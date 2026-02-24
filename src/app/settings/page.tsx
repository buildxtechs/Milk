'use client';

import { useState, useRef } from 'react';
import { useStore, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Store, Building2, Phone, MapPin, Image as ImageIcon, ShieldCheck, Save, Trash2, Send } from 'lucide-react';

export default function SettingsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const settings = useSettings();
    const updateSettings = useStore((s) => s.updateSettings);

    const [form, setForm] = useState(settings);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        setIsSaving(true);
        // Simulate a small delay for UX
        setTimeout(() => {
            updateSettings(form);
            setIsSaving(false);
            alert(t.savedSuccess);
        }, 500);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm({ ...form, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.settings}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'உங்கள் கடை மற்றும் அமைப்புகளை நிர்வகிக்கவும்' : 'Manage your shop details and application settings'}</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    <Save size={18} />
                    {isSaving ? t.loading : t.save}
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                {/* Shop Details */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Building2 size={20} style={{ color: 'var(--primary)' }} />
                            <h2 className="card-title">{t.shopDetails}</h2>
                        </div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {/* Logo Upload */}
                            <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                <label className="form-label">{t.shopLogo}</label>
                                <div
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: 'var(--radius)',
                                        border: '2px dashed var(--border)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        position: 'relative',
                                        background: 'var(--surface-2)'
                                    }}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {form.logo ? (
                                        <>
                                            <img
                                                src={form.logo}
                                                alt="Shop Logo"
                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                            />
                                            <div style={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(0,0,0,0.5)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                opacity: 0,
                                                transition: 'opacity 0.2s'
                                            }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                                            >
                                                <ImageIcon size={24} style={{ color: 'white' }} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.selectLogo}</span>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                />
                                {form.logo && (
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ marginTop: '8px', color: 'var(--danger)' }}
                                        onClick={() => setForm({ ...form, logo: '' })}
                                    >
                                        <Trash2 size={12} />
                                        {t.removeLogo}
                                    </button>
                                )}
                            </div>

                            {/* Text Fields */}
                            <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">{t.shopName}</label>
                                    <div className="search-bar" style={{ padding: '0 12px' }}>
                                        <Store size={14} style={{ color: 'var(--text-muted)' }} />
                                        <input
                                            className="form-input"
                                            value={form.shopName}
                                            onChange={e => setForm({ ...form, shopName: e.target.value })}
                                            placeholder="Enter shop name"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t.shopMobile}</label>
                                    <div className="search-bar" style={{ padding: '0 12px' }}>
                                        <Phone size={14} style={{ color: 'var(--text-muted)' }} />
                                        <input
                                            className="form-input"
                                            value={form.mobile}
                                            onChange={e => setForm({ ...form, mobile: e.target.value })}
                                            placeholder="Enter mobile number"
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">{t.shopAddress}</label>
                                    <div className="search-bar" style={{ padding: '0 12px', alignItems: 'flex-start', paddingTop: '10px' }}>
                                        <MapPin size={14} style={{ color: 'var(--text-muted)', marginTop: '4px' }} />
                                        <textarea
                                            className="form-input"
                                            style={{ minHeight: '80px', border: 'none', padding: '0', resize: 'vertical' }}
                                            value={form.address}
                                            onChange={e => setForm({ ...form, address: e.target.value })}
                                            placeholder="Enter shop address"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Purchase Controls */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ShieldCheck size={20} style={{ color: 'var(--primary)' }} />
                            <h2 className="card-title">{t.purchaseControls}</h2>
                        </div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group" style={{ maxWidth: '400px' }}>
                                <label className="form-label">{t.maxPurchasesPerMonth}</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={form.maxPurchasesPerMonth}
                                    onChange={e => setForm({ ...form, maxPurchasesPerMonth: parseInt(e.target.value) || 1 })}
                                />
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {language === 'ta' ? 'ஒரு வாடிக்கையாளர் ஒரு மாதத்திற்கு எத்தனை முறை தீவனம் வாங்கலாம் என்பதை கட்டுப்படுத்துகிறது.' : 'Controls how many times a customer can purchase feed per month.'}
                                </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setForm({ ...form, enforceCustomerSelection: !form.enforceCustomerSelection })}>
                                <div style={{
                                    width: '44px',
                                    height: '24px',
                                    backgroundColor: form.enforceCustomerSelection ? 'var(--primary)' : 'var(--border)',
                                    borderRadius: '12px',
                                    position: 'relative',
                                    transition: 'background-color 0.2s'
                                }}>
                                    <div style={{
                                        width: '18px',
                                        height: '18px',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '3px',
                                        left: form.enforceCustomerSelection ? '23px' : '3px',
                                        transition: 'left 0.2s'
                                    }} />
                                </div>
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>{t.enforceCustomerSelection}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WhatsApp Templates */}
                <div className="card">
                    <div className="card-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Send size={20} style={{ color: 'var(--primary)' }} />
                            <h2 className="card-title">{t.whatsappTemplates}</h2>
                        </div>
                    </div>
                    <div className="card-body">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="form-group">
                                <label className="form-label">{t.amountTemplate}</label>
                                <textarea
                                    className="form-input"
                                    style={{ minHeight: '80px', resize: 'vertical' }}
                                    value={form.whatsappAmountTemplate}
                                    onChange={e => setForm({ ...form, whatsappAmountTemplate: e.target.value })}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Tokens: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{name}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{amount}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{balance}'}</code>
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t.invoiceTemplate}</label>
                                <textarea
                                    className="form-input"
                                    style={{ minHeight: '80px', resize: 'vertical' }}
                                    value={form.whatsappInvoiceTemplate}
                                    onChange={e => setForm({ ...form, whatsappInvoiceTemplate: e.target.value })}
                                />
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    Tokens: <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{name}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{invoice}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{total}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{advance}'}</code>,
                                    <code style={{ background: '#f1f5f9', padding: '2px 4px', borderRadius: '4px' }}>{'{balance}'}</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                <p>{language === 'ta' ? 'அனைத்து மாற்றங்களும் உங்கள் உலாவியில் பாதுகாப்பாக சேமிக்கப்படுகின்றன.' : 'All changes are saved securely in your browser storage.'}</p>
            </div>
        </div>
    );
}
