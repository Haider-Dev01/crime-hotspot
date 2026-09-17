import React from 'react';
import { Landmark, TrendingUp } from 'lucide-react';

const formatMoney = (value) => {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `$${Math.round(value).toLocaleString()}`;
};

const formatPct = (value) => {
  if (value == null || Number.isNaN(value)) return 'N/A';
  return `${value.toFixed(1)}%`;
};

const SocioPanel = ({ socio, census }) => {
  const districts = socio?.districts || [];
  const top = districts.slice(0, 8);
  const maxLq = top.reduce((m, d) => Math.max(m, d.location_quotient || 0), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Landmark size={20} style={{ color: 'var(--color-secondary)' }} /> Socio-spatial rates
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
          Cook County ACS indicators with district sample rates per 10,000 residents (area-allocated Chicago population proxy).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Median household income</p>
          <p style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{formatMoney(census?.medianIncome)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{census?.available ? 'Pop-weighted tract medians' : 'Census file not loaded'}</p>
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unemployment</p>
          <p style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{formatPct(census?.unemploymentPct)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Population-weighted</p>
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Professional share</p>
          <p style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{formatPct(census?.professionalPct)}</p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Occupation proxy</p>
        </div>
        <div className="glass-card" style={{ padding: '1rem' }}>
          <p style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Chicago pop. proxy</p>
          <p style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            {census?.chicagoPopProxy ? census.chicagoPopProxy.toLocaleString() : 'N/A'}
          </p>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            {census?.available ? 'Cook × 51.9%' : 'ACS 2017 city estimate'}
          </p>
        </div>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <TrendingUp size={15} style={{ color: 'var(--color-primary)' }} /> Highest sample rate / 10k (location quotient)
        </h3>
        {top.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>District rates unavailable.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {top.map((d) => {
              const pct = ((d.location_quotient || 0) / maxLq) * 100;
              return (
                <div key={d.district}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>District {d.district}</span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-primary)', fontWeight: 700 }}>
                      {d.sample_rate_per_10k?.toFixed(2)} / 10k · LQ {d.location_quotient?.toFixed(2)}
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-primary)', borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {socio?.rate_caveat && (
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.85rem', lineHeight: 1.45 }}>
            {socio.rate_caveat}
          </p>
        )}
      </div>
    </div>
  );
};

export default SocioPanel;
