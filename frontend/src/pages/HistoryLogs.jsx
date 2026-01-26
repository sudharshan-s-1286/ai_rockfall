import React, { useState, useEffect } from 'react';
import { FaFilter, FaDownload } from 'react-icons/fa';

const HistoryLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('ALL'); // ALL, HIGH, MEDIUM
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:8000/history/all');
            if (res.ok) {
                const data = await res.json();
                setLogs(data); // Assuming data is array
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    const filteredLogs = logs.filter(log => {
        if (filter === 'ALL') return true;
        return log.risk_level === filter;
    });

    const downloadCSV = () => {
        const headers = "ID,Time,Risk,Confidence,Cracks,Source\n";
        const rows = filteredLogs.map(l =>
            `${l.id},${l.timestamp},${l.risk_level},${l.max_confidence},${l.crack_count},${l.source}`
        ).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "rocksense_history.csv";
        a.click();
    };

    return (
        <div style={{ padding: '2rem', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ margin: 0 }}>EVENT HISTORY</h1>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        className="glass-panel"
                        style={{ padding: '0.5rem', color: 'white', background: 'transparent' }}
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="ALL">ALL EVENTS</option>
                        <option value="HIGH">HIGH RISK</option>
                        <option value="MEDIUM">MEDIUM RISK</option>
                        <option value="LOW">LOW RISK</option>
                    </select>

                    <button className="btn-primary" onClick={downloadCSV}>
                        <FaDownload /> CSV
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '0.5fr 2fr 1fr 1fr 1fr 1fr', padding: '1rem', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', background: 'rgba(255,255,255,0.05)' }}>
                    <span>ID</span>
                    <span>TIMESTAMP</span>
                    <span>RISK</span>
                    <span>CONFIDENCE</span>
                    <span>CRACKS</span>
                    <span>SOURCE</span>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}

                    {!loading && filteredLogs.map(log => (
                        <div key={log.id} style={{
                            display: 'grid', gridTemplateColumns: '0.5fr 2fr 1fr 1fr 1fr 1fr', padding: '1rem',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            color: log.risk_level === 'HIGH' ? 'var(--neon-red)' : 'inherit'
                        }}>
                            <span>#{log.id}</span>
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span style={{ fontWeight: 'bold' }}>{log.risk_level}</span>
                            <span>{(log.max_confidence * 100).toFixed(1)}%</span>
                            <span>{log.crack_count}</span>
                            <span>{log.source || 'Upload'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HistoryLogs;
