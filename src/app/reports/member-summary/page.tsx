'use client';

import { useState } from 'react';
import { useStore, useCustomers, useAdvances } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatCurrency } from '@/lib/utils';
import { Search, Printer, FileText, Wallet, CheckCircle, Square } from 'lucide-react';

export default function MemberSummaryPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();

    const [search, setSearch] = useState('');
    const [exportOnly, setExportOnly] = useState(false);

    // Aggregate data per customer
    const memberData = customers.map(customer => {
        const customerAdvances = advances.filter(a => a.customerId === customer.id);

        // Sum total added (Initial Amount)
        const totalInitial = customerAdvances.reduce((sum, advance) => sum + advance.amount, 0);
        const currentBalance = customerAdvances.reduce((sum, advance) => sum + advance.remainingBalance, 0);

        return {
            id: customer.id,
            name: customer.name,
            village: customer.village,
            totalInitial,
            currentBalance,
        };
    });

    const filtered = memberData.filter(row =>
        row.name.toLowerCase().includes(search.toLowerCase()) ||
        row.id.toLowerCase().includes(search.toLowerCase()) ||
        row.village.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="animate-fade-in">
            <div className={`page-header ${exportOnly ? 'no-print' : ''}`}>
                <div>
                    <h1 className="page-title">{language === 'ta' ? 'உறுப்பினர் சுருக்கம்' : 'Member Summary'}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'உறுப்பினர் வாரியான நிதி சுருக்கம்' : 'Member-wise financial summary'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <label className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={exportOnly} onChange={e => setExportOnly(e.target.checked)} />
                        {language === 'ta' ? 'தரவு மட்டும்' : 'Export Data Only'}
                    </label>
                    <button className="btn btn-primary" onClick={() => window.print()}>
                        <Printer size={16} /> {t.print}
                    </button>
                </div>
            </div>

            <div className={`no-print`}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                    <div className="search-bar" style={{ flex: 1 }}>
                        <Search size={16} style={{ color: 'var(--text-muted)' }} />
                        <input placeholder={`${t.search} ${t.name}, ID...`} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                {/* Summary Stats */}
                {!exportOnly && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                        <div className="stat-card">
                            <div className="stat-icon purple"><Wallet size={20} /></div>
                            <div>
                                <div className="stat-label">{t.totalInitialAmount}</div>
                                <div className="stat-value">{formatCurrency(filtered.reduce((sum, row) => sum + row.totalInitial, 0))}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green"><CheckCircle size={20} /></div>
                            <div>
                                <div className="stat-label">{language === 'ta' ? 'மொத்த இருப்பு' : 'Total Balance'}</div>
                                <div className="stat-value">{formatCurrency(filtered.reduce((sum, row) => sum + row.currentBalance, 0))}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="card shadow-sm">
                <div className="table-container">
                    <table className="export-table">
                        <thead>
                            <tr>
                                <th>{t.memberNumber}</th>
                                <th>{t.name}</th>
                                <th>{t.totalInitialAmount} (₹)</th>
                                <th>{language === 'ta' ? 'இருப்பு' : 'Balance'} (₹)</th>
                                <th style={{ width: '40px' }} className="print-only-cell">
                                    {language === 'ta' ? 'தேர்வு' : 'Check'}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                                        <FileText size={32} style={{ opacity: 0.2, margin: '0 auto 12px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{row.id}</td>
                                        <td style={{ fontWeight: 600 }}>{row.name}</td>
                                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(row.totalInitial)}</td>
                                        <td style={{ fontWeight: 700, color: row.currentBalance < 0 ? 'var(--danger)' : 'var(--primary)' }}>{formatCurrency(row.currentBalance)}</td>
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
                    .no-print { display: none !important; }
                    .print-only-cell { display: table-cell !important; }
                    .card { border: none; box-shadow: none; }
                    .export-table th { background: #f8fafc !important; color: black !important; border-bottom: 2px solid #e2e8f0; }
                    .export-table td { border-bottom: 1px solid #e2e8f0; }
                    body { background: white !important; }
                }
            `}</style>
        </div>
    );
}
