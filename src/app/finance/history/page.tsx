'use client';

import { useState, useMemo, Suspense } from 'react';
import { useStore, useCustomers, useAdvances, usePayouts, useExternalDeductions } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency, calculateCustomerBalance } from '@/lib/utils';
import { Search, Filter, Trash2, Edit2, Wallet, ShoppingBag, ArrowDownCircle, AlertCircle, X, CheckCircle } from 'lucide-react';

export default function FinanceHistoryPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">Loading History...</div>}>
            <HistoryContent />
        </Suspense>
    );
}

function HistoryContent() {
    const language = useStore((s) => s.language);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'advance' | 'payout' | 'deduction' | 'purchase'>('all');
    const [editItem, setEditItem] = useState<any>(null);
    const [toast, setToast] = useState('');
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();
    const payouts = usePayouts();
    const deductions = useExternalDeductions(); // Assuming this was missing, based on usage in allRecords
    const transactions = useStore((s) => s.transactions); // Assuming this was missing, based on usage in allRecords
    const deleteAdvance = useStore((s) => s.deleteAdvance);
    const deletePayout = useStore((s) => s.deletePayout);
    const deleteExternalDeduction = useStore((s) => s.deleteExternalDeduction);
    const deleteTransaction = useStore((s) => s.deleteTransaction);
    const updateAdvance = useStore((s) => s.updateAdvance);
    const updateExternalDeduction = useStore((s) => s.updateExternalDeduction);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const allRecords = useMemo(() => {
        const records: any[] = [];

        // Advances
        advances.forEach(a => {
            records.push({
                ...a,
                type: 'advance',
                displayType: language === 'ta' ? 'முன்பணம்' : 'Advance',
                displayColor: 'var(--success)',
                amount: a.amount,
                details: a.notes || '-',
            });
        });

        // Payouts
        payouts.forEach(p => {
            records.push({
                ...p,
                type: 'payout',
                displayType: language === 'ta' ? 'பணப்பட்டுவாடா' : 'Payout',
                displayColor: 'var(--primary)',
                amount: p.netAmount,
                details: language === 'ta' ? `கழிவு: ${formatCurrency(p.deductionAmount)}` : `Deduction: ${formatCurrency(p.deductionAmount)}`,
            });
        });

        // External Deductions
        deductions.forEach(d => {
            records.push({
                ...d,
                type: 'deduction',
                displayType: language === 'ta' ? 'வெளிப்புறக் கழிவு' : 'Deduction',
                displayColor: 'var(--danger)',
                amount: d.amount,
                details: d.reason,
            });
        });

        // POS Transactions (Purchases)
        transactions.forEach(t => {
            records.push({
                ...t,
                type: 'purchase',
                displayType: language === 'ta' ? 'கொள்முதல்' : 'Purchase',
                displayColor: 'var(--warning)',
                amount: t.totalAmount,
                details: t.items.map(i => `${i.productName} x${i.quantity}`).join(', '),
            });
        });

        return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }, [advances, payouts, deductions, transactions, language]);

    const filtered = allRecords.filter(r => {
        const customer = customers.find(c => c.id === r.customerId);
        const matchSearch = customer?.name.toLowerCase().includes(search.toLowerCase()) ||
            customer?.id.toLowerCase().includes(search.toLowerCase()) ||
            r.details.toLowerCase().includes(search.toLowerCase());
        const matchType = typeFilter === 'all' || r.type === typeFilter;
        return matchSearch && matchType;
    });

    const handleDelete = (record: any) => {
        if (!confirm(t.deleteConfirm)) return;

        if (record.type === 'advance') deleteAdvance(record.id);
        else if (record.type === 'payout') deletePayout(record.id);
        else if (record.type === 'deduction') deleteExternalDeduction(record.id);
        else if (record.type === 'purchase') deleteTransaction(record.id);

        showToast(t.deletedSuccess);
    };

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editItem) return;

        if (editItem.type === 'advance') {
            updateAdvance(editItem.id, {
                amount: editItem.amount,
                date: editItem.date,
                notes: editItem.notes,
                remainingBalance: editItem.remainingBalance
            });
        } else if (editItem.type === 'deduction') {
            updateExternalDeduction(editItem.id, {
                amount: editItem.amount,
                date: editItem.date,
                reason: editItem.reason
            });
        }

        setEditItem(null);
        showToast(t.savedSuccess);
    };

    return (
        <div className="animate-fade-in">
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{language === 'ta' ? 'நிதி வரலாறு' : 'Finance History'}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'அனைத்து நிதி பரிவர்த்தனைகளையும் நிர்வகிக்கவும்' : 'Manage all financial transactions and deductions'}</p>
                </div>
            </div>

            <div className="card shadow-sm" style={{ marginBottom: '20px' }}>
                <div className="card-body" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input
                            placeholder={`${t.search} ${t.name}, ID...`}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {(['all', 'advance', 'payout', 'deduction', 'purchase'] as const).map(f => (
                            <button
                                key={f}
                                className={`btn btn-sm ${typeFilter === f ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setTypeFilter(f)}
                            >
                                {f === 'all' && t.all}
                                {f === 'advance' && (language === 'ta' ? 'முன்பணம்' : 'Advances')}
                                {f === 'payout' && (language === 'ta' ? 'பட்டுவாடா' : 'Payouts')}
                                {f === 'deduction' && (language === 'ta' ? 'கழிவுகள்' : 'Deductions')}
                                {f === 'purchase' && (language === 'ta' ? 'கொள்முதல்' : 'Purchases')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="card shadow-sm overflow-hidden">
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>{t.date}</th>
                                <th>{t.name}</th>
                                <th>{language === 'ta' ? 'வகை' : 'Type'}</th>
                                <th style={{ textAlign: 'right' }}>{t.amount}</th>
                                <th>{language === 'ta' ? 'விவரங்கள்' : 'Details'}</th>
                                <th style={{ textAlign: 'center' }}>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                                        <AlertCircle size={40} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(r => {
                                    const customer = customers.find(c => c.id === r.customerId);
                                    return (
                                        <tr key={r.id}>
                                            <td style={{ fontSize: '13px' }}>{formatDate(r.date)}</td>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{customer?.name || r.customerId}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{customer?.village} • {r.customerId}</div>
                                            </td>
                                            <td>
                                                <span
                                                    className="badge"
                                                    style={{
                                                        background: `${r.displayColor}20`,
                                                        color: r.displayColor,
                                                        border: `1px solid ${r.displayColor}40`
                                                    }}
                                                >
                                                    {r.displayType}
                                                    {r.type === 'deduction' && r.isProcessed && (
                                                        <span title="Processed" style={{ display: 'inline-flex', alignItems: 'center' }}>
                                                            <CheckCircle size={10} style={{ marginLeft: '4px' }} />
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: r.type === 'advance' ? 'var(--success)' : 'var(--danger)' }}>
                                                {r.type === 'advance' ? '+' : '-'}{formatCurrency(r.amount)}
                                            </td>
                                            <td style={{ fontSize: '12px', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {r.details}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    {(r.type === 'advance' || r.type === 'deduction') && (
                                                        <button
                                                            className="btn btn-ghost btn-sm btn-icon"
                                                            style={{ color: 'var(--primary)' }}
                                                            onClick={() => setEditItem({ ...r })}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {editItem && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 className="modal-title">
                                {t.edit} {editItem.displayType}
                            </h3>
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
                                        onChange={e => {
                                            const newAmount = Number(e.target.value);
                                            if (editItem.type === 'advance') {
                                                const diff = newAmount - editItem.amount;
                                                setEditItem({
                                                    ...editItem,
                                                    amount: newAmount,
                                                    remainingBalance: Math.max(0, (editItem.remainingBalance || 0) + diff)
                                                });
                                            } else {
                                                setEditItem({ ...editItem, amount: newAmount });
                                            }
                                        }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">
                                        {editItem.type === 'advance' ? t.notes : t.reason}
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        value={editItem.type === 'advance' ? editItem.notes : editItem.reason}
                                        onChange={e => {
                                            if (editItem.type === 'advance') setEditItem({ ...editItem, notes: e.target.value });
                                            else setEditItem({ ...editItem, reason: e.target.value });
                                        }}
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

