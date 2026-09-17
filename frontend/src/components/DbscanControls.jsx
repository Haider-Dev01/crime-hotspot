import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

const DbscanControls = ({ epsKm, minSamples, onEps, onMinSamples, paramsUsed, clusterCount }) => {
  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.85rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-light)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <SlidersHorizontal size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            DBSCAN parameters
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {clusterCount} hotspot{clusterCount === 1 ? '' : 's'} · eps {epsKm} km · min {minSamples}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Neighborhood radius (eps) — {epsKm.toFixed(2)} km
          </label>
          <input
            type="range"
            min="0.2"
            max="2"
            step="0.05"
            value={epsKm}
            onChange={(e) => onEps(Number(e.target.value))}
            style={{ width: '100%', marginTop: 8, accentColor: 'var(--color-primary)' }}
          />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Min samples — {minSamples}
          </label>
          <input
            type="range"
            min="5"
            max="40"
            step="1"
            value={minSamples}
            onChange={(e) => onMinSamples(Number(e.target.value))}
            style={{ width: '100%', marginTop: 8, accentColor: 'var(--color-secondary)' }}
          />
        </div>
      </div>
      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
        Clustering reruns on the current type, district and year filters. Smaller eps / higher min samples produce fewer, denser hotspots.
        {paramsUsed?.eps_km != null ? ` Last run: eps=${paramsUsed.eps_km} km, min_samples=${paramsUsed.min_samples}.` : ''}
      </p>
    </div>
  );
};

export default DbscanControls;
