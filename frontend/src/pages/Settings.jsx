import React, { useState } from 'react';
import { FaSave } from 'react-icons/fa';

const Settings = () => {
    const [confThreshold, setConfThreshold] = useState(50);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [operatorName, setOperatorName] = useState("Site Admin");

    const handleSave = () => {
        alert("Settings Saved! (Simulation)");
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>SYSTEM CONFIGURATION</h1>

            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginTop: 0, color: 'var(--neon-cyan)', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>AI PARAMETERS</h3>

                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '10px' }}>Confidence Threshold: {confThreshold}%</label>
                    <input
                        type="range" min="0" max="100" value={confThreshold}
                        onChange={(e) => setConfThreshold(e.target.value)}
                        style={{ width: '100%', accentColor: 'var(--neon-green)' }}
                    />
                    <p style={{ fontSize: '0.8rem', color: '#888' }}>Determines how strictly the model flags potential cracks.</p>
                </div>

                <h3 style={{ marginTop: '2.5rem', color: 'var(--neon-cyan)', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>NOTIFICATIONS</h3>

                <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <input
                        type="checkbox" checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--neon-green)' }}
                    />
                    <span>Enable Email Alerts for HIGH RISK events</span>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '10px' }}>Operator Name</label>
                    <input
                        type="text" value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)',
                            color: 'white', padding: '10px', borderRadius: '4px', width: '100%'
                        }}
                    />
                </div>

                <div style={{ marginTop: '3rem', textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                        <FaSave /> SAVE CHANGES
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
