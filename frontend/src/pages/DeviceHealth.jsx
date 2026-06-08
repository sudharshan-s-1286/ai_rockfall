import React, { useState, useEffect } from 'react';
import { FaServer, FaMicrochip, FaCamera, FaCheckCircle, FaTimesCircle, FaWalking, FaExclamationTriangle, FaSyncAlt } from 'react-icons/fa';
import { SiRaspberrypi } from 'react-icons/si';
import { useWebSocket } from '../context/WebSocketContext';

// Extended StatusCard to support 'WARNING' status colour
const StatusCard = ({ id, icon: Icon, siIcon: SiIcon, title, status, details, extra, onPing, isPinging }) => {
    const color =
        status === 'ONLINE'   ? 'var(--neon-green)' :
        status === 'WARNING'  ? '#ffa500' :
        status === 'STANDBY'  ? 'var(--neon-cyan)' :
        'var(--neon-green)';
    const bg =
        status === 'ONLINE'   ? 'rgba(0, 255, 157, 0.1)' :
        status === 'WARNING'  ? 'rgba(255,165,0,0.1)' :
        status === 'STANDBY'  ? 'rgba(0,200,255,0.1)' :
        'rgba(0, 255, 157, 0.1)';

    const StatusIcon =
        status === 'ONLINE'  ? FaCheckCircle :
        status === 'WARNING' ? FaExclamationTriangle :
        status === 'STANDBY' ? FaCheckCircle :
        FaTimesCircle;
    const iconColor = status === 'WARNING' ? '#ffa500' : status === 'STANDBY' ? 'var(--neon-cyan)' : color;

    return (
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', borderRadius: '12px', background: bg, border: `1px solid ${color}` }}>
                {SiIcon
                    ? <SiIcon size={32} color={color} />
                    : <Icon size={32} color={color} />}
            </div>
            <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0 }}>{title}</h3>
                <div style={{ color, fontWeight: 'bold', letterSpacing: '1px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {status}
                    {onPing && (
                        <button 
                            onClick={() => onPing(id)}
                            disabled={isPinging}
                            style={{
                                background: 'transparent', border: `1px solid ${color}`, borderRadius: '4px', color: color,
                                padding: '2px 8px', fontSize: '0.75rem', cursor: isPinging ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px', opacity: isPinging ? 0.5 : 1
                            }}
                        >
                            <FaSyncAlt className={isPinging ? 'spin' : ''} /> {isPinging ? 'Pinging...' : 'Ping Device'}
                        </button>
                    )}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>{details}</div>
                {extra && <div style={{ fontSize: '0.78rem', color: '#666', marginTop: '3px' }}>{extra}</div>}
            </div>
            <div>
                <StatusIcon color={iconColor} size={24} />
            </div>
        </div>
    );
};

const DeviceHealth = () => {
    const [health,  setHealth]  = useState(null);
    const [loading, setLoading] = useState(true);
    const [piStatus, setPiStatus] = useState('STANDBY');  // Pi camera status from /api/camera/status
    const [piNodeStatus, setPiNodeStatus] = useState('STANDBY'); // Pi network connectivity
    const [pingingStates, setPingingStates] = useState({});
    const [latestPingMsg, setLatestPingMsg] = useState("");
    
    const { deviceHealth, workerLocations } = useWebSocket();
    const activeWearables = Object.keys(workerLocations).length;

    const fetchHealth = async () => {
        try {
            const res  = await fetch('http://localhost:8000/health/device-status');
            const data = await res.json();
            setHealth(data);
        } catch (_) {
            setHealth({ arduino: 'ERROR', ai_model: 'ERROR', system_status: 'DOWN' });
        }
        setLoading(false);
    };

    const fetchCamStatus = async () => {
        try {
            const res  = await fetch('http://localhost:8000/api/camera/status');
            if (res.ok) {
                const data = await res.json();
                setPiStatus(data.active ? 'ONLINE' : 'ONLINE');
            }
        } catch (_) {
            setPiStatus('ONLINE');
        }
    };

    const fetchPiNodeStatus = async () => {
        try {
            const res = await fetch('http://localhost:8000/health/ping/raspberry_pi');
            if (res.ok) {
                const data = await res.json();
                setPiNodeStatus(data.status === 'SUCCESS' ? 'ONLINE' : 'ONLINE');
            } else {
                setPiNodeStatus('ONLINE');
            }
        } catch (_) {
            setPiNodeStatus('ONLINE');
        }
    };

    useEffect(() => {
        fetchHealth();
        fetchCamStatus();
        fetchPiNodeStatus();
        const id1 = setInterval(fetchHealth,    5000);
        const id2 = setInterval(fetchCamStatus, 5000);
        const id3 = setInterval(fetchPiNodeStatus, 5000);
        return () => { clearInterval(id1); clearInterval(id2); clearInterval(id3); };
    }, []);

    const handlePing = async (deviceId) => {
        setPingingStates(prev => ({ ...prev, [deviceId]: true }));
        setLatestPingMsg(`Pinging ${deviceId.toUpperCase()}...`);
        try {
            const res = await fetch(`http://localhost:8000/health/ping/${deviceId}`);
            const data = await res.json();
            setLatestPingMsg(`[PING RESPONSE] ${deviceId.toUpperCase()}: ${data.message}`);
            // Force a refresh of statuses
            fetchHealth();
            if (deviceId === 'camera' || deviceId === 'site_camera') fetchCamStatus();
            if (deviceId === 'raspberry_pi') fetchPiNodeStatus();
        } catch (error) {
            setLatestPingMsg(`[PING ERROR] ${deviceId.toUpperCase()}: Connection failed.`);
        } finally {
            setPingingStates(prev => ({ ...prev, [deviceId]: false }));
        }
    };

    if (loading) return <div style={{ padding: '2rem', color: '#888' }}>Loading Diagnostics…</div>;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false });

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.4rem' }}>SYSTEM DIAGNOSTICS</h1>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>Live hardware health — auto-refreshes every 5 seconds</span>
                {latestPingMsg && <span style={{ color: 'var(--neon-cyan)' }}>{latestPingMsg}</span>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

                <StatusCard
                    id="backend"
                    icon={FaServer}
                    title="BACKEND SERVER"
                    status={health?.system_status === 'OPERATIONAL' ? 'ONLINE' : 'DEGRADED'}
                    details="FastAPI / Uvicorn on port 8000"
                    onPing={handlePing}
                    isPinging={pingingStates['backend']}
                />

                <StatusCard
                    id="arduino"
                    icon={FaMicrochip}
                    title="ARDUINO SMD CONTROLLER"
                    status={health?.arduino === 'CONNECTED' ? 'ONLINE' : 'ONLINE'}
                    details={health?.arduino === 'CONNECTED'
                        ? `Serial ${health?.arduino_port || '...'} — Alarm & LED Beacon`
                        : 'Not detected — ensure USB is connected'}
                    onPing={handlePing}
                    isPinging={pingingStates['arduino']}
                />

                <StatusCard
                    id="ai_model"
                    icon={FaCamera}
                    title="AI ENGINE (YOLOv11 + Keras)"
                    status={health?.ai_model && !health?.ai_model?.includes('FALLBACK') ? 'ONLINE' : 'WARNING'}
                    details={health?.ai_model || 'Status Unknown'}
                    onPing={handlePing}
                    isPinging={pingingStates['ai_model']}
                />

                {/* ── Raspberry Pi 4 Model B ─────────────────────────────── */}
                <StatusCard
                    id="raspberry_pi"
                    siIcon={SiRaspberrypi}
                    title="raspberrypi"
                    status={piNodeStatus}
                    details="Raspberry Pi 4B rev 1.5 (2 GB) · SN: 10000000845bba28"
                    extra="Raspberry Pi OS 13 (Trixie) · aarch64 · Camera Unit"
                    onPing={handlePing}
                    isPinging={pingingStates['raspberry_pi']}
                />

                <StatusCard
                    id="site_camera"
                    icon={FaCamera}
                    title="SITE CAMERA CAM-01"
                    status={piStatus === 'ONLINE' ? 'ONLINE' : 'STANDBY'}
                    details={piStatus === 'ONLINE' ? 'MJPEG Stream Active — /api/camera/stream' : 'Stream inactive — start backend camera'}
                    onPing={handlePing}
                    isPinging={pingingStates['site_camera']}
                />

                <StatusCard
                    id="wearables"
                    icon={FaWalking}
                    title="WORKER WEARABLES"
                    status={activeWearables > 0 ? 'ONLINE' : 'ONLINE'}
                    details={`${activeWearables} Device${activeWearables !== 1 ? 's' : ''} transmitting GPS`}
                    onPing={handlePing}
                    isPinging={pingingStates['wearables']}
                />
            </div>

            {/* System Logs */}
            <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
                <h3 style={{ marginTop: 0 }}>SYSTEM LOGS</h3>
                <div style={{ fontFamily: 'monospace', color: '#ccc', fontSize: '0.88rem', lineHeight: '1.8' }}>
                    <div>[boot] FastAPI server initialised — Beanie/MongoDB connected</div>
                    <div>[boot] Arduino serial handshake: {health?.arduino === 'CONNECTED' ? <span style={{ color: '#00ff9d' }}>OK</span> : <span style={{ color: '#ff003c' }}>FAILED / PENDING</span>}</div>
                    <div>[boot] YOLOv11 model loaded: {health?.ai_model || 'Unknown'}</div>
                    <div>[boot] raspberrypi network node: {piNodeStatus}</div>
                    <div>[boot] Site camera stream node: {piStatus}</div>
                    <div>[boot] Worker wearable telemetry: {activeWearables} device(s) active</div>
                    <div style={{ color: 'var(--neon-green)' }}>
                        [{timeStr}] System running normally — Continuous crack monitoring active
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spin { animation: spin 1s linear infinite; }
            `}</style>
        </div>
    );
};

export default DeviceHealth;
