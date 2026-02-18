import React, { useState, useEffect } from 'react';
import MapVisualizer from '../components/MapVisualizer';
import { FaClock, FaUserClock, FaSun, FaMoon, FaCloudSun } from 'react-icons/fa';

const MineMap = () => {
    const [selectedZone, setSelectedZone] = useState(null);
    const [workers, setWorkers] = useState([]);
    const [selectedShift, setSelectedShift] = useState('Morning'); // Morning/Evening/Night

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

    // Filter workers by shift
    const filteredWorkers = workers.filter(w => w.shift === selectedShift);

    // Stats for chosen shift
    const totalAssigned = filteredWorkers.length;
    const onSiteCount = filteredWorkers.filter(w => w.status === 'Active' || w.is_onsite === 'Yes').length;

    const ShiftButton = ({ shift, icon: Icon, color }) => (
        <button
            onClick={() => setSelectedShift(shift)}
            style={{
                flex: 1, padding: '10px', background: selectedShift === shift ? color : 'rgba(255,255,255,0.05)',
                border: `1px solid ${selectedShift === shift ? color : 'rgba(255,255,255,0.1)'}`,
                color: selectedShift === shift ? '#000' : '#888',
                borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                fontWeight: 'bold', transition: 'all 0.3s'
            }}
        >
            <Icon /> {shift}
        </button>
    );

    return (
        <div style={{ height: '100%', display: 'flex', gap: '1rem', padding: '1rem' }}>
            {/* Main Map View */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Shift Selector Overlay (positioned above or integrated) */}
                <div className="glass-panel" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FaClock /> SHIFT VISUALIZER
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', width: '400px' }}>
                        <ShiftButton shift="Morning" icon={FaCloudSun} color="#ffc107" />
                        <ShiftButton shift="Evening" icon={FaSun} color="#ff5722" />
                        <ShiftButton shift="Night" icon={FaMoon} color="#5e60ce" />
                    </div>
                </div>

                <MapVisualizer
                    workers={filteredWorkers} // Pass filtered list
                    onZoneClick={handleZoneClick}
                    selectedZoneId={selectedZone?.id}
                />
            </div>

            {/* Sidebar Info */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Stats Card */}
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'linear-gradient(145deg, rgba(0,0,0,0.6), rgba(0,255,157,0.05))' }}>
                    <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>SHIFT STATUS</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neon-green)' }}>
                        {onSiteCount} / {totalAssigned}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#ccc' }}>PERSONNEL ON-SITE</div>
                </div>

                <div className="glass-panel" style={{ padding: '1rem', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>ACTIVE PERSONNEL</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
                        {filteredWorkers.map(w => (
                            <div key={w.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px', padding: '10px',
                                background: 'rgba(255,255,255,0.03)', borderRadius: '6px',
                                borderLeft: `3px solid ${w.status === 'Active' ? 'var(--neon-green)' : 'grey'}`
                            }}>
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%', background: '#333',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                }}>
                                    {w.photo_url ? (
                                        <img src={`http://localhost:8000${w.photo_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <FaUserClock color="#666" />
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{w.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#888' }}>{w.assigned_zone}</div>
                                </div>

                                <div style={{ fontSize: '0.8rem', color: w.status === 'Active' ? 'var(--neon-green)' : '#666' }}>
                                    {w.status === 'Active' ? 'ON-SITE' : 'OFF'}
                                </div>
                            </div>
                        ))}
                        {filteredWorkers.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                                No workers assigned to {selectedShift} shift.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MineMap;
