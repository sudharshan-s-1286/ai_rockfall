import React, { useState } from 'react';
import { FaBell, FaBellSlash } from 'react-icons/fa';

const AlarmControl = ({ onTrigger }) => {
    const [isActive, setIsActive] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggleAlarm = async (targetState) => {
        setLoading(true);
        try {
            await onTrigger(targetState);
            setIsActive(targetState);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    return (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>MANUAL OVERRIDE</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                    className="btn-danger"
                    onClick={() => toggleAlarm(true)}
                    disabled={loading || isActive}
                    style={{ opacity: isActive ? 0.5 : 1 }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <FaBell size={24} />
                        <span>START ALARM</span>
                    </div>
                </button>

                <button
                    className="btn-primary"
                    onClick={() => toggleAlarm(false)}
                    disabled={loading || !isActive}
                    style={{
                        borderColor: 'var(--text-secondary)',
                        color: 'var(--text-secondary)',
                        opacity: !isActive ? 0.5 : 1
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        <FaBellSlash size={24} />
                        <span>STOP</span>
                    </div>
                </button>
            </div>

            {isActive && (
                <div style={{
                    marginTop: '1rem',
                    textAlign: 'center',
                    color: 'var(--neon-red)',
                    fontWeight: 'bold',
                    animation: 'pulse 1s infinite'
                }}>
                    ⚠️ ALARM ACTIVE ⚠️
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default AlarmControl;
