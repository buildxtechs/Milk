'use client';

import { useState, useMemo } from 'react';
import { useStore, useCustomers, useAdvances, useExternalDeductions } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Advance, Customer } from '@/lib/types';
import { generateAdvanceId, formatDate, formatCurrency, todayStr, generateWhatsAppLink, parseTemplate, calculateCustomerBalance, generateExternalDeductionId } from '@/lib/utils';
import { Plus, Search, Wallet, X, Clock, User, ArrowUpCircle, CalendarDays, Edit2, Trash2 } from 'lucide-react';

export default function AmountCreditsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();
    const deductions = useExternalDeductions();
    const addAdvance = useStore((s) => s.addAdvance);
    const updateAdvance = useStore((s) => s.updateAdvance);
    const settings = useStore((s) => s.settings);

    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [viewingHistory, setViewingHistory] = useState<string | null>(null);
    const [toast, setToast] = useState('');
    const [inlineAmounts, setInlineAmounts] = useState<Record<string, string>>({});
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNotes, setCreditNotes] = useState('');
    const [selectedCustomerForCredit, setSelectedCustomerForCredit] = useState<Customer | null>(null);

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

        const externalDeductionAmount = deductions
            .filter(d => d.customerId === customer.id && !d.isProcessed)
            .reduce((sum, d) => sum + d.amount, 0);

        const currentBalance = calculateCustomerBalance(customer.id, advances, deductions);

        // Find last credit date
        const lastCreditDate = customerAdvances.length > 0
            ? [...customerAdvances].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].date
            : null;

        return {
            ...customer,
            initialAmount,
            addedAmount,
            externalDeductionAmount,
            currentBalance,
            lastCreditDate
        };
    }).filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.village.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const hasBalA = a.currentBalance > 0 ? 1 : 0;
        const hasBalB = b.currentBalance > 0 ? 1 : 0;
        if (hasBalA !== hasBalB) return hasBalB - hasBalA;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    const addExternalDeduction = useStore((s) => s.addExternalDeduction);

    // Handle inline direct credit
    const handleInlineCredit = (customerId: string, amount: number) => {
        if (amount <= 0) return;

        const dedId = generateExternalDeductionId(deductions.map(d => d.id));
        addExternalDeduction({
            id: dedId,
            customerId,
            amount,
            reason: 'Added Credit (via Credits Page)',
            isProcessed: false,
            date: todayStr(),
            createdAt: new Date().toISOString()
        });

        showToast(language === 'ta' ? 'தொகை கழிக்கப்பட்டது' : 'Amount added to deductions');
        setInlineAmounts(prev => ({ ...prev, [customerId]: '' }));

        // WhatsApp Notification
        const customer = getCustomer(customerId);
        if (customer && customer.whatsapp) {
            const currentTotalBalance = calculateCustomerBalance(customerId, advances, deductions);
            const newTotalBalance = Math.max(0, currentTotalBalance - amount);

            const msg = parseTemplate(settings.whatsappAmountTemplate, {
                name: customer.name,
                amount: amount,
                balance: newTotalBalance
            });
            window.open(generateWhatsAppLink(customer.whatsapp, msg), '_blank');
        }
    };

    // Handle save credit from modal
    const handleSaveCredit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerForCredit || !creditAmount || Number(creditAmount) <= 0) return;

        const amount = Number(creditAmount);
        const dedId = generateExternalDeductionId(deductions.map(d => d.id));

        addExternalDeduction({
            id: dedId,
            customerId: selectedCustomerForCredit.id,
            amount,
            reason: creditNotes || 'Added Credit (via Credits Page)',
            isProcessed: false,
            date: todayStr(),
            createdAt: new Date().toISOString()
        });

        showToast(language === 'ta' ? 'தொகை கழிக்கப்பட்டது' : 'Amount added to deductions');
        setShowModal(false); // Changed from setShowCreditModal
        setCreditAmount('');
        setCreditNotes('');
        setSelectedCustomerForCredit(null);

        // Optional: WhatsApp Notification (adapted from original logic)
        const customer = getCustomer(selectedCustomerForCredit.id);
        if (customer && customer.whatsapp) {
            const currentTotalBalance = calculateCustomerBalance(customer.id, advances, deductions);
            const newTotalBalance = Math.max(0, currentTotalBalance - amount); // amount is the credit being added

            const msg = parseTemplate(settings.whatsappAmountTemplate, {
                name: customer.name,
                amount: amount,
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
                                <th>{language === 'ta' ? 'வெளிப்புற கழிவுகள்' : 'Ext. Deductions'} (₹)</th>
                                <th>{t.currentBalance} (₹)</th>
                                <th className="no-print" style={{ width: '120px' }}>{language === 'ta' ? 'நேரடி வரவு' : 'Add Credit'} (₹)</th>
                                <th className="no-print" style={{ width: '160px' }}>{t.actions}</th>
                                <th className="print-only-cell" style={{ width: '40px' }}>{t.check}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerFinanceData.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Wallet size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                customerFinanceData.map((c, index) => (
                                    <tr key={c.id} className={c.currentBalance === 0 ? 'print-hide' : ''}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{c.id}</td>
                                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                                        <td>{c.village}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(c.initialAmount)}</td>
                                        <td style={{ fontWeight: 600, color: c.addedAmount < 0 ? 'var(--danger)' : 'var(--primary)' }}>{formatCurrency(c.addedAmount)}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--danger)' }}>{formatCurrency(c.externalDeductionAmount)}</td>
                                        <td style={{ fontWeight: 700, color: c.currentBalance <= 500 && c.currentBalance > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                            {formatCurrency(c.currentBalance)}
                                            {c.currentBalance <= 500 && c.currentBalance > 0 && (
                                                <span className="no-print" style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--danger)', background: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                                                    {language === 'ta' ? 'குறைவு' : 'Low'}
                                                </span>
                                            )}
                                        </td>
                                        {/* Direct Credit Input */}
                                        <td className="no-print">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>₹</span>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    data-index={index}
                                                    data-field="direct-credit"
                                                    style={{ width: '90px', height: '32px', padding: '0 8px', fontSize: '13px' }}
                                                    placeholder="0"
                                                    min={0}
                                                    onFocus={e => e.target.select()}
                                                    onBlur={(e) => {
                                                        const val = Number(e.target.value);
                                                        if (val > 0) {
                                                            handleInlineCredit(c.id, val);
                                                            e.target.value = '';
                                                        }
                                                    }}
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const val = Number(e.target.value);
                                                            if (val > 0) {
                                                                addExternalDeduction({
                                                                    id: generateExternalDeductionId(deductions.map(d => d.id)),
                                                                    customerId: c.id,
                                                                    amount: val,
                                                                    reason: 'Added Credit (via Credits Page)',
                                                                    isProcessed: false,
                                                                    date: todayStr(),
                                                                    createdAt: new Date().toISOString()
                                                                });
                                                                showToast(language === 'ta' ? 'தொகை கழிக்கப்பட்டது' : 'Amount added to deductions');
                                                                e.target.value = '';
                                                            }
                                                            const nextEl = document.querySelector(`input[data-field="direct-credit"][data-index="${index + 1}"]`) as HTMLInputElement;
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
                                        <td className="no-print">
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                {c.lastCreditDate && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px', marginRight: '4px' }}>
                                                        <CalendarDays size={12} />
                                                        {formatDate(c.lastCreditDate)}
                                                    </span>
                                                )}
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
                    .print-hide { display: none !important; }
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
                    onSave={(data) => {
                        const amount = Number(data.amount);
                        const dedId = generateExternalDeductionId(deductions.map(d => d.id));
                        addExternalDeduction({
                            id: dedId,
                            customerId: data.customerId,
                            amount,
                            reason: data.notes || 'Added Credit (via Credits Page)',
                            isProcessed: false,
                            date: data.date,
                            createdAt: new Date().toISOString()
                        });
                        showToast(language === 'ta' ? 'தொகை கழிக்கப்பட்டது' : 'Amount added to deductions');
                        setShowModal(false);
                    }}
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
                    deductions={deductions.filter(d => d.customerId === viewingHistory)}
                    onUpdateAdvance={updateAdvance}
                    onDeleteAdvance={useStore.getState().deleteAdvance}
                    onUpdateDeduction={useStore.getState().updateExternalDeduction}
                    onDeleteDeduction={useStore.getState().deleteExternalDeduction}
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
    onSave: (data: { customerId: string; date: string; amount: number; notes: string }) => void;
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
        onSave({ ...form });
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
interface HistoryRecord {
    id: string;
    date: string;
    amount: number;
    notes?: string;
    reason?: string;
    type: 'advance' | 'deduction';
    createdAt: string;
    remainingBalance?: number;
}

function HistoryModal({
    t,
    language,
    customerId,
    customerName,
    advances,
    deductions,
    onUpdateAdvance,
    onDeleteAdvance,
    onUpdateDeduction,
    onDeleteDeduction,
    onClose
}: {
    t: Translations;
    language: string;
    customerId: string;
    customerName: string;
    advances: Advance[];
    deductions: any[];
    onUpdateAdvance: (id: string, data: Partial<Advance>) => void;
    onDeleteAdvance: (id: string) => void;
    onUpdateDeduction: (id: string, data: any) => void;
    onDeleteDeduction: (id: string) => void;
    onClose: () => void;
}) {
    const [editItem, setEditItem] = useState<HistoryRecord | null>(null);

    const records = useMemo(() => {
        const combined: HistoryRecord[] = [
            ...advances.map(a => ({ ...a, type: 'advance' as const })),
            ...deductions.map(d => ({ ...d, type: 'deduction' as const, notes: d.reason }))
        ];
        return combined.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [advances, deductions]);

    const handleDelete = (record: HistoryRecord) => {
        if (!confirm(t.deleteConfirm)) return;
        if (record.type === 'advance') onDeleteAdvance(record.id);
        else onDeleteDeduction(record.id);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;

        if (editItem.type === 'advance') {
            onUpdateAdvance(editItem.id, {
                amount: editItem.amount,
                date: editItem.date,
                notes: editItem.notes
            });
        } else {
            onUpdateDeduction(editItem.id, {
                amount: editItem.amount,
                date: editItem.date,
                reason: editItem.notes
            });
        }
        setEditItem(null);
    };

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg" style={{ maxWidth: '900px' }}>
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
                    <div className="table-container" style={{ maxHeight: '450px', overflowY: 'auto', border: 'none', borderRadius: 0 }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface)' }}>
                                <tr>
                                    <th style={{ borderTop: 'none' }}>{t.date}</th>
                                    <th style={{ borderTop: 'none' }}>{language === 'ta' ? 'வகை' : 'Type'}</th>
                                    <th style={{ borderTop: 'none' }}>{t.amount} (₹)</th>
                                    <th style={{ borderTop: 'none' }}>{t.notes}</th>
                                    <th style={{ borderTop: 'none', textAlign: 'center' }}>{t.actions}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            {t.noData}
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={`${r.type}-${r.id}`}>
                                            <td>{formatDate(r.date)}</td>
                                            <td>
                                                <span
                                                    className="badge"
                                                    style={{
                                                        background: r.type === 'advance' ? 'var(--success)15' : 'var(--danger)15',
                                                        color: r.type === 'advance' ? 'var(--success)' : 'var(--danger)',
                                                        fontSize: '11px'
                                                    }}
                                                >
                                                    {r.type === 'advance' ? (language === 'ta' ? 'முன்பணம்' : 'Advance') : (language === 'ta' ? 'வெளிப்புறக் கழிவு' : 'Deduction')}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600, color: r.type === 'advance' ? 'var(--success)' : 'var(--danger)' }}>
                                                {r.type === 'advance' ? '+' : '-'}{formatCurrency(r.amount)}
                                            </td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.notes || r.reason || '-'}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        style={{ color: 'var(--primary)' }}
                                                        onClick={() => setEditItem({ ...r, notes: r.notes || r.reason })}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-sm btn-icon"
                                                        style={{ color: 'var(--danger)' }}
                                                        onClick={() => handleDelete(r)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
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

            {/* Sub-modal for editing a specific record */}
            {editItem && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal" style={{ width: '400px' }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{t.edit} {editItem.type === 'advance' ? (language === 'ta' ? 'முன்பணம்' : 'Advance') : (language === 'ta' ? 'கழிவு' : 'Deduction')}</h3>
                            <button className="btn btn-ghost btn-icon" onClick={() => setEditItem(null)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleUpdate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">{t.date}</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={editItem.date}
                                        onChange={e => setEditItem({ ...editItem, date: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t.amount} (₹)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={editItem.amount}
                                        onChange={e => setEditItem({ ...editItem, amount: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">{t.notes}</label>
                                    <textarea
                                        className="form-textarea"
                                        value={editItem.notes || ''}
                                        onChange={e => setEditItem({ ...editItem, notes: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setEditItem(null)}>{t.cancel}</button>
                                <button type="submit" className="btn btn-primary">{t.save}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
