'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Transaction } from '@/lib/types';
import { formatDate, formatCurrency, currentMonthStr, formatTime } from '@/lib/utils';
import { FileText, Calendar, Edit2, Check, X, Trash2 } from 'lucide-react';

export default function POSTransactionsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const updateTransaction = useStore((s) => s.updateTransaction);
    const deleteTransaction = useStore((s) => s.deleteTransaction);
    const updateStock = useStore((s) => s.updateStock);
    const deductBalance = useStore((s) => s.deductBalance);
    const addAdvance = useStore((s) => s.addAdvance);

    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
    const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState<number>(0);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const getCustomer = (id: string) => customers.find(c => c.id === id);

    const filteredTxns = transactions
        .filter(t => {
            const customer = getCustomer(t.customerId);
            return !search || customer?.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
        })
        .filter(t => t.date.startsWith(selectedMonth))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const handleEdit = (txn: Transaction) => {
        setEditingTxnId(txn.id);
        setEditAmount(txn.totalAmount);
    };

    const handleSave = (txn: Transaction) => {
        if (editAmount < 0) {
            showToast(language === 'ta' ? 'சரியான தொகையை உள்ளிடவும்' : 'Enter a valid amount');
            return;
        }

        const diff = editAmount - txn.totalAmount;

        // If the sale was made on Credit (advance), we need to adjust the debt
        if (txn.paymentMode === 'advance' && diff !== 0) {
            if (diff > 0) {
                // Total amount increased, so they owe us more
                addAdvance({
                    id: `ADV-${Date.now()}`,
                    customerId: txn.customerId,
                    date: new Date().toISOString().split('T')[0],
                    amount: diff,
                    remainingBalance: diff,
                    notes: `POS Edit (Added): ${txn.id}`,
                    createdAt: new Date().toISOString()
                });
            } else {
                // Total amount decreased, so their debt decreases
                deductBalance(txn.customerId, Math.abs(diff));
            }
        }

        updateTransaction(txn.id, {
            totalAmount: editAmount,
            advanceUsed: txn.paymentMode === 'advance' ? editAmount : txn.advanceUsed
        });

        setEditingTxnId(null);
        showToast(language === 'ta' ? 'தொகை புதுப்பிக்கப்பட்டது' : 'Amount updated successfully');
    };

    const handleDelete = (txn: Transaction) => {
        if (!confirm(language === 'ta' ? 'இந்த பரிவர்த்தனையை நீக்க விரும்புகிறீர்களா? (கையிருப்பு மற்றும் கணக்கு சரிசெய்யப்படும்)' : 'Are you sure you want to delete this transaction? (Stock and balances will be restored)')) {
            return;
        }

        // Restore stock
        txn.items.forEach(item => {
            updateStock(item.productId, item.quantity); // Adds stock back
        });

        // Restore Advance/Debt
        // If paymentMode was advance, we ADDED to their debt. So deleting must REMOVE that debt (deductBalance).
        if (txn.paymentMode === 'advance' && txn.advanceUsed) {
            // Note: useStore's deductBalance reduces the debt balance (which is remainingBalance in Advances)
            deductBalance(txn.customerId, txn.advanceUsed);
        }

        deleteTransaction(txn.id);
        showToast(language === 'ta' ? 'பரிவர்த்தனை நீக்கப்பட்டது' : 'Transaction deleted');
    };

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{language === 'ta' ? 'POS பரிவர்த்தனைகள்' : 'POS Transactions'}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'பரிவர்த்தனை தொகையை நிர்வகிக்கவும் திருத்தவும்' : 'Manage and edit transaction amounts'}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 mb-4 items-center">
                <div className="search-bar">
                    <FileText size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <input type="month" className="form-input" style={{ width: 'auto' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                </div>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.invoiceNumber}</th>
                                <th>{t.date}</th>
                                <th>{t.name}</th>
                                <th>{language === 'ta' ? 'பொருட்கள்' : 'Items'}</th>
                                <th>{t.paymentMode}</th>
                                <th>{t.amount}</th>
                                <th style={{ textAlign: 'center' }}>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTxns.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <FileText size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filteredTxns.map(txn => {
                                    const customer = getCustomer(txn.customerId);
                                    const isEditing = editingTxnId === txn.id;
                                    return (
                                        <tr key={txn.id}>
                                            <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>{txn.id}</td>
                                            <td style={{ fontSize: '13px' }}>
                                                <div>{formatDate(txn.date)}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatTime(txn.createdAt)}</div>
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{customer?.name || txn.customerId}</td>
                                            <td>{txn.items.length} {language === 'ta' ? 'பொருட்கள்' : 'items'}</td>
                                            <td>
                                                <span className={`badge ${txn.paymentMode === 'cash' ? 'badge-blue' : 'badge-green'}`}>
                                                    {txn.paymentMode === 'cash' ? t.cash : (language === 'ta' ? 'கடன்' : 'Credit')}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                                                {isEditing ? (
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        style={{ width: '100px', padding: '4px 8px' }}
                                                        value={editAmount === 0 ? '' : editAmount}
                                                        onChange={e => setEditAmount(Number(e.target.value))}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    formatCurrency(txn.totalAmount)
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button className="btn btn-sm btn-icon" style={{ color: 'var(--success)' }} onClick={() => handleSave(txn)} title={t.save}>
                                                            <Check size={16} />
                                                        </button>
                                                        <button className="btn btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setEditingTxnId(null)} title={t.cancel}>
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleEdit(txn)} title={language === 'ta' ? 'திருத்து' : 'Edit'}>
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(txn)} title={t.delete}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
