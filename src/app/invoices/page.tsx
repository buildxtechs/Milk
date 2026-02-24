'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useSettings } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Transaction } from '@/lib/types';
import { formatDate, formatCurrency, getMonthlySummary, currentMonthStr, formatTime } from '@/lib/utils';
import { FileText, Printer, X, Eye, Calendar } from 'lucide-react';

export default function InvoicesPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();

    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
    const [viewingTxn, setViewingTxn] = useState<typeof transactions[0] | null>(null);

    const getCustomer = (id: string) => customers.find(c => c.id === id);

    const filteredTxns = transactions
        .filter(t => {
            const customer = getCustomer(t.customerId);
            return !search || customer?.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
        })
        .filter(t => t.date.startsWith(selectedMonth))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const activeCustomers = customers.filter(c => c.status === 'active');

    const handlePrint = () => window.print();

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.invoiceList}</h1>
                    <p className="page-subtitle">{transactions.length} {language === 'ta' ? 'மொத்த இன்வாய்ஸ்கள்' : 'total invoices'}</p>
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
                                <th>{t.actions}</th>
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
                                                <span className="badge badge-green">
                                                    {t.cash}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatCurrency(txn.totalAmount)}</td>
                                            <td>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewingTxn(txn)} title={t.view}>
                                                    <Eye size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>


            {/* Invoice View Modal */}
            {viewingTxn && (
                <InvoiceModal
                    t={t}
                    language={language}
                    transaction={viewingTxn}
                    customer={getCustomer(viewingTxn.customerId)}
                    onClose={() => setViewingTxn(null)}
                />
            )}

        </div>
    );
}

// ── Invoice Modal ─────────────────────────────────────────────
function InvoiceModal({ t, language, transaction, customer, onClose }: {
    t: Translations;
    language: string;
    transaction: Transaction;
    customer: ReturnType<typeof useCustomers>[0] | undefined;
    onClose: () => void;
}) {
    const settings = useSettings();
    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header no-print">
                    <h3 className="modal-title">{t.invoice} - {transaction.id}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => window.print()}>
                            <Printer size={14} /> {t.printInvoice}
                        </button>
                        <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>
                <div className="modal-body print-area" id="invoice-print">
                    <div style={{ display: 'none' }} className="print:block">
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginBottom: '10px' }}>
                            {language === 'ta' ? 'அச்சிடப்பட்டது' : 'Printed on'}: {formatDate(new Date().toISOString())} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {/* Invoice Header */}
                    <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid var(--border)', paddingBottom: '16px' }}>
                        {settings.logo ? (
                            <img src={settings.logo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', margin: '0 auto 4px' }} />
                        ) : (
                            <div style={{ fontSize: '28px', marginBottom: '4px' }}>🐄</div>
                        )}
                        <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)' }}>
                            {settings.shopName}
                        </h2>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            <div>{settings.address}</div>
                            <div>{settings.mobile}</div>
                        </div>
                    </div>

                    {/* Invoice Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{t.billTo}</div>
                            <div style={{ fontWeight: 700, fontSize: '16px' }}>{customer?.name}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{customer?.village}</div>
                            <div style={{ color: 'var(--text-secondary)' }}>{customer?.mobile}</div>
                            <div style={{ fontSize: '12px', color: 'var(--primary)', fontFamily: 'monospace', marginTop: '4px' }}>{customer?.id}</div>
                        </div>
                        <div className="md:text-right">
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px' }}>{t.invoiceNumber}</div>
                            <div style={{ fontWeight: 800, fontSize: '18px', fontFamily: 'monospace', color: 'var(--primary)' }}>{transaction.id}</div>
                            <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{formatDate(transaction.date)}</div>
                            <div style={{ marginTop: '8px' }}>
                                <span className="badge badge-green">
                                    {t.cash}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="table-container" style={{ marginBottom: '16px' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{t.productName}</th>
                                    <th>{language === 'ta' ? 'அளவு' : 'Qty'}</th>
                                    <th>{language === 'ta' ? 'விலை' : 'Price'}</th>
                                    <th>{t.total}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transaction.items.map((item, i) => (
                                    <tr key={item.productId}>
                                        <td>{i + 1}</td>
                                        <td style={{ fontWeight: 600 }}>{item.productName}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.unitPrice)}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <div style={{ width: '240px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>{t.subtotal}</span>
                                <span>{formatCurrency(transaction.subtotal)}</span>
                            </div>
                            {transaction.discount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{t.discount}</span>
                                    <span style={{ color: 'var(--danger)' }}>-{formatCurrency(transaction.discount)}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '16px', fontWeight: 800, borderTop: '2px solid var(--border)', marginTop: '4px' }}>
                                <span>{t.grandTotal}</span>
                                <span style={{ color: 'var(--primary)' }}>{formatCurrency(transaction.totalAmount)}</span>
                            </div>
                        </div>
                    </div>

                    {transaction.notes && (
                        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', fontSize: '13px' }}>
                            <strong>{t.notes}:</strong> {transaction.notes}
                        </div>
                    )}

                    <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div style={{ textAlign: 'center' }}>
                            {transaction.signature && (
                                <img
                                    src={transaction.signature}
                                    alt="Signature"
                                    style={{ width: '150px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}
                                />
                            )}
                            {!transaction.signature && (
                                <div style={{ width: '150px', borderBottom: '1px solid var(--border)', marginBottom: '4px', height: '40px' }}></div>
                            )}
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                {t.customerSignature}
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: '150px', borderBottom: '1px solid var(--border)', marginBottom: '4px', height: '40px' }}></div>
                            <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signature'}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                        {language === 'ta' ? 'நன்றி! மீண்டும் வாருங்கள்.' : 'Thank you for your business!'}
                    </div>
                </div>
            </div>
        </div>
    );
}

