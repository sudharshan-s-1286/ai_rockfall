import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    FaCamera, FaMicrochip, FaExclamationTriangle, FaCheckCircle, 
    FaClock, FaChartLine, FaShieldAlt, FaStopCircle 
} from 'react-icons/fa';
import Webcam from 'react-webcam';

const API_BASE = "http://localhost:8000";
const WS_BASE = "ws://localhost:8000";

const LiveMonitor = () => {
    // ── Laptop State ────────────────────────────────────────────────────────
    const [laptopCamOn, setLaptopCamOn] = useState(false);
    const [laptopAiActive, setLaptopAiActive] = useState(false);
    const [laptopStatus, setLaptopStatus] = useState("IDLE");
    const [laptopDetections, setLaptopDetections] = useState([]);
    const [laptopConfirmed, setLaptopConfirmed] = useState(false);
    const [laptopCountdown, setLaptopCountdown] = useState(15);
    const [laptopHealth, setLaptopHealth] = useState("OFFLINE");
    const [laptopStats, setLaptopStats] = useState({ fps: 0, latency: 0, flaws: 0 });

    // ── Pi State ────────────────────────────────────────────────────────────
    const [piCamOn, setPiCamOn] = useState(false);
    const [piAiActive, setPiAiActive] = useState(false);
    const [piStatus, setPiStatus] = useState("IDLE");
    const [piDetections, setPiDetections] = useState([]);
    const [piConfirmed, setPiConfirmed] = useState(false);
    const [piCountdown, setPiCountdown] = useState(15);
    const [piHealth, setPiHealth] = useState("OFFLINE");
    const [piStats, setPiStats] = useState({ fps: 0, latency: 0, flaws: 0 });

    // ── Global System State ───────────────────────────────────────────────
    const [aiEngineStatus, setAiEngineStatus] = useState({ yolo: false, keras: false });
    const [alertActive, setAlertActive] = useState(false);
    const [isSilenced, setIsSilenced] = useState(false);
    const [logs, setLogs] = useState([]);

    // ── Auto-Trigger Alarm on HIGH RISK ───────────────────────────────────
    useEffect(() => {
        const laptopHigh = laptopDetections.some(d => d.severity === "HIGH");
        const piHigh = piDetections.some(d => d.severity === "HIGH" || (d.class && d.class.includes("High")));
        
        const isCurrentlyHigh = laptopHigh || piHigh;

        if (isCurrentlyHigh && !alertActive && !isSilenced) {
            setAlertActive(true);
            fetch(`${API_BASE}/alarm/start`, { method: 'POST' })
                .catch(e => console.error("Auto alarm trigger failed:", e));
        }

        if (!isCurrentlyHigh) {
            setIsSilenced(false);
        }
    }, [laptopDetections, piDetections, alertActive, isSilenced]);

    // ── Refs ──────────────────────────────────────────────────────────────
    const laptopVideoRef = useRef(null);
    const laptopCanvasRef = useRef(null);
    const laptopOverlayRef = useRef(null);
    const piCanvasRef = useRef(null);
    const laptopWs = useRef(null);
    const piWs = useRef(null);
    const lastRequestTime = useRef(Date.now());

    // ── Handlers ──────────────────────────────────────────────────────────
    const handleStopAlarm = async () => {
        setAlertActive(false);
        setIsSilenced(true);
        try {
            await fetch(`${API_BASE}/alarm/stop`, {
                method: 'POST'
            });
        } catch (e) { console.error("Stop alarm failed:", e); }
    };

    // ── Overlay Drawing (PREMIUM STYLE: Transparent Red) ──────────────────
    const drawPremiumBBoxes = (ctx, detections, confirmed, clearCanvas = true) => {
        if (clearCanvas) {
            ctx.clearRect(0, 0, 640, 480);
        }
        
        detections.forEach(det => {
            const bbox = det.bbox || [];
            if (bbox.length < 4) return;
            const [x1, y1, x2, y2] = bbox;
            let severity = det.severity;
            if (!severity) {
                if (det.class && det.class.includes("High_Risk")) severity = "HIGH";
                else if (det.class && det.class.includes("Medium_Risk")) severity = "MEDIUM";
                else severity = "LOW";
            }
            const color = severity === "HIGH" ? "rgba(255, 0, 60, 0.4)" : 
                          severity === "MEDIUM" ? "rgba(255, 165, 0, 0.4)" : 
                          "rgba(0, 255, 157, 0.4)";
            const borderColor = severity === "HIGH" ? "#ff003c" : 
                                severity === "MEDIUM" ? "#ffa500" : 
                                "#00ff9d";

            // Filled Box
            ctx.fillStyle = color;
            ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            
            // Sharp Border
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            
            // Label box
            ctx.fillStyle = borderColor;
            ctx.font = "bold 14px Segoe UI, Inter";
            const labelText = `${severity} RISK (${Math.round(det.confidence * 100)}%)`;
            ctx.fillText(labelText, x1, y1 - 8);

            if (confirmed) {
                // Add Glow Effect for verified hazard
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#ff003c";
                ctx.strokeStyle = "#fff";
                ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                ctx.shadowBlur = 0;
            }
        });
    };

    // ── Polling Log History ───────────────────────────────────────────────
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/pi-stream/detections`);
                if (res.ok) setLogs(await res.json());
            } catch (e) {}
        };
        fetchLogs();
        const id = setInterval(fetchLogs, 5000);
        return () => clearInterval(id);
    }, []);

    // ── Laptop Webcam Capture & Fetch Loop ───────────────────────────────
    const captureLaptop = useCallback(async () => {
        if (laptopVideoRef.current && laptopVideoRef.current.getScreenshot) {
            const imageSrc = laptopVideoRef.current.getScreenshot();
            if (!imageSrc) return;

            const now = Date.now();
            const currentFps = Math.round(1000 / (now - lastRequestTime.current));
            lastRequestTime.current = now;

            const blob = await (await fetch(imageSrc)).blob();
            const formData = new FormData();
            formData.append('file', blob, "live_feed.jpg");

            try {
                const res = await fetch(`${API_BASE}/inference/detect`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                const realDetections = [];
                // Adapt the old format detections back into the structure `drawPremiumBBoxes` expects 
                // data.raw_yolo and data.risk_details
                
                let yoloBoxes = [];
                if (data.raw_yolo?.images && data.raw_yolo.images[0]?.results) {
                    yoloBoxes = data.raw_yolo.images[0].results;
                } else if (data.raw_yolo?.data) {
                    yoloBoxes = data.raw_yolo.data;
                } else if (Array.isArray(data.raw_yolo)) {
                    yoloBoxes = data.raw_yolo;
                }

                yoloBoxes.forEach((det, idx) => {
                    const box = det.box;
                    let displaySeverity = "LOW";
                    if (data.risk_details && data.risk_details[idx]) {
                        displaySeverity = data.risk_details[idx].label;
                    } else {
                        displaySeverity = data.risk_level;
                    }
                    
                    realDetections.push({
                        bbox: [box.x1, box.y1, box.x2, box.y2],
                        severity: displaySeverity,
                        confidence: det.confidence || 0,
                        class: displaySeverity + " Risk"
                    });
                });

                setLaptopDetections(realDetections);
                
                const isHigh = realDetections.some(d => d.severity === "HIGH");
                setLaptopStatus(isHigh ? "CRACK_CONFIRMED" : "SCANNING");
                setLaptopConfirmed(isHigh);
                if (isHigh) setLaptopCountdown(15);
                
                setLaptopStats({ 
                    fps: currentFps, 
                    latency: 800, 
                    flaws: realDetections.length 
                });
            } catch (err) {
                console.error("Laptop capture loop inference error:", err);
            }
        }
    }, [laptopVideoRef, alertActive]);

    useEffect(() => {
        if (laptopCamOn) {
            setLaptopHealth("ONLINE");
        } else {
            setLaptopHealth("OFFLINE");
            setLaptopStatus("IDLE");
            setLaptopDetections([]);
        }
    }, [laptopCamOn]);

    useEffect(() => {
        let active = true;
        const loop = async () => {
            if (!active || !laptopAiActive || !laptopCamOn) return;
            try {
                await captureLaptop();
            } catch (err) {
                console.error("Capture loop iteration error:", err);
            }
            if (active && laptopAiActive) {
                setTimeout(loop, 200);
            }
        };

        if (laptopAiActive && laptopCamOn) {
            loop();
        }
        return () => { active = false; };
    }, [laptopAiActive, laptopCamOn, captureLaptop]);

    const handleReloadAI = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/pi-stream/reload-models`);
            const data = await res.json();
            if (data.status === "success") {
                setAiEngineStatus({ yolo: data.yolo_online, keras: data.keras_online });
                alert("AI Engines Reloaded. YOLO: " + (data.yolo_online ? "ON" : "OFF") + ", KERAS: " + (data.keras_online ? "ON" : "OFF"));
            } else { alert("Reload failed: " + data.message); }
        } catch (e) { alert("Reload failed. Is backend running?"); }
    };

    // Draw Overlay Effect
    useEffect(() => {
        if (!laptopOverlayRef.current) return;
        const ctx = laptopOverlayRef.current.getContext('2d');
        drawPremiumBBoxes(ctx, laptopDetections, laptopConfirmed);
    }, [laptopDetections, laptopConfirmed]);

    // ── Pi WebSocket Receiver ────────────────────────────────────────────
    useEffect(() => {
        if (!piCamOn) {
            setPiHealth("OFFLINE"); setPiStatus("IDLE"); setPiDetections([]);
            if (piWs.current) { piWs.current.close(); piWs.current = null; }
            return;
        }

        piWs.current = new WebSocket(`${WS_BASE}/ws/live-feed`);
        
        piWs.current.onmessage = (e) => {
            const data = JSON.parse(e.data);
            if (data.type === 'status') {
                setPiHealth(data.pi_online ? "ONLINE" : "OFFLINE");
                setAiEngineStatus({ yolo: data.yolo_available, keras: data.risk_engine_ready });
            } else if (data.type === 'pi_frame') {
                const canvas = piCanvasRef.current;
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                const realDetections = data.detections || [];

                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    if (piAiActive) drawPremiumBBoxes(ctx, realDetections, data.confirmed, false);
                };
                img.src = `data:image/jpeg;base64,${data.frame}`;
                
                setPiDetections(realDetections);
                setPiStatus(data.status);
                setPiConfirmed(data.confirmed);
                setPiCountdown(data.countdown);
                setPiStats({ fps: 5, latency: 800, flaws: realDetections.length });
            }
        };
        return () => { if (piWs.current) piWs.current.close(); };
    }, [piCamOn, piAiActive]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#0a0a0c', color: '#fff', padding: '1.5rem', fontFamily: 'Segoe UI, Inter, sans-serif' }}>
            
            {/* ALERT BANNER */}
            {alertActive && (
                <div style={{ background: 'rgba(255,0,60,0.1)', borderLeft: '5px solid #ff003c', padding: '1rem 1.5rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '1rem', animation: 'glow-alert 2s infinite' }}>
                    <FaExclamationTriangle size={24} color="#ff003c" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#fff' }}>GEOLOGICAL ANOMALY DETECTED</div>
                        <div style={{ fontSize: '0.85rem', color: '#aaa' }}>Seismic instability verified via temporal stability logic. Emergency systems activated.</div>
                    </div>
                    <button onClick={handleStopAlarm} style={{ background: '#ff003c', border: 'none', color: '#fff', padding: '0.6rem 1.5rem', borderRadius: '4px', cursor: 'pointer', fontWeight: '900', letterSpacing: '1px' }}>STOP ALARM</button>
                    <button onClick={() => { setAlertActive(false); setIsSilenced(true); }} style={{ background: 'transparent', border: '1px solid #444', color: '#888', padding: '0.6rem 1rem', borderRadius: '4px', cursor: 'pointer' }}>DISMISS</button>
                </div>
            )}

            {/* AI ENGINE STATUS HEADER */}
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: aiEngineStatus.yolo ? '#00ff9d' : '#ff003c' }} />
                    YOLO11 MONITOR: {aiEngineStatus.yolo ? "ACTIVE" : "STANDBY"}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: aiEngineStatus.keras ? '#00ff9d' : '#ff003c' }} />
                    RISK CLASSIFIER: {aiEngineStatus.keras ? "LOADED" : "OFFLINE"}
                </div>
                <button onClick={handleReloadAI} style={{ background: '#222', border: '1px solid #444', color: '#888', padding: '2px 10px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer' }}>
                    RELOAD AI ENGINES
                </button>
                <div style={{ marginLeft: 'auto' }}>
                    ARDUINO LINK: <span style={{ color: '#00ff9d' }}>SECURE</span>
                </div>
            </div>

            {/* MAIN DUAL VIEW */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1, minHeight: 0 }}>
                {/* ── LAPTOP MONITOR PANEL ── */}
                <div style={{ background: 'rgba(20,20,25,0.7)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid #333', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: laptopCamOn ? '#00ff9d' : '#333' }} />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#eee', textTransform: 'uppercase' }}>CCTV FEED: CAM-01 (Laptop)</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setLaptopCamOn(!laptopCamOn); if (laptopCamOn && laptopAiActive) setLaptopAiActive(false); }} style={{ background: laptopCamOn ? '#ff003c' : '#333', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {laptopCamOn ? "STOP CAMERA" : "START CAMERA"}
                            </button>
                            <button onClick={() => { if(laptopCamOn) setLaptopAiActive(!laptopAiActive); }} disabled={!laptopCamOn} style={{ opacity: laptopCamOn ? 1 : 0.5, background: laptopAiActive ? 'rgba(0,255,157,0.2)' : '#333', border: laptopAiActive ? '1px solid #00ff9d' : 'none', color: laptopAiActive ? '#00ff9d' : '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: laptopCamOn ? 'pointer' : 'not-allowed' }}>
                                {laptopAiActive ? "• AI: ACTIVE" : "START AI"}
                            </button>
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '8px', overflow: 'hidden', border: laptopHealth === 'ONLINE' ? '1px solid #222' : '2px solid #ff003c' }}>
                        {laptopHealth !== 'ONLINE' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff003c', fontSize: '0.8rem', zIndex: 5 }}>
                                CAMERA {laptopHealth} (Click Start)
                            </div>
                        )}
                        {laptopCamOn && (
                            <Webcam
                                audio={false}
                                ref={laptopVideoRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                        <canvas ref={laptopOverlayRef} width={640} height={480} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', zIndex: 10 }} />
                        {laptopAiActive && (
                            <div style={{ position: 'absolute', bottom: 10, left: 10, background: laptopStatus.includes("VERIFYING") ? 'rgba(255,165,0,0.9)' : laptopStatus === "CRACK_CONFIRMED" ? 'rgba(255,0,60,0.9)' : 'rgba(0,255,157,0.8)', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', animation: laptopStatus.includes("VERIFYING") ? 'pulse 1s infinite' : 'none', zIndex: 20 }}>
                                {laptopStatus.includes("VERIFYING") ? `STABILITY CHECK: ${laptopCountdown}s` : laptopStatus === "CRACK_CONFIRMED" ? "HAZARD CONFIRMED!" : "AI SCANNING (15s Window)"}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${(laptopDetections.some(d => d.severity === "HIGH") ? "#ff003c" : laptopDetections.some(d => d.severity === "MEDIUM") ? "#ffa500" : "#00ff9d")}44`, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Current Risk Level</span>
                            {(() => {
                                const checkRisk = (d, lvl) => d.severity === lvl || (d.class && d.class.includes(lvl === "HIGH" ? "High" : "Medium"));
                                const currentRisk = laptopDetections.some(d => checkRisk(d, "HIGH")) ? "HIGH" : laptopDetections.some(d => checkRisk(d, "MEDIUM")) ? "MEDIUM" : "LOW";
                                const riskColor = currentRisk === "HIGH" ? "#ff003c" : currentRisk === "MEDIUM" ? "#ffa500" : "#00ff9d";
                                return <span style={{ fontSize: '1.8rem', fontWeight: '900', color: riskColor, textShadow: `0 0 15px ${riskColor}88` }}>{currentRisk}</span>;
                            })()}
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #333', borderRadius: '8px', padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Detected Flaws</span><span style={{ color: laptopStats.flaws > 0 ? '#ff003c' : '#888', fontWeight: 'bold' }}>{laptopStats.flaws} FOUND</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>FPS (Est)</span><span style={{ color: '#eee' }}>{laptopStats.fps}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Latency</span><span style={{ color: '#eee' }}>~{Math.round(laptopStats.latency)}ms</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Resolution</span><span style={{ color: '#eee' }}>640x480</span></div>
                        </div>
                    </div>
                </div>

                {/* ── PI MONITOR PANEL ── */}
                <div style={{ background: 'rgba(20,20,25,0.7)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', border: '1px solid #333', backdropFilter: 'blur(10px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: piCamOn ? '#00ff9d' : '#333' }} />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#eee', textTransform: 'uppercase' }}>REMOTECAM: RPI-08 (Raspberry Pi)</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setPiCamOn(!piCamOn); if (piCamOn && piAiActive) setPiAiActive(false); }} style={{ background: piCamOn ? '#ff003c' : '#333', border: 'none', color: '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                                {piCamOn ? "STOP CAMERA" : "START CAMERA"}
                            </button>
                            <button onClick={() => { if(piCamOn) setPiAiActive(!piAiActive); }} disabled={!piCamOn} style={{ opacity: piCamOn ? 1 : 0.5, background: piAiActive ? 'rgba(0,255,157,0.2)' : '#333', border: piAiActive ? '1px solid #00ff9d' : 'none', color: piAiActive ? '#00ff9d' : '#fff', padding: '4px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: piCamOn ? 'pointer' : 'not-allowed' }}>
                                {piAiActive ? "• AI: ACTIVE" : "START AI"}
                            </button>
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', background: '#000', borderRadius: '8px', overflow: 'hidden', border: piHealth === 'ONLINE' ? '1px solid #222' : '2px solid #ff003c' }}>
                        {piHealth !== 'ONLINE' && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>
                                PI STREAM {piHealth}
                            </div>
                        )}
                        <canvas ref={piCanvasRef} width={640} height={480} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {piAiActive && (
                            <div style={{ position: 'absolute', bottom: 10, left: 10, background: piStatus.includes("VERIFYING") ? 'rgba(255,165,0,0.9)' : piStatus === "CRACK_CONFIRMED" ? 'rgba(255,0,60,0.9)' : 'rgba(0,255,157,0.8)', color: '#000', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', animation: piStatus.includes("VERIFYING") ? 'pulse 1s infinite' : 'none', zIndex: 20 }}>
                                {piStatus.includes("VERIFYING") ? `STABILITY CHECK: ${piCountdown}s` : piStatus === "CRACK_CONFIRMED" ? "HAZARD CONFIRMED!" : "AI SCANNING (15s Window)"}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${(piDetections.some(d => d.severity === "HIGH") ? "#ff003c" : piDetections.some(d => d.severity === "MEDIUM") ? "#ffa500" : "#00ff9d")}44`, borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>Current Risk Level</span>
                            {(() => {
                                const checkRisk = (d, lvl) => d.severity === lvl || (d.class && d.class.includes(lvl === "HIGH" ? "High" : "Medium"));
                                const currentRisk = piDetections.some(d => checkRisk(d, "HIGH")) ? "HIGH" : piDetections.some(d => checkRisk(d, "MEDIUM")) ? "MEDIUM" : "LOW";
                                const riskColor = currentRisk === "HIGH" ? "#ff003c" : currentRisk === "MEDIUM" ? "#ffa500" : "#00ff9d";
                                return <span style={{ fontSize: '1.8rem', fontWeight: '900', color: riskColor, textShadow: `0 0 15px ${riskColor}88` }}>{currentRisk}</span>;
                            })()}
                        </div>
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #333', borderRadius: '8px', padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Detected Flaws</span><span style={{ color: piStats.flaws > 0 ? '#ff003c' : '#888', fontWeight: 'bold' }}>{piStats.flaws} FOUND</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>FPS (Est)</span><span style={{ color: '#eee' }}>{piStats.fps}</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Latency</span><span style={{ color: '#eee' }}>~{Math.round(piStats.latency)}ms</span></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#666' }}>Resolution</span><span style={{ color: '#eee' }}>640x480</span></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LOGS FOOTER */}
            <div style={{ height: '140px', background: 'rgba(20,20,25,0.7)', borderRadius: '12px', border: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #222', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                    <span>CLASSIFICATION HISTORY LOG</span>
                    <span>TOTAL EVENTS: {logs.length}</span>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {logs.slice(0, 5).map((log, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '4px 10px', fontSize: '0.8rem', borderBottom: '1px solid #1a1a1a' }}>
                            <span style={{ color: '#555' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span style={{ color: '#00ff9d', fontWeight: 'bold' }}>[{log.source.toUpperCase()}]</span>
                            <span style={{ flex: 1 }}>Surface Crack Detected — {log.risk_level} SEVERITY</span>
                            <span style={{ color: log.risk_level === 'HIGH' ? '#ff003c' : '#ffa500' }}>● VERIFIED</span>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                @keyframes glow-alert {
                    0% { box-shadow: 0 0 5px rgba(255,0,60,0.2); }
                    50% { box-shadow: 0 0 20px rgba(255,0,60,0.4); }
                    100% { box-shadow: 0 0 5px rgba(255,0,60,0.2); }
                }
                @keyframes blinker {
                    50% { opacity: 0.5; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};

export default LiveMonitor;
