'use client';

import { useParams } from 'next/navigation';
import { useStore, useCustomers, useTransactions } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Printer, ArrowLeft, Download, ShoppingBag, Calendar, User } from 'lucide-react';
import Link from 'next/link';

export default function CustomerHistoryPage() {
    const params = useParams();
    const id = params.id as string;

    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();

    const customer = customers.find(c => c.id === id);
    const history = transactions
        .filter(t => t.customerId === id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (!customer) {
        return (
            <div className="p-8 text-center">
                <h2 className="text-xl font-bold">{t.noData}</h2>
                <Link href="/customers" className="btn btn-primary mt-4">
                    <ArrowLeft size={16} /> {language === 'ta' ? 'வாடிக்கையாளர்கள் பக்கம் செல்லவும்' : 'Back to Customers'}
                </Link>
            </div>
        );
    }

    const totalSpent = history.reduce((sum, txn) => sum + txn.totalAmount, 0);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <div className="no-print mb-6">
                <Link href="/customers" className="btn btn-ghost mb-4 flex items-center gap-2">
                    <ArrowLeft size={16} /> {language === 'ta' ? 'வாடிக்கையாளர்கள்' : 'Customers'}
                </Link>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="page-title">{language === 'ta' ? 'வாடிக்கையாளர் கொள்முதல் வரலாறு' : 'Customer Purchase History'}</h1>
                        <p className="page-subtitle">{customer.name} ({customer.id})</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-primary" onClick={() => window.print()}>
                            <Printer size={16} /> {t.print}
                        </button>
                    </div>
                </div>
            </div>

            <div className="print-area">
                {/* Print Header */}
                <div className="print-only text-center mb-8 border-b-2 border-primary pb-4">
                    <h1 className="text-2xl font-bold text-primary">Theevanam Shop</h1>
                    <p className="text-sm text-gray-500">{language === 'ta' ? 'வாடிக்கையாளர் கொள்முதல் அறிக்கை' : 'Customer Purchase Statement'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Customer Info Card */}
                    <div className="card md:col-span-2">
                        <div className="card-header">
                            <h3 className="card-title flex items-center gap-2">
                                <User size={18} /> {t.customerDetails}
                            </h3>
                        </div>
                        <div className="card-body grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs text-muted font-bold uppercase">{t.name}</div>
                                <div className="font-bold text-lg">{customer.name}</div>
                                <div className="text-sm text-secondary">{customer.village}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted font-bold uppercase">{t.mobile}</div>
                                <div className="font-bold">{customer.mobile}</div>
                                <div className="text-sm text-secondary">{customer.id}</div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title flex items-center gap-2">
                                <ShoppingBag size={18} /> {language === 'ta' ? 'சுருக்கம்' : 'Summary'}
                            </h3>
                        </div>
                        <div className="card-body">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-muted">{language === 'ta' ? 'மொத்த கொள்முதல்' : 'Total Purchases'}</span>
                                <span className="font-bold">{history.length}</span>
                            </div>
                            <div className="flex justify-between items-center text-xl font-black text-primary">
                                <span>{t.total}</span>
                                <span>{formatCurrency(totalSpent)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="card overflow-hidden">
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>{t.date}</th>
                                    <th>{t.invoiceNumber}</th>
                                    <th>{language === 'ta' ? 'பொருட்கள்' : 'Items'}</th>
                                    <th className="text-right">{t.amount}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-12 text-muted">{t.noData}</td>
                                    </tr>
                                ) : (
                                    history.map(txn => (
                                        <tr key={txn.id}>
                                            <td>{formatDate(txn.date)}</td>
                                            <td className="font-mono text-xs">{txn.id}</td>
                                            <td>
                                                <div className="text-xs font-bold">
                                                    {txn.items.map(i => `${i.productName} (${i.quantity})`).join(', ')}
                                                </div>
                                            </td>
                                            <td className="text-right font-bold text-primary">{formatCurrency(txn.totalAmount)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {history.length > 0 && (
                                <tfoot className="bg-surface-2 font-bold">
                                    <tr>
                                        <td colSpan={3} className="text-right">{t.total}</td>
                                        <td className="text-right text-primary text-lg">{formatCurrency(totalSpent)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                <div className="print-only mt-12 pt-8 border-t border-gray-200">
                    <p className="text-center text-xs text-gray-400">
                        {language === 'ta' ? 'கணினி மூலம் உருவாக்கப்பட்ட அறிக்கை' : 'Computer generated statement'} |
                        {formatDate(new Date().toISOString().split('T')[0])}
                    </p>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    .print-area { display: block !important; }
                    .card { border: 1px solid #eee !important; box-shadow: none !important; }
                    .print-only { display: block !important; }
                }
                .print-only { display: none; }
            `}</style>
        </div>
    );
}
