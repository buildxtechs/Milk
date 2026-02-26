'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore, useCustomers, useAdvances, useSettings } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Advance } from '@/lib/types';
import { generateAdvanceId, formatDate, formatCurrency, todayStr, generateWhatsAppLink, parseTemplate } from '@/lib/utils';
import { Plus, Search, Trash2, Wallet, X, AlertTriangle, Send } from 'lucide-react';

export default function FinancePage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <FinanceContent />
        </Suspense>
    );
}

function FinanceContent() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();
    const addAdvance = useStore((s) => s.addAdvance);
    const updateAdvance = useStore((s) => s.updateAdvance);
    const deleteAdvance = useStore((s) => s.deleteAdvance);
    const settings = useSettings();
    const searchParams = useSearchParams();

    const [search, setSearch] = useState('');

    useEffect(() => {
        const query = searchParams.get('search');
        if (query) setSearch(query);
    }, [searchParams]);

    const [showModal, setShowModal] = useState(false);
    const [preselectedId, setPreselectedId] = useState<string | undefined>(undefined);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const getCustomer = (id: string) => customers.find(c => c.id === id);

    const filtered = advances.filter(a => {
        const customer = getCustomer(a.customerId);
        return !search || customer?.name.toLowerCase().includes(search.toLowerCase()) || customer?.village.toLowerCase().includes(search.toLowerCase());
    }).sort((a, b) => {
        if (a.remainingBalance === 0 && b.remainingBalance !== 0) return 1;
        if (a.remainingBalance !== 0 && b.remainingBalance === 0) return -1;
        return b.remainingBalance - a.remainingBalance;
    });

    const totalOutstanding = advances.reduce((s, a) => s + a.remainingBalance, 0);
    const totalGiven = advances.reduce((s, a) => s + a.amount, 0);

    const handleSave = (data: Omit<Advance, 'id' | 'createdAt'>) => {
        const id = generateAdvanceId(advances.map(a => a.id));
        addAdvance({ ...data, id, createdAt: new Date().toISOString() });
        showToast(t.savedSuccess);

        // Open WhatsApp Link
        const customer = getCustomer(data.customerId);
        if (customer && customer.whatsapp) {
            // Recalculate customer's total balance
            const customerAdvances = advances.filter(a => a.customerId === data.customerId);
            const currentTotalBalance = customerAdvances.reduce((s, a) => s + a.remainingBalance, 0) + data.amount;

            const message = parseTemplate(settings.whatsappAmountTemplate, {
                name: customer.name,
                amount: data.amount,
                balance: currentTotalBalance
            });
            window.open(generateWhatsAppLink(customer.whatsapp, message), '_blank');
        }

        setShowModal(false);
    };

    const handleDelete = (id: string) => {
        if (confirm(t.deleteConfirm)) { deleteAdvance(id); showToast(t.deletedSuccess); }
    };

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.finance}</h1>
                    <p className="page-subtitle">{advances.length} {t.totalFinanceRecords}</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setPreselectedId(undefined); setShowModal(true); }}>
                    <Plus size={16} /> {t.addAmount}
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon orange"><Wallet size={22} /></div>
                    <div>
                        <div className="stat-label">{t.totalGiven}</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(totalGiven)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><AlertTriangle size={22} /></div>
                    <div>
                        <div className="stat-label">{t.outstandingBalances}</div>
                        <div className="stat-value" style={{ fontSize: '20px' }}>{formatCurrency(totalOutstanding)}</div>
                    </div>
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search} ${t.name}, ${t.village}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.memberNumber}</th>
                                <th>{t.name}</th>
                                <th>{t.village}</th>
                                <th>{t.date}</th>
                                <th>{t.advanceAmount}</th>
                                <th>{t.remainingBalance}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Wallet size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((a, index) => {
                                    const customer = getCustomer(a.customerId);
                                    const recovered = a.amount - a.remainingBalance;
                                    const progress = a.amount > 0 ? (recovered / a.amount) * 100 : 0;
                                    return (
                                        <tr key={a.id} className={a.remainingBalance === 0 ? 'print-hide' : ''}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}>{a.id}</td>
                                            <td
                                                style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'underline' }}
                                                onClick={() => {
                                                    setPreselectedId(customer?.id || a.customerId);
                                                    setShowModal(true);
                                                }}
                                            >
                                                {customer?.name || a.customerId}
                                            </td>
                                            <td>{customer?.village || '-'}</td>
                                            <td>{formatDate(a.date)}</td>
                                            <td style={{ fontWeight: 600 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>₹</span>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        data-index={index}
                                                        data-field="advance-amount"
                                                        style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '13px' }}
                                                        defaultValue={a.amount}
                                                        onBlur={(e) => {
                                                            const newVal = Number(e.target.value);
                                                            if (newVal !== a.amount) {
                                                                const diff = newVal - a.amount;
                                                                updateAdvance(a.id, {
                                                                    amount: newVal,
                                                                    remainingBalance: Math.max(0, a.remainingBalance + diff)
                                                                });
                                                            }
                                                        }}
                                                        onKeyDown={(e: any) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const nextEl = document.querySelector(`input[data-field="advance-amount"][data-index="${index + 1}"]`) as HTMLInputElement;
                                                                if (nextEl) {
                                                                    nextEl.focus();
                                                                    nextEl.select();
                                                                } else {
                                                                    e.target.blur();
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: 700, color: a.remainingBalance > 0 ? 'var(--danger)' : 'var(--primary)' }}>
                                                {formatCurrency(a.remainingBalance)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--primary)' }} onClick={() => {
                                                        if (customer && customer.whatsapp) {
                                                            const message = parseTemplate(settings.whatsappAmountTemplate, {
                                                                name: customer.name,
                                                                amount: a.amount,
                                                                balance: a.remainingBalance
                                                            });
                                                            window.open(generateWhatsAppLink(customer.whatsapp, message), '_blank');
                                                        }
                                                    }}>
                                                        <Send size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(a.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <AdvanceModal
                    t={t}
                    language={language}
                    customers={customers.filter(c => c.status === 'active')}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setPreselectedId(undefined); }}
                    initialCustomerId={preselectedId || (search.startsWith('CUST-') ? search : undefined)}
                />
            )}

            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-hide { display: none !important; }
                }
            `}</style>
        </div>
    );
}

function AdvanceModal({ t, language, customers, onSave, onClose, initialCustomerId }: {
    t: Translations;
    language: string;
    customers: ReturnType<typeof useCustomers>;
    onSave: (data: Omit<Advance, 'id' | 'createdAt'>) => void;
    onClose: () => void;
    initialCustomerId?: string;
}) {
    const [form, setForm] = useState({
        customerId: initialCustomerId || customers[0]?.id || '',
        date: todayStr(),
        amount: 0,
        notes: '',
    });

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

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
                            <select className="form-select" required value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                            </select>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.date} *</label>
                                <input className="form-input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.advanceAmount} (₹) *</label>
                                <input className="form-input" type="number" min={1} required value={form.amount} onChange={e => set('amount', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.notes}</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} />
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
