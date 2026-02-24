'use client';

import { useState } from 'react';
import { useStore, useCustomers, useAdvances } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Advance, Customer } from '@/lib/types';
import { generateAdvanceId, formatDate, formatCurrency, todayStr, generateWhatsAppLink, parseTemplate } from '@/lib/utils';
import { Plus, Search, Wallet, X, Clock, User, ArrowUpCircle } from 'lucide-react';

export default function AmountCreditsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();
    const addAdvance = useStore((s) => s.addAdvance);
    const settings = useStore((s) => s.settings);

    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewingHistory, setViewingHistory] = useState<string | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const getCustomer = (id: string) => customers.find(c => c.id === id);

    // Filtered list of customers for the table
    const customerFinanceData = customers.filter(c => c.status === 'active').map(customer => {
        const customerAdvances = [...advances]
            .filter(a => a.customerId === customer.id)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const initialAmount = customerAdvances.length > 0 ? customerAdvances[0].amount : 0;
        const addedAmount = customerAdvances.length > 1
            ? customerAdvances.slice(1).reduce((sum, a) => sum + a.amount, 0)
            : 0;

        const currentBalance = customerAdvances.reduce((sum, a) => sum + a.remainingBalance, 0);

        return {
            ...customer,
            initialAmount,
            addedAmount,
            currentBalance
        };
    }).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.village.toLowerCase().includes(search.toLowerCase())
    );

    const handleSaveCredit = (data: Omit<Advance, 'id' | 'createdAt'>) => {
        const id = generateAdvanceId(advances.map(a => a.id));
        addAdvance({
            ...data,
            id,
            createdAt: new Date().toISOString()
        });
        showToast(t.savedSuccess);

        // Optional: WhatsApp Notification
        const customer = getCustomer(data.customerId);
        if (customer && customer.whatsapp) {
            const customerAdvances = advances.filter(a => a.customerId === data.customerId);
            const newTotalBalance = customerAdvances.reduce((s, a) => s + a.remainingBalance, 0) + data.amount;
            const msg = parseTemplate(settings.whatsappAmountTemplate, {
                name: customer.name,
                amount: data.amount,
                balance: newTotalBalance
            });
            window.open(generateWhatsAppLink(customer.whatsapp, msg), '_blank');
        }

        setShowModal(false);
    };

    return (
        <div className="animate-fade-in">
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header no-print">
                <div>
                    <h1 className="page-title">{t.amountCredits}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'வாடிக்கையாளர் இருப்பு மற்றும் வரவு பதிவுகள்' : 'Customer balances and credit history'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        {t.print}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> {t.addAmount}
                    </button>
                </div>
            </div>

            {/* Print Header */}
            <div className="print-only text-center" style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0 }}>{settings.shopName}</h1>
                <p style={{ margin: '4px 0' }}>{settings.address}</p>
                <div style={{ marginTop: '16px', borderTop: '2px solid #000', paddingTop: '12px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{t.amountCredits}</h2>
                    <p style={{ fontSize: '14px', color: '#666' }}>{t.date}: {formatDate(new Date().toISOString())}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="no-print" style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        placeholder={`${t.search} ${t.customers}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table className="export-table">
                        <thead>
                            <tr>
                                <th>{t.memberNumber}</th>
                                <th>{t.name}</th>
                                <th>{t.village}</th>
                                <th>{t.initialAmount} (₹)</th>
                                <th>{t.addedAmount} (₹)</th>
                                <th>{t.currentBalance} (₹)</th>
                                <th className="no-print" style={{ width: '80px' }}>{t.actions}</th>
                                <th className="print-only-cell" style={{ width: '40px' }}>{t.check}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerFinanceData.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Wallet size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                customerFinanceData.map((c) => (
                                    <tr key={c.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{c.id}</td>
                                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                                        <td>{c.village}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(c.initialAmount)}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(c.addedAmount)}</td>
                                        <td style={{ fontWeight: 700, color: c.currentBalance <= 500 && c.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {formatCurrency(c.currentBalance)}
                                            {c.currentBalance <= 500 && c.currentBalance > 0 && (
                                                <span className="no-print" style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--danger)', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {language === 'ta' ? 'குறைவு' : 'Low'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="no-print">
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title={t.creditHistory}
                                                    onClick={() => setViewingHistory(c.id)}
                                                >
                                                    <Clock size={16} />
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    style={{ color: 'var(--primary)' }}
                                                    onClick={() => setShowModal(true)}
                                                >
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="print-only-cell">
                                            <div style={{ width: '18px', height: '18px', border: '1px solid #000', margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                .print-only { display: none; }
                .print-only-cell { display: none; }
                @media print {
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .print-only-cell { display: table-cell !important; }
                    .card { border: none !important; box-shadow: none !important; margin: 0 !important; padding: 0 !important; }
                    .table-container { overflow: visible !important; border: none !important; }
                    table { width: 100%; border-collapse: collapse !important; border: 1px solid #000 !important; }
                    th, td { border: 1px solid #000 !important; padding: 8px !important; text-align: left !important; }
                    th { background-color: #f2f2f2 !important; color: #000 !important; font-weight: bold !important; }
                    tr { page-break-inside: avoid; }
                    body { background: white !important; padding: 0 !important; margin: 0 !important; }
                }
            `}</style>

            {/* Add Credit Modal */}
            {showModal && (
                <CreditModal
                    t={t}
                    customers={customers.filter(c => c.status === 'active')}
                    onSave={handleSaveCredit}
                    onClose={() => setShowModal(false)}
                />
            )}

            {/* History Modal */}
            {viewingHistory && (
                <HistoryModal
                    t={t}
                    language={language}
                    customerId={viewingHistory}
                    customerName={getCustomer(viewingHistory)?.name || ''}
                    advances={advances.filter(a => a.customerId === viewingHistory)}
                    onClose={() => setViewingHistory(null)}
                />
            )}
        </div>
    );
}

// ── Credit Modal ──────────────────────────────────────────────
function CreditModal({ t, customers, onSave, onClose }: {
    t: Translations;
    customers: Customer[];
    onSave: (data: Omit<Advance, 'id' | 'createdAt'>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        customerId: customers[0]?.id || '',
        date: todayStr(),
        amount: 0,
        notes: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...form, remainingBalance: form.amount });
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">{t.addAmount}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">{t.selectCustomer} *</label>
                            <select
                                className="form-select"
                                required
                                value={form.customerId}
                                onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
                            >
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                            </select>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.date} *</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    required
                                    value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.amount} (₹) *</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min={1}
                                    required
                                    value={form.amount}
                                    onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                                    onFocus={e => e.target.select()}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.notes}</label>
                            <textarea
                                className="form-textarea"
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
                        <button type="submit" className="btn btn-primary">{t.save}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── History Modal ─────────────────────────────────────────────
function HistoryModal({ t, language, customerId, customerName, advances, onClose }: {
    t: Translations;
    language: string;
    customerId: string;
    customerName: string;
    advances: Advance[];
    onClose: () => void;
}) {
    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title">{t.creditHistory}</h3>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <User size={14} /> {customerName} ({customerId})
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <div className="modal-body" style={{ padding: 0 }}>
                    <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto', border: 'none', borderRadius: 0 }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)' }}>
                                <tr>
                                    <th style={{ borderTop: 'none' }}>{t.date}</th>
                                    <th style={{ borderTop: 'none' }}>{t.creditedAmount} (₹)</th>
                                    <th style={{ borderTop: 'none' }}>{t.remainingBalance} (₹)</th>
                                    <th style={{ borderTop: 'none' }}>{t.notes}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {advances.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            {t.noData}
                                        </td>
                                    </tr>
                                ) : (
                                    [...advances].sort((a, b) => b.date.localeCompare(a.date)).map((a) => (
                                        <tr key={a.id}>
                                            <td>{formatDate(a.date)}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <ArrowUpCircle size={14} />
                                                    {formatCurrency(a.amount)}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700 }}>{formatCurrency(a.remainingBalance)}</td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.notes || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>{t.close}</button>
                </div>
            </div>
        </div>
    );
}
