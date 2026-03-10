'use client';

import { useState, useRef } from 'react';
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
            // Payslip
            const monthTxns = transactions.filter(txn => txn.customerId === custId && txn.date.startsWith(selectedMonth));
            const monthAdvances = advances.filter(adv => adv.customerId === custId && adv.date.startsWith(selectedMonth));
            const totalAdded = monthAdvances.reduce((s, a) => s + a.amount, 0);
            const totalDeducted = monthTxns.reduce((s, t) => s + t.totalAmount, 0);
            const currentBalance = getBalance(custId);

            // Build transaction details for payslip
            const advancesList = monthAdvances.map((adv: any, i: number) =>
                `   ➕ ${formatDate(adv.date)} - ${adv.notes || 'தொகை சேர்க்கப்பட்டது'} : ${formatCurrency(adv.amount)}`
            ).join('\n');
            const purchasesList = monthTxns.map((txn: any, i: number) =>
                `   ➖ ${formatDate(txn.date)} - ${txn.items.map((it: any) => it.productName).join(', ')} : ${formatCurrency(txn.totalAmount)}`
            ).join('\n');

            whatsappMessage = `*🏪 ${settings.shopName}*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                `வணக்கம் *${customer.name}* 🙏\n\n` +
                `📄 *மாத பேஸ்லிப் - ${selectedMonth}*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                (advancesList ? `💵 *வரவு (சேர்க்கப்பட்ட தொகை):*\n${advancesList}\n\n` : '') +
                (purchasesList ? `🛒 *செலவு (கொள்முதல்):*\n${purchasesList}\n\n` : '') +
                (!advancesList && !purchasesList ? `📭 இந்த மாதத்தில் பதிவுகள் இல்லை\n\n` : '') +
                `━━━━━━━━━━━━━━━━━\n` +
                `💰 *கணக்கு சுருக்கம்*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `▪️ மொத்த வரவு          : ${formatCurrency(totalAdded)}\n` +
                `▪️ மொத்த கழிவு          : ${formatCurrency(totalDeducted)}\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `✅ *தற்போதைய இருப்பு : ${formatCurrency(currentBalance)}*\n` +
                `━━━━━━━━━━━━━━━━━\n\n` +
                `🙏 நன்றி!\n` +
                (settings.mobile ? `📞 தொடர்புக்கு: ${settings.mobile}` : '');

            setRenderData({
                customer,
                monthTxns,
                monthAdvances,
                totalAdded,
                totalDeducted,
                net: totalAdded - totalDeducted,
                balance: currentBalance
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
                    : `payslip-${customer.name}-${selectedMonth}.pdf`;
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
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                <div>
                                    <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#7c3aed', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>{settings.shopName}</h1>
                                    <div style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.6' }}>
                                        {settings.address && <div>{settings.address}</div>}
                                        {settings.mobile && <div>📞 {settings.mobile}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'inline-block', padding: '6px 20px', background: 'linear-gradient(135deg, #7c3aed, #a78bfa)', color: 'white', borderRadius: '100px', fontWeight: 800, fontSize: '14px', letterSpacing: '1px' }}>
                                        {language === 'ta' ? 'பேஸ்லிப்' : 'PAYSLIP'}
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155', marginTop: '8px' }}>{selectedMonth}</div>
                                </div>
                            </div>

                            <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '24px' }} />

                            {/* Customer + Balance */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '28px' }}>
                                <div style={{ background: '#f8fafc', padding: '16px 20px', borderRadius: '8px', borderLeft: '4px solid #7c3aed', flex: '0 0 55%' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>
                                        {language === 'ta' ? 'வாடிக்கையாளர் விவரம்' : 'CUSTOMER DETAILS'}
                                    </div>
                                    <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{renderData.customer?.name}</div>
                                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.5' }}>
                                        <div style={{ fontFamily: 'monospace', color: '#7c3aed' }}>ID: {renderData.customer?.id}</div>
                                        {renderData.customer?.village && <div>📍 {renderData.customer.village}</div>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'center', flex: '0 0 35%', background: '#f5f3ff', padding: '16px', borderRadius: '8px', border: '2px solid #ddd6fe' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>
                                        {language === 'ta' ? 'தற்போதைய இருப்பு' : 'CURRENT BALANCE'}
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#7c3aed' }}>{formatCurrency(renderData.balance)}</div>
                                </div>
                            </div>

                            {/* Transaction Table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 800, color: 'white', background: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '4px 0 0 0' }}>{language === 'ta' ? 'தேதி' : 'DATE'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'left', fontSize: '9px', fontWeight: 800, color: 'white', background: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'விவரம்' : 'DESCRIPTION'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'center', fontSize: '9px', fontWeight: 800, color: 'white', background: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px' }}>{language === 'ta' ? 'வகை' : 'TYPE'}</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right', fontSize: '9px', fontWeight: 800, color: 'white', background: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', borderRadius: '0 4px 0 0' }}>{language === 'ta' ? 'தொகை' : 'AMOUNT'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {renderData.monthAdvances?.map((adv: any, i: number) => (
                                        <tr key={adv.id} style={{ background: i % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                                            <td style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>{formatDate(adv.date)}</td>
                                            <td style={{ padding: '10px', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{adv.notes || (language === 'ta' ? 'தொகை சேர்க்கப்பட்டது' : 'Amount Added')}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ display: 'inline-block', padding: '2px 10px', background: '#dcfce7', color: '#15803d', borderRadius: '100px', fontSize: '10px', fontWeight: 700 }}>
                                                    {language === 'ta' ? 'வரவு' : 'Credit'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#16a34a', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>+{formatCurrency(adv.amount)}</td>
                                        </tr>
                                    ))}
                                    {renderData.monthTxns?.map((txn: any, i: number) => (
                                        <tr key={txn.id} style={{ background: (renderData.monthAdvances?.length + i) % 2 === 0 ? '#ffffff' : '#faf5ff' }}>
                                            <td style={{ padding: '10px', fontSize: '12px', borderBottom: '1px solid #f1f5f9' }}>{formatDate(txn.date)}</td>
                                            <td style={{ padding: '10px', fontSize: '12px', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>{txn.items.map((it: any) => it.productName).join(', ')}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                                                <span style={{ display: 'inline-block', padding: '2px 10px', background: '#fef2f2', color: '#dc2626', borderRadius: '100px', fontSize: '10px', fontWeight: 700 }}>
                                                    {language === 'ta' ? 'கழிவு' : 'Debit'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#dc2626', fontSize: '13px', borderBottom: '1px solid #f1f5f9' }}>-{formatCurrency(txn.totalAmount)}</td>
                                        </tr>
                                    ))}
                                    {(renderData.monthAdvances?.length === 0 && renderData.monthTxns?.length === 0) && (
                                        <tr>
                                            <td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                                {language === 'ta' ? 'இந்த மாதத்தில் பதிவுகள் இல்லை' : 'No records for this month'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Summary Cards */}
                            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                                <div style={{ flex: 1, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                        {language === 'ta' ? 'மொத்த வரவு' : 'Total Credit'}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#15803d' }}>{formatCurrency(renderData.totalAdded)}</div>
                                </div>
                                <div style={{ flex: 1, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                        {language === 'ta' ? 'மொத்த கழிவு' : 'Total Debit'}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#dc2626' }}>{formatCurrency(renderData.totalDeducted)}</div>
                                </div>
                                <div style={{ flex: 1, background: '#f5f3ff', border: '2px solid #c4b5fd', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                                        {language === 'ta' ? 'நிகர மாற்றம்' : 'Net Change'}
                                    </div>
                                    <div style={{ fontSize: '18px', fontWeight: 900, color: renderData.net >= 0 ? '#15803d' : '#dc2626' }}>
                                        {renderData.net >= 0 ? '+' : ''}{formatCurrency(renderData.net)}
                                    </div>
                                </div>
                            </div>

                            {/* Signatures */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '50px' }}>
                                <div style={{ textAlign: 'center', width: '180px' }}>
                                    <div style={{ height: '50px' }} />
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
