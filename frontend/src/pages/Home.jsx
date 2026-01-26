import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import DropZone from '../components/DropZone';
import RiskBadge from '../components/RiskBadge';
import AlarmControl from '../components/AlarmControl';
import '../styles/dashboard.css';
import { FaServer, FaWind, FaHardHat, FaExclamationTriangle } from 'react-icons/fa';

// API Config
const API_BASE = 'http://localhost:8000';

const Home = () => {
    // State
    const [riskLevel, setRiskLevel] = useState('LOW');
    const [crackCount, setCrackCount] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('OFFLINE');
    const [logs, setLogs] = useState([]);

    // Poll System Health
    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await fetch(`${API_BASE}/health/device-status`);
                const data = await res.json();
                if (data.arduino === 'CONNECTED') {
                    setConnectionStatus('ONLINE');
                } else {
                    setConnectionStatus('OFFLINE');
                }
            } catch (e) {
                setConnectionStatus('ERROR');
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    // Handlers
    const handleImageSelected = async (file) => {
        setIsAnalyzing(true);
        addLog(`Uploaded ${file.name} for analysis...`);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/inference/detect`, {
                method: 'POST',
                headers: {
                    // 'Content-Type': 'multipart/form-data' // Fetch adds this automatically with FormData
                },
                body: formData
            });

            if (!res.ok) throw new Error("Analysis failed");

            const data = await res.json();
            setRiskLevel(data.risk_level);
            setCrackCount(data.crack_count || 0);
            addLog(`Analysis Complete: Risk ${data.risk_level}, Cracks: ${data.crack_count}`);

        } catch (e) {
            console.error(e);
            addLog(`Error: ${e.message}`);
        }
        setIsAnalyzing(false);
    };

    const handleAlarmTrigger = async (state) => {
        const endpoint = state ? 'start' : 'stop';
        addLog(`Manual Override: ${state ? 'STARTING' : 'STOPPING'} Alarm...`);

        const res = await fetch(`${API_BASE}/alarm/${endpoint}`, { method: 'POST' });
        if (res.ok) {
            addLog(`Alarm ${state ? 'Active' : 'Stopped'}`);
        } else {
            addLog('Failed to toggle alarm');
        }
    };

    const addLog = (msg) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 5));
    };

    return (
        <div style={{ padding: '0 2rem' }}>
            <Navbar connectionStatus={connectionStatus} />

            <div className="dashboard-grid">
                {/* LEFT COLUMN: Controls & Logs */}
                <div className="sidebar">
                    <RiskBadge level={riskLevel} />

                    <div className="glass-panel" style={{ padding: '1rem', flex: 1 }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>ACTIVITY LOG</h3>
                        <div style={{ fontSize: '0.85rem', color: '#ccc', fontFamily: 'monospace' }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '8px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && <span style={{ opacity: 0.5 }}>System Ready. Waiting for input...</span>}
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1rem' }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>SENSORS</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span><FaWind /> Wind Speed</span>
                                <span className="neon-text-green">12 km/h</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span><FaServer /> Backend</span>
                                <span className="neon-text-green">98% UP</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CENTER COLUMN: Visualization & Upload */}
                <div className="main-content glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
                    {/* Map Background with Overlay */}
                    <div style={{
                        flex: 1,
                        background: 'url(/assets/mine_map.png) center/cover no-repeat',
                        position: 'relative',
                        minHeight: '300px'
                    }}>
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to bottom, transparent 60%, var(--bg-dark))'
                        }}></div>

                        <div style={{ position: 'absolute', top: '20px', left: '20px' }}>
                            <h2 style={{ margin: 0, textShadow: '0 0 10px black' }}>OPEN PIT SECTOR 4</h2>
                            <div style={{ color: 'var(--neon-cyan)' }}>LIVE FEED | CAM-01</div>
                        </div>

                        {/* Upload Overlay */}
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '20px',
                            width: '300px',
                            height: '200px',
                            background: 'rgba(0,0,0,0.8)',
                            borderRadius: '8px'
                        }}>
                            <DropZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Action & Stats */}
                <div className="right-panel">
                    <AlarmControl onTrigger={handleAlarmTrigger} />

                    <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
                        <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>SHIFT STATUS</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                            <FaHardHat size={30} color="var(--neon-green)" />
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>34</div>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>ACTIVE WORKERS</div>
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid #333', margin: '1rem 0' }}></div>

                        <h3 style={{ marginTop: 0, color: 'var(--text-secondary)' }}>DETECTED FLAWS</h3>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <FaExclamationTriangle size={30} color={crackCount > 0 ? "orange" : "#333"} />
                            <div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{crackCount}</div>
                                <div style={{ fontSize: '0.8rem', color: '#888' }}>CRACKS FOUND</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
