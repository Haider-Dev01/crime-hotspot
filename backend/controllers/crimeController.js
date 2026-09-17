const fs = require('fs');
const csv = require('csv-parser');
const { CRIME_CSV_PATH } = require('../lib/paths');

const CSV_PATH = CRIME_CSV_PATH;

// In-memory cache for parsed crime records to ensure instant API responses
let crimesCache = [];
let isLoaded = false;
let loadingPromise = null;

/**
 * Parses the crime CSV file and loads it into the in-memory cache.
 * Implements a Promise to handle asynchronous loading and prevent race conditions.
 */
const loadCrimeData = () => {
  if (isLoaded) return Promise.resolve(crimesCache);
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    const results = [];
    
    if (!fs.existsSync(CSV_PATH)) {
      return reject(new Error(`CSV data file not found at path: ${CSV_PATH}`));
    }

    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on('data', (data) => {
        // Parse and cast types properly for correct JSON representation
        results.push({
          ID: data.ID ? parseInt(data.ID, 10) : null,
          CaseNumber: data['Case Number'] || data.CaseNumber || null,
          Date: data.Date || null,
          PrimaryType: data['Primary Type'] || data.PrimaryType || null,
          Latitude: data.Latitude ? parseFloat(data.Latitude) : null,
          Longitude: data.Longitude ? parseFloat(data.Longitude) : null,
          District: data.District ? parseInt(data.District, 10) : null,
          Arrest: ['true', 'True', 'TRUE', 't', '1', true].includes(data.Arrest),
          Domestic: ['true', 'True', 'TRUE', 't', '1', true].includes(data.Domestic),

        });
      })
      .on('end', () => {
        crimesCache = results;
        isLoaded = true;
        loadingPromise = null;
        console.log(`[+] Loaded ${crimesCache.length} crime records into cache successfully!`);
        resolve(crimesCache);
      })
      .on('error', (err) => {
        loadingPromise = null;
        reject(err);
      });
  });

  return loadingPromise;
};

// Start loading the dataset eagerly at startup to avoid delay on first request
loadCrimeData().catch((err) => {
  console.error('[ERROR] Failed to eagerly load CSV data:', err.message);
});

/**
 * GET /api/crimes
 * Returns all crimes. Supports filtering by type via the ?type=QUERY query parameter.
 */
const getCrimes = async (req, res, next) => {
  try {
    const crimes = await loadCrimeData();
    const { type } = req.query;

    if (type) {
      // Perform a case-insensitive match on the PrimaryType column
      const filteredCrimes = crimes.filter(
        (crime) => crime.PrimaryType && crime.PrimaryType.toUpperCase() === type.toUpperCase()
      );
      return res.status(200).json({
        success: true,
        count: filteredCrimes.length,
        data: filteredCrimes
      });
    }

    return res.status(200).json({
      success: true,
      count: crimes.length,
      data: crimes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/crimes/types
 * Returns a unique list of crime types present in the dataset.
 */
const getCrimeTypes = async (req, res, next) => {
  try {
    const crimes = await loadCrimeData();
    
    // Use Set to gather unique types, filtering out any null values
    const uniqueTypes = [...new Set(crimes.map((crime) => crime.PrimaryType).filter(Boolean))];
    uniqueTypes.sort(); // Sort alphabetically

    return res.status(200).json({
      success: true,
      count: uniqueTypes.length,
      data: uniqueTypes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stats/types
 * Returns count of crimes grouped by their PrimaryType.
 */
const getCrimeStatsByType = async (req, res, next) => {
  try {
    const crimes = await loadCrimeData();
    
    // Group and count crimes by type
    const stats = crimes.reduce((acc, crime) => {
      const type = crime.PrimaryType || 'UNKNOWN';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadCrimeData,
  getCrimes,
  getCrimeTypes,
  getCrimeStatsByType
};
