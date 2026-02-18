import React, { useState, useEffect } from 'react';
import AlarmControl from '../components/AlarmControl';
import { FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa';

const EmergencyControl = () => {
    const [alarmActive, setAlarmActive] = useState(false);
    const [activationTime, setActivationTime] = useState(null);
    const [elapsed, setElapsed] = useState(0);

    const handleTrigger = async (state) => {
        // AlarmControl handles the visual toggle, we handle the API
        try {
            const endpoint = state ? 'http://localhost:8000/alarm/start' : 'http://localhost:8000/alarm/stop';
            const res = await fetch(endpoint, { method: 'POST' });
            const data = await res.json();

            if (data.status === 'Alarm Started' || data.status === 'Alarm Stopped') {
                setAlarmActive(state);
                if (state) {
                    setActivationTime(Date.now());
                } else {
                    setActivationTime(null);
                    setElapsed(0);
                }
            } else {
                console.error("Alarm API Error:", data);
                alert("Failed to trigger alarm: " + (data.detail || "Unknown error"));
                // Revert state if needed, but AlarmControl might need robust handling
            }
        } catch (e) {
            console.error("Connection Error:", e);
            alert("Connection Error: Check if backend is running.");
        }
    };

    useEffect(() => {
        let interval;
        if (alarmActive && activationTime) {
            interval = setInterval(() => {
                setElapsed(Math.floor((Date.now() - activationTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [alarmActive, activationTime]);

    const formatTime = (sec) => {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    return (
        <div style={{ padding: '2rem', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1 className="neon-text-red" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '15px' }}>
                <FaExclamationTriangle /> EMERGENCY RESPONSE
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>
                {/* Left: Big Status Panel */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: alarmActive ? '2px solid var(--neon-red)' : '2px solid var(--neon-green)',
                    boxShadow: alarmActive ? '0 0 50px rgba(255, 0, 60, 0.3)' : 'none',
                    transition: 'all 0.3s ease'
                }}>
                    <FaShieldAlt size={80} color={alarmActive ? 'var(--neon-red)' : 'var(--neon-green)'} style={{ marginBottom: '1rem' }} />

                    <h2 style={{ fontSize: '3rem', margin: 0, color: alarmActive ? 'var(--neon-red)' : 'var(--neon-green)' }}>
                        {alarmActive ? 'ALARM ACTIVE' : 'SYSTEM SECURE'}
                    </h2>

                    {alarmActive && (
                        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                            <div style={{ color: '#888' }}>TIME ELAPSED</div>
                            <div style={{ fontSize: '4rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                {formatTime(elapsed)}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Controls & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <AlarmControl onTrigger={handleTrigger} />

                    {/* Rescue Team Button */}
                    <button
                        onClick={async () => {
                            if (!window.confirm("Are you sure you want to alert the Rescue Team?")) return;
                            try {
                                const res = await fetch('http://localhost:8000/alarm/rescue', { method: 'POST' });
                                const data = await res.json();
                                alert(data.detail || data.status);
                            } catch (e) {
                                alert("Failed to contact server.");
                            }
                        }}
                        style={{
                            background: '#00d4ff',
                            color: '#000',
                            border: 'none',
                            padding: '1.5rem',
                            fontSize: '1.2rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            boxShadow: '0 0 20px rgba(0, 212, 255, 0.3)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}
                    >
                        🚑 Alert Rescue Team
                    </button>

                    <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
                        <h3 style={{ color: 'var(--text-secondary)', marginTop: 0 }}>RESPONSE PROTOCOLS</h3>
                        <ul style={{ lineHeight: '1.8', color: '#ccc' }}>
                            <li>1. Verify visual feed on <strong>Live Monitor</strong>.</li>
                            <li>2. If slope failure imminent, activate <strong>ALARM</strong> immediately.</li>
                            <li>3. Alert Shift Manager via radio (Channel 4).</li>
                            <li>4. Do not reset alarm until area is cleared.</li>
                        </ul>

                        <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                            <strong>Shift Manager:</strong> John Doe<br />
                            <strong>Radio:</strong> Channel 4<br />
                            <strong>Emergency Ext:</strong> 555-0199
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyControl;
