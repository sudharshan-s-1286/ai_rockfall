import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html, useProgress } from '@react-three/drei';
import MineModel from '../components/MineModel';
import WorkerMarker from '../components/WorkerMarker';
import HeatmapVisualizer from '../components/HeatmapVisualizer';
import { FaMountain } from 'react-icons/fa';
import { useWebSocket } from '../context/WebSocketContext';

// Loader Component
function Loader() {
    const { progress } = useProgress();
    return <Html center><div style={{ color: 'white' }}>{progress.toFixed(0)}% loaded</div></Html>;
}

// Mock Coordinates Mapping (since backend doesn't store coordinates yet)
const ZONE_COORDS = {
    "Sector 4": [2, 0.05, 2],
    "Zone A": [-2, 0.05, -2],
    "Zone B": [4, 0.05, -1],
    "Zone C": [-3, 0.05, 3],
    "Main Tunnel": [0, 0.05, 0],
    "Unassigned": [5, 0.05, 5]
};

// deterministically generate coords from string if not in map
// deterministically generate coords FROM ZONE, but add random jitter
// We use a simple hash of the ID to keep it consistent per render if we wanted, 
// but for "random place" request, we can just use Math.random() if we want them to move, 
// OR better: use the worker ID to create a stable but unique offset.
const getCoords = (zone, workerId, shift) => {
    let base = [0, 0.05, 0];
    if (ZONE_COORDS[zone]) {
        base = [...ZONE_COORDS[zone]];
    } else {
        // fallback hash-like gen
        const h = zone.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        base = [(h % 10) - 5, 0.05, (h % 8) - 4];
    }

    // Shift-based grouping (simple offset)
    if (shift) {
        const s = shift.toLowerCase();
        if (s.includes('morning')) { base[0] += 0.8; base[2] += 0.8; }
        else if (s.includes('evening')) { base[0] -= 0.8; base[2] -= 0.8; }
        else if (s.includes('night')) { base[0] += 0.8; base[2] -= 0.8; }
    }

    // Add jitter based on workerID to keep it stable but distinct
    // If workerId is numeric string "01", hash it
    const idVal = workerId ? workerId.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) : Math.random() * 100;

    // Random offset between -0.4 and 0.4 (reduced jitter to keep groups tighter)
    const offsetX = ((idVal % 100) / 100) * 0.8 - 0.4;
    const offsetZ = ((idVal % 50) / 50) * 0.8 - 0.4;

    return [base[0] + offsetX, base[1], base[2] + offsetZ];
};

const MineMap = () => {
    const [workers, setWorkers] = useState([]);
    const [error, setError] = useState(null);
    const [viewMode, setViewMode] = useState('3D'); // '3D' or 'Heatmap'
    const { workerLocations, aiDetections } = useWebSocket();

    const fetchWorkers = async () => {
        try {
            const res = await fetch('http://localhost:8000/workers/');
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            // Map backend data to include 3D coordinates
            const mapped = data.map(w => {
                const [x, y, z] = getCoords(w.assigned_zone || "Unassigned", w.user_id, w.shift);
                return {
                    ...w,
                    x, y, z
                };
            });
            setWorkers(mapped);
            setError(null);
        } catch (e) {
            console.error("Map fetch error:", e);
            // Don't overwrite with empty if it's just a transient error, 
            // but if empty init, use mock
            if (workers.length === 0) {
                setWorkers([
                    { id: "1", user_id: "01", name: "Worker A", x: 1, y: 0.2, z: -2, assigned_zone: "Zone A", shift: "Morning" },
                    { id: "2", user_id: "02", name: "Worker B", x: -2, y: 0.2, z: 3, assigned_zone: "Zone B", shift: "Evening" }
                ]);
                setError("Using offline data");
            }
        }
    };

    useEffect(() => {
        fetchWorkers();
        const interval = setInterval(fetchWorkers, 5000);
        return () => clearInterval(interval);
    }, []);

    // Merge API workers with Live WebSocket Telemetry
    const liveWorkers = workers.map(w => {
        const liveData = workerLocations[w.user_id];
        if (liveData) {
            // For demo, we just map latitude/longitude to 3D roughly
            // Assuming lat around 12.0 and long around 80.0
            const x = (liveData.longitude - 80.2210) * 1000;
            const z = (liveData.latitude - 12.9820) * 1000;
            return { ...w, x, z, status: liveData.status, live: true };
        }
        return w;
    });

    const highRiskDetections = aiDetections.filter(d => d.risk_level === 'HIGH' && d.crack_coordinates);

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#050505', position: 'relative' }}>

            {/* Header / Overlay */}
            <div style={{
                position: 'absolute',
                top: 20,
                left: 20,
                zIndex: 10,
                color: 'white',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaMountain size={24} color="var(--neon-green)" />
                    <h2 style={{ margin: 0, color: 'var(--neon-green)', textShadow: '0 0 10px rgba(0,255,157,0.5)' }}>
                        Mine Map
                    </h2>
                </div>
                <p style={{ margin: '5px 0 15px 34px', fontSize: '0.9rem', color: '#aaa' }}>
                    Live Worker Tracking & Risk Zones
                </p>
                
                {/* View Toggle */}
                <div style={{ marginLeft: '34px', display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => setViewMode('3D')}
                        style={{ 
                            padding: '8px 16px', 
                            background: viewMode === '3D' ? 'var(--neon-green)' : '#333',
                            color: viewMode === '3D' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                        3D View
                    </button>
                    <button 
                        onClick={() => setViewMode('Heatmap')}
                        style={{ 
                            padding: '8px 16px', 
                            background: viewMode === 'Heatmap' ? 'var(--neon-green)' : '#333',
                            color: viewMode === 'Heatmap' ? '#000' : '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                        2D Risk Heatmap
                    </button>
                </div>
                {error && <div style={{ color: 'orange', marginTop: '5px' }}>⚠️ {error}</div>}
            </div>

            {viewMode === '3D' ? (
                <>
                    {/* Legend */}
                    <div style={{
                        position: 'absolute',
                        bottom: 20,
                        left: 20,
                        zIndex: 10,
                        background: 'rgba(0,0,0,0.6)',
                        padding: '10px',
                        borderRadius: '8px',
                        backdropFilter: 'blur(5px)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        fontSize: '0.8rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ccff', boxShadow: '0 0 5px #00ccff' }}></div>
                            <span>Active Worker</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff0055', boxShadow: '0 0 5px #ff0055' }}></div>
                            <span>Health Alert / Unfit</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255, 0, 60, 0.4)', border: '1px solid #ff003c', borderStyle: 'dashed' }}></div>
                            <span>High Risk Zone</span>
                        </div>
                    </div>

                    <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
                        <ambientLight intensity={0.5} />
                        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

                        <Suspense fallback={<Loader />}>
                            <MineModel scale={[1.5, 1.5, 1.5]} />
                            {liveWorkers.map(w => (
                                <WorkerMarker key={w.id || w.user_id} worker={w} />
                            ))}
                            
                            {/* Render All Risk Heatmap Overlays in 3D */}
                            {aiDetections.filter(d => d.crack_coordinates).map((detection, idx) => {
                                const x = (detection.crack_coordinates[0] * 10) - 5;
                                const z = (detection.crack_coordinates[1] * 10) - 5;
                                const radius = 1 + (detection.confidence || 0.5) * 2;
                                
                                let color = "#ff003c"; // Default Red
                                if (detection.risk_level === 'MEDIUM') color = "#facc15";
                                if (detection.risk_level === 'LOW') color = "#4ade80";

                                return (
                                    <mesh key={`risk-3d-${idx}-${detection.timestamp}`} position={[x, 0.1, z]} rotation={[-Math.PI / 2, 0, 0]}>
                                        <circleGeometry args={[radius, 32]} />
                                        <meshBasicMaterial color={color} transparent opacity={0.5} />
                                    </mesh>
                                );
                            })}
                            
                            <Environment preset="city" />
                        </Suspense>

                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            enableRotate={true}
                            maxPolarAngle={Math.PI / 2} // Don't go below ground
                        />
                    </Canvas>
                </>
            ) : (
                <div style={{ paddingTop: '100px', width: '100%', height: 'calc(100% - 100px)' }}>
                     <HeatmapVisualizer height="100%" />
                </div>
            )}
        </div>
    );
};

export default MineMap;
