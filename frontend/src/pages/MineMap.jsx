import React, { useState, useEffect } from 'react';
import MapVisualizer from '../components/MapVisualizer';

const MineMap = () => {
    const [selectedZone, setSelectedZone] = useState(null);
    const [workers, setWorkers] = useState([]);

    // Fetch live map data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:8000/admin/users/3d-map-data');
                if (res.ok) {
                    const data = await res.json();
                    setWorkers(data);
                }
            } catch (error) {
                console.error("Failed to fetch map data", error);
            }
        };
        fetchData();
        const interval = setInterval(fetchData, 5000); // Live update
        return () => clearInterval(interval);
    }, []);

    const handleZoneClick = (zone) => {
        setSelectedZone(zone);
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '1rem', padding: '1rem' }}>
            {/* Main Map View */}
            <MapVisualizer
                workers={workers}
                onZoneClick={handleZoneClick}
                selectedZoneId={selectedZone?.id}
            />

            {/* Sidebar Info */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="glass-panel" style={{ padding: '1rem' }}>
                    <h3>WORKER TRACKING</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {workers.map(w => (
                            <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: w.status === 'Active' ? 'var(--neon-green)' : 'yellow' }}></div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{w.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{w.zone || w.assigned_zone}</div>
                                </div>
                            </div>
                        ))}
                        {workers.length === 0 && <div style={{ color: '#666' }}>No active workers found.</div>}
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', flex: 1 }}>
                    <h3>ZONE DETAILS</h3>
                    {selectedZone ? (
                        <div>
                            <h4 style={{ color: 'var(--neon-cyan)', margin: 0 }}>{selectedZone.name}</h4>
                            <p>Status: Monitoring Active</p>
                            <p>Risk Score: {selectedZone.name.includes("High") ? "85/100" : "12/100"}</p>
                        </div>
                    ) : (
                        <div style={{ color: '#666', fontStyle: 'italic' }}>Select a zone on the map...</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MineMap;
