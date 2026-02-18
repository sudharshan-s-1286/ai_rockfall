import React from 'react';
import { FaUser } from 'react-icons/fa';

const MapVisualizer = ({ workers = [], onZoneClick, selectedZoneId = null, height = '100%' }) => {

    const zones = [
        { id: "Sector 4", name: "Sector 4 (High Risk)", color: "rgba(255, 0, 60, 0.4)", top: '50%', left: '30%', width: '150px', height: '100px' },
        { id: "Sector 2", name: "Sector 2 (Safe)", color: "rgba(0, 255, 157, 0.2)", top: '20%', left: '60%', width: '200px', height: '120px' },
        { id: "Zone A", name: "Zone A (Entrance)", color: "rgba(0, 150, 255, 0.2)", top: '70%', left: '10%', width: '120px', height: '80px' },
        { id: "Base", name: "Base Operations", color: "rgba(255, 255, 0, 0.2)", top: '10%', left: '10%', width: '100px', height: '100px' },
    ];

    return (
        <div className="glass-panel" style={{ flex: 1, position: 'relative', overflow: 'hidden', padding: 0, height: height }}>
            {/* Background Image - Using the generated 3D-style map image */}
            <div style={{
                width: '100%', height: '100%',
                background: 'url(/assets/open_pit_mine_map.png) center/cover no-repeat',
                opacity: 0.8
            }}></div>

            {/* Zones Overlay */}
            {zones.map(z => (
                <div key={z.id}
                    onClick={() => onZoneClick && onZoneClick(z)}
                    style={{
                        position: 'absolute', top: z.top, left: z.left, width: z.width, height: z.height,
                        background: selectedZoneId === z.id ? 'rgba(255, 255, 255, 0.3)' : z.color,
                        border: selectedZoneId === z.id ? '2px solid white' : '1px dashed white',
                        borderRadius: '20px',
                        cursor: onZoneClick ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', textShadow: '0 0 5px black',
                        boxShadow: selectedZoneId === z.id ? '0 0 15px white' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {z.name}
                </div>
            ))}

            {/* Workers */}
            {workers.map((w, idx) => {
                let top, left;
                const zone = zones.find(z => z.id === w.assigned_zone || z.id === w.zone);

                if (zone) {
                    // Randomize slightly within zone
                    const offsetX = (idx % 3) * 20 - 20;
                    const offsetY = (Math.floor(idx / 3)) * 20 - 20;
                    top = `calc(${zone.top} + ${parseFloat(zone.height) / 2}px + ${offsetY}px)`;
                    left = `calc(${zone.left} + ${parseFloat(zone.width) / 2}px + ${offsetX}px)`;
                } else {
                    top = '50%';
                    left = '50%';
                }

                // Show only if active/on-site (filtered list passed from parent handles shift logic)
                const opacity = w.status === 'Active' || w.is_onsite === "Yes" ? 1 : 0.3;

                return (
                    <div key={w.id || idx} style={{
                        position: 'absolute', top: top, left: left,
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        opacity: opacity,
                        transition: 'all 0.5s ease',
                        zIndex: 10
                    }}>
                        <div style={{ position: 'relative' }}>
                            {w.photo_url ? (
                                <img src={`http://localhost:8000${w.photo_url}`} style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid cyan' }} alt="" />
                            ) : (
                                <FaUser color="cyan" size={24} style={{ filter: 'drop-shadow(0 0 5px cyan)' }} />
                            )}
                            {w.status === 'Active' && <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, background: '#0f0', borderRadius: '50%' }} />}
                        </div >
                        <span style={{ fontSize: '0.7rem', background: 'rgba(0,0,0,0.7)', padding: '2px 4px', borderRadius: '4px', marginTop: '4px', color: '#fff', whiteSpace: 'nowrap' }}>
                            {w.name}
                        </span>
                    </div >
                );
            })}
        </div >
    );
};

export default MapVisualizer;
