import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'primary', subtext }) => {
  const colorMap = {
    primary: {
      accent: 'var(--color-primary)',
      bg: 'rgba(244, 63, 94, 0.1)',
      border: 'rgba(244, 63, 94, 0.2)'
    },
    secondary: {
      accent: 'var(--color-secondary)',
      bg: 'rgba(14, 165, 233, 0.1)',
      border: 'rgba(14, 165, 233, 0.2)'
    },
    warning: {
      accent: 'var(--color-accent)',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.2)'
    },
    success: {
      accent: 'var(--color-success)',
      bg: 'rgba(16, 185, 129, 0.1)',
      border: 'rgba(16, 185, 129, 0.2)'
    }
  };

  const style = colorMap[color] || colorMap.primary;

  return (
    <div className="glass-card" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.25rem',
      borderRadius: 'var(--radius-lg)',
      background: 'rgba(30, 41, 59, 0.35)',
      boxShadow: 'inset 0 0 12px rgba(255, 255, 255, 0.02)'
    }}>
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: '0.75rem',
          fontWeight: '700',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '0.5rem'
        }}>
          {title}
        </p>
        <h3 style={{
          fontSize: 'clamp(1.15rem, 2.2vw, 2.1rem)',
          fontWeight: '800',
          fontFamily: 'var(--font-heading)',
          color: '#fff',
          lineHeight: '1.15',
          marginBottom: '0.4rem',
          overflowWrap: 'anywhere'
        }}>
          {value}
        </h3>
        {subtext && (
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            {subtext}
          </p>
        )}
      </div>

      <div style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        padding: '0.75rem',
        borderRadius: '12px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Icon size={24} style={{ color: style.accent }} />
      </div>
    </div>
  );
};

export default StatCard;
