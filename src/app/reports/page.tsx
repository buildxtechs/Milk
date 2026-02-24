'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useProducts } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatCurrency, formatDate, currentMonthStr, getMonthlySummary, exportToExcel } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Users, Droplets, ShoppingBag, Wallet, Download, Calendar } from 'lucide-react';

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const products = useProducts();

    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
    const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'customers'>('overview');

    // ── Month-filtered data ──────────────────────────────────────
    const monthTxns = transactions.filter(t => t.date.startsWith(selectedMonth));
    const activeCustomers = customers.filter(c => c.status === 'active');

    const totalSalesRevenue = monthTxns.reduce((s, t) => s + t.totalAmount, 0);
    const totalAdvancesGiven = advances.reduce((s, a) => s + a.amount, 0);
    const totalOutstanding = advances.reduce((s, a) => s + a.remainingBalance, 0);

    // ── Daily milk chart (last 30 days) ─────────────────────────
    const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const dateStr = d.toISOString().split('T')[0];
        const daySales = transactions.filter(t => t.date === dateStr);
        return {
            date: `${d.getDate()}/${d.getMonth() + 1}`,
            revenue: daySales.reduce((s, t) => s + t.totalAmount, 0),
        };
    });

    // ── Monthly trend (last 6 months) ───────────────────────────
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - (5 - i));
        const monthStr = d.toISOString().slice(0, 7);
        const mTxns = transactions.filter(t => t.date.startsWith(monthStr));
        return {
            month: d.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-IN', { month: 'short' }),
            salesRevenue: mTxns.reduce((s, t) => s + t.totalAmount, 0),
        };
    });

    // ── Category-wise sales ──────────────────────────────────────
    const categorySales = products.reduce((acc, p) => {
        const pTxns = monthTxns.flatMap(t => t.items.filter(i => i.productId === p.id));
        const revenue = pTxns.reduce((s, i) => s + i.total, 0);
        if (revenue > 0) {
            const existing = acc.find(a => a.category === p.category);
            if (existing) existing.revenue += revenue;
            else acc.push({ category: p.category, revenue });
        }
        return acc;
    }, [] as { category: string; revenue: number }[]);

    // ── Customer summaries ───────────────────────────────────────
    const customerSummaries = activeCustomers.map(c => {
        const cTransactions = transactions.filter(t => t.customerId === c.id && t.date.startsWith(selectedMonth));
        const totalSpent = cTransactions.reduce((s, t) => s + t.totalAmount, 0);
        return { customer: c, totalSpent, transactions: cTransactions };
    }).sort((a, b) => b.totalSpent - a.totalSpent);


    const handleExportSales = () => {
        const data = monthTxns.map(t => {
            const c = customers.find(c => c.id === t.customerId);
            return {
                'Invoice No': t.id,
                Date: formatDate(t.date),
                Customer: c?.name || t.customerId,
                Village: c?.village || '',
                Items: t.items.map(i => `${i.productName}×${i.quantity}`).join('; '),
                'Payment Mode': t.paymentMode,
                Total: t.totalAmount,
            };
        });
        exportToExcel(data, `sales_report_${selectedMonth}`);
    };

    const handleExportCustomers = () => {
        const data = customerSummaries.map(({ customer: c, totalSpent: s }) => ({
            ID: c.id,
            Name: c.name,
            Village: c.village,
            Mobile: c.mobile,
            'Total Spent': s.toFixed(2),
        }));
        exportToExcel(data, `customer_report_${selectedMonth}`);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.reports}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'நிதி மற்றும் செயல்பாட்டு அறிக்கைகள்' : 'Financial & operational reports'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                    <input type="month" className="form-input" style={{ width: 'auto' }} value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
                </div>
            </div>

            {/* Top Stats */}
            <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Users size={20} /></div>
                    <div>
                        <div className="stat-label">{t.activeCustomers}</div>
                        <div className="stat-value">{activeCustomers.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><ShoppingBag size={20} /></div>
                    <div>
                        <div className="stat-label">{t.salesRevenue}</div>
                        <div className="stat-value" style={{ fontSize: '16px' }}>{formatCurrency(totalSalesRevenue)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><Wallet size={20} /></div>
                    <div>
                        <div className="stat-label">{t.outstandingAdvances}</div>
                        <div className="stat-value" style={{ fontSize: '16px' }}>{formatCurrency(totalOutstanding)}</div>
                    </div>
                </div>
            </div>

            <div className="tabs">
                {(['overview', 'sales', 'customers'] as const).map(tab => (
                    <div key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                        {tab === 'overview' ? (language === 'ta' ? 'கண்ணோட்டம்' : 'Overview')
                            : tab === 'sales' ? t.sales
                                : t.customers}
                    </div>
                ))}
            </div>

            {/* ── Overview Tab ── */}
            {activeTab === 'overview' && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                        {/* Monthly Trend */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">{language === 'ta' ? '6 மாத வருவாய் போக்கு' : '6-Month Revenue Trend'}</span>
                            </div>
                            <div className="card-body">
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={last6Months}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        <Legend />
                                        <Line type="monotone" dataKey="salesRevenue" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name={language === 'ta' ? 'விற்பனை வருவாய்' : 'Sales Revenue'} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Category Sales Pie */}
                        <div className="card">
                            <div className="card-header">
                                <span className="card-title">{language === 'ta' ? 'வகை வாரியான விற்பனை' : 'Sales by Category'}</span>
                            </div>
                            <div className="card-body">
                                {categorySales.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t.noData}</div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie data={categorySales} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}>
                                                {categorySales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Milk Volume */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{language === 'ta' ? 'கடந்த 30 நாட்கள் விற்பனை போக்கு' : 'Last 30 Days Sales Trend'}</span>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={last30Days}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                                    <Bar dataKey="revenue" fill="#f59e0b" radius={[3, 3, 0, 0]} name={t.amount} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}


            {/* ── Sales Tab ── */}
            {activeTab === 'sales' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={handleExportSales}>
                            <Download size={14} /> {t.exportExcel}
                        </button>
                    </div>
                    <div className="card">
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t.invoiceNumber}</th>
                                        <th>{t.date}</th>
                                        <th>{t.name}</th>
                                        <th>{t.village}</th>
                                        <th>{language === 'ta' ? 'பொருட்கள்' : 'Items'}</th>
                                        <th>{t.paymentMode}</th>
                                        <th>{t.amount}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthTxns.length === 0 ? (
                                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t.noData}</td></tr>
                                    ) : (
                                        monthTxns.map(txn => {
                                            const c = customers.find(c => c.id === txn.customerId);
                                            return (
                                                <tr key={txn.id}>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}>{txn.id}</td>
                                                    <td>{formatDate(txn.date)}</td>
                                                    <td style={{ fontWeight: 600 }}>{c?.name || txn.customerId}</td>
                                                    <td>{c?.village || '-'}</td>
                                                    <td style={{ fontSize: '12px' }}>{txn.items.map(i => `${i.productName}×${i.quantity}`).join(', ')}</td>
                                                    <td>
                                                        <span className="badge badge-green">
                                                            {t.cash}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(txn.totalAmount)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {monthTxns.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                                            <td colSpan={6}>{language === 'ta' ? 'மொத்தம்' : 'Total'}</td>
                                            <td style={{ color: 'var(--accent)' }}>{formatCurrency(totalSalesRevenue)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{t.customerWiseReport} - {selectedMonth}</span>
                            <button className="btn btn-secondary btn-sm" onClick={handleExportCustomers}>
                                <Download size={14} /> {t.exportExcel}
                            </button>
                        </div>
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t.customerId}</th>
                                        <th>{t.name}</th>
                                        <th>{t.village}</th>
                                        <th>{t.totalSales}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customerSummaries.length === 0 ? (
                                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{t.noData}</td></tr>
                                    ) : (
                                        customerSummaries.map(({ customer: c, totalSpent: s }) => (
                                            <tr key={c.id}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}>{c.id}</td>
                                                <td style={{ fontWeight: 600 }}>{c.name}</td>
                                                <td>{c.village}</td>
                                                <td style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(s)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {customerSummaries.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                                            <td colSpan={3}>{language === 'ta' ? 'மொத்தம்' : 'Total'}</td>
                                            <td style={{ color: 'var(--primary)' }}>{formatCurrency(customerSummaries.reduce((s, c) => s + c.totalSpent, 0))}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">{language === 'ta' ? 'அதிக கொள்முதல் செய்தவர்கள்' : 'Top 5 Customers'}</span>
                        </div>
                        <div className="card-body">
                            {customerSummaries.slice(0, 5).map(({ customer, totalSpent, transactions }) => (
                                <div key={customer.id} className="list-item" style={{ padding: '12px 0' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{customer.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{transactions.length} orders | {customer.village}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(totalSpent)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
