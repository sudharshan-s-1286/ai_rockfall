import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaMicrochip, FaExclamationTriangle, FaBroadcastTower, FaMapMarkedAlt } from 'react-icons/fa';

const LandingPage = () => {
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);

    const scrollToFeatures = () => {
        document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToTop = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleLoginNavigation = () => {
        console.log("Navigating to login...");
        navigate('/login');
    };

    return (
        <div ref={scrollContainerRef} style={{
            height: '100vh',
            width: '100vw',
            background: '#050505',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            position: 'relative',
            overflowY: 'auto', /* Allow scroll for full page content */
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Background Ambience */}
            <div style={{
                position: 'fixed', top: '-10%', left: '-10%', width: '50%', height: '50%',
                background: 'radial-gradient(circle, rgba(0,255,157,0.1) 0%, rgba(0,0,0,0) 70%)',
                zIndex: 0, pointerEvents: 'none'
            }}></div>
            <div style={{
                position: 'fixed', bottom: '-10%', right: '-10%', width: '50%', height: '50%',
                background: 'radial-gradient(circle, rgba(0,243,255,0.1) 0%, rgba(0,0,0,0) 70%)',
                zIndex: 0, pointerEvents: 'none'
            }}></div>

            {/* Navbar */}
            <nav style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.5rem 3rem', position: 'sticky', top: 0, zIndex: 100,
                background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)',
                flex: '0 0 auto', boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '20px solid var(--neon-green)' }}></div>
                    <h2 style={{ fontSize: '1.4rem', letterSpacing: '2px', margin: 0 }}>
                        <span style={{ color: 'var(--neon-green)' }}>Rock</span>Sense
                    </h2>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                    <a href="#" onClick={(e) => { e.preventDefault(); scrollToTop(); }} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Home</a>
                    <a href="#features" onClick={(e) => { e.preventDefault(); scrollToFeatures(); }} style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Features</a>
                    <a href="#contact" style={{ color: '#aaa', textDecoration: 'none', fontSize: '0.9rem' }}>Contact</a>
                    <button
                        onClick={handleLoginNavigation}
                        className="hover-glow"
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--neon-cyan)',
                            color: 'var(--neon-cyan)',
                            padding: '8px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            letterSpacing: '1px',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 0 10px rgba(0,243,255,0.2)'
                        }}
                    >
                        ADMIN LOGIN
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4rem 6rem', position: 'relative', zIndex: 10, minHeight: '80vh'
            }}>
                {/* Text Content */}
                <div style={{ maxWidth: '600px' }}>
                    <h1 style={{
                        fontSize: '3rem', lineHeight: '1.2', marginBottom: '1.5rem',
                        background: 'linear-gradient(to right, #fff, #aaa)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                    }}>
                        Ai RockFall Prediction <br />
                        and Monitoring System
                    </h1>
                    <p style={{ color: '#888', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '2.5rem' }}>
                        Real-time AI monitoring for early crack detection and risk prevention in underground mines. Ensure safety with RockSense.
                    </p>
                    <div style={{ display: 'flex', gap: '1.5rem' }}>
                        <button
                            onClick={handleLoginNavigation}
                            style={{
                                background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-green))',
                                border: 'none', padding: '12px 28px', borderRadius: '30px',
                                color: '#000', fontWeight: 'bold', letterSpacing: '1px', cursor: 'pointer',
                                boxShadow: '0 0 20px rgba(0,255,157,0.4)', fontSize: '0.9rem'
                            }}>
                            GET STARTED
                        </button>
                        <button
                            onClick={scrollToFeatures}
                            style={{
                                background: 'transparent', border: '1px solid #444',
                                padding: '12px 28px', borderRadius: '30px',
                                color: '#fff', letterSpacing: '1px', cursor: 'pointer', fontSize: '0.9rem'
                            }}>
                            LEARN MORE
                        </button>
                    </div>
                </div>

                {/* Visual Content */}
                <div style={{
                    flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
                    position: 'relative'
                }}>
                    {/* Abstract Hologram Representation */}
                    <div style={{
                        width: '450px', height: '300px',
                        background: 'rgba(0,20,40,0.5)',
                        border: '1px solid rgba(0,243,255,0.3)',
                        borderRadius: '20px',
                        position: 'relative',
                        transform: 'perspective(1000px) rotateY(-15deg) rotateX(10deg)',
                        boxShadow: '0 0 50px rgba(0,243,255,0.1)',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <div style={{ position: 'absolute', top: '20px', left: '20px', color: 'var(--neon-red)', fontSize: '0.8rem', fontWeight: 'bold' }}>RISK LEVEL: HIGH</div>
                        <div style={{
                            position: 'absolute', inset: '10px',
                            background: 'linear-gradient(rgba(0,243,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,243,255,0.05) 1px, transparent 1px)',
                            backgroundSize: '20px 20px', borderRadius: '15px'
                        }}></div>
                        <div style={{ position: 'absolute', top: '40%', left: '30%', width: '10px', height: '10px', background: 'yellow', borderRadius: '50%', boxShadow: '0 0 10px yellow' }}></div>
                        <div style={{ position: 'absolute', top: '60%', left: '70%', width: '10px', height: '10px', background: 'red', borderRadius: '50%', boxShadow: '0 0 10px red' }}></div>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div id="features" style={{ padding: '4rem 6rem', position: 'relative', zIndex: 10, background: 'rgba(0,0,0,0.5)' }}>
                <h2 style={{ textAlign: 'center', color: 'var(--neon-green)', marginBottom: '3rem', fontSize: '2rem' }}>Core Features</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <FeatureCard
                        icon={FaMicrochip}
                        title="YOLO Crack Detection"
                        desc="Advanced computer vision to detect micro-cracks in real-time."
                    />
                    <FeatureCard
                        icon={FaBroadcastTower}
                        title="IoT Sensor Integration"
                        desc="Seamlessly connects with environmental sensors for holistic monitoring."
                    />
                    <FeatureCard
                        icon={FaExclamationTriangle}
                        title="Instant Emergency Alarms"
                        desc="Automated audible and visual alerts when critical thresholds are breached."
                    />
                    <FeatureCard
                        icon={FaMapMarkedAlt}
                        title="3D Mine Mapping"
                        desc="Visualize risk zones and personnel location on an interactive 3D map."
                    />
                </div>
            </div>

            {/* Contact Section */}
            <div id="contact" style={{ padding: '4rem 6rem', position: 'relative', zIndex: 10, textAlign: 'center' }}>
                <h2 style={{ color: 'var(--neon-cyan)', marginBottom: '1.5rem' }}>Contact Us</h2>
                <p style={{ color: '#aaa', marginBottom: '2rem' }}>Interested in deploying RockSense or need a demo?</p>

                <div className="glass-panel" style={{ display: 'inline-block', padding: '2rem', textAlign: 'left' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: 'var(--neon-green)' }}>Email:</strong> demo@rocksensesystems.com
                    </div>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: 'var(--neon-green)' }}>Phone:</strong> +1 (555) 123-4567
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <strong style={{ color: 'var(--neon-green)' }}>HQ:</strong> 123 Mining Tech Park, Innovation City
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ padding: '2rem', textAlign: 'center', color: '#666', fontSize: '0.8rem', borderTop: '1px solid #222' }}>
                &copy; 2024 RockSense Systems. All rights reserved.
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, desc }) => (
    <div className="glass-panel" style={{ padding: '2rem', transition: 'transform 0.3s ease' }}>
        <Icon size={40} color="var(--neon-cyan)" style={{ marginBottom: '1rem' }} />
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.2rem' }}>{title}</h3>
        <p style={{ color: '#aaa', lineHeight: '1.5', fontSize: '0.9rem' }}>{desc}</p>
    </div>
);

const FeatureIcon = ({ icon: Icon, title }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.7 }}>
        <Icon size={24} color="var(--neon-cyan)" style={{ marginBottom: '1rem' }} />
        <span style={{ fontSize: '0.9rem', letterSpacing: '0.5px' }}>{title}</span>
    </div>
);

export default LandingPage;
