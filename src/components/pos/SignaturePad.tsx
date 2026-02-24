'use client';

import { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Fingerprint, Pen, CheckCircle } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signature: string, method: 'signature' | 'fingerprint') => void;
    onCancel: () => void;
    t: any;
}

export default function SignaturePad({ onSave, onCancel, t }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [method, setMethod] = useState<'signature' | 'fingerprint'>('signature');
    const [isFingerprinting, setIsFingerprinting] = useState(false);
    const [fingerprintCaptured, setFingerprintCaptured] = useState(false);

    useEffect(() => {
        if (method !== 'signature') return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set line style
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Adjust for high-DPI screens
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }, [method]);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();

        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDrawing(true);
        setIsEmpty(false);
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clear = () => {
        if (method === 'signature') {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            setIsEmpty(true);
        } else {
            setFingerprintCaptured(false);
        }
    };

    const simulateFingerprint = async () => {
        setIsFingerprinting(true);
        setFingerprintCaptured(false);

        // Mantra RD Service standard ports
        const ports = [11100, 11101, 11102, 11103, 11104, 11105];
        let activePort = null;

        // 1. Discover Active RD Service Port
        for (const port of ports) {
            try {
                const url = `http://localhost:${port}/rd/info`;
                const res = await fetch(url, { method: 'DEVICEINFO' }); // Mantra discovery often uses DEVICEINFO or simple GET
                if (res.ok) {
                    activePort = port;
                    break;
                }
            } catch (e) {
                continue;
            }
        }

        if (!activePort) {
            // Fallback: Try a simple GET if DEVICEINFO failed or just try 11100
            activePort = 11100;
        }

        // 2. Capture Fingerprint
        try {
            const captureUrl = `http://localhost:${activePort}/rd/capture`;
            // Standard RD Service Capture Request (XML)
            const captureRequest = `
                <Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="" posh="" env="P" />
            `.trim();

            const response = await fetch(captureUrl, {
                method: 'CAPTURE',
                body: captureRequest,
                headers: { 'Content-Type': 'text/xml' }
            });

            const xmlText = await response.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, "text/xml");

            const respNode = xmlDoc.getElementsByTagName("Resp")[0];
            const errCode = respNode?.getAttribute("errCode");
            const errInfo = respNode?.getAttribute("errInfo");

            if (errCode === "0") {
                setFingerprintCaptured(true);
            } else {
                alert(`Fingerprint Capture Error (${errCode}): ${errInfo}`);
            }
        } catch (error) {
            console.error("Mantra Capture Failed:", error);
            alert("Could not communicate with Mantra RD Service. Please ensure it is running.");
        } finally {
            setIsFingerprinting(false);
        }
    };

    const save = () => {
        if (method === 'signature') {
            if (isEmpty) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            onSave(canvas.toDataURL('image/png'), 'signature');
        } else {
            if (!fingerprintCaptured) return;
            // Provide a static fingerprint placeholder or similar identifier
            onSave('FINGERPRINT_CAPTURED', 'fingerprint');
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">{t.validationMethod || 'Verification'}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onCancel}><X size={18} /></button>
                </div>
                <div className="modal-body">
                    {/* Method Toggle */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--surface-2)', padding: '4px', borderRadius: 'var(--radius)' }}>
                        <button
                            className={`btn btn-sm ${method === 'signature' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setMethod('signature')}
                        >
                            <Pen size={14} /> {t.signature}
                        </button>
                        <button
                            className={`btn btn-sm ${method === 'fingerprint' ? 'btn-primary' : 'btn-ghost'}`}
                            style={{ flex: 1, justifyContent: 'center' }}
                            onClick={() => setMethod('fingerprint')}
                        >
                            <Fingerprint size={14} /> {t.fingerprint}
                        </button>
                    </div>

                    <div style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {method === 'signature' ? t.signHere : t.captureFingerprint}
                    </div>

                    {method === 'signature' ? (
                        <div style={{
                            border: '2px dashed var(--border)',
                            borderRadius: 'var(--radius)',
                            background: '#f8fafc',
                            touchAction: 'none'
                        }}>
                            <canvas
                                ref={canvasRef}
                                style={{ width: '100%', height: '200px', cursor: 'crosshair', display: 'block' }}
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseLeave={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                        </div>
                    ) : (
                        <div style={{
                            height: '200px',
                            border: '2px dashed var(--border)',
                            borderRadius: 'var(--radius)',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px'
                        }}>
                            {isFingerprinting ? (
                                <div className="animate-pulse" style={{ textAlign: 'center' }}>
                                    <Fingerprint size={64} style={{ color: 'var(--primary)', opacity: 0.5 }} />
                                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px', color: 'var(--primary)' }}>Scanning...</div>
                                </div>
                            ) : fingerprintCaptured ? (
                                <div style={{ textAlign: 'center' }}>
                                    <CheckCircle size={64} style={{ color: 'var(--success)' }} />
                                    <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '8px', color: 'var(--success)' }}>Captured Successfully</div>
                                </div>
                            ) : (
                                <button className="btn btn-primary btn-lg" onClick={simulateFingerprint}>
                                    <Fingerprint size={24} /> {t.captureFingerprint}
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={clear}>
                        <RotateCcw size={14} /> {t.clear}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={save}
                        disabled={method === 'signature' ? isEmpty : !fingerprintCaptured}
                    >
                        <Check size={14} /> {t.confirm || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
}
