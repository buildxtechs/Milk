'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useStockInwards } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
    Download, Trash2, ShieldAlert, FileSpreadsheet, Archive,
    Users, ShoppingCart, Database, Server, Info, ArrowRight,
    Search, CheckCircle2, AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function DatabasePage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const user = useStore((s) => s.user);
    const clearData = useStore((s) => s.clearData);

    // Data for overview and export
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const stockInwards = useStockInwards();

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'backup' | 'cleanup'>('overview');

    const isAdmin = user?.role === 'admin';

    const collections = [
        { id: 'customers', label: t.customers, count: customers.length, icon: Users, color: '#3b82f6' },
        { id: 'transactions', label: language === 'ta' ? 'விற்பனை' : 'Transactions', count: transactions.length, icon: ShoppingCart, color: '#10b981' },
        { id: 'advances', label: language === 'ta' ? 'முன்பணம்' : 'Advances', count: advances.length, icon: Archive, color: '#f59e0b' },
        { id: 'stock', label: t.stock, count: stockInwards.length, icon: Archive, color: '#8b5cf6' },
    ];

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const handleExport = (category: string) => {
        setIsExporting(true);
        try {
            let data: any[] = [];
            let fileName = `${category}_backup_${new Date().toISOString().split('T')[0]}`;

            switch (category) {
                case 'customers':
                    data = customers;
                    break;
                case 'transactions':
                    data = transactions.map(txn => ({
                        ...txn,
                        items: txn.items.map(i => `${i.productName} (x${i.quantity})`).join('; ')
                    }));
                    break;
                case 'advances':
                    data = advances;
                    break;
                case 'stock':
                    data = stockInwards;
                    break;
                case 'all':
                    const wb = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customers), 'Customers');
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(transactions.map(t => ({ ...t, items: JSON.stringify(t.items) }))), 'Transactions');
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(advances), 'Advances');
                    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockInwards), 'Stock');
                    XLSX.writeFile(wb, `full_backup_${new Date().toISOString().split('T')[0]}.xlsx`);
                    setIsExporting(false);
                    return;
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, category);
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } catch (error) {
            console.error('Export failed', error);
        }
        setIsExporting(false);
    };

    const handleCleanup = () => {
        if (!isAdmin) return;
        clearData(selectedCategories);
        setSelectedCategories([]);
        setShowConfirm(false);
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.database}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'தரவு மேலாண்மை மற்றும் பாதுகாப்பு மையம்' : 'Data management and security center'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }} className="no-print">
                <button
                    className={`btn ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('overview')}
                >
                    <Server size={16} /> {language === 'ta' ? 'மேலோட்டம்' : 'Overview'}
                </button>
                <button
                    className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('backup')}
                >
                    <Download size={16} /> {t.backup}
                </button>
                <button
                    className={`btn ${activeTab === 'cleanup' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('cleanup')}
                >
                    <Trash2 size={16} /> {t.cleanup}
                </button>
            </div>

            <div className="dashboard-grid">
                {activeTab === 'overview' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px' }}>
                        {collections.map(col => (
                            <div key={col.id} className="card shadow-sm hover-up" style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        backgroundColor: `${col.color}15`,
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        color: col.color
                                    }}>
                                        <col.icon size={24} />
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <h3 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{col.count}</h3>
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>{col.label.toUpperCase()}</p>
                                    </div>
                                </div>
                                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <CheckCircle2 size={14} className="text-success" />
                                    <span>{language === 'ta' ? 'ஒத்திசைக்கப்பட்டது' : 'Synced & Safe'}</span>
                                </div>
                            </div>
                        ))}

                        <div className="card shadow-sm" style={{ gridColumn: '1 / -1', padding: '24px', background: 'var(--primary-light)', borderColor: 'var(--primary)', borderWidth: '1px', borderStyle: 'dashed' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <Info size={32} className="text-primary" style={{ flexShrink: 0 }} />
                                <div>
                                    <h3 style={{ fontWeight: 700, marginBottom: '4px' }}>{language === 'ta' ? 'தானியங்கி ஒத்திசைவு' : 'Automatic Synchronization'}</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                        {language === 'ta'
                                            ? 'உங்கள் தரவு தானாகவே மேகக்கணியில் ஒத்திசைக்கப்படுகிறது. இணையம் இல்லாதபோது இது உங்கள் சாதனத்தில் சேமிக்கப்படும்.'
                                            : 'Your data is automatically synced to the cloud. When offline, changes are stored locally and synced when connection is restored.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'backup' && (
                    <div className="card shadow-sm">
                        <div className="card-header">
                            <h3 className="card-title">{t.backup}</h3>
                        </div>
                        <div className="card-body">
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                {language === 'ta' ? 'உங்கள் எல்லா தரவையும் எக்செல் கோப்புகளாக பதிவிறக்கவும்.' : 'Download all your data as Excel files for offline storage or reporting.'}
                            </p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                {collections.map(col => (
                                    <button key={col.id} className="btn btn-secondary" style={{ justifyContent: 'space-between' }} onClick={() => handleExport(col.id)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <col.icon size={16} /> {col.label}
                                        </div>
                                        <Download size={14} />
                                    </button>
                                ))}
                            </div>

                            <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid var(--border)' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%', justifyContent: 'center', gap: '10px', height: '48px', fontSize: '16px' }}
                                    onClick={() => handleExport('all')}
                                    disabled={isExporting}
                                >
                                    <FileSpreadsheet size={20} /> {t.downloadAll}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'cleanup' && (
                    <div className="card shadow-sm" style={{ borderColor: isAdmin ? 'var(--danger)' : 'var(--border)' }}>
                        <div className="card-header" style={{ background: isAdmin ? 'var(--danger-light)' : 'transparent' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Trash2 size={18} style={{ color: isAdmin ? 'var(--danger)' : 'var(--text-muted)' }} />
                                <span className="card-title" style={{ color: isAdmin ? 'var(--danger)' : 'var(--text-primary)' }}>{t.cleanup}</span>
                            </div>
                            {!isAdmin && <ShieldAlert size={16} style={{ color: 'var(--text-muted)' }} />}
                        </div>
                        <div className="card-body">
                            {!isAdmin ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    <ShieldAlert size={48} style={{ opacity: 0.1, margin: '0 auto 16px' }} />
                                    <p style={{ fontWeight: 600 }}>{language === 'ta' ? 'நிர்வாகிகளுக்கு மட்டுமே அனுமதி' : 'Restricted Access'}</p>
                                    <p style={{ fontSize: '13px', marginTop: '4px' }}>{language === 'ta' ? 'இந்தச் செயலைச் செய்ய உங்களுக்கு அனுமதி இல்லை.' : 'You do not have permission to perform cleanup operations.'}</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div className="alert alert-danger" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
                                        <AlertCircle size={20} />
                                        <div style={{ fontSize: '13px' }}>
                                            <strong>{language === 'ta' ? 'எச்சரிக்கை:' : 'Warning:'}</strong> {language === 'ta' ? 'இந்தச் செயல் தரவை நிரந்தரமாக நீக்கும். மீட்பது சாத்தியமில்லை.' : 'This action permanently deletes data. It cannot be recovered once removed.'}
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        {['transactions', 'advances', 'stock', 'customers'].map(cat => (
                                            <label key={cat} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                borderRadius: '10px',
                                                background: 'var(--surface-2)',
                                                cursor: 'pointer',
                                                border: '1px solid var(--border)',
                                                transition: 'all 0.2s'
                                            }} className="cleanup-label">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedCategories.includes(cat)}
                                                        onChange={() => toggleCategory(cat)}
                                                        style={{ width: '18px', height: '18px' }}
                                                    />
                                                    <span style={{ fontWeight: 600 }}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                                                </div>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {collections.find(c => c.id === cat)?.count || 0} {language === 'ta' ? 'பதிவுகள்' : 'records'}
                                                </span>
                                            </label>
                                        ))}
                                    </div>

                                    <button
                                        className="btn btn-danger"
                                        style={{ width: '100%', marginTop: '24px', height: '48px', justifyContent: 'center' }}
                                        disabled={selectedCategories.length === 0}
                                        onClick={() => setShowConfirm(true)}
                                    >
                                        <Trash2 size={18} /> {language === 'ta' ? 'தேர்ந்தெடுக்கப்பட்டதை நீக்கு' : 'Delete Selected Data'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {showConfirm && (
                <div className="modal-overlay">
                    <div className="modal" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{t.cleanup}</h3>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                background: '#fee2e2',
                                color: 'var(--danger)',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                margin: '0 auto 20px'
                            }}>
                                <Trash2 size={32} />
                            </div>
                            <h4 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{t.confirmDelete}</h4>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                                {language === 'ta'
                                    ? 'தேர்ந்தெடுக்கப்பட்ட அனைத்து தரவுகளும் நிரந்தரமாக நீக்கப்படும். இதை மாற்ற முடியாது.'
                                    : 'A full permanent wipe of the selected categories will be performed. This is not reversible.'}
                            </p>
                        </div>
                        <div className="modal-footer" style={{ border: 'none', background: 'var(--surface-2)' }}>
                            <button className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowConfirm(false)}>
                                {language === 'ta' ? 'இல்லை, ரத்துசெய்' : 'No, Cancel'}
                            </button>
                            <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCleanup}>
                                {language === 'ta' ? 'ஆம், நீக்கவும்' : 'Yes, Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .cleanup-label:hover {
                    border-color: var(--danger) !important;
                    background: #fff5f5 !important;
                }
                .hover-up {
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                }
                .hover-up:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1) !important;
                }
            `}</style>
        </div>
    );
}
