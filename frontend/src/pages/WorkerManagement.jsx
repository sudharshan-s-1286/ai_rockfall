
import React, { useState, useEffect } from 'react';
import { FaUserPlus, FaUsers, FaEdit, FaTrash, FaTimes, FaSave, FaCheck } from 'react-icons/fa';

const WorkerManagement = () => {
    // const [activeTab, setActiveTab] = useState(2); // Default to Management Only

    const [allWorkers, setAllWorkers] = useState([]);
    const [editingWorker, setEditingWorker] = useState(null);

    // Fetch users 
    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:8000/workers/');
            if (res.ok) setAllWorkers(await res.json());
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this worker?")) return;
        try {
            await fetch(`http://localhost:8000/workers/${id}`, { method: 'DELETE' });
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    const handleUpdateWorker = async () => {
        if (!editingWorker) return;
        try {
            await fetch(`http://localhost:8000/workers/${editingWorker.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingWorker)
            });
            setEditingWorker(null);
            fetchUsers();
        } catch (e) { console.error(e); }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header / Titles */}
            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FaUsers /> Worker Management Directory
                </h2>
                <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '5px' }}>
                    View and manage all registered personnel.
                </div>
            </div>

            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div className="glass-panel" style={{ height: '100%', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                        <h3 style={{ margin: 0 }}>Registered Workers</h3>
                        <button className="btn-secondary" onClick={fetchUsers}>Refresh List</button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#eee' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', textAlign: 'left', color: '#888' }}>
                                    <th style={{ padding: '10px' }}>Name / ID</th>
                                    <th style={{ padding: '10px' }}>Shift</th>
                                    <th style={{ padding: '10px' }}>Zone</th>
                                    <th style={{ padding: '10px' }}>Health</th>
                                    <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allWorkers.map(w => (
                                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ fontWeight: 'bold' }}>{w.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{w.user_id}</div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <Badge text={w.shift} color={w.shift === 'Morning' ? 'orange' : w.shift === 'Evening' ? 'coral' : 'skyblue'} />
                                        </td>
                                        <td style={{ padding: '10px' }}>{w.assigned_zone}</td>
                                        <td style={{ padding: '10px' }}>
                                            <Badge text={w.fitness_status} color={w.fitness_status === 'Fit' ? 'limegreen' : 'red'} />
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>
                                            <button onClick={() => setEditingWorker(w)} style={actionBtnStyle}><FaEdit /></button>
                                            <button onClick={() => handleDelete(w.id)} style={{ ...actionBtnStyle, color: 'red' }}><FaTrash /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {allWorkers.length === 0 && <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No workers found. Create one in Admin page.</div>}
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {editingWorker && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '500px', padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0 }}>Edit Worker: {editingWorker.name}</h3>
                            <button onClick={() => setEditingWorker(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}><FaTimes /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <Select label="Shift" value={editingWorker.shift} onChange={e => setEditingWorker({ ...editingWorker, shift: e.target.value })}>
                                <option value="Morning">Morning</option>
                                <option value="Evening">Evening</option>
                                <option value="Night">Night</option>
                            </Select>
                            <Select label="Zone" value={editingWorker.assigned_zone} onChange={e => setEditingWorker({ ...editingWorker, assigned_zone: e.target.value })}>
                                <option value="Sector 4">Sector 4</option>
                                <option value="Sector 2">Sector 2</option>
                                <option value="Zone A">Zone A</option>
                                <option value="Base">Base</option>
                            </Select>
                            <Select label="Fitness" value={editingWorker.fitness_status} onChange={e => setEditingWorker({ ...editingWorker, fitness_status: e.target.value })}>
                                <option value="Fit">Fit</option>
                                <option value="Unfit">Unfit</option>
                                <option value="Review">Review</option>
                            </Select>

                            <button className="btn-primary" onClick={handleUpdateWorker} style={{ marginTop: '1rem' }}>
                                <FaSave /> Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const Select = ({ label, children, ...props }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <label style={{ fontSize: '0.85rem', color: '#aaa' }}>{label}</label>
        <select style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', border: '1px solid #444', borderRadius: '4px', color: '#fff' }} {...props}>
            {children}
        </select>
    </div>
);

const Badge = ({ text, color }) => (
    <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.8rem', background: color, color: '#000', fontWeight: 'bold', opacity: 0.8 }}>
        {text}
    </span>
);

const actionBtnStyle = {
    background: 'none', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontSize: '1rem', padding: '5px'
};

export default WorkerManagement;
