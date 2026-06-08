import React, { useState, useEffect } from 'react';
import DropZone from '../components/DropZone';
import RiskBadge from '../components/RiskBadge';
import AlarmControl from '../components/AlarmControl';
import '../styles/dashboard.css';
import { FaServer, FaWind, FaHardHat, FaExclamationTriangle } from 'react-icons/fa';

// API Config
const API_BASE = 'http://localhost:8000';

const ImageAnalysis = () => {
    // State
    const [riskLevel, setRiskLevel] = useState(null); // null = waiting for upload
    const [crackCount, setCrackCount] = useState(0);
    const [detections, setDetections] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [logs, setLogs] = useState([]);

    // Alarm Control
    const triggerAlarm = async () => {
        if (isAlarmActive) return;
        setIsAlarmActive(true);
        try {
            await fetch(`${API_BASE}/alarm/start`, { method: 'POST' });
            addLog("ALARM TRIGGERED DUE TO HIGH RISK!");
        } catch (e) {
            console.error("Alarm Trigger Error:", e);
            addLog("Failed to trigger alarm.");
        }
    };

    const stopAlarm = async () => {
        setIsAlarmActive(false);
        try {
            await fetch(`${API_BASE}/alarm/stop`, { method: 'POST' });
            addLog("Alarm Stopped by User.");
        } catch (e) {
            console.error("Alarm Stop Error:", e);
            addLog("Failed to stop alarm.");
        }
    };

    // Handlers
    const handleImageSelected = async (file) => {
        setDetections([]);
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

            const rawElements = data.raw_yolo?.data || (data.raw_yolo?.images?.[0]?.results) || [];
            const mappedDetections = rawElements.map((det, i) => {
                const rd = data.risk_details && data.risk_details[i];
                return {
                    class: det.name || det.class || "Low_Risk",
                    confidence: det.confidence,
                    bbox: [det.box.x1, det.box.y1, det.box.x2, det.box.y2],
                    severity: rd ? rd.label : null
                };
            });
            setDetections(mappedDetections);

            addLog(`Analysis Complete: Risk ${data.risk_level}, Cracks: ${data.crack_count}`);

            // Auto-trigger alarm if High Risk
            if (data.risk_level === 'HIGH') {
                triggerAlarm();
            }

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
        <div className="dashboard-grid" style={{ height: 'calc(100vh - 4rem)', padding: 0 }}>
            {/* LEFT COLUMN: Controls & Logs */}
            <div className="sidebar" style={{ gridRow: '1 / -1' }}>
                {/* Risk Badge Analysis Result */}
                <div className="risk-display-section">
                    <h3>Analysis Result</h3>
                    {riskLevel ? (
                        <RiskBadge level={riskLevel} />
                    ) : (
                        <div style={{
                            padding: '1rem',
                            border: '1px dashed rgba(255,255,255,0.3)',
                            borderRadius: '12px',
                            color: 'rgba(255,255,255,0.5)',
                            textAlign: 'center'
                        }}>
                            NO IMAGE ANALYZED
                        </div>
                    )}
                </div>

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
            </div>

            {/* CENTER COLUMN: Visualization & Upload */}
            <div className="main-content glass-panel" style={{ padding: 0, display: 'flex', flexDirection: 'column', gridColumn: 2, gridRow: '1 / -1' }}>
                {/* Static Map Background just for aesthetics in this view too */}
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

                    <div style={{
                        position: 'absolute',
                        top: 0, bottom: 0, left: 0, right: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)'
                    }}>
                        <div style={{ width: '80%', height: '80%' }}>
                            <DropZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} detections={detections} />
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Action & Stats */}
            <div className="right-panel" style={{ gridColumn: 3, gridRow: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    <AlarmControl onTrigger={handleAlarmTrigger} />

                    {/* Emergency Stop Button - Only appears when alarm is active */}
                    {isAlarmActive && (
                        <button
                            className="btn-danger blink"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                background: 'red',
                                color: 'white',
                                border: '2px solid white',
                                boxShadow: '0 0 15px red'
                            }}
                            onClick={stopAlarm}
                        >
                            STOP ALARM
                        </button>
                    )}
                </div>

                <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
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
    );
};

export default ImageAnalysis;
