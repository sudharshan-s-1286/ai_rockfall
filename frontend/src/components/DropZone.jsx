import React, { useRef, useState } from 'react';
import { FaCloudUploadAlt, FaCamera, FaSpinner } from 'react-icons/fa';

const DropZone = ({ onImageSelected, isAnalyzing, detections = [] }) => {
    const [preview, setPreview] = useState(null);
    const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
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
            const img = new Image();
            img.onload = () => {
                setImgSize({ w: img.width, h: img.height });
                setPreview(reader.result);
                onImageSelected(file);
            };
            img.src = reader.result;
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
                    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '400px', display: 'flex' }}>
                        <img
                            src={preview}
                            alt="Analysis Target"
                            style={{
                                maxWidth: '100%',
                                maxHeight: '400px',
                                borderRadius: '8px',
                                border: '1px solid var(--neon-cyan)',
                                boxShadow: '0 0 20px rgba(0, 243, 255, 0.2)',
                                display: 'block'
                            }}
                        />
                        {/* SVG Bounding Boxes Overlay */}
                        {!isAnalyzing && detections.length > 0 && imgSize.w > 0 && (
                            <svg 
                                viewBox={`0 0 ${imgSize.w} ${imgSize.h}`} 
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10, borderRadius: '8px' }}
                            >
                                {detections.map((det, i) => {
                                    const [x1, y1, x2, y2] = det.bbox;
                                    const w = x2 - x1;
                                    const h = y2 - y1;
                                    
                                    let severity = det.severity;
                                    if (!severity) {
                                        if (det.class && det.class.includes("High_Risk")) severity = "HIGH";
                                        else if (det.class && det.class.includes("Medium_Risk")) severity = "MEDIUM";
                                        else severity = "LOW";
                                    }
                                    const color = severity === "HIGH" ? "#ff003c" : severity === "MEDIUM" ? "#ffa500" : "#00ff9d";
                                    
                                    return (
                                        <g key={i}>
                                            <rect x={x1} y={y1} width={w} height={h} fill={`${color}44`} stroke={color} strokeWidth={Math.max(2, imgSize.w * 0.005)} />
                                            <rect x={x1} y={y1 - Math.max(20, imgSize.h * 0.04)} width={Math.max(120, imgSize.w * 0.15)} height={Math.max(20, imgSize.h * 0.04)} fill={color} />
                                            <text x={x1 + 4} y={y1 - 4} fill="#000" fontSize={Math.max(14, imgSize.h * 0.025)} fontWeight="bold" fontFamily="Segoe UI, Inter">
                                                {severity} ({Math.round(det.confidence * 100)}%)
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        )}
                    </div>
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
