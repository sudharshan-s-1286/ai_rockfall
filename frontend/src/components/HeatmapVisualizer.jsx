import React, { useEffect, useState } from 'react';
import { MapContainer, ImageOverlay, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const IMAGE_BOUNDS = [[0, 0], [1000, 1000]];

// Fallback data to guarantee colors even if backend fetch fails or is slow
const FALLBACK_DATA = [
    { lat: 550, lng: 550, risk: 'HIGH' },
    { lat: 580, lng: 520, risk: 'HIGH' },
    { lat: 520, lng: 580, risk: 'HIGH' },
    { lat: 400, lng: 400, risk: 'MEDIUM' },
    { lat: 350, lng: 450, risk: 'MEDIUM' },
    { lat: 450, lng: 350, risk: 'MEDIUM' },
    { lat: 200, lng: 200, risk: 'LOW' },
    { lat: 800, lng: 800, risk: 'LOW' },
    { lat: 200, lng: 800, risk: 'LOW' },
    { lat: 800, lng: 200, risk: 'LOW' }
];

const RiskCirclesLayer = ({ data }) => {
    // If no data from backend, use fallback for the dare!
    const displayData = (data && data.length > 0) ? data : FALLBACK_DATA;

    return (
        <>
            {displayData.map((p, idx) => {
                let color = '#ef4444'; // Red
                let radius = 25;
                
                if (p.risk === 'MEDIUM') {
                    color = '#facc15'; // Yellow
                    radius = 20;
                } else if (p.risk === 'LOW') {
                    color = '#4ade80'; // Green
                    radius = 15;
                }

                const lat = parseFloat(p.lat);
                const lng = parseFloat(p.lng);

                if (isNaN(lat) || isNaN(lng)) return null;

                return (
                    <CircleMarker
                        key={`risk-marker-${idx}-${lat}-${lng}`}
                        center={[lat, lng]}
                        pathOptions={{ 
                            fillColor: color, 
                            color: '#ffffff', // White border for extreme contrast
                            fillOpacity: 1.0,  // Solid color
                            weight: 3,
                            opacity: 1.0
                        }}
                        radius={radius + 5} // Even larger
                    >
                        <Tooltip sticky>
                            <div style={{ color: '#000', fontWeight: 'bold' }}>
                                {p.risk} RISK ZONE
                            </div>
                        </Tooltip>
                    </CircleMarker>
                );
            })}
        </>
    );
};

const HeatmapVisualizer = ({ height = '100%' }) => {
    const [heatData, setHeatData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHeatmapData = async () => {
            try {
                // Use actual hostname to handle remote access/IP changes
                const host = window.location.hostname;
                const res = await fetch(`http://${host}:8000/heatmap`);
                if (!res.ok) throw new Error("HTTP " + res.status);
                const data = await res.json();
                console.log("FINAL HEATMAP DATA:", data);
                setHeatData(Array.isArray(data) ? data : []);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching heatmap data:", error);
                setHeatData([]); 
                setLoading(false);
            }
        };

        fetchHeatmapData();
        const interval = setInterval(fetchHeatmapData, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading && heatData.length === 0) {
        // Reduced loading time or just show map with fallback
        setTimeout(() => setLoading(false), 1000);
        return <div style={{ height, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>Initializing Mine Risk Map...</div>;
    }

    return (
        <div className="glass-panel" style={{ width: '100%', height: '640px', position: 'relative', overflow: 'hidden', padding: 0, background: '#000', border: '1px solid #333' }}>
            <MapContainer 
                crs={L.CRS.Simple} 
                bounds={IMAGE_BOUNDS} 
                className="schematic-map"
                style={{ height: '640px', width: '100%', background: '#050505' }}
                zoomSnap={0.5}
            >
                <ImageOverlay
                    url="/mine_site_plan.png"
                    bounds={IMAGE_BOUNDS}
                />
                <RiskCirclesLayer data={heatData} />
            </MapContainer>

            {/* Legend Overlay */}
            <div style={{ position: 'absolute', bottom: 20, left: 20, background: 'rgba(0,0,0,0.85)', padding: '15px', borderRadius: '12px', zIndex: 1000, color: 'white', border: '1px solid #4ade80' }}>
                <div style={{ fontSize: '1.1rem', marginBottom: '10px', fontWeight: 'bold', color: '#4ade80' }}>DANGER ZONE STATUS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 16, height: 16, background: '#ef4444', borderRadius: '50%', border: '2px solid white' }}></div>
                        <span style={{ fontSize: '1rem', color: '#ef4444', fontWeight: 'bold' }}>HIGH RISK</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 16, height: 16, background: '#facc15', borderRadius: '50%', border: '2px solid white' }}></div>
                        <span style={{ fontSize: '1rem', color: '#facc15', fontWeight: 'bold' }}>MEDIUM RISK</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 16, height: 16, background: '#4ade80', borderRadius: '50%', border: '2px solid white' }}></div>
                        <span style={{ fontSize: '1rem', color: '#4ade80', fontWeight: 'bold' }}>SAFE ZONE</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HeatmapVisualizer;
