import React, { useState, useEffect } from 'react';
import { crimeService, clusterService } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import CrimeMap from '../components/CrimeMap';
import CrimeChart from '../components/CrimeChart';
import AnalyticsPanel from '../components/AnalyticsPanel';
import DataSourceBanner from '../components/DataSourceBanner';
import SocioPanel from '../components/SocioPanel';
import TimeRangeFilter from '../components/TimeRangeFilter';
import DbscanControls from '../components/DbscanControls';
import {
  ShieldAlert, Layers, TrendingUp, Compass,
  Search, Filter, RefreshCw, AlertTriangle, Target, Landmark, Users,
} from 'lucide-react';

const crimeYear = (crime) => {
  if (!crime?.Date) return null;
  const t = new Date(crime.Date);
  return Number.isFinite(t.getTime()) ? t.getFullYear() : null;
};

const Dashboard = () => {
  // ── Data states ──────────────────────────────────────────────────────────
  const [allCrimes, setAllCrimes] = useState([]);
  const [filteredCrimes, setFilteredCrimes] = useState([]);
  const [types, setTypes] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [dynamicStats, setDynamicStats] = useState({});
  const [clusters, setClusters] = useState([]);
  const [clusterSummary, setClusterSummary] = useState(null);
  const [datasetMeta, setDatasetMeta] = useState(null);
  const [censusSummary, setCensusSummary] = useState(null);
  const [districtSocio, setDistrictSocio] = useState(null);

  // ── Filter states ─────────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [years, setYears] = useState([]);
  const [yearCounts, setYearCounts] = useState({});
  const [yearStart, setYearStart] = useState(null);
  const [yearEnd, setYearEnd] = useState(null);
  const [epsKm, setEpsKm] = useState(0.5);
  const [minSamples, setMinSamples] = useState(10);
  const [focusClusterId, setFocusClusterId] = useState(null);

  // ── UI states ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [clusterLoading, setClusterLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isClusterConnected, setIsClusterConnected] = useState(false);
  const [metrics, setMetrics] = useState({ totalCount: 0, categoriesCount: 0, districtsCount: 0, topType: 'N/A', topTypeCount: 0 });

  // ── Initial data load ─────────────────────────────────────────────────────
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crimesResponse, typesResponse, metaResponse, demoResponse, socioResponse] = await Promise.all([
        crimeService.getCrimes(),
        crimeService.getCrimeTypes(),
        crimeService.getMeta().catch(() => null),
        crimeService.getDemographicsSummary().catch(() => null),
        crimeService.getDistrictSocio().catch(() => null),
      ]);
      const crimesList = crimesResponse.data || [];
      setAllCrimes(crimesList);
      setFilteredCrimes(crimesList);
      setTypes(typesResponse.data || []);
      setDatasetMeta(metaResponse?.data || null);
      setCensusSummary(demoResponse?.data || null);
      setDistrictSocio(socioResponse?.data || null);
      const extractedDistricts = [...new Set(crimesList.map((c) => c.District).filter(Boolean))].sort((a, b) => a - b);
      setDistricts(extractedDistricts);
      setIsConnected(true);
    } catch (err) {
      setError('Could not connect to the Express REST API at http://localhost:5000.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // ── Load DBSCAN clusters (separate microservice) ──────────────────────────
  const loadClusterData = async () => {
    setClusterLoading(true);
    try {
      const fromYear = yearStart != null && yearEnd != null ? Math.min(yearStart, yearEnd) : null;
      const toYear = yearStart != null && yearEnd != null ? Math.max(yearStart, yearEnd) : null;
      const params = {
        epsKm,
        minSamples,
        type: selectedType,
        district: selectedDistrict,
        from: fromYear != null ? `${fromYear}-01-01` : undefined,
        to: toYear != null ? `${toYear}-12-31` : undefined,
      };
      const [clusterResponse, summaryResponse] = await Promise.all([
        clusterService.getClusters(params),
        clusterService.getClusterSummary(params),
      ]);
      setClusters(clusterResponse.data || []);
      setClusterSummary(summaryResponse.data || null);
      setIsClusterConnected(true);
    } catch (err) {
      console.warn('DBSCAN clustering service unavailable:', err.message);
      setIsClusterConnected(false);
    } finally {
      setClusterLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    if (!allCrimes.length) return;
    const ys = [...new Set(allCrimes.map(crimeYear).filter(Boolean))].sort((a, b) => a - b);
    setYears(ys);
    const counts = {};
    ys.forEach((y) => { counts[y] = 0; });
    allCrimes.forEach((c) => {
      const y = crimeYear(c);
      if (y != null) counts[y] = (counts[y] || 0) + 1;
    });
    setYearCounts(counts);
    setYearStart((prev) => (prev == null && ys.length ? ys[0] : prev));
    setYearEnd((prev) => (prev == null && ys.length ? ys[ys.length - 1] : prev));
  }, [allCrimes]);

  useEffect(() => {
    if (yearStart == null || yearEnd == null) return undefined;
    const timer = setTimeout(() => { loadClusterData(); }, 450);
    return () => clearTimeout(timer);
  }, [selectedType, selectedDistrict, yearStart, yearEnd, epsKm, minSamples]);

  // ── Client-side dynamic filtering ────────────────────────────────────────
  useEffect(() => {
    let result = [...allCrimes];
    if (selectedType) result = result.filter((c) => c.PrimaryType?.toUpperCase() === selectedType.toUpperCase());
    if (selectedDistrict) result = result.filter((c) => c.District?.toString() === selectedDistrict.toString());
    if (searchQuery) result = result.filter((c) => c.PrimaryType?.toLowerCase().includes(searchQuery.toLowerCase()));
    if (yearStart != null && yearEnd != null) {
      const lo = Math.min(yearStart, yearEnd);
      const hi = Math.max(yearStart, yearEnd);
      result = result.filter((c) => {
        const y = crimeYear(c);
        return y != null && y >= lo && y <= hi;
      });
    }
    setFilteredCrimes(result);
  }, [selectedType, selectedDistrict, searchQuery, allCrimes, yearStart, yearEnd]);

  // ── Dynamic KPI recalculation ────────────────────────────────────────────
  useEffect(() => {
    if (filteredCrimes.length === 0) {
      setMetrics({ totalCount: 0, categoriesCount: 0, districtsCount: 0, topType: 'N/A', topTypeCount: 0 });
      setDynamicStats({});
      return;
    }
    const frequencies = filteredCrimes.reduce((acc, c) => {
      const t = c.PrimaryType || 'UNKNOWN';
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
    const top = Object.entries(frequencies).reduce((a, b) => b[1] > a[1] ? b : a, ['N/A', 0]);
    setMetrics({
      totalCount: filteredCrimes.length,
      categoriesCount: new Set(filteredCrimes.map((c) => c.PrimaryType).filter(Boolean)).size,
      districtsCount: new Set(filteredCrimes.map((c) => c.District).filter(Boolean)).size,
      topType: top[0],
      topTypeCount: top[1],
    });
    setDynamicStats(frequencies);
  }, [filteredCrimes]);

  const handleResetFilters = () => {
    setSelectedType('');
    setSelectedDistrict('');
    setSearchQuery('');
    if (years.length) {
      setYearStart(years[0]);
      setYearEnd(years[years.length - 1]);
    }
    setEpsKm(0.5);
    setMinSamples(10);
    setFocusClusterId(null);
  };
  const timeNarrowed = years.length > 0 && yearStart != null && yearEnd != null
    && (Math.min(yearStart, yearEnd) !== years[0] || Math.max(yearStart, yearEnd) !== years[years.length - 1]);
  const hasFilters = selectedType || selectedDistrict || searchQuery || timeNarrowed;

  return (
    <div className="dashboard-shell">
      <Navbar isConnected={isConnected} isClusterConnected={isClusterConnected} crimeSource={datasetMeta?.crime_source} />

      <DataSourceBanner meta={datasetMeta} />

      {/* ── Error Banner ── */}
      {error && (
        <div className="glass-panel" style={{ padding: '1.25rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '5px solid var(--color-primary)', background: 'rgba(244,63,94,0.1)' }}>
          <AlertTriangle size={24} style={{ color: 'var(--color-primary)' }} />
          <div style={{ flex: 1 }}>
            <h4 style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Server Connection Offline</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{error}</p>
          </div>
          <button onClick={loadDashboardData} style={{ padding: '0.5rem 1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Reconnect
          </button>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <section className="kpi-grid">
        <StatCard title="Total Crimes Mapped" value={metrics.totalCount.toLocaleString()} icon={ShieldAlert} color="primary" subtext="Active hotspots in current view" />
        <StatCard title="Crime Categories" value={metrics.categoriesCount} icon={Layers} color="secondary" subtext="Unique classification groups" />
        <StatCard title="Active Districts" value={metrics.districtsCount} icon={Compass} color="success" subtext="Chicago police zones covered" />
        <StatCard title="Most Common Crime" value={metrics.topType} icon={TrendingUp} color="warning" subtext={`${metrics.topTypeCount.toLocaleString()} incidents tracked`} />
        <StatCard title="DBSCAN Hotspots" value={clusterLoading ? '...' : clusters.length} icon={Target} color="primary" subtext="Automated cluster zones" />
        <StatCard
          title="Sample rate / 10k"
          value={censusSummary?.sample_rate_per_10k != null ? censusSummary.sample_rate_per_10k.toFixed(2) : '—'}
          icon={Users}
          color="secondary"
          subtext="Mapped extract vs Chicago pop. proxy"
        />
        <StatCard
          title="Median income"
          value={censusSummary?.medianIncome != null ? `$${Math.round(censusSummary.medianIncome).toLocaleString()}` : 'N/A'}
          icon={Landmark}
          color="success"
          subtext={censusSummary?.available ? 'Cook County ACS tracts' : 'Load demographic_cleaned.csv'}
        />
      </section>

      {/* ── Advanced Filters ── */}
      <section className="glass-panel filter-panel">
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} /> Advanced Geospatial Filters
        </h3>
        <div className="filter-grid">
          {/* Search */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Search Category</label>
            <div style={{ position: 'relative' }}>
              <input type="text" placeholder="e.g. THEFT, NARCOTICS..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.2rem', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.85rem', outline: 'none' }} />
              <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>
          {/* Crime Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by Type</label>
            <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}>
              <option value="">-- All Categories --</option>
              {types.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {/* District */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filter by District</label>
            <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', background: 'var(--bg-main)', border: '1px solid var(--border-light)', borderRadius: '8px', color: '#fff', fontFamily: 'var(--font-body)', fontSize: '0.85rem', cursor: 'pointer', outline: 'none' }}>
              <option value="">-- All Districts --</option>
              {districts.map((d) => <option key={d} value={d}>District {d}</option>)}
            </select>
          </div>
          {/* Reset */}
          <button onClick={handleResetFilters} disabled={!hasFilters && epsKm === 0.5 && minSamples === 10}
            style={{ height: '42px', padding: '0 1.25rem', background: hasFilters ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.02)', color: hasFilters ? 'var(--color-primary)' : 'var(--text-muted)', border: `1px solid ${hasFilters ? 'rgba(244,63,94,0.3)' : 'var(--border-light)'}`, borderRadius: '8px', fontWeight: '600', cursor: hasFilters ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            Clear Filters
          </button>
          <TimeRangeFilter
            years={years}
            yearStart={yearStart ?? years[0]}
            yearEnd={yearEnd ?? years[years.length - 1]}
            yearCounts={yearCounts}
            onYearStart={(y) => setYearStart(Math.min(y, yearEnd ?? y))}
            onYearEnd={(y) => setYearEnd(Math.max(y, yearStart ?? y))}
          />
          <DbscanControls
            epsKm={epsKm}
            minSamples={minSamples}
            onEps={setEpsKm}
            onMinSamples={setMinSamples}
            paramsUsed={clusterSummary?.params}
            clusterCount={clusters.length}
          />
        </div>
      </section>

      {/* ── Geospatial Map ── */}
      <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Geospatial Hotspot Map</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Individual markers · heatmap · DBSCAN convex hulls · district rates. Click a ranked zone below to zoom.

            </p>
          </div>
          {hasFilters && (
            <span style={{ fontSize: '0.75rem', background: 'rgba(244,63,94,0.15)', color: 'var(--color-primary)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(244,63,94,0.3)', fontWeight: '700' }}>
              Showing: {filteredCrimes.length.toLocaleString()} matches
            </span>
          )}
        </div>
        {loading ? (
          <div style={{ height: '530px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)', gap: '1rem' }}>
            <RefreshCw size={36} style={{ animation: 'spin 2s linear infinite', color: 'var(--color-primary)' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: '600' }}>Fetching dataset from REST API...</p>
          </div>
        ) : (
          <CrimeMap
            crimes={filteredCrimes}
            clusters={clusters}
            districtGeojson={districtSocio?.geojson || null}
            selectedDistrict={selectedDistrict}
            focusClusterId={focusClusterId}
          />
        )}
      </section>

      <section className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        <SocioPanel socio={districtSocio} census={censusSummary} />
      </section>

      {/* ── Analytics Intelligence Panel ── */}
      <section className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        {clusterLoading ? (
          <div style={{ minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 2s linear infinite', color: 'var(--color-primary)' }} />
            <span>Running DBSCAN spatial clustering algorithm...</span>
          </div>
        ) : (
          <AnalyticsPanel summary={clusterSummary} clusters={clusters} onSelectCluster={setFocusClusterId} />
        )}
      </section>

      {/* ── ChartJS Distribution Chart ── */}
      <section className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Crime Type Frequency Analysis</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Comparative frequency analytics — updates dynamically with active filter selections.
          </p>
        </div>
        {loading ? (
          <div style={{ height: '320px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw size={24} style={{ animation: 'spin 2s linear infinite', marginRight: '0.5rem' }} />
            Recalculating...
          </div>
        ) : (
          <CrimeChart stats={dynamicStats} />
        )}
      </section>

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Dashboard;
