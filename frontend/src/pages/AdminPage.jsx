import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaUsers, FaMapMarkedAlt, FaCheck, FaTrash, FaCamera } from 'react-icons/fa';

const AdminPage = () => {
    const [activeTab, setActiveTab] = useState(1);

    // --- Tab 1: Create User State ---
    const [formData, setFormData] = useState({
        name: '', userId: '', password: '', shift: 'Morning', assignedZone: 'Sector 4' // Default value
    });
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [createStatus, setCreateStatus] = useState(null);

    // --- Tab 2: Shift Mgmt State ---
    const [allWorkers, setAllWorkers] = useState([]);
    const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
    const [bulkShift, setBulkShift] = useState('Morning');

    // Fetch users (Tab 2)
    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8000/admin/users');
            if (res.ok) setAllWorkers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (activeTab === 2) fetchUsers();
    }, [activeTab]);

    // Handlers
    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmitCreate = async (e) => {
        e.preventDefault();
        setCreateStatus('submitting');

        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('user_id', formData.userId);
            data.append('password', formData.password);
            data.append('shift', formData.shift);
            data.append('assigned_zone', formData.assignedZone);
            if (photo) data.append('photo', photo);

            const res = await fetch('http://localhost:8000/admin/users/create', { // Corrected URL
                method: 'POST',
                body: data // No Content-Type header for FormData, browser sets it
            });

            if (res.ok) {
                setCreateStatus('success');
                // Reset form with valid defaults
                setFormData({ name: '', userId: '', password: '', shift: 'Morning', assignedZone: 'Sector 4' });
                setPhoto(null);
                setPhotoPreview(null);
                setTimeout(() => setCreateStatus(null), 3000);
            } else {
                setCreateStatus('error');
            }
        } catch (error) {
            console.error(error);
            setCreateStatus('error');
        }
    };

    const handleBulkShiftUpdate = async () => {
        if (selectedWorkerIds.length === 0) return;
        try {
            const res = await fetch('http://localhost:8000/admin/users/update-shift', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ worker_ids: selectedWorkerIds, new_shift: bulkShift })
            });

            if (res.ok) {
                fetchUsers(); // Refresh list
                setSelectedWorkerIds([]);
                alert("Shift updated successfully!");
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{
                display: 'flex', gap: '2rem', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem'
            }}>
                <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} icon={FaUserPlus} label="Create User" />
                <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} icon={FaUsers} label="All Users & Shifts" />

            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                {/* TAB 1: CREATE USER */}
                {activeTab === 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
                        <div className="glass-panel" style={{ flex: 1, padding: '2rem', maxWidth: '600px', overflowY: 'auto' }}>
                            <h3 style={{ marginTop: 0, marginBottom: '2rem', color: 'var(--neon-cyan)' }}>Add New Personnel</h3>
                            <form onSubmit={handleSubmitCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <Input label="Full Name" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. John Doe" autoComplete="name" />
                                <Input label="Worker ID" value={formData.userId} onChange={e => setFormData({ ...formData, userId: e.target.value })} placeholder="e.g. WKR-1049" autoComplete="username" />
                                <Input label="Password" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="e.g. SecurePass123" autoComplete="new-password" />

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Shift Assignment</label>
                                    <select
                                        style={inputStyle}
                                        value={formData.shift}
                                        onChange={e => setFormData({ ...formData, shift: e.target.value })}
                                    >
                                        <option value="Morning">Morning Shift (06:00 - 14:00)</option>
                                        <option value="Evening">Evening Shift (14:00 - 22:00)</option>
                                        <option value="Night">Night Shift (22:00 - 06:00)</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Profile Photo</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <label className="btn-secondary" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <FaCamera /> Upload Photo
                                            <input type="file" hidden accept="image/*" onChange={handlePhotoChange} />
                                        </label>
                                        {photoPreview && <img src={photoPreview} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="Preview" />}
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>Assigned Zone</label>
                                    <select
                                        style={inputStyle}
                                        value={formData.assignedZone}
                                        onChange={e => setFormData({ ...formData, assignedZone: e.target.value })}
                                    >
                                        <option value="Sector 4">Sector 4 (High Risk)</option>
                                        <option value="Sector 2">Sector 2 (Safe)</option>
                                        <option value="Zone A">Zone A (Entrance)</option>
                                        <option value="Base">Base Operations</option>
                                    </select>
                                </div>

                                <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }} disabled={createStatus === 'submitting'}>
                                    {createStatus === 'submitting' ? 'Creating...' : 'Create Worker Profile'}
                                </button>
                                {createStatus === 'success' && <div style={{ color: 'var(--neon-green)', marginTop: '10px' }}><FaCheck /> User Created Successfully!</div>}
                            </form>
                        </div>
                    </div>
                )}

                {/* TAB 2: MANAGEMENT */}
                {activeTab === 2 && (
                    <div className="glass-panel" style={{ height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h3 style={{ margin: 0 }}>Shift Management</h3>
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <span>Selected: {selectedWorkerIds.length}</span>
                                <select style={inputStyle} value={bulkShift} onChange={e => setBulkShift(e.target.value)}>
                                    <option value="Morning">Morning</option>
                                    <option value="Evening">Evening</option>
                                    <option value="Night">Night</option>
                                </select>
                                <button className="btn-primary" onClick={handleBulkShiftUpdate}>Apply Shift</button>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                                        <th style={{ padding: '10px' }}>
                                            <input type="checkbox" onChange={e => {
                                                if (e.target.checked) setSelectedWorkerIds(allWorkers.map(u => u.id));
                                                else setSelectedWorkerIds([]);
                                            }} />
                                        </th>
                                        <th style={{ padding: '10px' }}>Profile</th>
                                        <th style={{ padding: '10px' }}>Name</th>
                                        <th style={{ padding: '10px' }}>ID</th>
                                        <th style={{ padding: '10px' }}>Shift</th>
                                        <th style={{ padding: '10px' }}>Zone</th>
                                        <th style={{ padding: '10px' }}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allWorkers.map(w => (
                                        <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '10px' }}>
                                                <input type="checkbox"
                                                    checked={selectedWorkerIds.includes(w.id)}
                                                    onChange={e => {
                                                        if (e.target.checked) setSelectedWorkerIds([...selectedWorkerIds, w.id]);
                                                        else setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== w.id));
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '10px' }}>
                                                {w.photo_url ? (
                                                    <img src={`http://localhost:8000${w.photo_url}`} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                                                ) : (
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#444' }}></div>
                                                )}
                                            </td>
                                            <td style={{ padding: '10px' }}>{w.name}</td>
                                            <td style={{ padding: '10px', color: '#aaa' }}>{w.user_id}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem',
                                                    background: w.shift === 'Morning' ? 'rgba(255, 200, 0, 0.2)' :
                                                        w.shift === 'Evening' ? 'rgba(255, 100, 0, 0.2)' : 'rgba(100, 100, 255, 0.2)',
                                                    color: w.shift === 'Morning' ? 'orange' : w.shift === 'Evening' ? 'coral' : 'lightblue'
                                                }}>
                                                    {w.shift}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px' }}>{w.assigned_zone}</td>
                                            <td style={{ padding: '10px' }}>
                                                <span style={{ color: w.is_onsite === "Yes" ? 'var(--neon-green)' : '#666' }}>
                                                    {w.is_onsite === "Yes" ? "On-site" : "Off-site"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 3 removed */}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        style={{
            background: 'none', border: 'none', color: active ? 'var(--neon-cyan)' : '#888',
            fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            paddingBottom: '8px', borderBottom: active ? '2px solid var(--neon-cyan)' : '2px solid transparent',
            transition: 'all 0.3s ease'
        }}
    >
        <Icon /> {label}
    </button>
);

const Input = ({ label, ...props }) => (
    <div>
        <label style={{ display: 'block', marginBottom: '8px', color: '#aaa', fontSize: '0.9rem' }}>{label}</label>
        <input style={inputStyle} {...props} />
    </div>
);

const inputStyle = {
    width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px', color: '#fff', fontSize: '1rem'
};

export default AdminPage;
