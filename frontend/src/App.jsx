import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LiveMonitor from './pages/LiveMonitor';
import ImageAnalysis from './pages/ImageAnalysis';
import EmergencyControl from './pages/EmergencyControl';
import HistoryLogs from './pages/HistoryLogs';
import WeatherIntel from './pages/WeatherIntel';
import MineMap from './pages/MineMap';
import AdminPage from './pages/AdminPage';
import DeviceHealth from './pages/DeviceHealth';
import Settings from './pages/Settings';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// Simple Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  const [connectionStatus, setConnectionStatus] = useState('OFFLINE');

  // Global System Health Poll
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/health/device-status');
        const data = await res.json();
        if (data.arduino === 'CONNECTED') {
          setConnectionStatus('ONLINE');
        } else {
          setConnectionStatus('OFFLINE');
        }
      } catch (e) {
        setConnectionStatus('ERROR');
      }
    };

    // Only poll if authenticated to save resources/errors
    if (localStorage.getItem('isAuthenticated') === 'true') {
      checkHealth();
      const interval = setInterval(checkHealth, 5000);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Dashboard Routes */}
      <Route element={
        <ProtectedRoute>
          <Layout connectionStatus={connectionStatus} />
        </ProtectedRoute>
      }>
        <Route path="/live" element={<LiveMonitor />} />
        <Route path="/analysis" element={<ImageAnalysis />} />
        <Route path="/map" element={<MineMap />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/emergency" element={<EmergencyControl />} />
        <Route path="/history" element={<HistoryLogs />} />
        <Route path="/weather" element={<WeatherIntel />} />
        <Route path="/health" element={<DeviceHealth />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* Catch all - redirect to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
