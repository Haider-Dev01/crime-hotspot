import React, { useState, useEffect } from 'react';
import { crimeService, clusterService } from '../services/api';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import CrimeMap from '../components/CrimeMap';
import CrimeChart from '../components/CrimeChart';
import AnalyticsPanel from '../components/AnalyticsPanel';
import {
  ShieldAlert, MapPin, Layers, TrendingUp, Compass,
  Search, Filter, RefreshCw, AlertTriangle, Target,
} from 'lucide-react';

const Dashboard = () => {
  // ── Data states ──────────────────────────────────────────────────────────
  const [allCrimes, setAllCrimes] = useState([]);
  const [filteredCrimes, setFilteredCrimes] = useState([]);
  const [types, setTypes] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [dynamicStats, setDynamicStats] = useState({});
  const [clusters, setClusters] = useState([]);
  const [clusterSummary, setClusterSummary] = useState(null);

  // ── Filter states ─────────────────────────────────────────────────────────
  const [selectedType, setSelectedType] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // ── UI states ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [clusterLoading, setClusterLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState({ totalCount: 0, categoriesCount: 0, districtsCount: 0, topType: 'N/A', topTypeCount: 0 });

  // ── Initial data load ─────────────────────────────────────────────────────
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [crimesResponse, typesResponse] = await Promise.all([
        crimeService.getCrimes(),
        crimeService.getCrimeTypes(),
      ]);
      const crimesList = crimesResponse.data || [];
      setAllCrimes(crimesList);
      setFilteredCrimes(crimesList);
      setTypes(typesResponse.data || []);
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
      const [clusterResponse, summaryResponse] = await Promise.all([
        clusterService.getClusters(),
        clusterService.getClusterSummary(),
      ]);
      setClusters(clusterResponse.data || []);
      setClusterSummary(summaryResponse.data || null);
    } catch (err) {
      console.warn('DBSCAN clustering service unavailable:', err.message);
    } finally {
      setClusterLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadClusterData();
  }, []);

  // ── Client-side dynamic filtering ────────────────────────────────────────
  useEffect(() => {
    let result = [...allCrimes];
    if (selectedType) result = result.filter((c) => c.PrimaryType?.toUpperCase() === selectedType.toUpperCase());
    if (selectedDistrict) result = result.filter((c) => c.District?.toString() === selectedDistrict.toString());
    if (searchQuery) result = result.filter((c) => c.PrimaryType?.toLowerCase().includes(searchQuery.toLowerCase()));
    setFilteredCrimes(result);
  }, [selectedType, selectedDistrict, searchQuery, allCrimes]);

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

  const handleResetFilters = () => { setSelectedType(''); setSelectedDistrict(''); setSearchQuery(''); };
  const hasFilters = selectedType || selectedDistrict || searchQuery;

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 1.5rem 3rem 1.5rem' }}>
      <Navbar isConnected={isConnected} />

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
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <StatCard title="Total Crimes Mapped" value={metrics.totalCount.toLocaleString()} icon={ShieldAlert} color="primary" subtext="Active hotspots in current view" />
        <StatCard title="Crime Categories" value={metrics.categoriesCount} icon={Layers} color="secondary" subtext="Unique classification groups" />
        <StatCard title="Active Districts" value={metrics.districtsCount} icon={Compass} color="success" subtext="Chicago police zones covered" />
        <StatCard title="Most Common Crime" value={metrics.topType} icon={TrendingUp} color="warning" subtext={`${metrics.topTypeCount.toLocaleString()} incidents tracked`} />
        <StatCard title="DBSCAN Hotspots" value={clusterLoading ? '...' : clusters.length} icon={Target} color="primary" subtext="Automated cluster zones" />
      </section>

      {/* ── Advanced Filters ── */}
      <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', background: 'rgba(15,23,42,0.5)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: 'var(--color-primary)' }} /> Advanced Geospatial Filters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
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
          <button onClick={handleResetFilters} disabled={!hasFilters}
            style={{ height: '42px', padding: '0 1.25rem', background: hasFilters ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.02)', color: hasFilters ? 'var(--color-primary)' : 'var(--text-muted)', border: `1px solid ${hasFilters ? 'rgba(244,63,94,0.3)' : 'var(--border-light)'}`, borderRadius: '8px', fontWeight: '600', cursor: hasFilters ? 'pointer' : 'not-allowed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
            Clear Filters
          </button>
        </div>
      </section>

      {/* ── Geospatial Map ── */}
      <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Geospatial Hotspot Map</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Individual Markers · Density Heatmap · DBSCAN Cluster Zones — use the toggle inside the map.
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
          <CrimeMap crimes={filteredCrimes} clusters={clusters} />
        )}
      </section>

      {/* ── Analytics Intelligence Panel ── */}
      <section className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2.5rem' }}>
        {clusterLoading ? (
          <div style={{ minHeight: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={20} style={{ animation: 'spin 2s linear infinite', color: 'var(--color-primary)' }} />
            <span>Running DBSCAN spatial clustering algorithm...</span>
          </div>
        ) : (
          <AnalyticsPanel summary={clusterSummary} clusters={clusters} />
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
