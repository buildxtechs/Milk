'use client';

import { useState, useMemo, useRef } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency, currentMonthStr, generateWhatsAppLink } from '@/lib/utils';
import { Printer, FileText, User, Download, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PayslipPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const settings = useSettings();
    const payslipRef = useRef<HTMLDivElement>(null);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr()); // yyyy-MM
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const selectedCustomer = useMemo(() =>
        customers.find(c => c.id === selectedCustomerId),
        [customers, selectedCustomerId]);

    // Filtered and combined data for the selected month
    const monthlyData = useMemo(() => {
        if (!selectedCustomerId) return [];

        const monthTxns = transactions.filter(txn =>
            txn.customerId === selectedCustomerId &&
            txn.date.startsWith(selectedMonth)
        ).map(txn => ({
            id: txn.id,
            date: txn.date,
            type: 'deduction' as const,
            amount: txn.totalAmount,
            details: txn.items.map(i => i.productName).join(', '),
            createdAt: txn.createdAt
        }));

        const monthAdvances = advances.filter(adv =>
            adv.customerId === selectedCustomerId &&
            adv.date.startsWith(selectedMonth)
        ).map(adv => ({
            id: adv.id,
            date: adv.date,
            type: 'addition' as const,
            amount: adv.amount,
            details: adv.notes || (language === 'ta' ? 'தொகை சேர்க்கப்பட்டது' : 'Amount Added'),
            createdAt: adv.createdAt
        }));

        return [...monthTxns, ...monthAdvances].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }, [selectedCustomerId, selectedMonth, transactions, advances, language]);

    const stats = useMemo(() => {
        const added = monthlyData.filter(d => d.type === 'addition').reduce((s, d) => s + d.amount, 0);
        const deducted = monthlyData.filter(d => d.type === 'deduction').reduce((s, d) => s + d.amount, 0);
        return { added, deducted, net: added - deducted };
    }, [monthlyData]);

    const currentTotalBalance = useMemo(() => {
        if (!selectedCustomerId) return 0;
        return advances.filter(a => a.customerId === selectedCustomerId).reduce((s, a) => s + a.remainingBalance, 0);
    }, [selectedCustomerId, advances]);

    const formatTime = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const handleDownloadPDF = async () => {
        if (!payslipRef.current) return;
        setIsGeneratingPDF(true);
        try {
            const element = payslipRef.current;
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`payslip-${selectedCustomer?.name}-${selectedMonth}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleWhatsAppShare = () => {
        const phone = selectedCustomer?.whatsapp || selectedCustomer?.mobile;
        if (!phone) {
            alert(language === 'ta' ? 'வாடிக்கையாளர் வாட்ஸ்அப் எண் இல்லை' : 'Customer WhatsApp/Mobile number not found');
            return;
        }

        const message = `*PAYSLIP - ${selectedMonth}*\n\n` +
            `*Shop:* ${settings.shopName}\n` +
            `*Customer:* ${selectedCustomer.name} (${selectedCustomer.id})\n\n` +
            `*Total Added:* ${formatCurrency(stats.added)}\n` +
            `*Total Deduction:* ${formatCurrency(stats.deducted)}\n` +
            `*Monthly Net Change:* ${stats.net >= 0 ? '+' : ''}${formatCurrency(stats.net)}\n` +
            `*Current Balance:* ${formatCurrency(currentTotalBalance)}\n\n` +
            `Please find the detailed payslip PDF attached below.`;

        const link = generateWhatsAppLink(phone, message);
        window.open(link, '_blank');
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{language === 'ta' ? 'மாதாந்திர பேஸ்லிப்' : 'Monthly Payslip'}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'விற்பனை மற்றும் வரவு விவரங்கள்' : 'Purchase and credit details'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => window.print()}
                        disabled={!selectedCustomerId}
                    >
                        <Printer size={16} /> {t.print}
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleDownloadPDF}
                        disabled={!selectedCustomerId || isGeneratingPDF}
                    >
                        {isGeneratingPDF ? <span className="spinner-sm" /> : <Download size={16} />}
                        {language === 'ta' ? 'PDF பதிவிறக்கம்' : 'Download PDF'}
                    </button>
                    <button
                        className="btn"
                        style={{ background: '#25D366', color: 'white' }}
                        onClick={handleWhatsAppShare}
                        disabled={!selectedCustomerId}
                    >
                        <Send size={16} /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="card shadow-sm no-print" style={{ marginBottom: '24px' }}>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div className="form-group">
                        <label className="form-label">{t.selectCustomer}</label>
                        <select
                            className="form-select"
                            value={selectedCustomerId}
                            onChange={e => setSelectedCustomerId(e.target.value)}
                        >
                            <option value="">{language === 'ta' ? 'தேர்வு செய்யவும்' : 'Select Customer'}</option>
                            {customers.map(c => (
                                <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{language === 'ta' ? 'மாதம்' : 'Month'}</label>
                        <input
                            className="form-input"
                            type="month"
                            value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {selectedCustomer ? (
                <div className="payslip-container" ref={payslipRef}>
                    {/* Payslip Header */}
                    <div className="card shadow-sm" style={{ marginBottom: '16px' }}>
                        <div className="card-body" style={{ textAlign: 'center', borderBottom: '2px solid var(--primary-light)' }}>
                            {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: '60px', height: '60px', marginBottom: '12px' }} />}
                            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>{settings.shopName}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{settings.address}</p>
                            <div style={{ marginTop: '16px', display: 'inline-block', padding: '6px 20px', background: 'var(--primary)', color: 'white', borderRadius: '100px', fontWeight: 700 }}>
                                {language === 'ta' ? 'பேஸ்லிப்' : 'PAYSLIP'} - {selectedMonth}
                            </div>
                        </div>
                        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', background: 'var(--surface-2)' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.customerDetails}</div>
                                <div style={{ fontSize: '18px', fontWeight: 800, marginTop: '4px' }}>{selectedCustomer.name}</div>
                                <div style={{ fontSize: '14px', marginTop: '2px' }}>ID: <span style={{ fontFamily: 'monospace' }}>{selectedCustomer.id}</span></div>
                                <div style={{ fontSize: '14px' }}>{selectedCustomer.village}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{language === 'ta' ? 'தற்போதைய இருப்பு' : 'Current Balance'}</div>
                                <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>{formatCurrency(currentTotalBalance)}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{language === 'ta' ? 'வரவு உள்ளது' : 'Available Credit'}</div>
                            </div>
                        </div>
                    </div>

                    {/* Transaction List */}
                    <div className="card shadow-sm" style={{ marginBottom: '16px' }}>
                        <div className="table-container">
                            <table className="payslip-table">
                                <thead>
                                    <tr>
                                        <th>{t.date}</th>
                                        <th>{language === 'ta' ? 'விவரம்' : 'Description'}</th>
                                        <th>{language === 'ta' ? 'வகை' : 'Type'}</th>
                                        <th style={{ textAlign: 'right' }}>{t.amount}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyData.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                {t.noData}
                                            </td>
                                        </tr>
                                    ) : (
                                        monthlyData.map((item, idx) => (
                                            <tr key={`${item.id}-${idx}`}>
                                                <td style={{ fontSize: '12px' }}>
                                                    <div>{formatDate(item.date)}</div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatTime(item.createdAt)}</div>
                                                </td>
                                                <td style={{ fontSize: '13px', maxWidth: '250px' }}>{item.details}</td>
                                                <td>
                                                    <span className={`badge ${item.type === 'addition' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: '10px' }}>
                                                        {item.type === 'addition' ? (language === 'ta' ? 'வரவு' : 'Credit') : (language === 'ta' ? 'கழிவு' : 'Deduction')}
                                                    </span>
                                                </td>
                                                <td style={{ textAlign: 'right', fontWeight: 700, color: item.type === 'addition' ? 'var(--success)' : 'var(--danger)' }}>
                                                    {item.type === 'addition' ? '+' : '-'}{formatCurrency(item.amount)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>{language === 'ta' ? 'மொத்த வரவு' : 'Total Added'} (+)</td>
                                        <td style={{ textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(stats.added)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>{language === 'ta' ? 'மொத்த கழிவு' : 'Total Deduction'} (-)</td>
                                        <td style={{ textAlign: 'right', color: 'var(--danger)' }}>{formatCurrency(stats.deducted)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--primary-light)', fontWeight: 800, fontSize: '16px' }}>
                                        <td colSpan={3} style={{ textAlign: 'right' }}>{language === 'ta' ? 'மாதாந்திர நிகர மாற்றம்' : 'Monthly Net Change'}</td>
                                        <td style={{ textAlign: 'right', color: stats.net >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                            {stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Signature and Footer Timestamp */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginTop: '40px', padding: '0 20px' }}>
                        <div>
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', textAlign: 'center' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700 }}>{language === 'ta' ? 'வாடிக்கையாளர் கையொப்பம்' : 'Customer Signature'}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {language === 'ta' ? 'உருவாக்கப்பட்டது' : 'Generated on'}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}
                            </div>
                            <div style={{ borderTop: '1px solid #cbd5e1', paddingTop: '8px', textAlign: 'center', marginTop: '14px' }}>
                                <div style={{ fontSize: '12px', fontWeight: 700 }}>{language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signature'}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '100px 40px', color: 'var(--text-muted)' }}>
                    <User size={64} style={{ opacity: 0.1, margin: '0 auto 20px' }} />
                    <h3>{language === 'ta' ? 'தொடங்க வாடிக்கையாளரைத் தேர்ந்தெடுக்கவும்' : 'Select a customer to view payslip'}</h3>
                </div>
            )}

            <style jsx>{`
                .payslip-table th { background: #f8fafc; font-weight: 700; color: #475569; padding: 12px 16px; border-bottom: 2px solid #e2e8f0; }
                .payslip-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; }
                .payslip-table tr:last-child td { border-bottom: none; }
                
                .spinner-sm {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                    margin-right: 8px;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                @media print {
                    .no-print, .page-header div:last-child { display: none !important; }
                    .page-header { margin-bottom: 0 !important; }
                    .card { border: 1px solid #e2e8f0; box-shadow: none !important; }
                    .payslip-table th { background: #f1f5f9 !important; color: black !important; -webkit-print-color-adjust: exact; }
                    body { background: white; padding: 0; }
                }
            `}</style>
        </div>
    );
}
