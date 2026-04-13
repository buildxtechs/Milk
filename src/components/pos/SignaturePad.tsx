'use client';

import React, { useRef, useState, useEffect } from 'react';
import { X, RotateCcw, Check, Fingerprint, Pen, CheckCircle, Info } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signature: string, method: 'signature' | 'fingerprint', name?: string) => void;
    onCancel: () => void;
    t: any;
}

export default function SignaturePad({ onSave, onCancel, t }: SignaturePadProps): React.ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isEmpty, setIsEmpty] = useState(true);
    const [method, setMethod] = useState<'signature' | 'fingerprint'>('signature');
    const [isFingerprinting, setIsFingerprinting] = useState(false);
    const [fingerprintCaptured, setFingerprintCaptured] = useState(false);
    const [fingerprintName, setFingerprintName] = useState('');
    const [isSaving, setIsSaving] = useState(false);


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
            setFingerprintName('');
        }
    };

    const simulateFingerprint = async () => {
        setIsFingerprinting(true);
        setFingerprintCaptured(false);

        // Mantra RD Service standard ports (Tried in order)
        const ports = [11100, 11101, 11102, 11103, 11104, 11105];
        const protocols = ['http', 'https'];
        let activePort = null;
        let activeProtocol = 'http';

        console.log("Mantra: Discovering RD Service...");

        // 1. Discover Active RD Service Port & Protocol
        discoveryLoop:
        for (const port of ports) {
            for (const protocol of protocols) {
                try {
                    const url = `${protocol}://127.0.0.1:${port}/rd/info`;
                    // Timeout-based fetch to avoid hanging on many ports
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1000);

                    const res = await fetch(url, { 
                        method: 'GET',
                        signal: controller.signal 
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (res.ok) {
                        activePort = port;
                        activeProtocol = protocol;
                        console.log(`Mantra: Found RD Service on ${url}`);
                        break discoveryLoop;
                    }
                } catch (e) {
                    continue;
                }
            }
        }

        if (!activePort) {
            // Last resort: standard port
            activePort = 11100;
            activeProtocol = 'http';
        }

        // 2. Capture Fingerprint
        try {
            const captureUrl = `${activeProtocol}://127.0.0.1:${activePort}/rd/capture`;
            const captureRequest = `
                <Opts fCount="1" fType="0" iCount="0" iType="0" pCount="0" pType="0" format="0" pidVer="2.0" timeout="10000" otp="" wadh="" posh="" env="P" />
            `.trim();

            console.log("Mantra: Sending CAPTURE request...");

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
                console.log("Mantra: Capture Success");
                setFingerprintCaptured(true);
            } else {
                console.warn(`Mantra: Capture Error ${errCode} - ${errInfo}`);
                alert(`Fingerprint Capture Error (${errCode}): ${errInfo}`);
            }
        } catch (error: any) {
            console.error("Mantra: Capture Failed:", error);
            const isProduction = window.location.protocol === 'https:';
            
            if (error.name === 'AbortError') {
                alert("Mantra: Connection timeout. Please ensure the RD Service is running.");
            } else if (isProduction) {
                alert(`Security Block: Fingerprint scanning on HTTPS (${window.location.hostname}) requires browser permission to talk to your local device.

Please follow these steps:
1. Open a NEW tab and go to: http://127.0.0.1:11100/rd/info (or port 11101/11102).
2. If you see a security warning, click "Advanced" and "Proceed".
3. Return here and try again.

Alternatively, enable 'chrome://flags/#allow-insecure-localhost' in Chrome.`);
            } else {
                alert(`Mantra Capture Failed: ${error.message || "Could not communicate with local service."}`);
            }
        } finally {
            setIsFingerprinting(false);
        }
    };

    const save = () => {
        if (method === 'signature') {
            if (isEmpty) return;
            const canvas = canvasRef.current;
            if (!canvas) return;
            setIsSaving(true);
            // Use JPEG with 0.5 quality to save space in localStorage
            onSave(canvas.toDataURL('image/jpeg', 0.5), 'signature');
        } else {
            if (!fingerprintCaptured) return;
            if (!fingerprintName.trim()) {
                alert(t.enterName || 'Please enter name');
                return;
            }
            setIsSaving(true);
            onSave('FINGERPRINT_CAPTURED', 'fingerprint', fingerprintName);
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

                    {method === 'fingerprint' && (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            fontSize: '11px', 
                            color: 'var(--text-muted)',
                            marginBottom: '12px',
                            background: 'var(--surface-1)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)'
                        }}>
                            <Info size={14} className="text-secondary" />
                            <span>Mantra MFS100 (S/N: 4725029)</span>
                        </div>
                    )}

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
                            minHeight: '200px',
                            border: '2px dashed var(--border)',
                            borderRadius: 'var(--radius)',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            padding: '24px'
                        }}>
                            {isFingerprinting ? (
                                <div className="animate-pulse" style={{ textAlign: 'center' }}>
                                    <Fingerprint size={64} style={{ color: 'var(--primary)', opacity: 0.5 }} />
                                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '8px', color: 'var(--primary)' }}>Scanning...</div>
                                </div>
                            ) : fingerprintCaptured ? (
                                <div style={{ textAlign: 'center', width: '100%' }}>
                                    <CheckCircle size={64} style={{ color: 'var(--success)', marginBottom: '16px' }} />
                                    <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '20px', color: 'var(--success)' }}>Captured Successfully</div>
                                    
                                    <div className="form-group" style={{ textAlign: 'left' }}>
                                        <label className="form-label">{t.enterName || 'Enter Name'}</label>
                                        <input 
                                            className="form-input" 
                                            value={fingerprintName} 
                                            onChange={e => setFingerprintName(e.target.value)}
                                            placeholder="..."
                                            autoFocus
                                        />
                                    </div>
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
                        disabled={isSaving || (method === 'signature' ? isEmpty : !fingerprintCaptured || !fingerprintName.trim())}
                    >
                        {isSaving ? (
                            <>
                                <div className="spinner-xs" style={{ marginRight: '8px' }}></div>
                                {t.loading || '...'}
                            </>
                        ) : (
                            <>
                                <Check size={14} /> {t.confirm || 'Confirm'}
                            </>
                        )}
                    </button>

                </div>
            </div>
        </div>
    );
}
