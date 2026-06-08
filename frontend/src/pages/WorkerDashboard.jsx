import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FaUser, FaBriefcase, FaHeartbeat, FaExclamationTriangle,
    FaSignOutAlt, FaMapMarkedAlt, FaBell, FaPhone, FaClock, FaCalendarAlt, FaBatteryFull
} from 'react-icons/fa';
import MineMap from './MineMap'; // Reusing the MineMap component
import { useWebSocket } from '../context/WebSocketContext';

// Helper to determine risk color
const getRiskColor = (level) => {
    switch (level?.toUpperCase()) {
        case 'HIGH': return 'var(--neon-red)';
        case 'MEDIUM': return 'var(--neon-yellow)';
        case 'LOW': return 'var(--neon-green)';
        default: return '#666';
    }
};

const WorkerDashboard = () => {
    const navigate = useNavigate();
    const [worker, setWorker] = useState(null);
    const [alert, setAlert] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { alerts, workerLocations } = useWebSocket();

    const userId = localStorage.getItem('userId');

    useEffect(() => {
        if (!userId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Worker Profile
                const profileRes = await fetch(`http://localhost:8000/workers/me?user_id=${userId}`);
                if (!profileRes.ok) throw new Error("Failed to load profile");
                const profileData = await profileRes.json();
                setWorker(profileData);

                // Fetch Latest Finalized Alert (Risk Status)
                const alertRes = await fetch(`http://localhost:8000/workers/dashboard/alert`);
                if (alertRes.ok) {
                    const alertData = await alertRes.json();
                    setAlert(alertData);
                }

                setLoading(false);
            } catch (e) {
                console.error("Dashboard Load Error:", e);
                setError(e.message);
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // 5s fallback polling
        return () => clearInterval(interval);
    }, [userId, navigate]);

    // Override alert with live WebSocket alert if available
    useEffect(() => {
        if (alerts.length > 0) {
            const latestAlert = alerts[0];
            setAlert({
                alert_type: latestAlert.command || "SYSTEM ALARM",
                severity: latestAlert.risk_level,
                message: "Emergency Protocol Triggered",
                area_id: latestAlert.zone,
                created_at: latestAlert.timestamp || new Date().toISOString()
            });
        }
    }, [alerts]);

    const liveTelemetry = worker ? workerLocations[worker.user_id] : null;

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    if (loading) return <div style={{ color: 'white', padding: '2rem', textAlign: 'center' }}>Loading Your Dashboard...</div>;
    if (error) return <div style={{ color: 'red', padding: '2rem', textAlign: 'center' }}>Error: {error} <br /><button onClick={() => navigate('/login')} style={{ marginTop: '1rem', padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: '4px' }}>Back to Login</button></div>;
    if (!worker) return null;

    return (
        <div style={{
            minHeight: '100vh',
            background: '#050505',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            padding: '2rem',
            maxWidth: '1200px',
            margin: '0 auto'
        }}>
            {/* Header */}
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Placeholder Photo */}
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', border: '2px solid var(--neon-cyan)' }}>
                        {worker.photo_url ? <img src={worker.photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <FaUser size={30} color="#888" />}
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--neon-cyan)' }}>
                            {worker.name}
                        </h1>
                        <p style={{ margin: '5px 0 0', color: '#aaa', fontSize: '0.9rem' }}>ID: {worker.user_id}</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'rgba(255, 50, 50, 0.1)',
                        border: '1px solid var(--neon-red)',
                        color: 'var(--neon-red)',
                        padding: '10px 20px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease'
                    }}
                >
                    <FaSignOutAlt /> Logout
                </button>
            </header>

            {/* Warning Banner (If HIGH risk) */}
            {alert && alert.severity === 'HIGH' && (
                <div style={{
                    background: 'rgba(255, 0, 0, 0.2)',
                    border: '2px solid var(--neon-red)',
                    padding: '1.5rem',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    marginBottom: '2rem',
                    animation: 'pulse 1.5s infinite'
                }}>
                    <FaExclamationTriangle size={48} color="var(--neon-red)" />
                    <div>
                        <h2 style={{ margin: 0, color: 'var(--neon-red)', textTransform: 'uppercase' }}>⚠ HIGH RISK ALERT: {alert.alert_type}</h2>
                        <p style={{ margin: '5px 0 0', fontSize: '1.1rem' }}>{alert.message} in {alert.area_id}</p>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>

                {/* 1. Profile Information */}
                <div className="glass-panel" style={cardStyle}>
                    <h3 style={headerStyle}><FaUser color="var(--neon-blue)" /> Profile Information</h3>
                    <div style={gridStyle}>
                        <span>Assigned Area:</span> <strong>{worker.assigned_zone}</strong>
                        <span>Contact:</span> <strong>{worker.contact_info || "N/A"}</strong>
                        {liveTelemetry && (
                            <>
                                <span>Wearable Status:</span> <strong style={{ color: 'var(--neon-green)' }}>{liveTelemetry.status}</strong>
                                <span>Battery:</span> <strong style={{ color: liveTelemetry.battery > 20 ? 'var(--neon-green)' : 'var(--neon-red)' }}><FaBatteryFull /> {liveTelemetry.battery}%</strong>
                            </>
                        )}
                    </div>
                </div>

                {/* 2. Shift Details */}
                <div className="glass-panel" style={cardStyle}>
                    <h3 style={headerStyle}><FaClock color="var(--neon-yellow)" /> Shift Details</h3>
                    <div style={gridStyle}>
                        <span>Current Shift:</span> <strong style={{ color: 'var(--neon-yellow)' }}>{worker.shift}</strong>
                        <span>Status:</span> <strong>{worker.is_onsite === "Yes" ? "On Duty" : "Off Duty"}</strong>
                        <span>Time:</span> <span>{worker.shift_start || "--:--"} to {worker.shift_end || "--:--"}</span>
                        <span>Next Shift:</span> <span>{worker.next_shift || "N/A"}</span>
                    </div>
                </div>

                {/* 3. Health Information */}
                <div className="glass-panel" style={cardStyle}>
                    <h3 style={headerStyle}><FaHeartbeat color="var(--neon-purple)" /> Health Information</h3>
                    <div style={gridStyle}>
                        <span>Status:</span>
                        <strong style={{ color: worker.fitness_status === 'Fit' ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                            {worker.fitness_status}
                        </strong>
                        <span>Blood Group:</span> <strong>{worker.blood_group || "--"}</strong>
                        <span>Emergency:</span> <strong>{worker.emergency_contact || "N/A"}</strong>
                        <span>Condition:</span> <span>{worker.medical_condition || "None"}</span>
                    </div>
                </div>

                {/* 4. Current Risk Status */}
                <div className="glass-panel" style={cardStyle}>
                    <h3 style={headerStyle}><FaExclamationTriangle color="var(--neon-orange)" /> Current Risk Level</h3>
                    {alert ? (
                        <div style={{ textAlign: 'center', padding: '10px' }}>
                            <div style={{
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                color: getRiskColor(alert.severity),
                                marginBottom: '5px'
                            }}>
                                {alert.severity}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
                                Area: {alert.area_id}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '5px' }}>
                                {new Date(alert.created_at).toLocaleString()}
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--neon-green)' }}>
                            <h3>LOW RISK</h3>
                            <p>No active alerts in your zone.</p>
                        </div>
                    )}
                </div>

                {/* 5. Alert Notification Panel */}
                <div className="glass-panel" style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                    <h3 style={headerStyle}><FaBell color="var(--neon-red)" /> Recent Alerts</h3>
                    {alert ? (
                        <div style={{
                            padding: '15px',
                            borderLeft: `4px solid ${getRiskColor(alert.severity)}`,
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '4px' }}>{alert.message}</strong>
                                <span style={{ color: '#aaa' }}>{alert.area_id}</span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <span style={{
                                    background: getRiskColor(alert.severity),
                                    color: '#000',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    fontWeight: 'bold'
                                }}>
                                    {alert.severity}
                                </span>
                                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '4px' }}>
                                    {new Date(alert.created_at).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p style={{ color: '#888', fontStyle: 'italic', padding: '10px' }}>No recent alerts to display.</p>
                    )}
                </div>

                {/* 6. 3D Map View */}
                <div className="glass-panel" style={{ ...cardStyle, gridColumn: '1 / -1', padding: 0, overflow: 'hidden', height: '400px', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: '5px 10px', borderRadius: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <FaMapMarkedAlt color="var(--neon-cyan)" /> <span style={{ fontWeight: 'bold' }}>Live Worker Tracking</span>
                    </div>
                    {/* Render the unified MineMap component but we can customize props if needed later */}
                    <MineMap />
                </div>

            </div>

            {/* 7. Account Footer */}
            <div style={{ marginTop: '3rem', borderTop: '1px solid #333', paddingTop: '1rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                <p>Logged in as {worker.name} ({worker.user_id}) • <a href="#" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>Change Password</a></p>
                <p>&copy; 2026 RockSense Safety Systems</p>
            </div>

            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4); }
                    70% { box-shadow: 0 0 0 15px rgba(255, 0, 0, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(255, 0, 0, 0); }
                }
                .glass-panel {
                    background: rgba(20, 20, 20, 0.6);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .glass-panel:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                    border-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
};

const cardStyle = {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
};

const headerStyle = {
    margin: 0,
    fontSize: '1.1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#ddd',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    paddingBottom: '0.5rem'
};

const gridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1.5fr',
    gap: '8px',
    fontSize: '0.95rem',
    color: '#ccc'
};

export default WorkerDashboard;
