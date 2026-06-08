import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    FaVideo, FaCircle, FaShieldAlt, FaExclamationTriangle,
    FaUsers, FaHeartbeat, FaClipboardList, FaClock,
    FaCheckCircle, FaSearch, FaBan, FaLaptop
} from 'react-icons/fa';

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000/ws';

// ─────────────────────────────────────────────────────────────────────────────
const LiveCamera = () => {
    // ── Refs ────────────────────────────────────────────────────────────────
    const laptopVideoRef = useRef(null);
    const laptopCanvasRef = useRef(null);
    const laptopOverlayRef = useRef(null);
    
    const piImgRef = useRef(null);
    const piOverlayRef = useRef(null);

    // ── Global Controls ─────────────────────────────────────────────────────
    const [systemOn, setSystemOn] = useState(false);
    const [alertActive, setAlertActive] = useState(false);

    // ── Laptop Feed State ───────────────────────────────────────────────────
    const [laptopStatus, setLaptopStatus] = useState("IDLE");
    const [laptopDetections, setLaptopDetections] = useState([]);
    const [laptopConfirmed, setLaptopConfirmed] = useState(false);
    const [laptopCountdown, setLaptopCountdown] = useState(15);
    const [laptopHealth, setLaptopHealth] = useState("OFFLINE");

    // ── Pi Feed State ───────────────────────────────────────────────────────
    const [piStatus, setPiStatus] = useState("IDLE");
    const [piDetections, setPiDetections] = useState([]);
    const [piConfirmed, setPiConfirmed] = useState(false);
    const [piCountdown, setPiCountdown] = useState(15);
    const [piHealth, setPiHealth] = useState("OFFLINE");
    const [piFrame, setPiFrame] = useState(null);

    // ── Polled Data ────────────────────────────────────────────────────────
    const [sysHealth, setSysHealth] = useState({ arduino: 'UNKNOWN' });
    const [workers, setWorkers] = useState(0);
    const [logs, setLogs] = useState([]);

    // ── WebSockets ──────────────────────────────────────────────────────────
    const laptopWs = useRef(null);
    const piWs = useRef(null);

    // ── Side-panel polled fetches ───────────────────────────────────────────
    useEffect(() => {
        const poll = async () => {
            try {
                const [h, w, l] = await Promise.all([
                    fetch(`${API_BASE}/health/device-status`),
                    fetch(`${API_BASE}/admin/users`),
                    fetch(`${API_BASE}/api/pi-stream/detections`),
                ]);
                if (h.ok) setSysHealth(await h.json());
                if (w.ok) { const ws = await w.json(); setWorkers(ws.filter(x => x.is_onsite === 'Yes').length); }
                if (l.ok) setLogs(await l.json());
            } catch (_) {}
        };
        poll();
        const id = setInterval(poll, 5000);
        return () => clearInterval(id);
    }, []);

    // ── Laptop Camera Capture & Streaming ──────────────────────────────────
    useEffect(() => {
        if (!systemOn) {
            if (laptopWs.current) {
                laptopWs.current.close();
                laptopWs.current = null;
            }
            if (laptopVideoRef.current?.srcObject) {
                laptopVideoRef.current.srcObject.getTracks().forEach(t => t.stop());
            }
            setLaptopHealth("OFFLINE");
            return;
        }

        // Initialize Laptop Camera
        navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
            .then(stream => {
                if (laptopVideoRef.current) {
                    laptopVideoRef.current.srcObject = stream;
                    setLaptopHealth("ONLINE");
                }
            }).catch(err => {
                console.error("Laptop camera access failed:", err);
                setLaptopHealth("ERROR");
            });

        // Initialize Laptop WebSocket
        laptopWs.current = new WebSocket(`${WS_BASE}/laptop-frame`);
        laptopWs.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'laptop_frame_result') {
                setLaptopDetections(data.detections || []);
                setLaptopStatus(data.status);
                setLaptopConfirmed(data.confirmed);
                setLaptopCountdown(data.countdown);
                if (data.confirmed && data.status === "CRACK_CONFIRMED") {
                    setAlertActive(true);
                }
            }
        };

        // Capture loop
        const captureInterval = setInterval(() => {
            if (laptopWs.current?.readyState === WebSocket.OPEN && laptopVideoRef.current) {
                const canvas = laptopCanvasRef.current;
                const video = laptopVideoRef.current;
                if (!canvas || !video || video.paused || video.ended) return;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
                laptopWs.current.send(JSON.stringify({
                    type: "frame",
                    frame: base64,
                    timestamp: new Date().toISOString()
                }));
            }
        }, 500); // 2 FPS for AI logic

        return () => clearInterval(captureInterval);
    }, [systemOn]);

    // ── Pi Stream WebSocket ───────────────────────────────────────────────
    useEffect(() => {
        if (!systemOn) {
            if (piWs.current) {
                piWs.current.close();
                piWs.current = null;
            }
            setPiHealth("OFFLINE");
            return;
        }

        piWs.current = new WebSocket(`${WS_BASE}/live-feed`);
        piWs.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'status') {
                setPiHealth(data.pi_online ? "ONLINE" : "OFFLINE");
            } else if (data.type === 'pi_frame') {
                setPiFrame(`data:image/jpeg;base64,${data.frame}`);
                setPiDetections(data.detections || []);
                setPiStatus(data.status);
                setPiConfirmed(data.confirmed);
                setPiCountdown(data.countdown);
                if (data.confirmed && data.status === "CRACK_CONFIRMED") {
                    setAlertActive(true);
                }
            } else if (data.type === 'pi_disconnected') {
                setPiHealth("OFFLINE");
                setPiFrame(null);
            }
        };

        return () => {
            if (piWs.current) piWs.current.close();
        };
    }, [systemOn]);

    // ── Rendering Overlays ────────────────────────────────────────────────
    useEffect(() => {
        const draw = (canvas, detections, confirmed, status) => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (!detections || detections.length === 0) return;

            detections.forEach(det => {
                const [x1, y1, x2, y2] = det.bbox;
                const severity = det.severity || "LOW";
                const color = severity === "HIGH" ? "#ff003c" : severity === "MEDIUM" ? "#ffa500" : "#00ff9d";
                
                // Draw Box
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(x1, y1, x2-x1, y2-y1);
                
                // Draw Label
                if (confirmed) {
                    ctx.fillStyle = color;
                    ctx.fillRect(x1, y1 - 25, 180, 25);
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 12px Inter";
                    ctx.fillText(`VERIFIED CRACK — ${severity}`, x1 + 5, y1 - 8);
                }
            });
        };

        draw(laptopOverlayRef.current, laptopDetections, laptopConfirmed, laptopStatus);
        draw(piOverlayRef.current, piDetections, piConfirmed, piStatus);
    }, [laptopDetections, laptopConfirmed, piDetections, piConfirmed]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0a0a0c', color: '#fff', padding: '1rem' }}>
            
            {/* ALERT BANNER */}
            {alertActive && (
                <div style={{ padding: '1rem', background: 'rgba(255,0,60,0.2)', border: '2px solid #ff003c', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'pulse 1.5s infinite' }}>
                    <FaExclamationTriangle size={24} color="#ff003c" />
                    <strong style={{ fontSize: '1.1rem' }}>EMERGENCY ALERT: Verified Geological Instability Detected!</strong>
                    <button onClick={() => setAlertActive(false)} style={{ marginLeft: 'auto', background: '#ff003c', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>
                        DISMISS
                    </button>
                </div>
            )}

            {/* HEADER */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FaShieldAlt size={24} color="var(--neon-cyan)" />
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>RockSense Command Center</h2>
                        <span style={{ fontSize: '0.8rem', color: '#888' }}>Dual-Feed AI Monitoring System v2.0</span>
                    </div>
                </div>
                <button 
                    onClick={() => setSystemOn(!systemOn)}
                    className={systemOn ? "btn-danger" : "btn-primary"}
                    style={{ padding: '0.8rem 2rem', fontSize: '1rem', fontWeight: 'bold' }}
                >
                    {systemOn ? "SHUTDOWN SYSTEM" : "INITIALIZE MONITORING"}
                </button>
            </div>

            {/* MAIN MONITORING AREA */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>
                
                {/* SCREEN 1: LAPTOP */}
                <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
                    <div style={{ padding: '8px 15px', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                            <FaLaptop /> LAPTOP CAMERA FEED
                        </span>
                        <span style={{ fontSize: '0.8rem', color: laptopHealth === "ONLINE" ? "#00ff9d" : "#ff003c" }}>
                            ● {laptopHealth}
                        </span>
                    </div>
                    
                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video ref={laptopVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <canvas ref={laptopOverlayRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        
                        {/* Status Overlay */}
                        {laptopStatus.includes("VERIFYING") && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffa500' }}>{laptopCountdown}s</div>
                                <div style={{ background: '#ffa500', color: '#000', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>VERIFYING...</div>
                            </div>
                        )}
                        {laptopConfirmed && (
                            <div style={{ position: 'absolute', top: 20, right: 20, background: '#ff003c', color: '#fff', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 0 15px #ff003c' }}>
                                VERIFIED CRACK
                            </div>
                        )}
                    </div>
                </div>

                {/* SCREEN 2: RASPBERRY PI */}
                <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
                    <div style={{ padding: '8px 15px', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                            <FaVideo /> RASPBERRY PI FEED
                        </span>
                        <span style={{ fontSize: '0.8rem', color: piHealth === "ONLINE" ? "#00ff9d" : "#ff003c" }}>
                            ● {piHealth}
                        </span>
                    </div>

                    <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {piFrame ? (
                            <img src={piFrame} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Pi Stream" />
                        ) : (
                            <div style={{ color: '#333', textAlign: 'center' }}>
                                <FaVideo size={48} />
                                <div style={{ marginTop: '10px' }}>WAITING FOR PI...</div>
                            </div>
                        )}
                        <canvas ref={piOverlayRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        
                        {/* Status Overlay */}
                        {piStatus.includes("VERIFYING") && (
                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ffa500' }}>{piCountdown}s</div>
                                <div style={{ background: '#ffa500', color: '#000', padding: '4px 10px', borderRadius: '4px', fontWeight: 'bold' }}>VERIFYING...</div>
                            </div>
                        )}
                        {piConfirmed && (
                            <div style={{ position: 'absolute', top: 20, right: 20, background: '#ff003c', color: '#fff', padding: '8px 15px', borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 0 15px #ff003c' }}>
                                VERIFIED CRACK
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* SYSTEM STATS FOOTER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem' }}>
                <StatCard icon={<FaHeartbeat color="#00ff9d" />} label="Arduino Status" val={sysHealth.arduino === 'CONNECTED' ? "ONLINE" : "OFFLINE"} />
                <StatCard icon={<FaUsers color="var(--neon-cyan)" />} label="Personnel On-Site" val={workers} />
                <StatCard icon={<FaClipboardList color="#ffa500" />} label="Recent Alerts" val={logs.length} />
                <StatCard icon={<FaClock color="#888" />} label="Last Verification" val={logs[0] ? new Date(logs[0].timestamp).toLocaleTimeString() : "--:--"} />
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={laptopCanvasRef} width={640} height={480} style={{ display: 'none' }} />

            <style>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.6; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

const StatCard = ({ icon, label, val }) => (
    <div className="glass-panel" style={{ padding: '0.8rem', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '8px' }}>{icon}</div>
        <div>
            <div style={{ fontSize: '0.75rem', color: '#888' }}>{label}</div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>{val}</div>
        </div>
    </div>
);

export default LiveCamera;
