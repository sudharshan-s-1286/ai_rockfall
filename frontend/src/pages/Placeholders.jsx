import React from 'react';

const Placeholder = ({ title }) => (
    <div style={{ textAlign: 'center', marginTop: '100px', color: '#666' }}>
        <h1>{title}</h1>
        <p>Under Construction</p>
    </div>
);

export const LiveMonitor = () => <Placeholder title="Live Monitor" />;
// export const ImageAnalysis = () => <Placeholder title="Image Analysis" />; // Will use existing Home
export const EmergencyControl = () => <Placeholder title="Emergency Control" />;
export const HistoryLogs = () => <Placeholder title="History Logs" />;
export const WeatherIntel = () => <Placeholder title="Weather Intelligence" />;
export const MineMap = () => <Placeholder title="3D Mine Map" />;
export const DeviceHealth = () => <Placeholder title="Device Health" />;
export const Settings = () => <Placeholder title="Settings" />;
