import { useMemo } from 'react';
import { Customer, Transaction, Advance } from '@/lib/types';
import { Translations } from '@/lib/translations';
import { formatDate, formatCurrency, currentMonthStr } from '@/lib/utils';
import { X, ShoppingBag, Wallet, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface CustomerDetailsModalProps {
    t: Translations;
    language: string;
    customer: Customer;
    transactions: Transaction[];
    advances: Advance[];
    onClose: () => void;
}

export default function CustomerDetailsModal({
    t, language, customer, transactions, advances, onClose
}: CustomerDetailsModalProps) {
    const currentMonth = currentMonthStr();

    // Financials
    const summary = useMemo(() => {
        const cTxns = transactions.filter(t => t.date.startsWith(currentMonth) && t.customerId === customer.id);
        const productDeductions = cTxns.reduce((s, t) => s + t.totalAmount, 0);
        const cAdvances = advances.filter(a => a.customerId === customer.id);
        const totalAdvances = cAdvances.reduce((s, a) => s + a.amount, 0);
        const remainingAdvances = cAdvances.reduce((s, a) => s + a.remainingBalance, 0);
        return { productDeductions, totalAdvances, remainingAdvances };
    }, [customer.id, currentMonth, transactions, advances]);

    // Purchase History
    const customerTransactions = useMemo(() => transactions
        .filter(t => t.customerId === customer.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        [customer.id, transactions]);


    // Calculate total spend
    const totalSpend = customerTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontSize: '24px' }}>🐄</div>
                        <div>
                            <h3 className="modal-title">{customer.name}</h3>
                            <div className="page-subtitle">{customer.village} | {customer.mobile}</div>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body">
                    {/* Financial Snapshot */}
                    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: '24px' }}>
                        <div className="stat-card">
                            <div className="stat-icon orange"><ShoppingBag size={20} /></div>
                            <div>
                                <div className="stat-label">{t.totalSales}</div>
                                <div className="stat-value">{customerTransactions.length}</div>
                                <div className="stat-sub">{formatCurrency(totalSpend)}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon red"><Wallet size={20} /></div>
                            <div>
                                <div className="stat-label">{t.outstandingAdvances}</div>
                                <div className="stat-value" style={{ color: 'var(--primary)' }}>{formatCurrency(summary.remainingAdvances)}</div>
                                <div className="stat-sub">{language === 'ta' ? 'மொத்த அட்வான்ஸ்' : 'Total Advances'}: {formatCurrency(summary.totalAdvances)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                        {/* Monthly Overview */}
                        <div className="card">
                            <div className="card-header">
                                <h4 className="card-title">{language === 'ta' ? 'இந்த மாத சுருக்கம்' : 'Monthly Overview'}</h4>
                            </div>
                            <div className="card-body" style={{ textAlign: 'center', padding: '32px' }}>
                                <ShoppingBag size={48} style={{ color: 'var(--primary)', marginBottom: '16px' }} />
                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>
                                    {transactions.filter(t => t.date.startsWith(currentMonth) && t.customerId === customer.id).length}
                                </div>
                                <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                                    {language === 'ta' ? 'இந்த மாத கொள்முதல் எண்ணிக்கை' : 'Purchases this month'}
                                </p>
                                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', fontWeight: 700, fontSize: '18px' }}>
                                    {formatCurrency(summary.productDeductions)}
                                </div>
                            </div>
                        </div>

                        {/* Recent Purchases */}
                        <div className="card">
                            <div className="card-header">
                                <h4 className="card-title">{language === 'ta' ? 'சமீபத்திய கொள்முதல்' : 'Recent Purchases'}</h4>
                            </div>
                            <div className="card-body" style={{ padding: 0, maxHeight: '300px', overflowY: 'auto' }}>
                                {customerTransactions.length === 0 ? (
                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        {t.noData}
                                    </div>
                                ) : (
                                    <table style={{ border: 'none' }}>
                                        <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                            <tr>
                                                <th>{t.date}</th>
                                                <th>{language === 'ta' ? 'பொருட்கள்' : 'Items'}</th>
                                                <th>{t.amount}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customerTransactions.map(txn => (
                                                <tr key={txn.id}>
                                                    <td>{formatDate(txn.date)}</td>
                                                    <td>
                                                        <div style={{ fontSize: '12px', fontWeight: 600 }}>
                                                            {txn.items.map(i => i.productName).join(', ')}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                            {t.cash}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 700 }}>{formatCurrency(txn.totalAmount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                            <div className="card-footer" style={{ borderTop: '1px solid var(--border)', padding: '12px' }}>
                                <Link
                                    href={`/customers/${customer.id}/history`}
                                    className="btn btn-ghost w-full"
                                    style={{ justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                                >
                                    {language === 'ta' ? 'முழு வரலாற்றைப் பார்க்க' : 'View Full History'}
                                    <ArrowRight size={14} />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
