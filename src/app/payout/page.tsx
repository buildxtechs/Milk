'use client';

import { useState, useMemo } from 'react';
import { useStore, useCustomers, useAdvances, usePayouts, useExternalDeductions } from '@/lib/store';
import { translations } from '@/lib/translations';
import { formatCurrency, todayStr, formatDate, generateInvoiceId } from '@/lib/utils';
import { Wallet, DollarSign, ArrowDownCircle, CheckCircle, Search, User, FileText, History, Plus, Trash2 } from 'lucide-react';
import SignaturePad from '@/components/pos/SignaturePad';

export default function PayoutPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const advances = useAdvances();
    const payouts = usePayouts();
    const externalDeductions = useExternalDeductions();
    const addPayout = useStore((s) => s.addPayout);
    const addExternalDeduction = useStore((s) => s.addExternalDeduction);
    const deductBalance = useStore((s) => s.deductBalance);

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [tempDeduction, setTempDeduction] = useState({ amount: 0, reason: '' });
    const [currentDeductions, setCurrentDeductions] = useState<{ amount: number; reason: string }[]>([]);
    const [showSignature, setShowSignature] = useState(false);
    const [payoutSuccess, setPayoutSuccess] = useState(false);

    const activeCustomers = customers.filter(c => c.status === 'active').sort((a, b) => {
        const balanceA = advances.filter(adv => adv.customerId === a.id).reduce((s, adv) => s + adv.remainingBalance, 0);
        const balanceB = advances.filter(adv => adv.customerId === b.id).reduce((s, adv) => s + adv.remainingBalance, 0);
        if (balanceA === 0 && balanceB !== 0) return 1;
        if (balanceA !== 0 && balanceB === 0) return -1;
        return balanceB - balanceA;
    });
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    const customerBalance = useMemo(() => {
        if (!selectedCustomerId) return 0;
        return advances.filter(a => a.customerId === selectedCustomerId).reduce((s, a) => s + a.remainingBalance, 0);
    }, [selectedCustomerId, advances]);

    const totalDeductions = currentDeductions.reduce((s, d) => s + d.amount, 0);
    const netPayout = Math.max(0, customerBalance - totalDeductions);

    const handleAddDeduction = () => {
        if (tempDeduction.amount <= 0 || !tempDeduction.reason) return;
        setCurrentDeductions([...currentDeductions, { ...tempDeduction }]);
        setTempDeduction({ amount: 0, reason: '' });
    };

    const removeDeduction = (idx: number) => {
        setCurrentDeductions(currentDeductions.filter((_, i) => i !== idx));
    };

    const handleMarkPaid = (signature: string) => {
        if (!selectedCustomerId || netPayout < 0) return;

        // 1. Record individual external deductions
        currentDeductions.forEach(d => {
            addExternalDeduction({
                id: `DED-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                customerId: selectedCustomerId,
                amount: d.amount,
                reason: d.reason,
                date: todayStr(),
                createdAt: new Date().toISOString()
            });
        });

        // 2. Record Payout
        const payoutId = `PAY-${Date.now()}`;
        addPayout({
            id: payoutId,
            customerId: selectedCustomerId,
            amount: customerBalance,
            deductionAmount: totalDeductions,
            netAmount: netPayout,
            date: todayStr(),
            signature,
            createdAt: new Date().toISOString()
        });

        // 3. Subtract from advance balance
        deductBalance(selectedCustomerId, customerBalance);

        // Reset
        setPayoutSuccess(true);
        setShowSignature(false);
        setCurrentDeductions([]);
        setSelectedCustomerId('');

        setTimeout(() => setPayoutSuccess(false), 3000);
    };

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.payout}</h1>
                    <p className="page-subtitle">{language === 'ta' ? 'வாடிக்கையாளர்களுக்கு பணம் வழங்குதல்' : 'Process payments to customers'}</p>
                </div>
            </div>

            {payoutSuccess && (
                <div className="alert alert-success" style={{ marginBottom: '20px' }}>
                    <CheckCircle size={18} /> {language === 'ta' ? 'பட்டுவாடா வெற்றிகரமாக முடிந்தது!' : 'Payout processed successfully!'}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', alignItems: 'start' }}>
                <div className="dashboard-main">
                    {/* Header: Customer Selection */}
                    <div className="card shadow-sm" style={{ marginBottom: '24px' }}>
                        <div className="card-body" style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                            <div style={{ flex: 1 }}>
                                <label className="form-label">{t.selectCustomer}</label>
                                <select
                                    className="form-select"
                                    value={selectedCustomerId}
                                    onChange={e => setSelectedCustomerId(e.target.value)}
                                >
                                    <option value="">{language === 'ta' ? 'தேர்வு செய்யவும்...' : 'Select a customer...'}</option>
                                    {activeCustomers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} - {c.village} ({c.id})</option>
                                    ))}
                                </select>
                            </div>
                            {selectedCustomer && (
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{language === 'ta' ? 'தற்போதைய இருப்பு' : 'Current Balance'}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(customerBalance)}</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {selectedCustomer && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {/* Deductions Section */}
                            <div className="card shadow-sm">
                                <div className="card-header">
                                    <span className="card-title">{t.externalDeduction}</span>
                                </div>
                                <div className="card-body">
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                className="form-input"
                                                placeholder={t.reason}
                                                value={tempDeduction.reason}
                                                onChange={e => setTempDeduction({ ...tempDeduction, reason: e.target.value })}
                                            />
                                        </div>
                                        <div style={{ width: '120px' }}>
                                            <input
                                                className="form-input"
                                                type="number"
                                                placeholder={t.amount}
                                                value={tempDeduction.amount || ''}
                                                onChange={e => setTempDeduction({ ...tempDeduction, amount: Number(e.target.value) })}
                                            />
                                        </div>
                                        <button className="btn btn-secondary" onClick={handleAddDeduction}>
                                            <Plus size={16} /> {t.add}
                                        </button>
                                    </div>

                                    {currentDeductions.length > 0 && (
                                        <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>{t.reason}</th>
                                                        <th style={{ textAlign: 'right' }}>{t.amount}</th>
                                                        <th style={{ width: '50px' }}></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {currentDeductions.map((d, i) => (
                                                        <tr key={i}>
                                                            <td>{d.reason}</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(d.amount)}</td>
                                                            <td>
                                                                <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={() => removeDeduction(i)}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Payout Summary */}
                            <div className="card shadow-sm" style={{ border: '2px solid var(--primary)' }}>
                                <div className="card-body" style={{ background: 'var(--primary-light)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t.netPayout}</div>
                                            <div style={{ fontSize: '32px', fontWeight: 900, color: 'var(--primary)' }}>{formatCurrency(netPayout)}</div>
                                        </div>
                                        <button
                                            className="btn btn-primary btn-lg"
                                            style={{ height: '56px', padding: '0 32px', fontSize: '16px' }}
                                            onClick={() => setShowSignature(true)}
                                            disabled={customerBalance <= 0}
                                        >
                                            <CheckCircle size={20} /> {t.markPaid}
                                        </button>
                                    </div>
                                    <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '20px' }}>
                                        <span>{language === 'ta' ? 'அசல் தொகை' : 'Original Balance'}: {formatCurrency(customerBalance)}</span>
                                        <span>{language === 'ta' ? 'மொத்த கழிவு' : 'Total Deduction'}: -{formatCurrency(totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="dashboard-side">
                    <div className="card shadow-sm">
                        <div className="card-header">
                            <span className="card-title">{t.payoutHistory}</span>
                        </div>
                        <div className="card-body" style={{ padding: 0 }}>
                            {payouts.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <History size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: '13px' }}>{t.noData}</p>
                                </div>
                            ) : (
                                <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {[...payouts].reverse().slice(0, 10).map(p => {
                                        const c = customers.find(cust => cust.id === p.customerId);
                                        return (
                                            <div key={p.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{c?.name}</span>
                                                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.netAmount)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                    <span>{formatDate(p.date)}</span>
                                                    <span>{p.id}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {showSignature && (
                <SignaturePad
                    t={t}
                    onSave={handleMarkPaid}
                    onCancel={() => setShowSignature(false)}
                />
            )}
        </div>
    );
}
