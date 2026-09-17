const fs = require('fs');
const csv = require('csv-parser');
const { loadCrimeData } = require('./crimeController');
const { hullToGeometry, polygonAreaKm2 } = require('../lib/geo');
const { DEMOGRAPHIC_CSV_PATH, MANIFEST_PATH } = require('../lib/paths');

const CHICAGO_SHARE_OF_COOK = 0.519;
const FALLBACK_CHICAGO_POP = 2704958;

let censusCache = null;
let censusLoaded = false;
let censusPromise = null;

const parseFloatOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

const loadCensusData = () => {
  if (censusLoaded) return Promise.resolve(censusCache);
  if (censusPromise) return censusPromise;

  censusPromise = new Promise((resolve) => {
    if (!fs.existsSync(DEMOGRAPHIC_CSV_PATH)) {
      censusCache = [];
      censusLoaded = true;
      censusPromise = null;
      console.warn('[!] Demographic CSV not found — socioeconomic rates will use published Chicago population fallback.');
      return resolve(censusCache);
    }

    const rows = [];
    fs.createReadStream(DEMOGRAPHIC_CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        rows.push({
          TractId: data.TractId || null,
          State: data.State || null,
          County: data.County || null,
          TotalPop: parseFloatOrNull(data.TotalPop) || 0,
          Income: parseFloatOrNull(data.Income),
          IncomePerCap: parseFloatOrNull(data.IncomePerCap),
          Professional: parseFloatOrNull(data.Professional),
          Unemployment: parseFloatOrNull(data.Unemployment),
        });
      })
      .on('end', () => {
        censusCache = rows;
        censusLoaded = true;
        censusPromise = null;
        console.log(`[+] Loaded ${censusCache.length} Cook County census tracts.`);
        resolve(censusCache);
      })
      .on('error', (err) => {
        console.error('[ERROR] Failed to load demographic CSV:', err.message);
        censusCache = [];
        censusLoaded = true;
        censusPromise = null;
        resolve(censusCache);
      });
  });

  return censusPromise;
};

loadCensusData();

const weightedMean = (rows, field, weightField = 'TotalPop') => {
  let num = 0;
  let den = 0;
  rows.forEach((row) => {
    if (row[field] == null) return;
    const w = row[weightField] || 0;
    num += row[field] * w;
    den += w;
  });
  return den > 0 ? num / den : null;
};

const weightedMedian = (rows, field, weightField = 'TotalPop') => {
  const items = rows
    .filter((row) => row[field] != null && row[weightField] > 0)
    .map((row) => ({ value: row[field], weight: row[weightField] }))
    .sort((a, b) => a.value - b.value);

  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.weight, 0);
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.weight;
    if (cumulative >= total / 2) return item.value;
  }
  return items[items.length - 1].value;
};

const summarizeCensus = (rows) => {
  if (!rows.length) {
    return {
      available: false,
      tractCount: 0,
      totalPop: null,
      medianIncome: null,
      incomePerCapita: null,
      unemploymentPct: null,
      professionalPct: null,
      chicagoPopProxy: FALLBACK_CHICAGO_POP,
      methodology: 'Census tract file missing. Chicago population proxy is the ACS 2017 city estimate (2,704,958).',
    };
  }

  const cookPop = rows.reduce((s, r) => s + (r.TotalPop || 0), 0);
  const chicagoPopProxy = Math.round(cookPop * CHICAGO_SHARE_OF_COOK);

  return {
    available: true,
    tractCount: rows.length,
    region: 'Cook County, Illinois',
    vintage: 'ACS 2017 (cleaned tract extract)',
    totalPop: cookPop,
    medianIncome: weightedMedian(rows, 'Income'),
    incomePerCapita: weightedMean(rows, 'IncomePerCap'),
    unemploymentPct: weightedMean(rows, 'Unemployment'),
    professionalPct: weightedMean(rows, 'Professional'),
    chicagoPopProxy,
    chicagoShareOfCook: CHICAGO_SHARE_OF_COOK,
    methodology: 'Tract Income / Unemployment / Professional are population-weighted across Cook County tracts. Chicago population proxy = Cook total × 0.519 (Chicago ≈ 51.9% of Cook County in ACS 2017). District populations are then allocated by convex-hull area of mapped incidents.',
  };
};

const readManifest = () => {
  try {
    if (!fs.existsSync(MANIFEST_PATH)) {
      return {
        crime_source: 'unknown',
        census_available: fs.existsSync(DEMOGRAPHIC_CSV_PATH),
      };
    }
    return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (err) {
    return { crime_source: 'unknown', census_available: false, error: err.message };
  }
};

const buildDistrictFeatures = (crimes, chicagoPopProxy) => {
  const byDistrict = new Map();

  crimes.forEach((crime) => {
    if (!crime.District || !crime.Latitude || !crime.Longitude) return;
    const id = crime.District;
    if (!byDistrict.has(id)) {
      byDistrict.set(id, { crimes: [], arrests: 0 });
    }
    const bucket = byDistrict.get(id);
    bucket.crimes.push(crime);
    if (crime.Arrest) bucket.arrests += 1;
  });

  const totalCrimes = [...byDistrict.values()].reduce((s, b) => s + b.crimes.length, 0);

  const withGeometry = [...byDistrict.entries()].map(([district, bucket]) => {
    const lonLat = bucket.crimes.map((c) => [c.Longitude, c.Latitude]);
    const geometry = hullToGeometry(lonLat);
    const ring = geometry && geometry.coordinates ? geometry.coordinates[0] : [];
    const areaKm2 = polygonAreaKm2(ring);
    const centerLat = bucket.crimes.reduce((s, c) => s + c.Latitude, 0) / bucket.crimes.length;
    const centerLon = bucket.crimes.reduce((s, c) => s + c.Longitude, 0) / bucket.crimes.length;
    return {
      district,
      crime_count: bucket.crimes.length,
      arrests: bucket.arrests,
      area_km2: areaKm2,
      center: { lat: centerLat, lon: centerLon },
      geometry,
    };
  });

  const totalArea = withGeometry.reduce((s, d) => s + d.area_km2, 0);

  const districts = withGeometry.map((d) => {
    const popShare = totalArea > 0 && d.area_km2 > 0
      ? d.area_km2 / totalArea
      : 1 / Math.max(withGeometry.length, 1);
    const population_proxy = Math.max(1, Math.round(chicagoPopProxy * popShare));
    const sample_rate_per_10k = (d.crime_count / population_proxy) * 10000;
    const crimeShare = totalCrimes > 0 ? d.crime_count / totalCrimes : 0;
    const location_quotient = popShare > 0 ? crimeShare / popShare : 0;

    return {
      district: d.district,
      crime_count: d.crime_count,
      arrests: d.arrests,
      arrest_rate: d.crime_count ? d.arrests / d.crime_count : 0,
      area_km2: Number(d.area_km2.toFixed(3)),
      population_proxy,
      sample_rate_per_10k: Number(sample_rate_per_10k.toFixed(3)),
      location_quotient: Number(location_quotient.toFixed(3)),
      center: d.center,
      geometry: d.geometry,
    };
  });

  districts.sort((a, b) => b.sample_rate_per_10k - a.sample_rate_per_10k);
  return { districts, totalCrimes };
};

const getMeta = async (req, res, next) => {
  try {
    const crimes = await loadCrimeData();
    const census = await loadCensusData();
    const manifest = readManifest();
    const summary = summarizeCensus(census);
    const source = manifest.crime_source || 'unknown';

    return res.status(200).json({
      success: true,
      data: {
        crime_source: source,
        is_synthetic: source === 'synthetic',
        crime_rows: crimes.length,
        raw_rows_processed: manifest.raw_rows_processed ?? null,
        census_available: summary.available,
        census_tracts: summary.tractCount,
        generated_at: manifest.generated_at || null,
        warning: manifest.warning || (
          source === 'synthetic'
            ? 'Crime points are a geographically clustered academic sample, not the official Chicago Crime extract.'
            : null
        ),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDemographicsSummary = async (req, res, next) => {
  try {
    const census = await loadCensusData();
    const crimes = await loadCrimeData();
    const summary = summarizeCensus(census);
    const chicagoPop = summary.chicagoPopProxy || FALLBACK_CHICAGO_POP;
    const sampleRatePer10k = chicagoPop ? (crimes.length / chicagoPop) * 10000 : null;

    return res.status(200).json({
      success: true,
      data: {
        ...summary,
        mapped_crimes: crimes.length,
        sample_rate_per_10k: sampleRatePer10k != null ? Number(sampleRatePer10k.toFixed(3)) : null,
        rate_caveat: 'Rate uses the 8,000-row mapped extract over a Chicago population proxy. It is a relative socio-spatial index, not the official city crime rate.',
      },
    });
  } catch (error) {
    next(error);
  }
};

const getDistrictSocio = async (req, res, next) => {
  try {
    const [crimes, census] = await Promise.all([loadCrimeData(), loadCensusData()]);
    const summary = summarizeCensus(census);
    const chicagoPop = summary.chicagoPopProxy || FALLBACK_CHICAGO_POP;
    const { districts } = buildDistrictFeatures(crimes, chicagoPop);

    const geojson = {
      type: 'FeatureCollection',
      features: districts
        .filter((d) => d.geometry)
        .map((d) => ({
          type: 'Feature',
          properties: {
            district: d.district,
            crime_count: d.crime_count,
            population_proxy: d.population_proxy,
            sample_rate_per_10k: d.sample_rate_per_10k,
            location_quotient: d.location_quotient,
            arrest_rate: Number(d.arrest_rate.toFixed(3)),
          },
          geometry: d.geometry,
        })),
    };

    return res.status(200).json({
      success: true,
      count: districts.length,
      data: {
        census: {
          available: summary.available,
          tractCount: summary.tractCount,
          totalPop: summary.totalPop,
          medianIncome: summary.medianIncome,
          unemploymentPct: summary.unemploymentPct,
          professionalPct: summary.professionalPct,
          chicagoPopProxy: chicagoPop,
          methodology: summary.methodology,
        },
        rate_caveat: 'District rates compare the mapped sample across area-allocated population. Rankings are valid within the extract; absolute incidence is not an official CPD statistic.',
        districts,
        geojson,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadCensusData,
  getMeta,
  getDemographicsSummary,
  getDistrictSocio,
};
