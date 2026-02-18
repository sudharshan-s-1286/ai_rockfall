
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import {
    FaMicrochip, FaExclamationTriangle, FaBroadcastTower, FaMapMarkedAlt,
    FaChevronDown, FaShieldAlt, FaBolt, FaVideo, FaCloudSun, FaClipboardList,
    FaCube, FaUsers, FaHeartbeat, FaBell, FaMountain, FaNetworkWired,
    FaChartLine, FaBullhorn, FaCommentDots, FaLayerGroup, FaCloud, FaSearch
} from 'react-icons/fa';

const LandingPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('home');

    const heroRef = useRef(null);
    const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    const handleLoginNavigation = () => navigate('/login');

    return (
        <div style={{
            background: '#050505',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflowX: 'hidden',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Navbar */}
            <nav style={{
                position: 'fixed', top: 0, width: '100%', zIndex: 100,
                padding: '1.5rem 2rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(16px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                boxSizing: 'border-box'
            }}>
                <div
                    onClick={() => setActiveTab('home')}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                >
                    <FaShieldAlt size={28} color="var(--neon-green)" style={{ filter: 'drop-shadow(0 0 5px var(--neon-green))' }} />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '800', letterSpacing: '1px', margin: 0 }}>
                        <span style={{ color: 'var(--neon-green)', textShadow: '0 0 10px rgba(0,255,157,0.4)' }}>Rock</span>Sense
                    </h2>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    {/* Navigation Links */}
                    <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '5px', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <TabButton
                            active={activeTab === 'home'}
                            onClick={() => setActiveTab('home')}
                            label="Home"
                        />
                        <TabButton
                            active={activeTab === 'features'}
                            onClick={() => setActiveTab('features')}
                            label="Features"
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(0,243,255,0.4)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoginNavigation}
                        style={{
                            background: 'rgba(0,0,0,0.6)',
                            border: '1px solid var(--neon-cyan)',
                            color: 'var(--neon-cyan)',
                            padding: '10px 24px',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            letterSpacing: '0.5px',
                            boxShadow: '0 0 10px rgba(0,243,255,0.15)',
                            transition: 'all 0.3s ease',
                            textShadow: '0 0 5px rgba(0,243,255,0.5)'
                        }}
                    >
                        ADMIN LOGIN
                    </motion.button>
                </div>
            </nav>

            {/* Main Content Area */}
            <div style={{ flex: 1, paddingTop: '80px' }}>
                <AnimatePresence mode="wait">
                    {activeTab === 'home' ? (
                        <HomeView key="home" heroRef={heroRef} y={y} opacity={opacity} handleLoginNavigation={handleLoginNavigation} setActiveTab={setActiveTab} />
                    ) : (
                        <FeaturesView key="features" />
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            <footer style={{
                padding: '3rem 2rem', background: '#020202', borderTop: '1px solid #1a1a1a',
                textAlign: 'center', color: '#666', marginTop: 'auto'
            }}>
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', gap: '2rem' }}>
                    <a href="#" className="footer-link">Privacy Policy</a>
                    <a href="#" className="footer-link">Terms of Service</a>
                    <a href="#" className="footer-link">Contact Support</a>
                </div>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>&copy; 2026 RockSense Systems. All rights reserved.</p>
            </footer>

            {/* Global Styles for this component */}
            <style>{`
                .footer-link { color: #888; text-decoration: none; transition: color 0.2s; }
                .footer-link:hover { color: var(--neon-cyan); }
                
                /* Custom Scrollbar for the page */
                ::-webkit-scrollbar { width: 8px; }
                ::-webkit-scrollbar-track { background: #050505; }
                ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: var(--neon-green); }
            `}</style>
        </div>
    );
};

// --- Sub-Components ---

const TabButton = ({ active, onClick, label }) => (
    <motion.button
        onClick={onClick}
        layout
        style={{
            background: active ? 'var(--neon-cyan)' : 'transparent',
            color: active ? '#000' : '#aaa',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '50px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: active ? '700' : '500',
            position: 'relative',
            zIndex: 1,
            transition: 'color 0.2s',
            boxShadow: active ? '0 0 15px rgba(0,243,255,0.5)' : 'none'
        }}
    >
        {label}
    </motion.button>
);

const HomeView = ({ heroRef, y, opacity, handleLoginNavigation, setActiveTab }) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
    >
        {/* Hero Section */}
        <div ref={heroRef} style={{
            height: 'calc(100vh - 80px)', // Adjust for navbar
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden'
        }}>
            {/* Animated Background */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'radial-gradient(circle at 50% 50%, rgba(0,255,157,0.03) 0%, rgba(0,0,0,0) 60%)'
            }}></div>
            <div style={{
                position: 'absolute', top: '-10%', right: '-5%', width: '50vw', height: '50vw',
                background: 'radial-gradient(circle, rgba(0,243,255,0.06) 0%, rgba(0,0,0,0) 70%)',
                borderRadius: '50%', filter: 'blur(100px)', zIndex: 0
            }}></div>
            <div style={{
                position: 'absolute', bottom: '-10%', left: '-10%', width: '40vw', height: '40vw',
                background: 'radial-gradient(circle, rgba(255,0,60,0.04) 0%, rgba(0,0,0,0) 70%)',
                borderRadius: '50%', filter: 'blur(90px)', zIndex: 0
            }}></div>

            <motion.div style={{ zIndex: 10, textAlign: 'center', maxWidth: '1000px', padding: '0 20px', y, opacity }}>
                <motion.div
                    initial={{ opacity: 0, y: 50, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                >
                    <h1 style={{
                        fontSize: 'clamp(3.5rem, 7vw, 6rem)',
                        fontWeight: '900',
                        lineHeight: '1.1',
                        marginBottom: '1.5rem',
                        color: '#fff',
                        letterSpacing: '-2px',
                        textShadow: '0 0 30px rgba(0,0,0,0.5)'
                    }}>
                        AI-Driven Safety <br />
                        <span style={{
                            background: 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            filter: 'drop-shadow(0 0 40px rgba(0,255,157,0.3))'
                        }}> for Modern Mining</span>
                    </h1>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                    style={{
                        fontSize: 'clamp(1.1rem, 2vw, 1.4rem)',
                        color: '#bbb',
                        lineHeight: '1.6',
                        marginBottom: '3rem',
                        maxWidth: '750px',
                        marginLeft: 'auto',
                        marginRight: 'auto',
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}
                >
                    Real-time rockfall prediction, hazardous zone monitoring, and <br />
                    emergency response automation powered by heavy-duty AI.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center' }}
                >
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0,255,157,0.4)', background: 'linear-gradient(90deg, #00ff9d, #00f3ff)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleLoginNavigation}
                        style={{
                            background: 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))',
                            border: 'none', padding: '18px 48px', borderRadius: '50px',
                            color: '#000', fontWeight: '800', fontSize: '1.1rem', cursor: 'pointer',
                            letterSpacing: '0.5px',
                            boxShadow: '0 0 20px rgba(0,255,157,0.2)'
                        }}
                    >
                        GET STARTED
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.08)', borderColor: '#fff' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setActiveTab('features')}
                        style={{
                            background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                            padding: '18px 48px', borderRadius: '50px',
                            color: '#fff', fontSize: '1.1rem', cursor: 'pointer',
                            letterSpacing: '0.5px', fontWeight: '600'
                        }}
                    >
                        VIEW FEATURES
                    </motion.button>
                </motion.div>
            </motion.div>

            <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{ position: 'absolute', bottom: '40px', color: 'rgba(255,255,255,0.3)' }}
            >
                <FaChevronDown size={28} />
            </motion.div>
        </div>
    </motion.div>
);

const FeaturesView = () => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
            padding: '2rem',
            maxWidth: '1400px',
            margin: '0 auto',
            minHeight: '80vh',
            position: 'relative'
        }}
    >
        {/* Ambient Background for Features Tab */}
        <div style={{
            position: 'absolute', top: 0, left: 0, index: -1, width: '100%', height: '100%',
            background: `
                radial-gradient(circle at 15% 50%, rgba(0, 255, 157, 0.05) 0%, transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(157, 78, 221, 0.05) 0%, transparent 25%)
            `,
            pointerEvents: 'none'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '5rem', position: 'relative' }}>
            <h1 style={{
                fontSize: '4rem',
                fontWeight: '900',
                marginBottom: '1rem',
                color: 'transparent',
                backgroundImage: 'linear-gradient(180deg, #fff, #666)',
                WebkitBackgroundClip: 'text',
                filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))',
                letterSpacing: '-1px'
            }}>
                SYSTEM CAPABILITIES
            </h1>
            <p style={{
                fontSize: '1.2rem',
                color: '#var(--neon-cyan)',
                fontFamily: 'monospace',
                letterSpacing: '2px',
                opacity: 0.8
            }}>
                // ADVANCED MONITORING & SAFETY PROTOCOLS
            </p>
        </div>

        {/* Phase I: Current Features - Holographic Dashboard */}
        <FeatureSection
            title="ACTIVE MODULES"
            subtitle="PHASE I: CORE DEPLOYMENT"
            glowColor="var(--neon-green)"
        >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                <FeatureCard
                    variant="active"
                    icon={FaSearch}
                    title="AI Crack Detection Engine"
                    desc="Real-time computer vision processing for structural integrity analysis."
                />
                <FeatureCard
                    variant="active"
                    icon={FaVideo}
                    title="Live CCTV Monitoring"
                    desc="Continuous visual surveillance with automated anomaly flagging."
                />
                <FeatureCard
                    variant="active"
                    icon={FaExclamationTriangle}
                    title="Intelligent Risk Classification"
                    desc="Dynamic hazard categorization based on multi-sensor inputs."
                />
                <FeatureCard
                    variant="active"
                    icon={FaCloudSun}
                    title="Weather Integration Module"
                    desc="Real-time meteorological data correlation for risk assessment."
                />
                <FeatureCard
                    variant="active"
                    icon={FaClipboardList}
                    title="Alert Logging & Analytics"
                    desc="Comprehensive historical data tracking and trend analysis."
                />
                <FeatureCard
                    variant="active"
                    icon={FaCube}
                    title="3D Dynamic Visualization"
                    desc="Interactive digital twin of mining infrastructure."
                />
                <FeatureCard
                    variant="active"
                    icon={FaUsers}
                    title="Workforce Management"
                    desc="Shift optimization and personnel tracking safety systems."
                />
                <FeatureCard
                    variant="active"
                    icon={FaHeartbeat}
                    title="Device Health Monitor"
                    desc="Self-diagnostic framework for sensor network integrity."
                />
                <FeatureCard
                    variant="active"
                    icon={FaBell}
                    title="Emergency Control System"
                    desc="Automated evacuation protocols and alert dissemination."
                />
            </div>
        </FeatureSection>

        {/* Phase II: Upcoming Features - Schematic Blueprint */}
        <FeatureSection
            title="DEVELOPMENT PIPELINE"
            subtitle="PHASE II: INFRASTRUCTURE EXPANSION"
            glowColor="#9d4edd"
            isUpcoming
        >
            <div style={{
                background: 'rgba(157, 78, 221, 0.05)',
                border: '1px dashed rgba(157, 78, 221, 0.4)',
                padding: '1rem 2rem',
                borderRadius: '4px',
                marginBottom: '3rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '1rem',
                fontFamily: 'monospace'
            }}>
                <div style={{ width: '10px', height: '10px', background: '#9d4edd', borderRadius: '50%', boxShadow: '0 0 10px #9d4edd' }} className="blink-anim" />
                <span style={{ color: '#e0aaff', fontSize: '0.9rem', letterSpacing: '1px' }}>
                    STATUS: IMPLEMENTATION IN PROGRESS
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
                <FeatureCard variant="blueprint" icon={FaMicrochip} title="Industrial-Grade Hardware Integration Platform" />
                <FeatureCard variant="blueprint" icon={FaMountain} title="Multi-Sensor Slope Stability Monitoring System" />
                <FeatureCard variant="blueprint" icon={FaNetworkWired} title="Advanced Sensor Data Fusion Architecture" />
                <FeatureCard variant="blueprint" icon={FaChartLine} title="Predictive Rockfall Risk Forecasting Engine" />
                <FeatureCard variant="blueprint" icon={FaBullhorn} title="Probability-Based Early Warning System" />
                <FeatureCard variant="blueprint" icon={FaCommentDots} title="Automated Multi-Channel Alerting (SMS & Email)" />
                <FeatureCard variant="blueprint" icon={FaMapMarkedAlt} title="GIS-Enabled Dynamic Risk Heatmap Visualization" />
                <FeatureCard variant="blueprint" icon={FaLayerGroup} title="Digital Elevation Model (DEM) Integration" />
                <FeatureCard variant="blueprint" icon={FaCloud} title="Scalable Multi-Site Cloud Monitoring Infrastructure" />
            </div>
        </FeatureSection>

        <style>{`
            .blink-anim { animation: blink 2s infinite; }
            @keyframes blink { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }
            
            .feature-card-active {
                background: linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(0,255,157,0.02) 100%);
                border: 1px solid rgba(0,255,157,0.1);
                box-shadow: 0 4px 30px rgba(0,0,0,0.5);
                backdrop-filter: blur(10px);
            }
            .feature-card-active:hover {
                border-color: var(--neon-green);
                box-shadow: 0 0 30px rgba(0,255,157,0.15), inset 0 0 20px rgba(0,255,157,0.05);
            }
            .feature-card-active::before { /* Top Left Bracket */
                content: ''; position: absolute; top: 0; left: 0; width: 20px; height: 20px;
                border-top: 2px solid var(--neon-green); border-left: 2px solid var(--neon-green);
                opacity: 0; transition: opacity 0.3s;
            }
            .feature-card-active::after { /* Bottom Right Bracket */
                content: ''; position: absolute; bottom: 0; right: 0; width: 20px; height: 20px;
                border-bottom: 2px solid var(--neon-green); border-right: 2px solid var(--neon-green);
                opacity: 0; transition: opacity 0.3s;
            }
            .feature-card-active:hover::before, .feature-card-active:hover::after { opacity: 1; }

            .feature-card-blueprint {
                background-color: #050510;
                background-image: linear-gradient(rgba(157, 78, 221, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(157, 78, 221, 0.1) 1px, transparent 1px);
                background-size: 20px 20px;
                border: 1px dashed rgba(157, 78, 221, 0.3);
            }
            .feature-card-blueprint:hover {
                background-color: #0a0a20;
                border-color: rgba(157, 78, 221, 0.6);
            }
        `}</style>
    </motion.div>
);

const FeatureSection = ({ title, subtitle, children, glowColor, isUpcoming }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        style={{ marginBottom: '6rem' }}
    >
        <div style={{
            display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '3rem',
            borderLeft: `4px solid ${glowColor}`, paddingLeft: '1.5rem'
        }}>
            <h2 style={{
                fontSize: '2.5rem', fontWeight: '800', margin: 0, color: '#fff',
                textTransform: 'uppercase', letterSpacing: '1px',
                textShadow: `0 0 20px ${glowColor}40`
            }}>
                {title}
            </h2>
            <span style={{
                fontSize: '1rem', color: glowColor, fontWeight: '600',
                fontFamily: 'monospace', letterSpacing: '2px'
            }}>
                {subtitle}
            </span>
        </div>
        {children}
    </motion.div>
);

const FeatureCard = ({ variant = 'active', icon: Icon, title, desc }) => {
    const isBlueprint = variant === 'blueprint';
    const mainColor = isBlueprint ? '#9d4edd' : 'var(--neon-green)';

    return (
        <motion.div
            className={isBlueprint ? "feature-card-blueprint" : "feature-card-active"}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ y: -5 }}
            transition={{ duration: 0.3 }}
            style={{
                padding: '2rem',
                borderRadius: isBlueprint ? '4px' : '12px',
                display: 'flex', flexDirection: 'column', gap: '1.2rem',
                position: 'relative',
                overflow: 'hidden',
                cursor: 'default'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                    width: '48px', height: '48px',
                    borderRadius: isBlueprint ? '4px' : '8px',
                    background: isBlueprint ? 'rgba(157, 78, 221, 0.1)' : 'rgba(0, 255, 157, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${mainColor}40`
                }}>
                    <Icon size={22} color={mainColor} style={{ opacity: isBlueprint ? 0.8 : 1 }} />
                </div>
                {isBlueprint && <FaBolt size={14} color={mainColor} style={{ opacity: 0.5 }} />}
            </div>

            <div>
                <h3 style={{
                    fontSize: '1.1rem', fontWeight: '700', color: '#fff',
                    marginBottom: '0.5rem', letterSpacing: '0.5px',
                    fontFamily: isBlueprint ? 'monospace' : 'inherit'
                }}>
                    {title}
                </h3>
                {desc && (
                    <p style={{
                        color: '#888', fontSize: '0.9rem', lineHeight: '1.5',
                        fontFamily: isBlueprint ? 'monospace' : 'inherit'
                    }}>
                        {desc}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default LandingPage;
