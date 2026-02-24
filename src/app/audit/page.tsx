'use client';

import { useState, useMemo } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, usePayouts, useExternalDeductions } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, Printer, FileText, ShoppingCart, Wallet, ArrowDownCircle, MinusCircle } from 'lucide-react';

export default function AuditPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const payouts = usePayouts();
    const deductions = useExternalDeductions();

    const [search, setSearch] = useState('');

    const allItems = useMemo(() => {
        const txns = transactions.map(txn => ({
            id: txn.id,
            date: txn.date,
            customerId: txn.customerId,
            type: 'deduction' as const,
            amount: txn.totalAmount,
            details: txn.items.map(i => i.productName).join(', '),
            createdAt: txn.createdAt
        }));

        const advs = advances.map(adv => ({
            id: adv.id,
            date: adv.date,
            customerId: adv.customerId,
            type: 'addition' as const,
            amount: adv.amount,
            details: adv.notes || (language === 'ta' ? 'தொகை சேர்க்கப்பட்டது' : 'Amount Added'),
            createdAt: adv.createdAt
        }));

        const pays = payouts.map(p => ({
            id: p.id,
            date: p.date,
            customerId: p.customerId,
            type: 'payout' as const,
            amount: p.netAmount,
            details: language === 'ta' ? `பணப்பட்டுவாடா (கழிவு: ${formatCurrency(p.deductionAmount)})` : `Payout (Deduction: ${formatCurrency(p.deductionAmount)})`,
            createdAt: p.createdAt
        }));

        const eds = deductions.map(d => ({
            id: d.id,
            date: d.date,
            customerId: d.customerId,
            type: 'external_deduction' as const,
            amount: d.amount,
            details: d.reason,
            createdAt: d.createdAt
        }));

        return [...txns, ...advs, ...pays, ...eds].sort((a, b) => a.createdAt.localeCompare(b.createdAt)); // Sort ascending for balance calculation
    }, [transactions, advances, payouts, deductions, language]);

    // Calculate running balance per customer
    const balances: Record<string, number> = {};
    const auditData = allItems.map(item => {
        const currentBalance = balances[item.customerId] || 0;
        let newBalance = currentBalance;

        if (item.type === 'addition') {
            newBalance += item.amount;
        } else if (item.type === 'deduction' || item.type === 'payout' || item.type === 'external_deduction') {
            newBalance -= item.amount;
        }

        balances[item.customerId] = newBalance;
        return { ...item, runningBalance: newBalance };
    }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Sort back to newest first

    const filtered = auditData.filter(item => {
        const customer = customers.find(c => c.id === item.customerId);
        const matchSearch = customer?.name.toLowerCase().includes(search.toLowerCase()) ||
            customer?.id.toLowerCase().includes(search.toLowerCase()) ||
            item.details.toLowerCase().includes(search.toLowerCase());
        return !search || matchSearch;
    });

    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.auditLog}</h1>
                    <p className="page-subtitle">{t.auditManagement}</p>
                </div>
                <button className="btn btn-secondary" onClick={() => window.print()}>
                    <Printer size={16} /> {t.print}
                </button>
            </div>

            {/* Audit Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon purple"><Wallet size={20} /></div>
                    <div>
                        <div className="stat-label">{t.totalInitialAmount}</div>
                        <div className="stat-value">{formatCurrency(filtered.filter(i => i.type === 'addition').reduce((s, i) => s + i.amount, 0))}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Wallet size={20} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'சேர்க்கப்பட்ட மொத்த தொகை' : 'Total Amount Added'}</div>
                        <div className="stat-value">{formatCurrency(filtered.filter(i => i.type === 'addition').reduce((s, i) => s + i.amount, 0))}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><ShoppingCart size={20} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த கழிவுகள்' : 'Total Deductions'}</div>
                        <div className="stat-value">{formatCurrency(filtered.filter(i => i.type === 'deduction').reduce((s, i) => s + i.amount, 0))}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><FileText size={20} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'நிகர் பலன்' : 'Net Balance'}</div>
                        <div className="stat-value">
                            {formatCurrency(
                                filtered.filter(i => i.type === 'addition').reduce((s, i) => s + i.amount, 0) -
                                filtered.filter(i => i.type === 'deduction').reduce((s, i) => s + i.amount, 0)
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input placeholder={`${t.search} ${t.name}, ID...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="table-container">
                    <table className="audit-table">
                        <thead>
                            <tr>
                                <th>{t.date}</th>
                                <th>{t.name}</th>
                                <th>{language === 'ta' ? 'வகை' : 'Type'}</th>
                                <th>{t.amount}</th>
                                <th>{language === 'ta' ? 'இருப்பு' : 'Balance'}</th>
                                <th>{language === 'ta' ? 'விவரங்கள்' : 'Details'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        <FileText size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item, idx) => (
                                    <tr key={`${item.id}-${idx}`}>
                                        <td>{formatDate(item.date)}</td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{getCustomerName(item.customerId)}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{item.customerId}</div>
                                        </td>
                                        <td>
                                            <span className={`badge ${item.type === 'addition' ? 'badge-green' : 'badge-orange'}`}>
                                                {item.type === 'addition' ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Wallet size={10} /> {t.amountAdded}
                                                    </span>
                                                ) : (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <ShoppingCart size={10} /> {t.deductionAmount}
                                                    </span>
                                                )}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: item.type === 'addition' ? 'var(--success)' : 'var(--danger)' }}>
                                            {item.type === 'addition' ? '+' : '-'}{formatCurrency(item.amount)}
                                        </td>
                                        <td style={{ fontWeight: 600, color: item.runningBalance < 0 ? 'var(--danger)' : 'var(--primary)' }}>
                                            {formatCurrency(item.runningBalance)}
                                        </td>
                                        <td style={{ fontSize: '12px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.details}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .page-header button, .search-bar { display: none; }
                    .card { border: none; box-shadow: none; }
                    .audit-table th { background: #f8fafc !important; color: black !important; }
                }
            `}</style>
        </div>
    );
}
