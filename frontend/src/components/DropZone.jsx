import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaCamera, FaSpinner } from 'react-icons/fa';

const DropZone = ({ onImageSelected, isAnalyzing }) => {
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
            onImageSelected(file);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    return (
        <div className="glass-panel" style={{
            padding: '2rem',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative'
        }}>

            {!preview && (
                <div
                    style={{ width: '100%', height: '100%', border: '2px dashed var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--neon-green)'; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                >
                    <FaCloudUploadAlt size={50} color="var(--neon-cyan)" />
                    <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Drag & Drop Rock Image</p>
                    <button className="btn-primary" style={{ marginTop: '1rem' }}>Browse Files</button>
                </div>
            )}

            {preview && (
                <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img
                        src={preview}
                        alt="Analysis Target"
                        style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            borderRadius: '8px',
                            border: '1px solid var(--neon-cyan)',
                            boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)'
                        }}
                    />
                    {isAnalyzing && (
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            background: 'rgba(0,0,0,0.8)',
                            padding: '1rem 2rem',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: 'var(--neon-green)',
                            border: '1px solid var(--neon-green)'
                        }}>
                            <FaSpinner className="spin" /> ANALYZING...
                        </div>
                    )}

                    <button
                        onClick={() => { setPreview(null); fileInputRef.current.value = ''; }}
                        style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
            />

            <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
        </div>
    );
};

export default DropZone;
