import React from 'react';
import { CalendarRange } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '0.75rem',
  background: 'var(--bg-main)',
  border: '1px solid var(--border-light)',
  borderRadius: '8px',
  color: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: '0.85rem',
  cursor: 'pointer',
  outline: 'none',
};

const TimeRangeFilter = ({ years, yearStart, yearEnd, yearCounts, onYearStart, onYearEnd }) => {
  if (!years.length) return null;
  const maxCount = Math.max(...years.map((y) => yearCounts[y] || 0), 1);

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
        <CalendarRange size={14} style={{ color: 'var(--color-secondary)' }} />
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Time window
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {yearStart} – {yearEnd}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr', gap: '1rem', alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>From year</label>
          <select value={yearStart} onChange={(e) => onYearStart(Number(e.target.value))} style={inputStyle}>
            {years.map((y) => <option key={`from-${y}`} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>To year</label>
          <select value={yearEnd} onChange={(e) => onYearEnd(Number(e.target.value))} style={inputStyle}>
            {years.map((y) => <option key={`to-${y}`} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 42 }}>
          {years.map((y) => {
            const active = y >= yearStart && y <= yearEnd;
            const h = Math.max(6, ((yearCounts[y] || 0) / maxCount) * 42);
            return (
              <div key={y} title={`${y}: ${(yearCounts[y] || 0).toLocaleString()}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{
                  width: '100%',
                  height: h,
                  borderRadius: 3,
                  background: active ? 'var(--color-secondary)' : 'rgba(255,255,255,0.12)',
                }} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimeRangeFilter;
