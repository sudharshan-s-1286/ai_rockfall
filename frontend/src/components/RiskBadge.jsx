import React from 'react';

const RiskBadge = ({ level }) => {
    let color = 'var(--text-secondary)';
    let glow = 'none';

    if (level === 'HIGH') {
        color = 'var(--neon-red)';
        glow = '0 0 20px rgba(255, 0, 60, 0.6)';
    } else if (level === 'MEDIUM') {
        color = 'orange';
        glow = '0 0 15px rgba(255, 165, 0, 0.4)';
    } else if (level === 'LOW') {
        color = 'var(--neon-green)';
        glow = '0 0 15px rgba(0, 255, 157, 0.4)';
    }

    return (
        <div className="glass-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '2rem',
            border: `2px solid ${color}`,
            boxShadow: glow
        }}>
            <span style={{ fontSize: '1rem', color: '#fff', marginBottom: '0.5rem' }}>CURRENT RISK LEVEL</span>
            <span style={{
                fontSize: '3.5rem',
                fontWeight: '800',
                color: color,
                textShadow: glow
            }}>
                {level}
            </span>
        </div>
    );
};

export default RiskBadge;
