import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import {
    FaVideo, FaImage, FaExclamationTriangle, FaHistory,
    FaCloudSun, FaMapMarkedAlt, FaServer, FaCog, FaMountain, FaUserShield,
    FaSignOutAlt, FaUsers
} from 'react-icons/fa';

const SidebarItem = ({ to, icon: Icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `sidebar-item ${isActive ? 'active' : ''}`
        }
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            textDecoration: 'none',
            color: 'var(--text-secondary)',
            borderRadius: '8px',
            transition: 'all 0.2s ease',
            marginBottom: '4px'
        }}
    >
        {({ isActive }) => (
            <>
                <Icon size={20} color={isActive ? 'var(--neon-cyan)' : 'inherit'} />
                <span style={{
                    color: isActive ? '#fff' : 'inherit',
                    fontWeight: isActive ? '600' : '400',
                    letterSpacing: '0.5px'
                }}>
                    {label}
                </span>
            </>
        )}
    </NavLink>
);

const Layout = ({ connectionStatus }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated'); // Clear auth
        navigate('/');
    };

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div className="glass-panel" style={{
                width: '260px',
                height: '100%',
                borderRadius: 0,
                borderRight: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                padding: '1.5rem',
                zIndex: 10
            }}>
                {/* Brand */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem', paddingLeft: '8px' }}>
                    <FaMountain size={24} color="var(--neon-green)" />
                    <h2 style={{ margin: 0, fontSize: '1.4rem', letterSpacing: '2px' }}>
                        <span className="neon-text-green">Rock</span>Sense
                    </h2>
                </div>

                {/* Navigation */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                    <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '8px', paddingLeft: '12px', fontWeight: 'bold' }}>MONITORING</div>
                    <SidebarItem to="/live" icon={FaVideo} label="Live Monitor" />
                    <SidebarItem to="/analysis" icon={FaImage} label="Image Analysis" />
                    <SidebarItem to="/map" icon={FaMapMarkedAlt} label="3D Mine Map" />

                    <div style={{ fontSize: '0.75rem', color: '#666', margin: '20px 0 8px', paddingLeft: '12px', fontWeight: 'bold' }}>SAFETY</div>
                    <SidebarItem to="/emergency" icon={FaExclamationTriangle} label="Emergency" />
                    <SidebarItem to="/health" icon={FaServer} label="Device Health" />
                    <SidebarItem to="/weather" icon={FaCloudSun} label="Weather Intel" />

                    <div style={{ fontSize: '0.75rem', color: '#666', margin: '20px 0 8px', paddingLeft: '12px', fontWeight: 'bold' }}>DATA</div>
                    <SidebarItem to="/admin" icon={FaUserShield} label="Administration" />
                    <SidebarItem to="/history" icon={FaHistory} label="History Logs" />
                    <SidebarItem to="/settings" icon={FaCog} label="Settings" />

                    <div style={{ fontSize: '0.75rem', color: '#666', margin: '20px 0 8px', paddingLeft: '12px', fontWeight: 'bold' }}>MANAGEMENT</div>
                    <SidebarItem to="/workers" icon={FaUsers} label="Worker Mgmt" />

                    <div style={{ height: '1px', background: 'var(--border-color)', margin: '16px 0' }}></div>

                    <button
                        onClick={handleLogout}
                        className="sidebar-item"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                            background: 'transparent', border: 'none', width: '100%', cursor: 'pointer',
                            color: '#ff4444', borderRadius: '8px', fontSize: '1rem', textAlign: 'left'
                        }}
                    >
                        <FaSignOutAlt size={20} />
                        <span>Logout</span>
                    </button>
                </div>

                {/* Status Footer */}
                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Thinking Engine</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <div style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: connectionStatus === 'ONLINE' ? 'var(--neon-green)' : 'var(--neon-red)',
                            boxShadow: connectionStatus === 'ONLINE' ? '0 0 8px var(--neon-green)' : 'none'
                        }}></div>
                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>
                            {connectionStatus === 'ONLINE' ? 'SYSTEM ONLINE' : 'DISCONNECTED'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                
                {/* Top Bar */}
                <div style={{ 
                    height: '60px', 
                    borderBottom: '1px solid var(--border-color)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '0 2rem',
                    background: 'rgba(0, 0, 0, 0.2)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffeb3b' }}>
                        <FaMapMarkedAlt size={18} />
                        <span style={{ fontWeight: '500', fontSize: '1rem', color: '#fff' }}>
                            Current Location : <span style={{ color: 'var(--neon-green)' }}>Indian Institute of Technology Madras</span>
                        </span>
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '2rem' }}>
                    <Outlet />
                </div>
            </div>

            <style>{`
        .sidebar-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .sidebar-item.active {
          background: rgba(0, 243, 255, 0.1);
          border-left: 3px solid var(--neon-cyan);
        }
      `}</style>
        </div>
    );
};

export default Layout;
