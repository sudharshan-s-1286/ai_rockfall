
import React, { useState } from 'react';
import { FaUserPlus, FaCheck, FaVideo } from 'react-icons/fa';
import LiveCamera from './LiveCamera';

// ── Tab Bar Styles ─────────────────────────────────────────────────────────────
const TABS = [
    { id: 'users',  label: 'User Administration', icon: <FaUserPlus /> },
    { id: 'camera', label: 'Live Camera Monitoring', icon: <FaVideo /> },
];

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState('users');

    // --- Create User State ---
    const [createStatus, setStatus] = useState(null);
    const [formData, setFormData] = useState({
        name: '', userId: '', password: '', shift: 'Morning', assignedZone: 'Sector 4',
        bloodGroup: '', emergencyContact: '', medicalCondition: 'None', fitnessStatus: 'Fit'
    });

    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        setStatus('submitting');

        try {
            const payload = {
                name: formData.name,
                user_id: formData.userId,
                password: formData.password,
                shift: formData.shift,
                assigned_zone: formData.assignedZone,
                blood_group: formData.bloodGroup,
                emergency_contact: formData.emergencyContact,
                medical_condition: formData.medicalCondition,
                fitness_status: formData.fitnessStatus
            };

            const res = await fetch('http://localhost:8000/workers/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setStatus('success');
                setFormData({
                    name: '', userId: '', password: '', shift: 'Morning', assignedZone: 'Sector 4',
                    bloodGroup: '', emergencyContact: '', medicalCondition: 'None', fitnessStatus: 'Fit'
                });
                setTimeout(() => setStatus(null), 3000);
            } else {
                const err = await res.json();
                alert("Error: " + err.detail);
                setStatus('error');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* ── Tab Bar ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0' }}>
                {TABS.map(tab => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                padding: '10px 22px',
                                background: isActive ? 'rgba(0,255,157,0.1)' : 'transparent',
                                border: 'none',
                                borderBottom: isActive ? '2px solid var(--neon-green)' : '2px solid transparent',
                                color: isActive ? 'var(--neon-green)' : '#888',
                                fontSize: '0.9rem', fontWeight: isActive ? 'bold' : 'normal',
                                cursor: 'pointer', borderRadius: '4px 4px 0 0',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* ── Tab Content ───────────────────────────────────────────────── */}
            <div style={{ flex: 1, overflow: 'auto' }}>

                {/* User Administration */}
                {activeTab === 'users' && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <div className="glass-panel" style={{ flex: 1, padding: '2rem', maxWidth: '800px' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '2rem', color: 'var(--neon-cyan)' }}>Add New Personnel</h3>
                            <form onSubmit={handleSubmitCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                                <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 0, color: '#888', borderBottom: '1px solid #444', paddingBottom: '5px' }}>Basic Info</h4></div>
                                <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                                <Input label="Worker ID" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} required />
                                <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />

                                <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 10, marginTop: 20, color: '#888', borderBottom: '1px solid #444', paddingBottom: '5px' }}>Job Details</h4></div>

                                <Select label="Shift" value={formData.shift} onChange={e => setFormData({ ...formData, shift: e.target.value })}>
                                    <option value="Morning">Morning</option>
                                    <option value="Evening">Evening</option>
                                    <option value="Night">Night</option>
                                </Select>

                                <Select label="Assigned Zone" value={formData.assignedZone} onChange={e => setFormData({ ...formData, assignedZone: e.target.value })}>
                                    <option value="Sector 4">Sector 4</option>
                                    <option value="Sector 2">Sector 2</option>
                                    <option value="Zone A">Zone A</option>
                                    <option value="Base">Base</option>
                                </Select>

                                <div style={{ gridColumn: '1 / -1' }}><h4 style={{ margin: 10, marginTop: 20, color: '#888', borderBottom: '1px solid #444', paddingBottom: '5px' }}>Health Records</h4></div>

                                <Input label="Blood Group" value={formData.bloodGroup} onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })} placeholder="e.g. O+" />
                                <Input label="Emergency Contact" value={formData.emergencyContact} onChange={e => setFormData({ ...formData, emergencyContact: e.target.value })} />
                                <Input label="Medical Condition" value={formData.medicalCondition} onChange={e => setFormData({ ...formData, medicalCondition: e.target.value })} />
                                <Select label="Fitness Status" value={formData.fitnessStatus} onChange={e => setFormData({ ...formData, fitnessStatus: e.target.value })}>
                                    <option value="Fit">Fit</option>
                                    <option value="Unfit">Unfit</option>
                                    <option value="Review">Review Needed</option>
                                </Select>

                                <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                                    <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={createStatus === 'submitting'}>
                                        {createStatus === 'submitting' ? 'Creating...' : 'Create Worker Profile'}
                                    </button>
                                </div>
                                {createStatus === 'success' && <div style={{ gridColumn: '1 / -1', color: 'var(--neon-green)', textAlign: 'center' }}><FaCheck /> Created Successfully!</div>}
                            </form>
                        </div>
                    </div>
                )}

                {/* Live Camera Monitoring */}
                {activeTab === 'camera' && <LiveCamera />}
            </div>
        </div>
    );
};

const Input = ({ label, ...props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '0.85rem', color: '#aaa' }}>{label}</label>
        <input style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} {...props} />
    </div>
);

const Select = ({ label, children, ...props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '0.85rem', color: '#aaa' }}>{label}</label>
        <select style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} {...props}>
            {children}
        </select>
    </div>
);

export default AdminPage;
