import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import RiskBadge from '../components/RiskBadge';
import { FaVideo, FaCircle } from 'react-icons/fa';

const API_BASE = 'http://localhost:8000';

const LiveMonitor = () => {
    const webcamRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [riskLevel, setRiskLevel] = useState('LOW');
    const [crackCount, setCrackCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [isAlarmActive, setIsAlarmActive] = useState(false);
    const [isSilenced, setIsSilenced] = useState(false);
    const lastRequestTime = useRef(Date.now());

    // Alarm Control
    const triggerAlarm = async () => {
        if (isAlarmActive || isSilenced) return; // Don't trigger if active OR silenced
        setIsAlarmActive(true);
        try {
            await fetch(`${API_BASE}/alarm/start`, { method: 'POST' });
        } catch (e) {
            console.error("Alarm Trigger Error:", e);
        }
    };

    const stopAlarm = async () => {
        setIsAlarmActive(false);
        setIsSilenced(true); // Prevent re-trigger until risk drops
        try {
            await fetch(`${API_BASE}/alarm/stop`, { method: 'POST' });
        } catch (e) {
            console.error("Alarm Stop Error:", e);
        }
    };

    // Auto-Trigger Alarm on HIGH RISK
    useEffect(() => {
        // Trigger if High Risk AND not already active AND not manually silenced
        if (isDetecting && riskLevel === 'HIGH' && !isAlarmActive && !isSilenced) {
            triggerAlarm();
        }

        // Reset silenced state if risk drops below HIGH
        if (riskLevel !== 'HIGH') {
            setIsSilenced(false);
        }
    }, [riskLevel, isDetecting, isAlarmActive, isSilenced]);

    // Capture & Analyze Loop
    const capture = useCallback(async () => {
        if (webcamRef.current && webcamRef.current.getScreenshot) {
            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) return;

            // Calculate FPS approximation
            const now = Date.now();
            setFps(Math.round(1000 / (now - lastRequestTime.current)));
            lastRequestTime.current = now;

            // Convert base64 to blob
            const blob = await (await fetch(imageSrc)).blob();
            const formData = new FormData();
            formData.append('file', blob, "live_feed.jpg");

            try {
                const res = await fetch(`${API_BASE}/inference/detect`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                setRiskLevel(data.risk_level);
                setCrackCount(data.crack_count);
                // console.log("Detections Received:", data.raw_yolo); // Debug log (noise)
                drawDetections(data.raw_yolo, data.risk_details);

            } catch (e) {
                console.error("Inference Error:", e);
            }
        }
    }, [webcamRef]);

    // Draw Boxes
    const drawDetections = (yoloData, riskDetails = []) => {
        const canvas = canvasRef.current;
        const video = webcamRef.current?.video;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        const { videoWidth, videoHeight } = video;

        // Match canvas size to video
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Clear previous
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        console.log("Drawing Detections:", yoloData);

        // Parse boxes
        let detections = [];
        if (yoloData.images && yoloData.images[0]?.results) {
            detections = yoloData.images[0].results;
        } else if (yoloData.data) {
            detections = yoloData.data;
        } else if (Array.isArray(yoloData)) {
            detections = yoloData;
        }

        detections.forEach((det, index) => {
            const box = det.box; // {x1, y1, x2, y2}
            const label = det.name || "Crack";
            const conf = det.confidence || 0;

            const width = box.x2 - box.x1;
            const height = box.y2 - box.y1;

            // Determine Label & Color from risk details if available
            let displayLabel = label;
            let displaySeverity = "LOW";

            // Try to find matching risk detail (assume order matches or use spatial matching? Order usually matches if list is preserved)
            // riskDetails comes from backend loop over same detections list.
            if (riskDetails && riskDetails[index]) {
                displaySeverity = riskDetails[index].label;
            } else {
                // Fallback to global risk if not detailed
                displaySeverity = riskLevel;
            }

            // Color Map
            let color = '#00ff9d'; // Default (Low)
            if (displaySeverity === 'HIGH') color = '#ff003c';
            else if (displaySeverity === 'MEDIUM') color = '#ffa500';

            // Draw Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 4;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;

            ctx.beginPath();
            ctx.rect(box.x1, box.y1, width, height);
            ctx.stroke();

            // Draw Label Background
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = color;
            ctx.fillRect(box.x1, box.y1, width, height);
            ctx.globalAlpha = 1.0;

            // Text
            ctx.font = 'bold 16px monospace';
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 5;
            ctx.fillText(`${displaySeverity} RISK (${(conf * 100).toFixed(0)}%)`, box.x1, box.y1 - 5);
            ctx.shadowBlur = 0;
        });
    };

    // Activity Loop (Sequential)
    useEffect(() => {
        let active = true;

        const loop = async () => {
            if (!active || !isDetecting) return;

            try {
                await capture();
            } catch (err) {
                console.error("Capture loop error:", err);
            }

            if (active && isDetecting) {
                // Schedule next frame ONLY after previous one finished
                setTimeout(loop, 200); // 200ms delay between frames preventing overload
            }
        };

        if (isDetecting) {
            loop();
        }

        return () => {
            active = false;
        };
    }, [isDetecting, capture]);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Header */}
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaVideo size={20} color="var(--neon-cyan)" />
                    <h2 style={{ margin: 0 }}>LIVE CCTV FEED: CAM-01</h2>
                </div>

                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {/* Camera Toggle */}
                    <button
                        className={isCameraOn ? "btn-danger" : "btn-primary"}
                        style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '1rem' }}
                        onClick={() => {
                            if (isCameraOn) setIsDetecting(false); // Stop AI if camera stops
                            setIsCameraOn(!isCameraOn);
                        }}
                    >
                        {isCameraOn ? "STOP CAMERA" : "START CAMERA"}
                    </button>

                    {/* AI Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isCameraOn ? 1 : 0.5 }}>
                        <FaCircle size={10} color={isDetecting ? "red" : "#555"} className={isDetecting ? "blink" : ""} />
                        <span style={{ fontWeight: 'bold' }}>AI: {isDetecting ? "ACTIVE" : "STANDBY"}</span>
                    </div>
                    <button
                        className={isDetecting ? "btn-danger" : "btn-primary"}
                        style={{ width: 'auto', padding: '0.5rem 1.5rem', fontSize: '1rem' }}
                        onClick={() => setIsDetecting(!isDetecting)}
                        disabled={!isCameraOn}
                    >
                        {isDetecting ? "STOP AI" : "START AI"}
                    </button>

                    {/* Emergency Alarm Stop - Only Shows when Active */}
                    {isAlarmActive && (
                        <button
                            className="btn-danger blink"
                            style={{
                                width: 'auto', padding: '0.5rem 1.5rem', fontSize: '1rem',
                                background: 'red', color: 'white', border: '2px solid white',
                                boxShadow: '0 0 20px red'
                            }}
                            onClick={stopAlarm}
                        >
                            STOP ALARM
                        </button>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', flex: 1 }}>
                {/* Main Video Area */}
                <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                    {isCameraOn ? (
                        <Webcam
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            videoConstraints={{ width: 640, height: 480, facingMode: "user" }}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <div style={{ color: '#555', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                            <FaVideo size={48} />
                            <span>CAMERA OFFLINE</span>
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                </div>

                {/* Sidebar Stats */}
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <RiskBadge level={riskLevel} />

                    <div className="glass-panel" style={{ padding: '1rem', flex: 1 }}>
                        <h3>FEED STATS</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>Detected Flaws</span>
                            <span style={{ color: 'var(--neon-pink)', fontWeight: 'bold' }}>{crackCount} FOUND</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>FPS (Est)</span>
                            <span style={{ color: 'var(--neon-cyan)' }}>{isDetecting ? fps : 0}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>Latency</span>
                            <span>~800ms</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#888' }}>Resolution</span>
                            <span>640x480</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        .blink { animation: blinker 1s linear infinite; }
        @keyframes blinker { 50% { opacity: 0; } }
      `}</style>
        </div>
    );
};

export default LiveMonitor;
