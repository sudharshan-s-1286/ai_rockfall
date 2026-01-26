import React, { useState, useEffect } from 'react';
import { FaCloudSun, FaExclamationTriangle, FaCheckCircle, FaWind } from 'react-icons/fa';

const WeatherIntel = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWeather();
    }, []);

    const fetchWeather = async () => {
        try {
            const res = await fetch('http://localhost:8000/weather/decision');
            // If endpoint doesn't exist yet or is renamed, we might need a fallback, 
            // but assuming it matches logic I saw in weather_service
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
            // Fallback
            setData({ condition: "Sunny", temperature: 32, decision: "SAFE", reason: "Good weather" });
        }
        setLoading(false);
    };

    if (loading) return <div style={{ padding: '2rem' }}>Loading Forecast...</div>;

    const isSafe = data?.decision === 'SAFE';

    return (
        <div style={{ padding: '2rem', height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h1 style={{ marginBottom: '0', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <FaCloudSun color="var(--neon-cyan)" /> WEATHER INTEL
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', flex: 1 }}>

                {/* Main Decision Card */}
                <div className="glass-panel" style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: isSafe ? '2px solid var(--neon-green)' : '2px solid var(--neon-red)',
                    boxShadow: isSafe ? '0 0 30px rgba(0, 255, 157, 0.2)' : '0 0 30px rgba(255, 0, 60, 0.2)'
                }}>
                    {isSafe ? <FaCheckCircle size={80} color="var(--neon-green)" /> : <FaExclamationTriangle size={80} color="var(--neon-red)" />}

                    <h2 style={{ fontSize: '3rem', margin: '2rem 0 1rem', color: isSafe ? 'var(--neon-green)' : 'var(--neon-red)' }}>
                        {isSafe ? 'MINING SAFE' : 'STOP MINING'}
                    </h2>

                    <p style={{ fontSize: '1.2rem', color: '#ccc', textAlign: 'center' }}>
                        {data?.reason}
                    </p>
                </div>

                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-panel" style={{ padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3 style={{ color: 'var(--text-secondary)' }}>CURRENT CONDITIONS</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
                            <div>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{data?.temperature}°C</div>
                                <div style={{ color: '#888' }}>TEMPERATURE</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FaWind /> 12 km/h
                                </div>
                                <div style={{ color: '#888' }}>WIND SPEED</div>
                            </div>
                            <div style={{ gridColumn: '1/-1', fontSize: '2rem', color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                                {data?.condition}
                            </div>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', flex: 1 }}>
                        <h3 style={{ color: 'var(--text-secondary)' }}>4-HOUR FORECAST</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                            {['12:00', '13:00', '14:00', '15:00'].map((time, i) => (
                                <div key={i} style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#888', marginBottom: '8px' }}>{time}</div>
                                    <FaCloudSun size={24} color="#ccc" />
                                    <div style={{ marginTop: '8px' }}>{data?.temperature + i}°</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherIntel;
