'use client';

import { useState, useMemo, useRef } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useExternalDeductions, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency, currentMonthStr, generateWhatsAppLink, calculateCustomerBalance } from '@/lib/utils';
import { Printer, FileText, User, Download, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function PayslipPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const deductions = useExternalDeductions();
    const settings = useSettings();
    const payslipRef = useRef<HTMLDivElement>(null);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const selectedCustomer = useMemo(() =>
        customers.find(c => c.id === selectedCustomerId),
        [customers, selectedCustomerId]);

    // Filtered and combined data for the selected customer
    const monthlyData = useMemo(() => {
        if (!selectedCustomerId) return [];

        const chargesTxns = transactions.filter(txn =>
            txn.customerId === selectedCustomerId && txn.paymentMode === 'advance'
        ).map(txn => ({
            id: txn.id,
            date: txn.date,
            type: 'charge' as const,
            amount: txn.totalAmount,
            details: txn.items.map(i => i.productName).join(', '),
            createdAt: txn.createdAt
        }));

        const manualDebts = advances.filter(adv =>
            adv.customerId === selectedCustomerId && !adv.notes?.startsWith('POS Purchase')
        ).map(adv => ({
            id: adv.id,
            date: adv.date,
            type: 'charge' as const,
            amount: adv.amount,
            details: adv.notes || (language === 'ta' ? 'தொகை சேர்க்கப்பட்டது' : 'Amount Added'),
            createdAt: adv.createdAt
        }));

        const allPayments = deductions.filter(d =>
            d.customerId === selectedCustomerId
        ).map(d => ({
            id: d.id,
            date: d.date,
            type: 'payment' as const,
            amount: d.amount,
            details: d.reason || (language === 'ta' ? 'தொகை செலுத்தப்பட்டது' : 'Amount Paid'),
            createdAt: d.createdAt
        }));

        return [...chargesTxns, ...manualDebts, ...allPayments].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }, [selectedCustomerId, transactions, advances, deductions, language]);

    const stats = useMemo(() => {
        const added = monthlyData.filter(d => d.type === 'charge').reduce((s, d) => s + d.amount, 0);
        const deducted = monthlyData.filter(d => d.type === 'payment').reduce((s, d) => s + d.amount, 0);
        return { added, deducted, net: added - deducted };
    }, [monthlyData]);

    const currentTotalBalance = useMemo(() => {
        if (!selectedCustomerId) return 0;
        return calculateCustomerBalance(selectedCustomerId, advances, deductions);
    }, [selectedCustomerId, advances, deductions]);

    const groupedData = useMemo(() => {
        if (monthlyData.length === 0) return [];

        const groups: {
            monthKey: string;
            monthLabel: string;
            items: typeof monthlyData;
            openingBalance: number;
            closingBalance: number;
        }[] = [];

        let runningBalance = 0;
        let currentGroup: any = null;

        monthlyData.forEach((item) => {
            const date = new Date(item.createdAt);
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            const monthLabel = date.toLocaleString(language === 'ta' ? 'ta-IN' : 'en-US', { month: 'long', year: 'numeric' });

            if (!currentGroup || currentGroup.monthKey !== monthKey) {
                if (currentGroup) groups.push(currentGroup);
                currentGroup = {
                    monthKey,
                    monthLabel,
                    items: [],
                    openingBalance: runningBalance,
                    closingBalance: 0
                };
            }

            currentGroup.items.push(item);
            if (item.type === 'charge') runningBalance += item.amount;
            else runningBalance -= item.amount;
            currentGroup.closingBalance = runningBalance;
        });

        if (currentGroup) groups.push(currentGroup);
        return groups;
    }, [monthlyData, language]);

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
            const filenameMonth = language === 'ta' ? 'முழு_வரலாறு' : 'Full_History';
            pdf.save(`payslip-${selectedCustomer?.name}-${filenameMonth}.pdf`);
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

        const reportTitle = language === 'ta' ? 'முழு வரலாறு' : 'Full History';
        const message = `*PAYSLIP - ${reportTitle}*\n\n` +
            `*Shop:* ${settings.shopName}\n` +
            `*Customer:* ${selectedCustomer.name} (${selectedCustomer.id})\n\n` +
            `*Total Charges:* ${formatCurrency(stats.added)}\n` +
            `*Total Payments:* ${formatCurrency(stats.deducted)}\n` +
            `*Balance Change:* ${stats.net >= 0 ? '+' : ''}${formatCurrency(stats.net)}\n` +
            `*Opening Balance:* ${formatCurrency(groupedData[0]?.openingBalance || 0)}\n` +
            `*Closing Balance:* ${formatCurrency(groupedData[groupedData.length - 1]?.closingBalance || 0)}\n\n` +
            `*Final Proper Balance:* ${formatCurrency(currentTotalBalance)}\n\n` +
            `Please find the detailed payslip PDF attached below.`;

        const link = generateWhatsAppLink(phone, message);
        window.open(link, '_blank');
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div className="no-print">
                    <h1 className="page-title">{language === 'ta' ? 'வாடிக்கையாளர் பேஸ்லிப்' : 'Customer Payslip'}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'முழு விற்பனை மற்றும் வரவு விவரங்கள்' : 'Full purchase and credit details'}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={() => window.print()} disabled={!selectedCustomerId}>
                        <Printer size={16} /> {t.print}
                    </button>
                    <button className="btn btn-primary" onClick={handleDownloadPDF} disabled={!selectedCustomerId || isGeneratingPDF}>
                        {isGeneratingPDF ? <span className="spinner-sm" /> : <Download size={16} />}
                        {language === 'ta' ? 'PDF பதிவிறக்கம்' : 'Download PDF'}
                    </button>
                    <button className="btn" style={{ background: '#25D366', color: 'white' }} onClick={handleWhatsAppShare} disabled={!selectedCustomerId}>
                        <Send size={16} /> WhatsApp
                    </button>
                </div>
            </div>

            <div className="card shadow-sm no-print" style={{ marginBottom: '24px' }}>
                <div className="card-body">
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">{t.selectCustomer}</label>
                        <select className="form-select" value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)}>
                            <option value="">{language === 'ta' ? 'தேர்வு செய்யவும்' : 'Select Customer'}</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.id})</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {selectedCustomer ? (
                <div className="payslip-container print-area" ref={payslipRef}>
                    <div className="card shadow-sm" style={{ marginBottom: '16px', overflow: 'hidden' }}>
                        <div className="card-body" style={{ textAlign: 'center', borderBottom: '2px solid var(--primary-light)', padding: '32px' }}>
                            {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: '80px', height: '80px', marginBottom: '16px', borderRadius: '12px' }} />}
                            <h2 style={{ fontSize: '28px', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-0.5px' }}>{settings.shopName}</h2>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', maxWidth: '400px', margin: '8px auto 0' }}>{settings.address}</p>
                            <div style={{ marginTop: '20px', display: 'inline-block', padding: '8px 24px', background: 'var(--primary)', color: 'white', borderRadius: '100px', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px shadow-sm' }}>
                                {language === 'ta' ? 'பேஸ்லிப் - முழு வரலாறு' : 'PAYSLIP - Full History'}
                            </div>
                        </div>
                        <div className="card-body" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)', gap: '0', padding: '0', background: 'var(--surface-2)' }}>
                            <div style={{ padding: '24px 32px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>{t.customerDetails}</div>
                                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }}>{selectedCustomer.name}</div>
                                <div style={{ fontSize: '14px', marginTop: '6px', color: 'var(--text-muted)' }}>
                                    <span style={{ opacity: 0.7 }}>ID:</span> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary)' }}>{selectedCustomer.id}</span>
                                </div>
                                <div style={{ fontSize: '14px', marginTop: '2px', color: 'var(--text-muted)' }}>{selectedCustomer.village}</div>
                            </div>
                            <div style={{ width: '1px', background: 'var(--border-color)', alignSelf: 'stretch', margin: '20px 0', opacity: 0.5 }} />
                            <div style={{ padding: '24px 32px', textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: '8px' }}>
                                    {currentTotalBalance > 0
                                        ? (language === 'ta' ? 'நிலுவைத் தொகை' : 'Outstanding Balance')
                                        : (language === 'ta' ? 'வரவு உள்ளது' : 'Available Credit')}
                                </div>
                                <div style={{ fontSize: '32px', fontWeight: 900, color: currentTotalBalance > 0 ? 'var(--danger)' : 'var(--success)', lineHeight: 1 }}>
                                    {currentTotalBalance > 0 ? '+' : (currentTotalBalance < 0 ? '-' : '')}{formatCurrency(Math.abs(currentTotalBalance))}
                                </div>
                                <div style={{ fontSize: '12px', color: currentTotalBalance > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', background: 'currentColor', borderRadius: '50%' }} />
                                    {currentTotalBalance > 0
                                        ? (language === 'ta' ? 'செலுத்தப்பட வேண்டியது' : 'Payment Pending')
                                        : (language === 'ta' ? 'வரவு மீதம்' : 'Balance Available')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm" style={{ marginBottom: '16px' }}>
                        <div className="table-container">
                            <table className="payslip-table" style={{ tableLayout: 'fixed', width: '100%' }}>
                                <colgroup>
                                    <col style={{ width: '150px' }} />
                                    <col style={{ width: 'auto' }} />
                                    <col style={{ width: '180px' }} />
                                    <col style={{ width: '160px' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>{t.date}</th>
                                        <th>{language === 'ta' ? 'விவரம்' : 'Description'}</th>
                                        <th style={{ textAlign: 'center' }}>{language === 'ta' ? 'வகை' : 'Type'}</th>
                                        <th style={{ textAlign: 'right' }}>{language === 'ta' ? 'தொகை' : 'Amount'}</th>
                                    </tr>
                                </thead>
                                {groupedData.length === 0 ? (
                                    <tbody>
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>{t.noData}</td>
                                        </tr>
                                    </tbody>
                                ) : (
                                    groupedData.map((group) => (
                                        <tbody key={group.monthKey}>
                                            <tr style={{ background: 'var(--primary-light)', borderBottom: '2px solid var(--primary-light)' }}>
                                                <td colSpan={4} style={{ padding: '12px 16px' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '18px' }}>📅</span>
                                                            <span style={{ fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', fontSize: '13px', letterSpacing: '0.5px' }}>{group.monthLabel}</span>
                                                        </div>
                                                        <div style={{ padding: '4px 12px', background: 'white', borderRadius: '6px', border: '1px solid var(--primary-light)', fontSize: '11px', color: 'var(--text-muted)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                            {language === 'ta' ? 'தொடக்க இருப்பு' : 'Opening balance'}: <b style={{ color: 'var(--text-main)', marginLeft: '4px' }}>{group.openingBalance > 0 ? '+' : ''}{formatCurrency(group.openingBalance)}</b>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                            {group.items.map((item, idx) => (
                                                <tr key={`${item.id}-${idx}`} style={{ borderBottom: '1px solid var(--surface-2)' }}>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{formatDate(item.date)}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{formatTime(item.createdAt)}</div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {item.details}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span className={`badge ${item.type === 'charge' ? 'badge-orange' : 'badge-green'}`} style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700, display: 'inline-block', width: '130px' }}>
                                                            {item.type === 'charge' ? (language === 'ta' ? 'கூடுதல் வரவு (+)' : 'Added Credit (+)') : (language === 'ta' ? 'கழிவுகள் (-)' : 'Deduction (-)')}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, fontSize: '15px', color: item.type === 'charge' ? 'var(--danger)' : 'var(--success)' }}>
                                                        {item.type === 'charge' ? '+' : '-'}{formatCurrency(item.amount)}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr style={{ background: 'var(--surface-2)' }}>
                                                <td colSpan={3} style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)', padding: '12px 16px', fontWeight: 600 }}>{language === 'ta' ? 'மாதாந்திர முடிவு இருப்பு' : 'Monthly Closing Balance'}:</td>
                                                <td style={{ textAlign: 'right', fontSize: '14px', fontWeight: 900, color: 'var(--primary)', padding: '12px 16px' }}>{group.closingBalance > 0 ? '+' : ''}{formatCurrency(group.closingBalance)}</td>
                                            </tr>
                                            <tr style={{ height: '16px' }} className="no-print"><td colSpan={4}></td></tr>
                                        </tbody>
                                    ))
                                )}
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--primary)' }}>
                                        <td colSpan={2} rowSpan={3} style={{ background: 'var(--surface-2)', padding: '24px', borderRight: '1px solid var(--border-color)' }}>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>{language === 'ta' ? 'அறிக்கை சுருக்கம்' : 'Statement Summary'}</div>
                                            <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.6' }}>
                                                {language === 'ta' ? 'இந்த அறிக்கை தேர்ந்தெடுக்கப்பட்ட வாடிக்கையாளரின் அனைத்து கடன் மற்றும் வரவு விவரங்களைக் காட்டுகிறது.' : 'This statement displays all charges and payments for the selected customer for the full history.'}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{language === 'ta' ? 'மொத்த கடன்' : 'Total Charges'} (+)</td>
                                        <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: '15px', fontWeight: 800, color: 'var(--danger)' }}>{formatCurrency(stats.added)}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{language === 'ta' ? 'மொத்த வரவு' : 'Total Payments'} (-)</td>
                                        <td style={{ textAlign: 'right', padding: '14px 16px', fontSize: '15px', fontWeight: 800, color: 'var(--success)' }}>{formatCurrency(stats.deducted)}</td>
                                    </tr>
                                    <tr style={{ background: 'var(--primary)', color: 'white' }}>
                                        <td style={{ textAlign: 'right', padding: '16px 16px', fontSize: '14px', fontWeight: 800 }}>{language === 'ta' ? 'நிகர மாற்றம்' : 'Net Change'}</td>
                                        <td style={{ textAlign: 'right', padding: '16px 16px', fontSize: '20px', fontWeight: 950 }}>{stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '80px', marginTop: '60px', padding: '0 32px' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ height: '64px' }}></div>
                            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'வாடிக்கையாளர் கையொப்பம்' : 'Customer Signature'}</div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ height: '64px' }}></div>
                            <div style={{ borderTop: '2px solid var(--border-color)', paddingTop: '12px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signature'}</div>
                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '4px', opacity: 0.7 }}>{language === 'ta' ? 'உருவாக்கப்பட்டது' : 'Generated on'}: {formatDate(new Date().toISOString())} {formatTime(new Date().toISOString())}</div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '120px 40px', color: 'var(--text-muted)' }}>
                    <User size={64} style={{ opacity: 0.1, margin: '0 auto 24px' }} />
                    <h3 style={{ fontWeight: 700 }}>{language === 'ta' ? 'தொடங்க வாடிக்கையாளரைத் தேர்ந்தெடுக்கவும்' : 'Select a customer to view payslip'}</h3>
                    <p style={{ fontSize: '14px', marginTop: '8px' }}>{language === 'ta' ? 'வாடிக்கையாளரின் கணக்கு விவரங்களைக் காண மேலே உள்ள பட்டியலிலிருந்து ஒருவரைத் தேர்ந்தெடுக்கவும்' : 'Choose a customer from the dropdown above to generate their detailed statement'}</p>
                </div>
            )}

            <style jsx>{`
                .payslip-table th { background: #f8fafc; font-weight: 700; color: #475569; padding: 14px 16px; border-bottom: 2px solid #e2e8f0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
                .payslip-table td { border-bottom: 1px solid #f1f5f9; }
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
                    .payslip-table th { background: #f1f5f9 !important; color: black !important; -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}
