import React, { useState, useEffect } from 'react';
import { FaCloudSun, FaExclamationTriangle, FaCheckCircle, FaWind, FaTint, FaThermometerHalf, FaHistory } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const WeatherIntel = () => {
    const [data, setData] = useState(null);
    const [history, setHistory] = useState([]);
    const [forecast, setForecast] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWeather();
        fetchHistory();
        fetchForecast();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await fetch('http://localhost:8000/history/weather?limit=10');
            const json = await res.json();
            setHistory(Array.isArray(json) ? json : []);
        } catch (e) {
            console.error("Failed to fetch history", e);
        }
    };

    const fetchWeather = async () => {
        try {
            const res = await fetch('http://localhost:8000/weather/decision');
            const json = await res.json();
            setData(json);
        } catch (e) {
            console.error(e);
            setData({ condition: "Sunny", temperature: 32, decision: "SAFE", reason: "System offline, displaying fallback data." });
        }
        setLoading(false);
    };

    const fetchForecast = async () => {
        try {
            const res = await fetch('http://localhost:8000/weather/forecast');
            const json = await res.json();
            if (json.list) {
                // Map to chart data format
                const chartData = json.list.map(item => {
                    const date = new Date(item.dt * 1000);
                    return {
                        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
                        temp: item.main.temp,
                        rain: item.rain ? item.rain['3h'] || 0 : 0
                    };
                });
                
                // If it's 3-hourly, we might have multiple per day. Deduplicate to 1 per day.
                const dailyData = chartData.reduce((acc, curr) => {
                    if (!acc.find(item => item.day === curr.day)) {
                        acc.push(curr);
                    }
                    return acc;
                }, []);
                
                setForecast(dailyData.slice(0, 7)); // Take up to 7 days
            }
        } catch (e) {
            console.error("Failed to fetch forecast", e);
            // Fallback chart data
            setForecast([
                { day: 'Mon', temp: 32 }, { day: 'Tue', temp: 33 }, { day: 'Wed', temp: 30 },
                { day: 'Thu', temp: 28 }, { day: 'Fri', temp: 29 }, { day: 'Sat', temp: 31 }, { day: 'Sun', temp: 32 }
            ]);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--neon-cyan)' }}>
            <FaCloudSun size={50} className="spin" />
            <span style={{ marginLeft: '1rem', fontSize: '1.5rem' }}>Analyzing Atmospherics...</span>
        </div>
    );

    const isSafe = data?.decision === 'SAFE';
    const riskColor = data?.risk_level === 'HIGH' ? 'var(--neon-red)' : data?.risk_level === 'MEDIUM' ? 'var(--warning)' : 'var(--neon-green)';

    return (
        <div style={{ padding: '2rem', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '15px', fontSize: '2rem', letterSpacing: '2px' }}>
                    <FaCloudSun color="var(--neon-cyan)" />
                    <span style={{ background: '-webkit-linear-gradient(45deg, #00f2ea, #00c6fb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        WEATHER INTEL
                    </span>
                </h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <span className="badge" style={{ background: 'rgba(0, 242, 234, 0.1)', color: 'var(--neon-cyan)', border: '1px solid var(--neon-cyan)' }}>
                        LIVE FEED
                    </span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1.5fr', gap: '2rem', flex: 1 }}>

                {/* Left Column: Decision & Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Main Decision Card */}
                    <div className="glass-panel" style={{
                        padding: '3rem 2rem',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${isSafe ? 'var(--neon-green)' : 'var(--neon-red)'}`,
                        background: `linear-gradient(145deg, rgba(0,0,0,0.6), ${isSafe ? 'rgba(0,255,157,0.05)' : 'rgba(255,0,60,0.05)'})`,
                        boxShadow: `0 0 50px ${isSafe ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 0, 60, 0.1)'}`,
                        position: 'relative', overflow: 'hidden'
                    }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: isSafe ? 'var(--neon-green)' : 'var(--neon-red)' }} />

                        {isSafe ? <FaCheckCircle size={80} color="var(--neon-green)" style={{ filter: 'drop-shadow(0 0 10px var(--neon-green))' }} />
                            : <FaExclamationTriangle size={80} color="var(--neon-red)" style={{ filter: 'drop-shadow(0 0 10px var(--neon-red))' }} />}

                        <h2 style={{ fontSize: '3.5rem', margin: '1.5rem 0 0.5rem', color: isSafe ? 'var(--neon-green)' : 'var(--neon-red)', letterSpacing: '3px' }}>
                            {isSafe ? 'SAFE' : 'HALT'}
                        </h2>
                        <span style={{ fontSize: '1.2rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '2px', opacity: 0.8 }}>
                            MINING OPERATIONS
                        </span>

                        <div style={{ marginTop: '2rem', background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${isSafe ? 'var(--neon-green)' : 'var(--neon-red)'}` }}>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: '#eee', fontStyle: 'italic' }}>
                                "{data?.recommendation || data?.reason}"
                            </p>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaThermometerHalf /> CURRENT CONDITIONS
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{data?.temperature}°C</div>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>TEMPERATURE</div>
                            </div>
                            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>{data?.humidity || 65}%</div>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>HUMIDITY</div>
                            </div>
                            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    <FaWind size={24} /> {data?.wind_speed || 12} <small style={{ fontSize: '1rem' }}>km/h</small>
                                </div>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>WIND SPEED</div>
                            </div>
                            <div className="metric-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--neon-cyan)', textTransform: 'uppercase' }}>
                                    {data?.condition}
                                </div>
                                <div style={{ color: '#888', fontSize: '0.9rem', marginTop: '5px' }}>CONDITION</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: History & Forecast */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* 7-Day Forecast Chart */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <h3 style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <FaCloudSun /> 7-DAY FORECAST & RISK TREND
                        </h3>
                        <div style={{ width: '100%', height: '200px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={forecast}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis 
                                        dataKey="day" 
                                        stroke="#888" 
                                        fontSize={12} 
                                        tickLine={false} 
                                        axisLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #333', borderRadius: '8px' }}
                                        labelStyle={{ color: 'var(--neon-green)', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="temp" 
                                        stroke="var(--neon-cyan)" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: 'var(--neon-cyan)', strokeWidth: 0 }}
                                        activeDot={{ r: 6, fill: '#fff', stroke: 'var(--neon-cyan)', strokeWidth: 2 }}
                                        name="Temp (°C)"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Report History */}
                    <div className="glass-panel" style={{ padding: '0', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 style={{ margin: 0, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <FaHistory /> RECENT ALERTS & LOGS
                            </h3>
                        </div>
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
                                <thead style={{ background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontSize: '0.9rem' }}>Time</th>
                                        <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontSize: '0.9rem' }}>Condition</th>
                                        <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontSize: '0.9rem' }}>Risk</th>
                                        <th style={{ padding: '15px', textAlign: 'left', color: '#aaa', fontSize: '0.9rem' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {history.map((log, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={{ padding: '15px' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: log.condition.includes('Rain') ? 'var(--neon-blue)' : 'var(--neon-yellow)' }} />
                                                    {log.condition}
                                                </div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold',
                                                    background: log.risk_level === 'HIGH' ? 'rgba(255,0,0,0.2)' : (log.risk_level === 'MEDIUM' ? 'rgba(255,165,0,0.2)' : 'rgba(0,255,0,0.2)'),
                                                    color: log.risk_level === 'HIGH' ? 'var(--neon-red)' : (log.risk_level === 'MEDIUM' ? 'orange' : 'var(--neon-green)')
                                                }}>
                                                    {log.risk_level}
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px', color: '#ccc', fontStyle: 'italic', fontSize: '0.9rem' }}>{log.recommendation}</td>
                                        </tr>
                                    ))}
                                    {history.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No recent history available</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeatherIntel;
