import React from 'react';
import { FaMountain } from 'react-icons/fa';

const Navbar = ({ connectionStatus }) => {
    return (
        <nav className="glass-panel" style={{
            padding: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FaMountain size={28} color="var(--neon-green)" />
                <h1 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '2px' }}>
                    <span className="neon-text-green">Rock</span>Sense
                </h1>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    SYSTEM STATUS:
                    <span style={{
                        color: connectionStatus === 'ONLINE' ? 'var(--neon-green)' : 'var(--neon-red)',
                        fontWeight: 'bold',
                        marginLeft: '8px'
                    }}>
                        {connectionStatus}
                    </span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
