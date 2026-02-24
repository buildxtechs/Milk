'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, Printer, FileText, Download, User, Wallet, ShoppingCart, CheckCircle } from 'lucide-react';

export default function ExportPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();

    const [search, setSearch] = useState('');

    // Aggregate data per customer
    const exportData = customers.map(customer => {
        const customerTransactions = transactions.filter(t => t.customerId === customer.id);
        const customerAdvances = advances.filter(a => a.customerId === customer.id);

        // Sum total added (Initial Amount)
        const totalAdded = customerAdvances.reduce((sum, advance) => sum + advance.amount, 0);
        const currentBalance = customerAdvances.reduce((sum, advance) => sum + advance.remainingBalance, 0); // This is their actual current credit

        // Sum total spent
        const totalSpent = customerTransactions.reduce((sum, transaction) => sum + transaction.totalAmount, 0);

        // Collect all items purchased
        const allItems = customerTransactions.flatMap(t => t.items.map(i => i.productName));
        const uniqueItems = Array.from(new Set(allItems)).join(', ');

        // Collect all invoice numbers
        const invoiceNumbers = customerTransactions.map(t => t.id).join(', ');

        return {
            id: customer.id,
            name: customer.name,
            village: customer.village,
            items: uniqueItems || '-',
            totalAdded,
            totalSpent,
            currentBalance,
            invoices: invoiceNumbers || '-',
            purchaseCount: customerTransactions.length
        };
    }).filter(row => row.purchaseCount > 0); // Only show customers with purchases

    const filtered = exportData.filter(row =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.village.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.exportData}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'வாடிக்கையாளர் வாரியாக விற்பனை சுருக்கம்' : 'Customer-wise purchase summary'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={() => window.print()}>
                        <Printer size={16} /> {t.print}
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)' }} />
                    <input placeholder={`${t.search} ${t.name}, ID...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Export Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon purple"><Wallet size={20} /></div>
                    <div>
                        <div className="stat-label">{t.totalInitialAmount}</div>
                        <div className="stat-value">{formatCurrency(filtered.reduce((sum, row) => sum + row.totalAdded, 0))}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><ShoppingCart size={20} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த செலவு' : 'Total Spent'}</div>
                        <div className="stat-value">{formatCurrency(filtered.reduce((sum, row) => sum + row.totalSpent, 0))}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><CheckCircle size={20} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த இருப்பு' : 'Net Balance'}</div>
                        <div className="stat-value">{formatCurrency(filtered.reduce((sum, row) => sum + row.currentBalance, 0))}</div>
                    </div>
                </div>
            </div>

            <div className="card shadow-sm">
                <div className="table-container">
                    <table className="export-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>{t.name}</th>
                                <th>{t.village}</th>
                                <th>{t.totalInitialAmount} (₹)</th>
                                <th style={{ width: '20%' }}>{language === 'ta' ? 'வாங்கிய பொருட்கள்' : 'Items Purchased'}</th>
                                <th>{t.amount} (₹)</th>
                                <th>{language === 'ta' ? 'இருப்பு' : 'Balance'} (₹)</th>
                                <th style={{ width: '20%' }}>{language === 'ta' ? 'இன்வாய்ஸ் எண்கள்' : 'Invoice Numbers'}</th>
                                <th style={{ width: '40px' }} className="print-only-cell">{language === 'ta' ? 'தேர்வு' : 'Check'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        <FileText size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.id}</td>
                                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                                        <td>{row.village}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(row.totalAdded)}</td>
                                        <td style={{ fontSize: '12px' }}>{row.items}</td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>{formatCurrency(row.totalSpent)}</td>
                                        <td style={{ fontWeight: 700, color: row.currentBalance < 0 ? 'var(--danger)' : 'var(--primary)' }}>{formatCurrency(row.currentBalance)}</td>
                                        <td style={{ fontSize: '11px', fontFamily: 'monospace' }}>{row.invoices}</td>
                                        <td className="print-only-cell">
                                            <div style={{ width: '18px', height: '18px', border: '1px solid #cbd5e1', margin: '0 auto' }}></div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx>{`
                .export-table th { white-space: nowrap; }
                .print-only-cell { display: none; }
                @media print {
                    .page-header div:last-child, .search-bar { display: none; }
                    .print-only-cell { display: table-cell !important; }
                    .card { border: none; box-shadow: none; }
                    .export-table th { background: #f8fafc !important; color: black !important; }
                    .export-table td { border-bottom: 1px solid #e2e8f0; }
                }
            `}</style>
        </div>
    );
}
