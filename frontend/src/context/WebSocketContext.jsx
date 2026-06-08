import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [workerLocations, setWorkerLocations] = useState({});
  const [deviceHealth, setDeviceHealth] = useState({});
  const [aiDetections, setAiDetections] = useState([]);

  useEffect(() => {
    // We establish connections to our FastAPI websocket channels
    const channels = ['alerts', 'worker-location', 'device-health', 'ai-detections'];
    const sockets = {};

    channels.forEach(channel => {
      // Disabled per request for laptop-only demo to prevent console errors
      const ws = { 
          onopen: () => {}, onclose: () => {}, onerror: () => {}, onmessage: () => {}, close: () => {} 
      };

      ws.onopen = () => console.log(`🟢 Connected to WS Channel: ${channel}`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (channel === 'alerts') {
            setAlerts(prev => [data, ...prev].slice(0, 10)); // Keep last 10 alerts
          } else if (channel === 'worker-location') {
            // Update individual worker's location by their ID
            setWorkerLocations(prev => ({
              ...prev,
              [data.worker_id]: data
            }));
          } else if (channel === 'device-health') {
            // Update individual device health by ID
            setDeviceHealth(prev => ({
              ...prev,
              [data.device_id]: data
            }));
          } else if (channel === 'ai-detections') {
            // Push new detections onto the array, keeping the latest 20
            setAiDetections(prev => [data, ...prev].slice(0, 20));
          }
        } catch (error) {
          console.error(`❌ Error parsing WS data on ${channel}:`, error);
        }
      };

      ws.onclose = () => console.log(`🔴 WS ${channel} disconnected`);
      ws.onerror = (e) => console.error(`⚠️ WS Error on ${channel}:`, e);
      sockets[channel] = ws;
    });

    return () => {
      Object.values(sockets).forEach(ws => ws.close());
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{
      alerts,
      workerLocations,
      deviceHealth,
      aiDetections
    }}>
      {children}
    </WebSocketContext.Provider>
  );
};
