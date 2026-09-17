import React from 'react';
import { ShieldAlert, Activity, Database, GitMerge } from 'lucide-react';

const StatusPill = ({ ok, label }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    fontWeight: '700',
    padding: '2px 8px',
    borderRadius: '12px',
    background: ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
    color: ok ? 'var(--color-success)' : 'var(--color-primary)',
    border: `1px solid ${ok ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
  }}>
    <span style={{
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: ok ? 'var(--color-success)' : 'var(--color-primary)',
      display: 'inline-block',
    }} />
    {label}
  </span>
);

const Navbar = ({ isConnected, isClusterConnected, crimeSource }) => {
  return (
    <header className="app-navbar glass-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: 'rgba(244, 63, 94, 0.15)',
          padding: '0.6rem',
          borderRadius: '12px',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <ShieldAlert size={28} className="pulse-primary" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Chicago Crime Hotspot
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>Academic GIS Visualization Project</span>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <GitMerge size={12} /> {crimeSource === 'synthetic' ? 'Synthetic district sample' : crimeSource === 'sampled_real' ? 'Stratified official sample' : 'Proportional Stratified Dataset'}
            </span>
          </p>
        </div>
      </div>

      <div className="navbar-status">
        <div className="glass-card" style={{
          padding: '0.4rem 0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          borderRadius: '8px',
          fontSize: '0.8rem'
        }}>
          <Database size={14} style={{ color: 'var(--color-secondary)' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Cache Engine:</span>
          <span style={{ color: '#fff', fontWeight: 'bold' }}>Active</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={14} style={{ color: isConnected ? 'var(--color-success)' : 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>API:</span>
          <StatusPill ok={isConnected} label={isConnected ? 'CRIMES' : 'OFF'} />
          <StatusPill ok={!!isClusterConnected} label={isClusterConnected ? 'DBSCAN' : 'OFF'} />
        </div>
      </div>
    </header>
  );
};

export default Navbar;
