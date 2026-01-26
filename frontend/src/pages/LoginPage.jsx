import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaMountain, FaArrowLeft } from 'react-icons/fa';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            const res = await fetch('http://localhost:8000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: username, password: password })
            });

            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('isAuthenticated', 'true');
                localStorage.setItem('userRole', data.role);
                localStorage.setItem('userName', data.name);
                navigate('/live');
            } else {
                setError(data.detail || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            setError('Connection error. Is backend running?');
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: '#050505',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 157, 0.05), transparent 70%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden'
        }}>
            <div className="glass-panel" style={{
                width: '400px',
                padding: '3rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 0 50px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,255,157,0.05)'
            }}>
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    style={{
                        position: 'absolute',
                        top: '20px',
                        left: '20px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--neon-green)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '0.9rem',
                        transition: 'transform 0.2s ease',
                        zIndex: 100
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(-3px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                    <FaArrowLeft /> Back
                </button>

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                    <FaMountain size={32} color="var(--neon-green)" />
                    <h2 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '2px' }}>
                        <span style={{ color: 'var(--neon-green)' }}>Rock</span>Sense
                    </h2>
                </div>

                <h3 style={{
                    marginBottom: '2rem', color: '#888', letterSpacing: '2px',
                    fontSize: '0.9rem', textTransform: 'uppercase'
                }}>
                    Secure Admin Login
                </h3>

                <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div style={{ position: 'relative' }}>
                        <FaUser style={{ position: 'absolute', left: '15px', top: '14px', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ position: 'relative' }}>
                        <FaLock style={{ position: 'absolute', left: '15px', top: '14px', color: '#666' }} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {error && <div style={{ color: 'var(--neon-red)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</div>}

                    <button
                        type="submit"
                        style={{
                            background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))',
                            border: 'none',
                            padding: '12px',
                            borderRadius: '8px',
                            color: '#000',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            marginTop: '1rem',
                            boxShadow: '0 0 15px rgba(0,255,157,0.3)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        LOGIN
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <a href="#" style={{ color: '#666', fontSize: '0.8rem', textDecoration: 'none' }}>Forgot Password?</a>
                    </div>
                </form>
            </div>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '12px 12px 12px 45px',
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '1rem',
    outline: 'none',
    boxSizing: 'border-box'
};

export default LoginPage;
