'use client';

import { useStore, useCustomers, useTransactions, useAdvances, useProducts, usePayouts, useExternalDeductions } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatCurrency, todayStr, currentMonthStr, isLowStock } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';
import {
    Users, Droplets, TrendingUp, AlertTriangle, Wallet, ShoppingCart,
    Plus, ArrowRight, Package, Leaf, Timer, Star, DollarSign, Minus
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function DashboardPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const products = useProducts();
    const payouts = usePayouts();
    const deductions = useExternalDeductions();

    const today = todayStr();
    const currentMonth = currentMonthStr();

    // Stats
    const activeCustomers = customers.filter(c => c.status === 'active').length;
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth));
    const totalProductSales = monthlyTransactions.reduce((s, t) => s + t.totalAmount, 0);

    const outstandingAdvances = advances.reduce((s, a) => s + a.remainingBalance, 0);
    const totalPayouts = payouts.filter(p => p.date.startsWith(currentMonth)).reduce((s, p) => s + p.netAmount, 0);
    const totalDeductions = deductions.filter(d => d.date.startsWith(currentMonth)).reduce((s, d) => s + d.amount, 0);

    const lowStockCount = products.filter(isLowStock).length;

    // Inventory Value
    const inventoryValue = products.reduce((s, p) => s + (p.costPrice * p.stockQuantity), 0);

    // Chart data - last 7 days metrics
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = format(d, 'yyyy-MM-dd');
        const daySales = transactions.filter(t => t.date === dateStr).reduce((s, t) => s + t.totalAmount, 0);
        return {
            day: format(d, 'dd/MM'),
            revenue: daySales,
        };
    });

    // Recent transactions
    const recentTransactions = [...transactions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5);


    const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || id;

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            {/* Stats Grid */}
            <div className="stat-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)' }}>
                    <div className="stat-icon green" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', color: 'white' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.activeCustomers}</div>
                        <div className="stat-value" style={{ color: '#166534' }}>{activeCustomers}</div>
                        <div className="stat-sub">{t.totalCustomers}: {customers.length}</div>
                    </div>
                </div>


                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)' }}>
                    <div className="stat-icon orange" style={{ background: 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)', color: 'white' }}>
                        <TrendingUp size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.monthlyRevenue}</div>
                        <div className="stat-value" style={{ color: '#9a3412' }}>{formatCurrency(totalProductSales)}</div>
                        <div className="stat-sub">{t.thisMonth}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)' }}>
                    <div className="stat-icon purple" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)', color: 'white' }}>
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.totalSales}</div>
                        <div className="stat-value" style={{ color: '#6b21a8' }}>{formatCurrency(totalProductSales)}</div>
                        <div className="stat-sub">{monthlyTransactions.length} {t.transactionsCount} ({t.thisMonth})</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fefce8 100%)' }}>
                    <div className="stat-icon yellow" style={{ background: 'linear-gradient(135deg, #eab308 0%, #a16207 100%)', color: 'white' }}>
                        <Wallet size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.outstandingAdvances}</div>
                        <div className="stat-value" style={{ color: '#854d0e' }}>{formatCurrency(outstandingAdvances)}</div>
                        <div className="stat-sub">{advances.length} {t.records}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #ecfeff 100%)' }}>
                    <div className="stat-icon cyan" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white' }}>
                        <DollarSign size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.payout} ({t.thisMonth})</div>
                        <div className="stat-value" style={{ color: '#164e63' }}>{formatCurrency(totalPayouts)}</div>
                        <div className="stat-sub">{payouts.length} {t.payoutHistory}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)' }}>
                    <div className="stat-icon blue" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)', color: 'white' }}>
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.totalPurchasesOfMonth}</div>
                        <div className="stat-value" style={{ color: '#1e3a8a' }}>{monthlyTransactions.length}</div>
                        <div className="stat-sub">{t.thisMonth}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)' }}>
                    <div className="stat-icon purple" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', color: 'white' }}>
                        <Minus size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.externalDeduction}</div>
                        <div className="stat-value" style={{ color: '#4c1d95' }}>{formatCurrency(totalDeductions)}</div>
                        <div className="stat-sub">{deductions.length} {t.records}</div>
                    </div>
                </div>

                <div className="stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)' }}>
                    <div className="stat-icon red" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', color: 'white' }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <div className="stat-label">{t.lowStockAlert}</div>
                        <div className="stat-value" style={{ color: '#991b1b' }}>{lowStockCount}</div>
                        <div className="stat-sub">{t.inventoryValue}: {formatCurrency(inventoryValue)}</div>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-content">

                {/* Left Column: Charts and Actions */}
                <div className="dashboard-main">

                    {/* Quick Actions */}
                    <div className="card shadow-sm" style={{ border: 'none' }}>
                        <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'var(--primary)', borderRadius: '2px' }} />
                                <span className="card-title" style={{ fontWeight: 800 }}>{t.quickActions}</span>
                            </div>
                        </div>
                        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                            <Link href="/pos" className="action-card action-pos">
                                <div className="action-icon">
                                    <ShoppingCart size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.newSale}</span>
                                    <span className="action-desc">{t.productSale}</span>
                                </div>
                            </Link>
                            <Link href="/customers" className="action-card action-customers">
                                <div className="action-icon">
                                    <Plus size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.addCustomer}</span>
                                    <span className="action-desc">{t.newProfile}</span>
                                </div>
                            </Link>
                            <Link href="/theevanam" className="action-card action-theevanam">
                                <div className="action-icon">
                                    <Leaf size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.theevanam}</span>
                                    <span className="action-desc">{t.feedItems}</span>
                                </div>
                            </Link>
                            <Link href="/stock" className="action-card action-stock">
                                <div className="action-icon">
                                    <Package size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.stockInward}</span>
                                    <span className="action-desc">{t.updateStock}</span>
                                </div>
                            </Link>
                            <Link href="/payout" className="action-card" style={{ color: '#06b6d4' }}>
                                <div className="action-icon" style={{ background: '#ecfeff', color: '#06b6d4' }}>
                                    <DollarSign size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.payout}</span>
                                    <span className="action-desc">{t.processPayment}</span>
                                </div>
                            </Link>
                            <Link href="/reports" className="action-card action-reports">
                                <div className="action-icon">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="action-info">
                                    <span className="action-name">{t.reports}</span>
                                    <span className="action-desc">{t.viewAnalytics}</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Performance Charts Area */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
                    </div>

                    {/* Recent Sales Table */}
                    <div className="card shadow-sm" style={{ border: 'none' }}>
                        <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', background: 'white', display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '4px', height: '18px', background: 'var(--accent)', borderRadius: '2px' }} />
                                <span className="card-title" style={{ fontWeight: 800 }}>{t.recentSales}</span>
                            </div>
                            <Link href="/invoices" className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: 'var(--primary)' }}>
                                {t.view} <ArrowRight size={14} />
                            </Link>
                        </div>
                        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                            {recentTransactions.length > 0 ? (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t.invoiceNumber}</th>
                                            <th>{t.name}</th>
                                            <th>{t.paymentMode}</th>
                                            <th>{t.amount}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.map(txn => (
                                            <tr key={txn.id}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{txn.id}</td>
                                                <td style={{ fontWeight: 700 }}>{getCustomerName(txn.customerId)}</td>
                                                <td>
                                                    <span className={`badge ${txn.paymentMode === 'cash' ? 'badge-blue' : 'badge-orange'}`}>
                                                        {t.cash}
                                                    </span>
                                                </td>
                                                <td style={{ fontWeight: 800, color: 'var(--accent)' }}>{formatCurrency(txn.totalAmount)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <ShoppingCart size={40} style={{ opacity: 0.1, margin: '0 auto 12px' }} />
                                    <p>{t.noData}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Mini Widgets */}
                <div className="dashboard-side">

                    {/* Revenue Trend Small */}
                    <div className="card shadow-sm" style={{ border: 'none', background: 'var(--primary)', color: 'white' }}>
                        <div className="card-body" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.8, marginBottom: '8px', fontSize: '13px' }}>
                                <TrendingUp size={16} />
                                <span>{t.revenueTrend}</span>
                            </div>
                            <div style={{ height: '80px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={last7Days}>
                                        <Bar dataKey="revenue" fill="rgba(255,255,255,0.3)" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Stock Alerts Widget */}
                    <div className="card shadow-sm" style={{ border: 'none' }}>
                        <div className="card-header" style={{ borderBottom: '1px solid #f1f5f9', background: 'white' }}>
                            <span className="card-title" style={{ fontWeight: 800 }}>{t.lowStockItems}</span>
                        </div>
                        <div className="card-body" style={{ padding: '12px' }}>
                            {products.filter(isLowStock).length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {products.filter(isLowStock).slice(0, 4).map(p => (
                                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: '#fef2f2', borderRadius: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>{language === 'ta' ? p.nameTa : p.nameEn}</div>
                                                <div style={{ fontSize: '11px', color: '#b91c1c', opacity: 0.7 }}>{t.stockQuantity}: {p.stockQuantity}</div>
                                            </div>
                                            <Link href="/stock" className="btn btn-icon btn-sm" style={{ color: '#b91c1c' }}>
                                                <Plus size={14} />
                                            </Link>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                    <Package size={24} style={{ opacity: 0.2, margin: '0 auto 8px' }} />
                                    <div style={{ fontSize: '12px' }}>{t.stockLevelsHealthy}</div>
                                </div>
                            )}
                        </div>
                    </div>


                </div>
            </div>

            <style jsx>{`
                .dashboard-content {
                    display: grid;
                    grid-template-columns: 1fr 340px;
                    gap: 24px;
                }
                .dashboard-main {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                .dashboard-side {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }
                @media (max-width: 1200px) {
                    .dashboard-content {
                        grid-template-columns: 1fr;
                    }
                }
                .action-card {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 20px;
                    border-radius: 16px;
                    text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid #f1f5f9;
                    background: white;
                    position: relative;
                    overflow: hidden;
                }

                .action-card::after {
                    content: '';
                    position: absolute;
                    top: 0;
                    right: 0;
                    width: 60px;
                    height: 60px;
                    background: currentColor;
                    opacity: 0.03;
                    border-radius: 0 0 0 100%;
                    transition: all 0.3s ease;
                }

                .action-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.05);
                    border-color: transparent;
                }

                .action-card:hover::after {
                    width: 100%;
                    height: 100%;
                    border-radius: 0;
                    opacity: 0.05;
                }

                .action-card:active {
                    transform: translateY(-1px) scale(0.98);
                }

                .action-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.3s ease;
                }

                .action-card:hover .action-icon {
                    transform: scale(1.1) rotate(-5deg);
                }

                .action-info {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }

                .action-name {
                    font-size: 14px;
                    font-weight: 800;
                    color: #1e293b;
                }

                .action-desc {
                    font-size: 11px;
                    font-weight: 500;
                    color: #64748b;
                    opacity: 0.8;
                }


                .action-pos { color: #ea580c; }
                .action-pos .action-icon { background: #fff7ed; color: #ea580c; }
                .action-pos:hover { background: #fff7ed; }

                .action-customers { color: #3b82f6; }
                .action-customers .action-icon { background: #eff6ff; color: #3b82f6; }
                .action-customers:hover { background: #eff6ff; }

                .action-theevanam { color: #0891b2; }
                .action-theevanam .action-icon { background: #ecfeff; color: #0891b2; }
                .action-theevanam:hover { background: #ecfeff; }

                .action-stock { color: #8b5cf6; }
                .action-stock .action-icon { background: #f5f3ff; color: #8b5cf6; }
                .action-stock:hover { background: #f5f3ff; }

                .action-reports { color: #f43f5e; }
                .action-reports .action-icon { background: #fff1f2; color: #f43f5e; }
                .action-reports:hover { background: #fff1f2; }
                
                .shadow-sm { box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1); }
                
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.4s ease-out; }
            `}</style>
        </div>
    );
}
