import React from 'react';
import { AlertTriangle, Database, CheckCircle2 } from 'lucide-react';

const DataSourceBanner = ({ meta }) => {
  if (!meta) return null;

  const synthetic = meta.is_synthetic || meta.crime_source === 'synthetic';
  const unknown = meta.crime_source === 'unknown';

  if (!synthetic && !unknown) {
    return (
      <div className="glass-panel" style={{
        padding: '1rem 1.5rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        borderLeft: '5px solid var(--color-success)',
        background: 'rgba(16,185,129,0.08)',
      }}>
        <CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
        <div>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700 }}>Sampled official extract</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {meta.crime_rows?.toLocaleString()} mapped incidents
            {meta.raw_rows_processed ? ` from ${meta.raw_rows_processed.toLocaleString()} cleaned raw rows` : ''}.
            {meta.census_available
              ? ` Census overlay: ${meta.census_tracts?.toLocaleString()} Cook County tracts.`
              : ' Census tract file not loaded — rates use a Chicago population proxy.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{
      padding: '1rem 1.5rem',
      marginBottom: '1.5rem',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.85rem',
      borderLeft: '5px solid var(--color-accent)',
      background: 'rgba(245,158,11,0.1)',
    }}>
      {synthetic ? (
        <AlertTriangle size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
      ) : (
        <Database size={20} style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }} />
      )}
      <div>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-accent)' }}>
          {synthetic ? 'Synthetic crime sample' : 'Dataset provenance unknown'}
        </h4>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {meta.warning || 'Run `python clean_data.py` with the real Chicago Crime CSV (or Git LFS pull) to replace this stand-in.'}
          {' '}Rates below compare districts inside this extract; they are not official CPD crime rates.
        </p>
      </div>
    </div>
  );
};

export default DataSourceBanner;
