import React from 'react';
import { Target, TrendingDown, AlertTriangle, BarChart2, MapPin, Percent } from 'lucide-react';

const DANGER_GRADIENT = ['#f43f5e', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#06b6d4'];

const AnalyticsPanel = ({ summary, clusters }) => {
  if (!summary) return null;

  const typeDistribution = summary.type_distribution || {};
  const sortedTypes = Object.entries(typeDistribution).sort((a, b) => b[1] - a[1]);
  const maxCount = sortedTypes.length > 0 ? sortedTypes[0][1] : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Section Header ── */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Target size={20} style={{ color: 'var(--color-primary)' }} /> Crime Analytics Intelligence Panel
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Automated DBSCAN spatial clustering analysis — {summary.total_clusters} hotspot zones detected
        </p>
      </div>

      {/* ── Top KPI Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Detected Hotspots', value: summary.total_clusters, icon: Target, color: '#f43f5e', sub: 'DBSCAN cluster zones' },
          { label: 'Crimes Clustered', value: summary.total_clustered_crimes?.toLocaleString(), icon: MapPin, color: '#3b82f6', sub: `of ${summary.total_crimes_analyzed?.toLocaleString()} analyzed` },
          { label: 'Cluster Coverage', value: `${summary.cluster_coverage_pct}%`, icon: Percent, color: '#10b981', sub: 'of all plotted crimes' },
          { label: 'Noise Points', value: summary.noise_points?.toLocaleString(), icon: AlertTriangle, color: '#eab308', sub: 'Isolated / unclustered' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
          }}>
            <div style={{ background: `${color}18`, border: `1px solid ${color}40`, borderRadius: '8px', padding: '0.5rem', flexShrink: 0 }}>
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)', color: '#fff', lineHeight: '1.1' }}>{value}</p>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Two-column grid: Most Dangerous + Crime Types Chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem' }}>

        {/* Most Dangerous Hotspot Zones */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f43f5e' }}>
            <TrendingDown size={15} /> Most Dangerous Hotspot Zones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {(clusters || []).slice(0, 6).map((cluster, i) => (
              <div key={cluster.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.6rem 0.8rem',
                background: i === 0 ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${i === 0 ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)'}`,
                borderRadius: '8px',
              }}>
                <span style={{
                  width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                  background: DANGER_GRADIENT[i] || '#64748b',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: '800', color: '#fff',
                }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    Zone #{cluster.id + 1} — District {cluster.dominant_district}
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{cluster.top_crime_type}</p>
                </div>
                <span style={{
                  background: `${cluster.color}22`, color: cluster.color,
                  border: `1px solid ${cluster.color}44`,
                  borderRadius: '20px', padding: '2px 8px',
                  fontSize: '0.7rem', fontWeight: '700', flexShrink: 0,
                }}>
                  {cluster.crime_count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Crime Type Distribution Bars */}
        <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart2 size={15} style={{ color: 'var(--color-secondary)' }} /> Crime Distribution Statistics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {sortedTypes.map(([type, count], i) => {
              const pct = (count / maxCount) * 100;
              const barColor = i === 0 ? '#f43f5e' : i < 3 ? '#f97316' : '#3b82f6';
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{type}</span>
                    <span style={{ fontSize: '0.72rem', color: barColor, fontWeight: '700' }}>{count.toLocaleString()}</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: barColor,
                      borderRadius: '3px',
                      transition: 'width 0.8s ease',
                      boxShadow: `0 0 6px ${barColor}60`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Key Insights Summary Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {[
          { label: 'Most Dangerous Area', value: summary.most_dangerous_area, color: '#f43f5e', icon: AlertTriangle },
          { label: 'Most Common Crime', value: summary.most_common_crime, color: '#f59e0b', icon: TrendingDown },
          { label: 'Crime Occurrences', value: summary.most_common_crime_count?.toLocaleString(), color: '#3b82f6', icon: BarChart2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{
            background: `linear-gradient(135deg, ${color}10 0%, rgba(30,41,59,0.5) 100%)`,
            border: `1px solid ${color}30`, borderRadius: '12px', padding: '1.1rem',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <Icon size={22} style={{ color, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
              <p style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff', fontFamily: 'var(--font-heading)' }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default AnalyticsPanel;
