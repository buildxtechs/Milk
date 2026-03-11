'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances, useExternalDeductions, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatDate, formatCurrency, currentMonthStr, generateWhatsAppLink, generatePOSWhatsAppMessage, calculateCustomerBalance } from '@/lib/utils';
import { Send, Search, FileText, Wallet, User, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function WhatsAppSharePage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const deductions = useExternalDeductions();
    const settings = useSettings();

    const [search, setSearch] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
    const [toast, setToast] = useState('');
    const [generatingFor, setGeneratingFor] = useState<string | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);
    const payslipRef = useRef<HTMLDivElement>(null);
    const [renderData, setRenderData] = useState<any>(null);
    const [renderType, setRenderType] = useState<'invoice' | 'payslip' | null>(null);

    const groupedRenderData = useMemo(() => {
        if (!renderData || renderType !== 'payslip') return [];

        const allItems = [
            ...(renderData.monthTxns || []).map((t: any) => ({ ...t, type: 'charge' })),
            ...(renderData.monthAdvances || []).map((a: any) => ({ ...a, type: 'charge' })),
            ...(renderData.allPayments || []).map((p: any) => ({ ...p, type: 'payment' }))
        ].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

        const groups: any[] = [];
        let runningBalance = 0;
        let currentGroup: any = null;

        allItems.forEach((item) => {
            const date = new Date(item.createdAt || item.date);
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
            if (item.type === 'charge') runningBalance += (item.amount || item.totalAmount);
            else runningBalance -= (item.amount || item.totalAmount);
            currentGroup.closingBalance = runningBalance;
        });

        if (currentGroup) groups.push(currentGroup);
        return groups;
    }, [renderData, renderType, language]);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const activeCustomers = customers.filter(c => c.status === 'active').filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.id.toLowerCase().includes(search.toLowerCase()) ||
        c.village.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => {
        const balA = calculateCustomerBalance(a.id, advances, deductions);
        const balB = calculateCustomerBalance(b.id, advances, deductions);
        const hasBalA = balA > 0 ? 1 : 0;
        const hasBalB = balB > 0 ? 1 : 0;
        if (hasBalA !== hasBalB) return hasBalB - hasBalA;
        return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

    const getBalance = (custId: string) => calculateCustomerBalance(custId, advances, deductions);

    const getLatestInvoice = (custId: string) => {
        const custTxns = transactions.filter(t => t.customerId === custId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return custTxns.length > 0 ? custTxns[0] : null;
    };

    const generatePDFAndShare = async (type: 'invoice' | 'payslip', custId: string) => {
        const customer = customers.find(c => c.id === custId);
        if (!customer) return;

        const phone = customer.whatsapp || customer.mobile;
        if (!phone) {
            showToast(language === 'ta' ? 'வாட்ஸ்அப் எண் இல்லை' : 'No WhatsApp number found');
            return;
        }

        setGeneratingFor(`${custId}-${type}`);

        // Pre-build the WhatsApp message BEFORE async operations to avoid stale state
        let whatsappMessage = '';

        if (type === 'invoice') {
            const latestTxn = getLatestInvoice(custId);
            if (!latestTxn) {
                showToast(language === 'ta' ? 'இன்வாய்ஸ் இல்லை' : 'No invoice found');
                setGeneratingFor(null);
                return;
            }

            const currentBalance = getBalance(custId);
            const oldBalance = currentBalance - (latestTxn.totalAmount || 0);
            const productList = latestTxn.items?.map((item: any, i: number) =>
                `   ${i + 1}. ${item.productName} x ${item.quantity} = ${formatCurrency(item.total)}`
            ).join('\n') || '';

            whatsappMessage = generatePOSWhatsAppMessage(latestTxn, customer.name, oldBalance, currentBalance, settings);

            setRenderData({ transaction: latestTxn, customer });
            setRenderType('invoice');
        } else {
            // Payslip - Full History
            const chargesTxns = transactions.filter(txn =>
                txn.customerId === custId && txn.paymentMode === 'advance'
            );
            const manualDebts = advances.filter(adv =>
                adv.customerId === custId && !adv.notes?.startsWith('POS Purchase')
            );
            const allPayments = deductions.filter(d => d.customerId === custId);

            const totalAdded = chargesTxns.reduce((s, t) => s + t.totalAmount, 0) +
                manualDebts.reduce((s, a) => s + a.amount, 0);
            const totalDeducted = allPayments.reduce((s, d) => s + d.amount, 0);
            const currentBalance = getBalance(custId);

            // Build transaction details for payslip
            const chargesList = [
                ...chargesTxns.map(txn =>
                    `   ➕ ${formatDate(txn.date)} - ${txn.items.map(it => it.productName).join(', ')} : ${formatCurrency(txn.totalAmount)}`
                ),
                ...manualDebts.map(adv =>
                    `   ➕ ${formatDate(adv.date)} - ${adv.notes || 'தொகை சேர்க்கப்பட்டது'} : ${formatCurrency(adv.amount)}`
                )
            ].join('\n');

            const paymentsList = allPayments.map(d =>
                `   ➖ ${formatDate(d.date)} - ${d.reason || 'தொகை செலுத்தப்பட்டது'} : ${formatCurrency(d.amount)}`
            ).join('\n');

            whatsappMessage = `*🏪 ${settings.shopName}*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                `வணக்கம் *${customer.name}* 🙏\n\n` +
                `📄 *வாடிக்கையாளர் பேஸ்லிப் - முழு வரலாறு*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                (chargesList ? `💵 *கொள்முதல் / கடன்:*\n${chargesList}\n\n` : '') +
                (paymentsList ? `🛒 *வசூல் / வரவு:*\n${paymentsList}\n\n` : '') +
                (!chargesList && !paymentsList ? `📭 கணக்கு விவரங்கள் இல்லை\n\n` : '') +
                `━━━━━━━━━━━━━━━━━\n` +
                `💰 *கணக்கு சுருக்கம்*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `▪️ மொத்த கடன்          : ${formatCurrency(totalAdded)}\n` +
                `▪️ மொத்த வரவு          : ${formatCurrency(totalDeducted)}\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `✅ *தற்போதைய இருப்பு : ${formatCurrency(currentBalance)}*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                `🙏 நன்றி!\n` +
                (settings.mobile ? `📞 தொடர்புக்கு: ${settings.mobile}` : '');

            setRenderData({
                customer,
                monthTxns: chargesTxns,
                monthAdvances: manualDebts,
                totalAdded,
                totalDeducted,
                net: totalAdded - totalDeducted,
                balance: currentBalance,
                allPayments // Pass all payments to the renderer
            });
            setRenderType('payslip');
        }

        // Wait for render, then generate PDF and open WhatsApp
        setTimeout(async () => {
            const ref = type === 'invoice' ? invoiceRef.current : payslipRef.current;
            if (!ref) { setGeneratingFor(null); return; }

            try {
                const canvas = await html2canvas(ref, {
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
                const filename = type === 'invoice'
                    ? `invoice-${customer.name}-latest.pdf`
                    : `payslip-${customer.name}-fullhistory.pdf`;
                pdf.save(filename);

                // Open WhatsApp with pre-built message
                const link = generateWhatsAppLink(phone, whatsappMessage);
                window.open(link, '_blank');
            } catch (error) {
                console.error('Error generating PDF:', error);
                showToast(language === 'ta' ? 'PDF பிழை' : 'Error generating PDF');
            } finally {
                setGeneratingFor(null);
                setRenderType(null);
                setRenderData(null);
            }
        }, 500);
    };

    return (
        <div className="animate-fade-in">
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Send size={22} style={{ display: 'inline', marginRight: '8px', color: '#25D366' }} />
                        {language === 'ta' ? 'வாட்ஸ்அப் பகிர்வு' : 'WhatsApp Share'}
                    </h1>
                    <p className="page-subtitle">{language === 'ta' ? 'வாடிக்கையாளர்களுக்கு இன்வாய்ஸ் மற்றும் பேஸ்லிப் அனுப்பவும்' : 'Send invoices & payslips to customers via WhatsApp'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label className="form-label" style={{ margin: 0, fontSize: '13px', whiteSpace: 'nowrap' }}>
                        {language === 'ta' ? 'மாதம்' : 'Month'}:
                    </label>
                    <input
                        className="form-input"
                        type="month"
                        value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value)}
                        style={{ width: 'auto' }}
                    />
                </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search} ${t.customers}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Customer Table */}
            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.memberNumber}</th>
                                <th>{t.name}</th>
                                <th>{t.village}</th>
                                <th>{t.whatsapp}</th>
                                <th style={{ textAlign: 'right' }}>{t.currentBalance}</th>
                                <th style={{ textAlign: 'center', minWidth: '260px' }}>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <User size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                activeCustomers.map(c => {
                                    const balance = getBalance(c.id);
                                    const latestInv = getLatestInvoice(c.id);
                                    return (
                                        <tr key={c.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{c.id}</td>
                                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                                            <td>{c.village}</td>
                                            <td style={{ fontSize: '13px' }}>{c.whatsapp || c.mobile || '—'}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: balance > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                                                {formatCurrency(balance)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#25D366', color: 'white', fontSize: '12px', padding: '6px 12px' }}
                                                        onClick={() => generatePDFAndShare('invoice', c.id)}
                                                        disabled={!latestInv || generatingFor === `${c.id}-invoice`}
                                                        title={latestInv ? `${latestInv.id} - ${formatDate(latestInv.date)}` : 'No invoices'}
                                                    >
                                                        {generatingFor === `${c.id}-invoice` ? (
                                                            <span className="spinner-sm" />
                                                        ) : (
                                                            <FileText size={14} />
                                                        )}
                                                        {language === 'ta' ? 'இன்வாய்ஸ்' : 'Invoice'}
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ background: '#25D366', color: 'white', fontSize: '12px', padding: '6px 12px' }}
                                                        onClick={() => generatePDFAndShare('payslip', c.id)}
                                                        disabled={generatingFor === `${c.id}-payslip`}
                                                    >
                                                        {generatingFor === `${c.id}-payslip` ? (
                                                            <span className="spinner-sm" />
                                                        ) : (
                                                            <Wallet size={14} />
                                                        )}
                                                        {language === 'ta' ? 'பேஸ்லிப்' : 'Payslip'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hidden render areas for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                {/* ══════════════ PROFESSIONAL INVOICE PDF ══════════════ */}
                {renderType === 'invoice' && renderData && (
                    <div ref={invoiceRef} style={{ width: '595px', background: 'white', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1e293b' }}>
                        {/* Top Color Bar */}
                        <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', height: '8px' }} />

                        <div style={{ padding: '32px 40px' }}>
                            {/* Header: Shop Info + INVOICE label */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#1e40af', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>{settings.shopName}</h1>
                                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                                        {settings.address && <div>{settings.address}</div>}
                                        {settings.mobile && <div>📞 {settings.mobile}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#1e40af', letterSpacing: '2px', marginBottom: '4px' }}>
                                        {language === 'ta' ? 'இன்வாய்ஸ்' : 'INVOICE'}
                                    </div>
                                    <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                                        {renderData.transaction?.id}
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '24px' }} />

                            {/* Bill To / Invoice Details */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #3b82f6', flex: '0 0 48%' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                                        {language === 'ta' ? 'பில் பெறுபவர்' : 'BILL TO'}
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{renderData.customer?.name}</div>
                                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                                        {renderData.customer?.village && <div>📍 {renderData.customer.village}</div>}
                                        {renderData.customer?.mobile && <div>📞 {renderData.customer.mobile}</div>}
                                        <div style={{ fontFamily: 'monospace', color: '#3b82f6', marginTop: '2px' }}>{renderData.customer?.id}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', flex: '0 0 40%' }}>
                                    <div style={{ marginBottom: '12px' }}>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                            {language === 'ta' ? 'தேதி' : 'DATE'}
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px' }}>{formatDate(renderData.transaction?.date || '')}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                                            {language === 'ta' ? 'கட்டண முறை' : 'PAYMENT'}
                                        </div>
                                        <div style={{ display: 'inline-block', padding: '3px 12px', background: '#dcfce7', color: '#15803d', borderRadius: '100px', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
                                            {language === 'ta' ? 'கடன்' : 'Credit'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 800, color: 'white', background: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '4px 0 0 0' }}>#</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 800, color: 'white', background: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'பொருள் விவரம்' : 'ITEM DESCRIPTION'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '9px', fontWeight: 800, color: 'white', background: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'அளவு' : 'QTY'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '9px', fontWeight: 800, color: 'white', background: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'விலை' : 'PRICE'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '9px', fontWeight: 800, color: 'white', background: '#1e40af', textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '0 4px 0 0' }}>{language === 'ta' ? 'மொத்தம்' : 'TOTAL'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderData.transaction?.items?.map((item: any, i: number) => (
                                        <tr key={item.productId} style={{ background: i % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                                            <td style={{ padding: '11px 10px', fontSize: '12px', color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>{i + 1}</td>
                                            <td style={{ padding: '11px 10px', fontSize: '13px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{item.productName}</td>
                                            <td style={{ padding: '11px 10px', fontSize: '13px', textAlign: 'center', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>{item.quantity}</td>
                                            <td style={{ padding: '11px 10px', fontSize: '13px', textAlign: 'right', color: '#334155', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(item.unitPrice)}</td>
                                            <td style={{ padding: '11px 10px', fontSize: '13px', textAlign: 'right', fontWeight: 700, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Totals Section */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <div style={{ width: '250px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#475569' }}>
                                        <span>{language === 'ta' ? 'கூட்டுத்தொகை' : 'Subtotal'}</span>
                                        <span style={{ fontWeight: 600 }}>{formatCurrency(renderData.transaction?.subtotal || 0)}</span>
                                    </div>
                                    {(renderData.transaction?.discount || 0) > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '13px', color: '#dc2626' }}>
                                            <span>{language === 'ta' ? 'தள்ளுபடி' : 'Discount'}</span>
                                            <span style={{ fontWeight: 600 }}>-{formatCurrency(renderData.transaction?.discount || 0)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#1e40af', borderRadius: '6px', marginTop: '6px' }}>
                                        <span style={{ fontSize: '15px', fontWeight: 800, color: 'white' }}>{language === 'ta' ? 'மொத்த தொகை' : 'GRAND TOTAL'}</span>
                                        <span style={{ fontSize: '18px', fontWeight: 900, color: 'white' }}>{formatCurrency(renderData.transaction?.totalAmount || 0)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {renderData.transaction?.notes && (
                                <div style={{ marginTop: '20px', padding: '12px 16px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '12px' }}>
                                    <strong>{language === 'ta' ? 'குறிப்பு:' : 'Note:'}</strong> {renderData.transaction.notes}
                                </div>
                            )}

                            {/* Signatures */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px', paddingTop: '0' }}>
                                <div style={{ textAlign: 'center', width: '180px' }}>
                                    {renderData.transaction?.signature && (
                                        <img src={renderData.transaction.signature} alt="Signature" style={{ width: '120px', height: '50px', objectFit: 'contain', margin: '0 auto 6px' }} />
                                    )}
                                    {!renderData.transaction?.signature && <div style={{ height: '50px' }} />}
                                    <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {language === 'ta' ? 'வாடிக்கையாளர் கையொப்பம்' : 'Customer Signature'}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', width: '180px' }}>
                                    <div style={{ height: '50px' }} />
                                    <div style={{ borderTop: '2px solid #cbd5e1', paddingTop: '8px', fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                        {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signature'}
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {language === 'ta' ? 'நன்றி! மீண்டும் வாருங்கள்.' : 'Thank you for your business!'} • {settings.shopName}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Color Bar */}
                        <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', height: '6px' }} />
                    </div>
                )}

                {/* ══════════════ PROFESSIONAL PAYSLIP PDF ══════════════ */}
                {renderType === 'payslip' && renderData && (
                    <div ref={payslipRef} style={{ width: '595px', background: 'white', fontFamily: 'Arial, Helvetica, sans-serif', color: '#1e293b' }}>
                        {/* Top Color Bar */}
                        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', height: '8px' }} />

                        <div style={{ padding: '32px 40px' }}>
                            {/* Header */}
                            <div style={{ textAlign: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '24px', marginBottom: '24px' }}>
                                {settings.logo && <img src={settings.logo} alt="Logo" style={{ width: '60px', height: '60px', marginBottom: '12px', borderRadius: '10px' }} />}
                                <h2 style={{ fontSize: '26px', fontWeight: 900, color: '#7c3aed', margin: '0', letterSpacing: '-0.5px' }}>{settings.shopName}</h2>
                                <p style={{ fontSize: '11px', color: '#64748b', margin: '6px 0 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>{settings.address}</p>
                                <div style={{ marginTop: '16px', display: 'inline-block', padding: '6px 24px', background: '#7c3aed', color: 'white', borderRadius: '100px', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                    {language === 'ta' ? 'பேஸ்லிப் - முழு வரலாறு' : 'PAYSLIP - Full History'}
                                </div>
                            </div>

                            {/* Customer + Balance */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0', background: '#fafafa', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9', marginBottom: '32px' }}>
                                <div style={{ padding: '20px 24px' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: '6px' }}>{language === 'ta' ? 'வாடிக்கையாளர் விவரம்' : 'CUSTOMER DETAILS'}</div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>{renderData.customer?.name}</div>
                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                        <span style={{ opacity: 0.7 }}>ID:</span> <span style={{ fontWeight: 700, color: '#7c3aed' }}>{renderData.customer?.id}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{renderData.customer?.village}</div>
                                </div>
                                <div style={{ width: '1px', background: '#e2e8f0', height: '80%', margin: 'auto 0' }} />
                                <div style={{ padding: '20px 24px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '9px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '1px', marginBottom: '6px' }}>
                                        {renderData.balance > 0
                                            ? (language === 'ta' ? 'நிலுவைத் தொகை' : 'OUTSTANDING BALANCE')
                                            : (language === 'ta' ? 'வரவு உள்ளது' : 'AVAILABLE CREDIT')}
                                    </div>
                                    <div style={{ fontSize: '30px', fontWeight: 900, color: renderData.balance > 0 ? '#dc2626' : '#7c3aed', lineHeight: '1' }}>
                                        {renderData.balance > 0 ? '+' : (renderData.balance < 0 ? '-' : '')}{formatCurrency(Math.abs(renderData.balance))}
                                    </div>
                                    <div style={{ fontSize: '10px', color: renderData.balance > 0 ? '#dc2626' : '#16a34a', fontWeight: 700, marginTop: '8px' }}>
                                        {renderData.balance > 0 ? (language === 'ta' ? 'நிலுவையில்' : 'Payment Due') : (language === 'ta' ? 'வரவு உள்ளது' : 'Available Credit')}
                                    </div>
                                </div>
                            </div>

                            {/* Transaction Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '100px' }} />
                                    <col style={{ width: 'auto' }} />
                                    <col style={{ width: '140px' }} />
                                    <col style={{ width: '130px' }} />
                                </colgroup>
                                <thead style={{ background: '#7c3aed' }}>
                                    <tr>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'தேதி' : 'DATE'}</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'விவரம்' : 'DESCRIPTION'}</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '10px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'வகை' : 'TYPE'}</th>
                                        <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: 'white', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'தொகை' : 'AMOUNT'}</th>
                                    </tr>
                                </thead>
                                {groupedRenderData.map((group: any) => (
                                    <tbody key={group.monthKey}>
                                        <tr style={{ background: '#f5f3ff', borderBottom: '1px solid #7c3aed' }}>
                                            <td colSpan={4} style={{ padding: '8px 14px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: 800, color: '#7c3aed', fontSize: '11px', textTransform: 'uppercase' }}>📅 {group.monthLabel}</span>
                                                    <span style={{ fontSize: '9px', color: '#64748b' }}>
                                                        {language === 'ta' ? 'தொடக்க இருப்பு' : 'Opening balance'}: <b style={{ color: '#1e293b' }}>{group.openingBalance > 0 ? '+' : ''}{formatCurrency(group.openingBalance)}</b>
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                        {group.items.map((item: any, idx: number) => (
                                            <tr key={`${item.id}-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '10px 14px', fontSize: '10px', color: '#1e293b' }}>{formatDate(item.date)}</td>
                                                <td style={{ padding: '10px 14px', fontSize: '11px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.items ? item.items.map((it: any) => it.productName).join(', ') : (item.notes || item.reason || 'Record')}
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    <div style={{
                                                        display: 'inline-block',
                                                        padding: '3px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '9px',
                                                        fontWeight: 800,
                                                        background: item.type === 'charge' ? '#fff7ed' : '#f0fdf4',
                                                        color: item.type === 'charge' ? '#c2410c' : '#15803d',
                                                        border: `1px solid ${item.type === 'charge' ? '#fdba74' : '#bbf7d0'}`,
                                                        width: '110px'
                                                    }}>
                                                        {item.type === 'charge' ? (language === 'ta' ? 'கூடுதல் வரவு (+)' : 'Added Credit (+)') : (language === 'ta' ? 'கழிவுகள் (-)' : 'Deduction (-)')}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '12px', color: item.type === 'charge' ? '#dc2626' : '#16a34a' }}>
                                                    {item.type === 'charge' ? '+' : '-'}{formatCurrency(item.amount || item.totalAmount)}
                                                </td>
                                            </tr>
                                        ))}
                                        <tr style={{ background: '#f8fafc' }}>
                                            <td colSpan={3} style={{ textAlign: 'right', fontSize: '10px', color: '#64748b', padding: '8px 14px', fontWeight: 600 }}>{language === 'ta' ? 'மாத முடிவு இருப்பு' : 'Monthly Closing Balance'}:</td>
                                            <td style={{ textAlign: 'right', fontSize: '11px', fontWeight: 800, color: '#7c3aed', padding: '8px 14px' }}>{group.closingBalance > 0 ? '+' : ''}{formatCurrency(group.closingBalance)}</td>
                                        </tr>
                                    </tbody>
                                ))}
                                {groupedRenderData.length === 0 && (
                                    <tbody>
                                        <tr>
                                            <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                                {language === 'ta' ? 'எந்த பதிவுகளும் இல்லை' : 'No records found'}
                                            </td>
                                        </tr>
                                    </tbody>
                                )}
                            </table>

                            {/* Summary Footer */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '-16px' }}>
                                <tfoot>
                                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #7c3aed' }}>
                                        <td colSpan={2} rowSpan={3} style={{ padding: '20px', borderRight: '1px solid #e2e8f0', fontSize: '10px', color: '#64748b' }}>
                                            <div style={{ fontWeight: 800, color: '#1e293b', textTransform: 'uppercase', marginBottom: '6px' }}>{language === 'ta' ? 'அறிக்கை சுருக்கம்' : 'Statement Summary'}</div>
                                            {language === 'ta' ? 'இந்த அறிக்கை தேர்ந்தெடுக்கப்பட்ட வாடிக்கையாளரின் கடன் மற்றும் வரவு விவரங்களைக் காட்டுகிறது.' : 'This statement displays all charges and payments for the selected customer for the full history.'}
                                        </td>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{language === 'ta' ? 'மொத்த கடன்' : 'Total Charges'} (+)</td>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', fontSize: '12px', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(renderData.totalAdded)}</td>
                                    </tr>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', fontSize: '10px', fontWeight: 700, color: '#64748b' }}>{language === 'ta' ? 'மொத்த வரவு' : 'Total Payments'} (-)</td>
                                        <td style={{ textAlign: 'right', padding: '10px 16px', fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(renderData.totalDeducted)}</td>
                                    </tr>
                                    <tr style={{ background: '#7c3aed', color: 'white' }}>
                                        <td style={{ textAlign: 'right', padding: '12px 16px', fontSize: '11px', fontWeight: 800 }}>{language === 'ta' ? 'நிகர மாற்றம்' : 'TOTAL NET CHANGE'}</td>
                                        <td style={{ textAlign: 'right', padding: '12px 16px', fontSize: '16px', fontWeight: 950 }}>{renderData.net >= 0 ? '+' : ''}{formatCurrency(renderData.net)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Signatures */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', marginTop: '60px', padding: '0 20px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '50px' }}></div>
                                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {language === 'ta' ? 'வாடிக்கையாளர் கையொப்பம்' : 'Customer Signature'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '50px' }}></div>
                                    <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '12px' }}>
                                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            {language === 'ta' ? 'அங்கீகரிக்கப்பட்ட கையொப்பம்' : 'Authorized Signature'}
                                        </div>
                                        <div style={{ fontSize: '8px', color: '#94a3b8', marginTop: '4px' }}>
                                            {language === 'ta' ? 'உருவாக்கப்பட்டது' : 'Generated on'}: {formatDate(new Date().toISOString())}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ marginTop: '30px', textAlign: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {language === 'ta' ? 'இது கணினி உருவாக்கிய ஆவணம்' : 'This is a computer generated document'} • {settings.shopName}
                                </div>
                            </div>
                        </div>

                        {/* Bottom Color Bar */}
                        <div style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', height: '6px' }} />
                    </div>
                )}
            </div>

            <style jsx>{`
                .spinner-sm {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 0.8s linear infinite;
                    display: inline-block;
                    margin-right: 6px;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
