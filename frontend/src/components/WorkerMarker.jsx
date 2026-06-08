import React, { useState } from 'react'
import { Html } from '@react-three/drei'

export default function WorkerMarker({ worker }) {
    const [showPopup, setShowPopup] = useState(false);

    // Randomize position slightly if x/y/z missing, or use default
    // We expect the parent MineMap to provide valid coordinates, but fallback here just in case
    const position = [worker.x || 0, worker.y || 0.5, worker.z || 0]

    // Color based on role or status
    // Blue = Normal, Red = Unfit/Alert
    const color = worker.fitness_status === 'Unfit' ? '#ff0055' : '#00ccff'

    return (
        <group position={position}>
            {/* Worker Representation (Sphere) */}
            <mesh 
                castShadow 
                receiveShadow 
                onClick={(e) => {
                    e.stopPropagation();
                    setShowPopup(!showPopup);
                }}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <sphereGeometry args={[showPopup ? 0.12 : 0.08, 32, 32]} />
                <meshStandardMaterial
                    color={color}
                    emissive={color}
                    emissiveIntensity={showPopup ? 0.8 : 0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* Glow / Ring Effect */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                <ringGeometry args={[0.1, 0.2, 32]} />
                <meshBasicMaterial color={color} opacity={0.3} transparent side={2} />
            </mesh>

            {/* Clickable Popup Card */}
            {showPopup && (
                <Html distanceFactor={15} position={[0, 0.4, 0]} zIndexRange={[100, 0]}>
                    <div style={{
                        background: 'rgba(10, 10, 15, 0.95)',
                        border: `1px solid ${color}`,
                        borderRadius: '8px',
                        padding: '12px',
                        width: '160px',
                        color: 'white',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: `0 4px 12px rgba(0,0,0,0.5)`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        cursor: 'default'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--neon-green)' }}>Worker Details</span>
                            <span style={{ cursor: 'pointer', color: '#888', fontSize: '10px' }} onClick={(e) => { e.stopPropagation(); setShowPopup(false); }}>✕</span>
                        </div>
                        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#aaa' }}>Name:</span>
                            <span style={{ fontWeight: '500' }}>{worker.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#aaa' }}>ID:</span>
                            <span style={{ fontWeight: '500' }}>{worker.user_id}</span>
                        </div>
                        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#aaa' }}>Shift:</span>
                            <span style={{ fontWeight: '500' }}>{worker.shift || 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#aaa' }}>Status:</span>
                            <span style={{ 
                                fontWeight: 'bold', 
                                color: worker.status === 'Active' ? 'var(--neon-green)' : (worker.status === 'Warning' ? 'yellow' : 'red') 
                            }}>
                                {worker.status || 'Active'}
                            </span>
                        </div>
                    </div>
                </Html>
            )}

            {/* Floating Label (when not showing popup) */}
            {!showPopup && (
                <Html distanceFactor={20} position={[0, 0.3, 0]}>
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.75)',
                        color: color,
                        padding: '1px 3px',
                        borderRadius: '2px',
                        border: `0.5px solid ${color}`,
                        fontSize: '6px',
                        fontFamily: "'Inter', sans-serif",
                        fontWeight: 'bold',
                        whiteSpace: 'nowrap',
                        backdropFilter: 'blur(2px)',
                        boxShadow: `0 0 3px ${color}40`,
                        pointerEvents: 'none',
                        userSelect: 'none'
                    }}>
                        <div style={{ fontSize: '7px', fontWeight: 'bold' }}>{worker.name || worker.user_id}</div>
                    </div>
                </Html>
            )}
        </group>
    )
}
