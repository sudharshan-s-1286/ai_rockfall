
import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useTexture, OrbitControls, Html, Environment, useGLTF } from '@react-three/drei';
import { FaUser } from 'react-icons/fa';

const Model = () => {
    // Try to load the GLB model
    try {
        const { scene } = useGLTF('/assets/3d_map.glb');
        return <primitive object={scene} scale={0.5} />;
    } catch (e) {
        console.error("Error loading GLB, falling back to texture:", e);
        // Fallback: Use the 2D map image as a texture on a 3D plane
        const texture = useTexture('/assets/open_pit_mine_map.png');
        return (
            <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <mesh receiveShadow>
                    <planeGeometry args={[40, 40]} />
                    <meshStandardMaterial map={texture} />
                </mesh>
                <gridHelper args={[40, 40, 0x444444, 0x222222]} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} />
            </group>
        );
    }
};

const WorkerPin = ({ worker, position }) => {
    const color = worker.shift === 'Morning' ? '#ffa500' :
        worker.shift === 'Evening' ? '#ff5722' : '#5e60ce'; // match dashboard colors

    return (
        <group position={position}>
            {/* Pin Line */}
            <mesh position={[0, 1.5, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
                <meshStandardMaterial color={color} />
            </mesh>

            {/* Floating Info */}
            <Html position={[0, 3.5, 0]} center>
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    transform: 'scale(1)', transition: 'all 0.2s'
                }}>
                    <div style={{
                        border: `2px solid ${color}`, borderRadius: '50%',
                        width: '32px', height: '32px', overflow: 'hidden', background: '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        {worker.photo_url ? (
                            <img src={`http://localhost:8000${worker.photo_url}`} style={{ width: '100%', height: '100%' }} />
                        ) : (
                            <FaUser color={color} />
                        )}
                    </div>
                    {worker.status === 'Active' && (
                        <div style={{ background: 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#fff', marginTop: '4px' }}>
                            {worker.name}
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
};

// Map zones to approximate 3D coordinates
const getPositionForZone = (zoneId, index) => {
    const noiseX = (index % 3 - 1) * 2;
    const noiseZ = (Math.floor(index / 3) % 3 - 1) * 2;

    // Base coordinates
    let base = [0, 0, 0];
    switch (zoneId) {
        case "Sector 4": base = [10, 0, 10]; break;
        case "Sector 2": base = [-8, 0, -8]; break;
        case "Zone A": base = [12, 0, -5]; break;
        case "Base": base = [0, 0, 0]; break;
        default: base = [Math.random() * 10 - 5, 0, Math.random() * 10 - 5];
    }
    return [base[0] + noiseX, base[1], base[2] + noiseZ];
};

const MapVisualizer = ({ workers = [], onZoneClick, selectedZoneId = null, height = '100%' }) => {
    return (
        <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 0, height: height, background: '#111' }}>
            <Canvas camera={{ position: [20, 20, 20], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <Environment preset="night" />

                <Suspense fallback={<Html center><div style={{ color: 'white' }}>Loading 3D Mine...</div></Html>}>
                    <Model />
                </Suspense>

                {workers.map((w, idx) => (
                    (w.status === 'Active' || w.is_onsite === "Yes") && (
                        <WorkerPin
                            key={w.id}
                            worker={w}
                            position={getPositionForZone(w.assigned_zone, idx)}
                        />
                    )
                ))}

                <OrbitControls
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2.1}
                    enableZoom={true}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                />

                <gridHelper args={[50, 50, 0x444444, 0x222222]} />
            </Canvas>

            {/* Legend Overlay */}
            <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '8px' }}>
                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>Shift Colors</div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 8, height: 8, background: '#ffa500', borderRadius: '50%' }}></span> <span style={{ color: '#fff', fontSize: '0.8rem' }}>Morning</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 8, height: 8, background: '#ff5722', borderRadius: '50%' }}></span> <span style={{ color: '#fff', fontSize: '0.8rem' }}>Evening</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 8, height: 8, background: '#5e60ce', borderRadius: '50%' }}></span> <span style={{ color: '#fff', fontSize: '0.8rem' }}>Night</span></div>
                </div>
            </div>
        </div>
    );
};

export default MapVisualizer;
