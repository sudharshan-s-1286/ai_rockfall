import React, { useState, useEffect } from 'react';
import { FaServer, FaMicrochip, FaCamera, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const StatusCard = ({ icon: Icon, title, status, details }) => (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{
            padding: '1rem', borderRadius: '12px',
            background: status === 'ONLINE' ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 0, 60, 0.1)',
            border: `1px solid ${status === 'ONLINE' ? 'var(--neon-green)' : 'var(--neon-red)'}`
        }}>
            <Icon size={32} color={status === 'ONLINE' ? 'var(--neon-green)' : 'var(--neon-red)'} />
        </div>
        <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>{title}</h3>
            <div style={{
                color: status === 'ONLINE' ? 'var(--neon-green)' : 'var(--neon-red)',
                fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px'
            }}>
                {status}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>{details}</div>
        </div>
        <div>
            {status === 'ONLINE' ? <FaCheckCircle color="var(--neon-green)" size={24} /> : <FaTimesCircle color="var(--neon-red)" size={24} />}
        </div>
    </div>
);

const DeviceHealth = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHealth = async () => {
            try {
                const res = await fetch('http://localhost:8000/health/device-status');
                const data = await res.json();
                setHealth(data);
            } catch (e) {
                setHealth({ arduino: 'ERROR', ai_model: 'ERROR', system_status: 'DOWN' });
            }
            setLoading(false);
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div style={{ padding: '2rem' }}>Loading Diagnostics...</div>;

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem' }}>SYSTEM DIAGNOSTICS</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
                <StatusCard
                    icon={FaServer}
                    title="BACKEND SERVER"
                    status={health?.system_status === 'OPERATIONAL' ? 'ONLINE' : 'DEGRADED'}
                    details="FastAPI / Uvicorn Running"
                />

                <StatusCard
                    icon={FaMicrochip}
                    title="ARDUINO CONTROLLER"
                    status={health?.arduino === 'CONNECTED' ? 'ONLINE' : 'OFFLINE'}
                    details="Serial Port COM7"
                />

                <StatusCard
                    icon={FaCamera}
                    title="AI ENGINE (YOLO+KERAS)"
                    status={(!health?.ai_model.includes('FALLBACK')) ? 'ONLINE' : 'WARNING'}
                    details={health?.ai_model}
                />

                <StatusCard
                    icon={FaCamera}
                    title="SITE CAMERA 01"
                    status="ONLINE"
                    details="RTSP Stream Active (Simulated)"
                />
            </div>

            <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <h3>SYSTEM LOGS</h3>
                <div style={{ fontFamily: 'monospace', color: '#ccc', fontSize: '0.9rem' }}>
                    <div>[10:00:01] System Boot Sequence Initiated...</div>
                    <div>[10:00:05] Hardware Check: Arduino OK</div>
                    <div>[10:00:15] AI Model loaded: Keras V2 (Robust Mode)</div>
                    <div>[10:00:16] Server Ready on Port 8000</div>
                    <div style={{ color: 'var(--neon-green)' }}>[Current] System running normally. Monitoring active.</div>
                </div>
            </div>
        </div>
    );
};

export default DeviceHealth;
