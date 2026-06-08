import React, { useEffect, useRef, useState, useCallback } from 'react';

/**
 * RockSense Live Stream Page
 * Connects to backend WebSocket (/ws/live-feed) and displays:
 *  - Live camera feed with bounding box overlays
 *  - Risk status badge (SAFE / WARNING / DANGER)
 *  - Detection statistics
 *  - Crack persistence bar
 *  - Detection event log
 */

const WS_URL = `ws://${window.location.hostname}:8000/ws/live-feed`;
const RECONNECT_DELAY_MS = 3000;
const MAX_LOG = 30;

// ── Risk level → visual config ────────────────────────────────────────────
const RISK_CONFIG = {
  SAFE:    { color: '#00e676', bg: 'rgba(0,230,118,0.1)',   border: '#00e676', label: '✅ SAFE'   },
  WARNING: { color: '#ffab00', bg: 'rgba(255,171,0,0.1)',  border: '#ffab00', label: '⚠️ WARNING' },
  DANGER:  { color: '#ff1744', bg: 'rgba(255,23,68,0.12)', border: '#ff1744', label: '🚨 DANGER'  },
  UNKNOWN: { color: '#64748b', bg: 'rgba(100,116,139,0.1)',border: '#475569', label: '❓ UNKNOWN'  },
};

function getRiskLevel(status, confirmed) {
  if (confirmed || (status && status.includes('CONFIRMED'))) return 'DANGER';
  if (status && status.includes('DETECTED')) return 'WARNING';
  if (status === 'SAFE') return 'SAFE';
  return 'UNKNOWN';
}

// ── Canvas renderer with bbox overlays ───────────────────────────────────
function VideoCanvas({ frame, detections, confirmed }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!frame) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width  = img.naturalWidth  || 640;
      canvas.height = img.naturalHeight || 480;
      ctx.drawImage(img, 0, 0);

      // Draw bounding boxes
      if (detections && detections.length > 0) {
        detections.forEach(det => {
          const [x1, y1, x2, y2] = det.bbox || [];
          if (x1 == null) return;
          const color = confirmed ? '#ff1744' : '#ffab00';
          ctx.strokeStyle = color;
          ctx.lineWidth   = 2;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          const label = `${det.class || 'crack'} ${((det.confidence || 0) * 100).toFixed(0)}%`;
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 18, label.length * 7.2, 18);
          ctx.fillStyle = '#000';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(label, x1 + 3, y1 - 4);
        });
      }

      // Timestamp
      const ts = new Date().toLocaleTimeString();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(canvas.width - 84, canvas.height - 22, 82, 18);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(ts, canvas.width - 4, canvas.height - 7);
      ctx.textAlign = 'left';
    };
    img.src = `data:image/jpeg;base64,${frame}`;
  }, [frame, detections, confirmed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', background: '#000', display: 'block' }}
    />
  );
}

// ── Main Page Component ───────────────────────────────────────────────────
export default function LiveStreamPage() {
  const wsRef            = useRef(null);
  const reconnectTimer   = useRef(null);
  const frameCountRef    = useRef(0);
  const lastFpsTimeRef   = useRef(performance.now());

  const [connected,     setConnected]     = useState(false);
  const [piOnline,      setPiOnline]      = useState(false);
  const [currentFrame,  setCurrentFrame]  = useState(null);
  const [detections,    setDetections]    = useState([]);
  const [statusText,    setStatusText]    = useState('Connecting to server…');
  const [riskLevel,     setRiskLevel]     = useState('UNKNOWN');
  const [confirmed,     setConfirmed]     = useState(false);
  const [fps,           setFps]           = useState(0);
  const [windowPct,     setWindowPct]     = useState(0);
  const [avgConf,       setAvgConf]       = useState(null);
  const [confirmedCount,setConfirmedCount] = useState(0);
  const [log,           setLog]           = useState([]);

  const addLog = useCallback((type, title, sub = '') => {
    const entry = { type, title, sub, time: new Date().toLocaleTimeString() };
    setLog(prev => [entry, ...prev].slice(0, MAX_LOG));
  }, []);

  // ── WebSocket connection ────────────────────────────────────────────────
  const connectWs = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      addLog('safe', '🟢 Connected to RockSense backend');
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handleMessage(data);
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      setConnected(false);
      setPiOnline(false);
      setCurrentFrame(null);
      setRiskLevel('UNKNOWN');
      setStatusText('Disconnected — reconnecting…');
      addLog('system', '🔴 Disconnected from server');
      reconnectTimer.current = setTimeout(connectWs, RECONNECT_DELAY_MS);
    };

    ws.onerror = () => setConnected(false);
  }, [addLog]);

  const handleMessage = useCallback((data) => {
    const { type } = data;

    if (type === 'frame') {
      // FPS calc
      frameCountRef.current++;
      const now  = performance.now();
      const span = now - lastFpsTimeRef.current;
      if (span > 2000) {
        setFps(((frameCountRef.current / span) * 1000).toFixed(1));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      setCurrentFrame(data.frame);
      setDetections(data.detections || []);
      setConfirmed(!!data.confirmed);
      setWindowPct(Math.round((data.ratio || 0) * 100));

      const level = getRiskLevel(data.status, data.confirmed);
      setRiskLevel(level);
      setStatusText(data.status || 'SAFE');
      setPiOnline(true);

      const dets = data.detections || [];
      if (dets.length > 0) {
        const conf = dets.reduce((s, d) => s + (d.confidence || 0), 0) / dets.length;
        setAvgConf((conf * 100).toFixed(0));
      } else {
        setAvgConf(null);
      }

      if (data.confirmed) {
        setConfirmedCount(c => c + 1);
        addLog('confirmed',
          `🚨 CRACK CONFIRMED — ${dets.length} detection(s)`,
          `Persistence ${Math.round((data.ratio || 0) * 100)}%`
        );
      }

    } else if (type === 'pi_disconnected') {
      setPiOnline(false);
      setCurrentFrame(null);
      setRiskLevel('UNKNOWN');
      setStatusText('Pi camera offline');
      addLog('system', '📷 Pi camera disconnected');

    } else if (type === 'status') {
      addLog('system', `🔵 ${data.message || 'Server message'}`);
    }
  }, [addLog]);

  useEffect(() => {
    connectWs();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  // ── Render ──────────────────────────────────────────────────────────────
  const risk   = RISK_CONFIG[riskLevel] || RISK_CONFIG.UNKNOWN;
  const barColor = windowPct > 60 ? '#ff1744' : windowPct > 30 ? '#ffab00' : '#00e676';

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '14px 28px', background: 'rgba(17,24,39,0.95)', borderBottom: '1px solid #1e2d45',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>⛰️ RockSense — Live Stream</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: '0.78rem', color: piOnline ? '#00e676' : '#ff1744', fontWeight: 600 }}>
            {piOnline ? '● Pi Camera LIVE' : '○ Pi Camera Offline'}
          </span>
          <span style={{ fontSize: '0.78rem', color: connected ? '#00e676' : '#ff1744', fontWeight: 600 }}>
            {connected ? '✓ Server Connected' : '✗ Server Disconnected'}
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, padding: '20px 28px', maxWidth: 1400, margin: '0 auto' }}>

        {/* Video */}
        <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e2d45', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>📷 CAM-01 (rapberrypi 2GB)</span>
            <span style={{ fontSize: '0.72rem', color: '#ff1744', fontWeight: 700, background: 'rgba(255,23,68,0.1)', border: '1px solid rgba(255,23,68,0.3)', padding: '2px 8px', borderRadius: 50 }}>● LIVE</span>
          </div>
          <VideoCanvas frame={currentFrame} detections={detections} confirmed={confirmed} />
          <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#475569', background: '#0d1424' }}>
            <span>{fps} FPS</span>
            <span>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Risk Badge */}
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, padding: '24px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 }}>
              Detection Status
            </div>
            <div style={{
              display: 'inline-block', padding: '10px 32px', borderRadius: 50,
              fontSize: '1.4rem', fontWeight: 900, letterSpacing: 2,
              color: risk.color, background: risk.bg, border: `2px solid ${risk.border}`,
              boxShadow: riskLevel === 'DANGER' ? `0 0 30px ${risk.color}66` : 'none',
              transition: 'all 0.4s',
            }}>
              {risk.label}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 10, minHeight: 18 }}>
              {statusText}
            </div>
          </div>

          {/* Stats */}
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#1e2d45' }}>
              {[
                { v: fps,           l: 'Stream FPS'  },
                { v: detections.length, l: 'Detections' },
                { v: avgConf ? `${avgConf}%` : '--', l: 'Confidence' },
                { v: confirmedCount,    l: 'Confirmed'   },
              ].map(({ v, l }) => (
                <div key={l} style={{ background: '#111827', padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#00d4ff', fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                  <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Persistence bar */}
            <div style={{ padding: '14px 16px', borderTop: '1px solid #1e2d45' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: 8 }}>
                <span>Crack Persistence (15s)</span>
                <span>{windowPct}%</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 50, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${windowPct}%`, background: barColor, borderRadius: 50, transition: 'width 0.4s, background 0.4s' }} />
              </div>
            </div>
          </div>

          {/* Log */}
          <div style={{ background: '#111827', border: '1px solid #1e2d45', borderRadius: 12, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2d45', fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
              🔍 Event Log
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: 10 }}>
              {log.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: '#475569', fontSize: '0.82rem' }}>No events yet</div>
              ) : log.map((item, i) => (
                <div key={i} style={{
                  padding: '8px 10px', borderRadius: 8, marginBottom: 5,
                  background: '#1a2235',
                  borderLeft: `3px solid ${item.type === 'confirmed' ? '#ff1744' : item.type === 'safe' ? '#00e676' : '#475569'}`,
                  fontSize: '0.76rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{item.title}</div>
                  {item.sub && <div style={{ color: '#64748b', marginTop: 2 }}>{item.sub}</div>}
                  <div style={{ color: '#475569', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>{item.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
