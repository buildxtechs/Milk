'use client';

import { useState } from 'react';
import { useStore, useCustomers, useProducts, useTransactions, useAdvances, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Transaction, TransactionItem, PaymentMode } from '@/lib/types';
import { generateInvoiceId, formatCurrency, todayStr, currentMonthStr, getMonthlyPurchaseCount, getNextEligibleDate, formatDate, generateWhatsAppLink, parseTemplate } from '@/lib/utils';
import { ShoppingCart, Plus, Minus, Trash2, AlertTriangle, CheckCircle, Search, X, Info, Send, Fingerprint } from 'lucide-react';
import CustomerDetailsModal from '@/components/customers/CustomerDetailsModal';
import SignaturePad from '@/components/pos/SignaturePad';

export default function POSPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const products = useProducts();
    const transactions = useTransactions();
    const advances = useAdvances();
    const addTransaction = useStore((s) => s.addTransaction);
    const updateStock = useStore((s) => s.updateStock);
    const deductBalance = useStore((s) => s.deductBalance);
    const settings = useSettings();

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [cart, setCart] = useState<TransactionItem[]>([]);
    const [discount, setDiscount] = useState(0);
    const [paymentMode, setPaymentMode] = useState<PaymentMode>('advance');
    const [validationMethod, setValidationMethod] = useState<'signature' | 'fingerprint'>('signature');
    const [notes, setNotes] = useState('');
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [toast, setToast] = useState('');
    const [saleSuccess, setSaleSuccess] = useState<Transaction | null>(null);
    const [showCustomerDetails, setShowCustomerDetails] = useState(false);
    const [showSignaturePad, setShowSignaturePad] = useState(false);
    const [customerSearch, setCustomerSearch] = useState('');
    const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
    const [budget, setBudget] = useState(0);

    const activeCustomers = customers.filter(c => c.status === 'active').sort((a, b) => {
        const balanceA = advances.filter(adv => adv.customerId === a.id).reduce((s, adv) => s + adv.remainingBalance, 0);
        const balanceB = advances.filter(adv => adv.customerId === b.id).reduce((s, adv) => s + adv.remainingBalance, 0);
        if (balanceA === 0 && balanceB !== 0) return 1;
        if (balanceA !== 0 && balanceB === 0) return -1;
        return balanceB - balanceA;
    });
    const filteredCustomers = customerSearch.trim() === ''
        ? activeCustomers.slice(0, 10)
        : activeCustomers.filter(c =>
            c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.village.toLowerCase().includes(customerSearch.toLowerCase()) ||
            c.id.includes(customerSearch)
        ).slice(0, 10);

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    // Purchase limit check
    const currentMonth = currentMonthStr();
    const purchaseCount = selectedCustomerId ? getMonthlyPurchaseCount(selectedCustomerId, currentMonth, transactions) : 0;
    const isLimitReached = purchaseCount >= settings.maxPurchasesPerMonth;
    const nextEligible = selectedCustomerId ? getNextEligibleDate(selectedCustomerId, transactions) : '';

    const customerAdvances = advances.filter(a => a.customerId === selectedCustomerId && a.remainingBalance > 0);
    const totalBalance = customerAdvances.reduce((s, a) => s + a.remainingBalance, 0);

    // Filtered products
    const filteredProducts = products.filter(p => {
        const matchSearch = p.nameEn.toLowerCase().includes(search.toLowerCase()) || p.nameTa.includes(search);
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        return matchSearch && matchCat && p.stockQuantity > 0;
    });

    const addToCart = async (product: typeof products[0]) => {
        // Animation delay kept minimal
        await new Promise(resolve => setTimeout(resolve, 300));

        setCart(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id
                    ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
                    : i
                );
            }
            return [...prev, {
                productId: product.id,
                productName: language === 'ta' ? (product.nameTa || product.nameEn) : product.nameEn,
                quantity: 1,
                unitPrice: product.sellingPrice,
                discount: 0,
                total: product.sellingPrice,
            }];
        });
    };

    const updateQty = (productId: string, qty: number) => {
        if (qty <= 0) {
            setCart(prev => prev.filter(i => i.productId !== productId));
        } else {
            setCart(prev => prev.map(i => i.productId === productId
                ? { ...i, quantity: qty, total: qty * i.unitPrice - i.discount }
                : i
            ));
        }
    };

    const removeFromCart = (productId: string) => setCart(prev => prev.filter(i => i.productId !== productId));

    const subtotal = cart.reduce((s, i) => s + i.total, 0);
    const grandTotal = Math.max(0, subtotal - discount);

    const handleCheckout = (signature: string, method?: 'signature' | 'fingerprint') => {
        if (!selectedCustomerId) { showToast(language === 'ta' ? 'வாடிக்கையாளரை தேர்வு செய்யவும்' : 'Please select a customer'); return; }
        if (cart.length === 0) { showToast(language === 'ta' ? 'கார்ட் காலியாக உள்ளது' : 'Cart is empty'); return; }
        if (isLimitReached) { showToast(t.purchaseLimitMsg); return; }

        // Logic for advance usage
        let advanceUsed = 0;
        if (paymentMode === 'advance') {
            advanceUsed = Math.min(totalBalance, grandTotal);
            deductBalance(selectedCustomerId, advanceUsed);
        }

        const txn: Transaction = {
            id: generateInvoiceId(transactions.map(t => t.id)),
            customerId: selectedCustomerId,
            date: todayStr(),
            items: cart,
            subtotal,
            discount,
            totalAmount: grandTotal,
            budgetProvided: budget > 0 ? budget : undefined,
            advanceUsed: advanceUsed > 0 ? advanceUsed : undefined,
            balanceDue: (grandTotal - (budget > 0 ? budget : 0) - advanceUsed) > 0 ? (grandTotal - (budget > 0 ? budget : 0) - advanceUsed) : 0,
            paymentMode,
            validationMethod: method || validationMethod,
            signature,
            notes,
            createdAt: new Date().toISOString(),
        };

        addTransaction(txn);
        // Update stock
        cart.forEach(item => updateStock(item.productId, -item.quantity));

        setSaleSuccess(txn);
        setNotes('');
        setBudget(0);
        setCustomerSearch('');
        setSelectedCustomerId('');
        setShowSignaturePad(false);
    };

    const handleCompleteSale = () => {
        if (!selectedCustomerId) { showToast(language === 'ta' ? 'வாடிக்கையாளரை தேர்வு செய்யவும்' : 'Please select a customer'); return; }
        if (cart.length === 0) { showToast(language === 'ta' ? 'கார்ட் காலியாக உள்ளது' : 'Cart is empty'); return; }
        if (isLimitReached) { showToast(t.purchaseLimitMsg); return; }

        setShowSignaturePad(true);
    };

    const categories = ['all', 'theevanam', 'medical', 'supplements', 'accessories', 'other'];
    const getCatLabel = (c: string) => {
        const map: Record<string, string> = {
            all: t.all, theevanam: t.theevanam, medical: t.medical,
            supplements: t.supplements, accessories: t.accessories, other: t.other
        };
        return map[c] || c;
    };

    return (
        <div>
            {toast && <div className="alert alert-warning" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.pos}</h1>
                    <p className="page-subtitle">{t.posSubtitle}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 items-start">
                {/* Left: Product Selection */}
                <div style={{ minWidth: 0 }}> {/* Prevent grid blowout */}
                    {/* Customer Selection */}
                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="card-body" style={{ padding: '16px' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                                    <label className="form-label">{t.selectCustomer} *</label>
                                    <div className="search-bar" style={{ background: 'var(--surface)' }}>
                                        <Search size={14} style={{ color: 'var(--text-muted)' }} />
                                        <input
                                            placeholder={language === 'ta' ? 'வாடிக்கையாளரைத் தேடு (பெயர், ஊர், எண்)...' : 'Search customer (Name, Village, ID)...'}
                                            value={customerSearch}
                                            onChange={e => {
                                                setCustomerSearch(e.target.value);
                                                setIsCustomerDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsCustomerDropdownOpen(true)}
                                        />
                                        {customerSearch && (
                                            <button
                                                className="btn btn-ghost btn-icon btn-sm"
                                                onClick={() => { setCustomerSearch(''); setSelectedCustomerId(''); }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {isCustomerDropdownOpen && filteredCustomers.length > 0 && (
                                        <div
                                            className="card"
                                            style={{
                                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                                marginTop: '4px', maxHeight: '250px', overflowY: 'auto',
                                                boxShadow: 'var(--shadow-lg)', border: '1px solid var(--primary)'
                                            }}
                                        >
                                            {filteredCustomers.map(c => (
                                                <div
                                                    key={c.id}
                                                    style={{
                                                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                                                        background: selectedCustomerId === c.id ? 'var(--primary-light)' : 'transparent',
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                    }}
                                                    onClick={() => {
                                                        setSelectedCustomerId(c.id);
                                                        setCustomerSearch(c.name);
                                                        setIsCustomerDropdownOpen(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.village} • {c.id}</div>
                                                    </div>
                                                    <span className="badge badge-gray">{c.id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {selectedCustomer && (
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span className="badge badge-green">{selectedCustomer.village}</span>
                                        <span className={`badge ${isLimitReached ? 'badge-red' : 'badge-blue'}`}>
                                            {purchaseCount}/{settings.maxPurchasesPerMonth} {t.purchases}
                                        </span>
                                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setShowCustomerDetails(true)} title={t.view}>
                                            <Info size={16} style={{ color: 'var(--primary)' }} />
                                        </button>
                                        {isLimitReached && (
                                            <span className="badge badge-red">
                                                <AlertTriangle size={10} />
                                                {t.purchaseLimit}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isLimitReached && (
                                <div className="alert alert-error" style={{ marginTop: '12px', marginBottom: 0 }}>
                                    <AlertTriangle size={16} />
                                    {t.purchaseLimitMsg} {t.nextEligibleDate}: {formatDate(nextEligible)}
                                </div>
                            )}
                            {selectedCustomer && totalBalance <= 500 && totalBalance > 0 && (
                                <div className="alert alert-warning" style={{ marginTop: '12px', marginBottom: 0 }}>
                                    <AlertTriangle size={16} />
                                    {t.lowBalanceWarning} ({formatCurrency(totalBalance)})
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Product Filters */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                            <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                            <input placeholder={`${t.search}...`} value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {categories.map(c => (
                                <button
                                    key={c}
                                    className={`btn btn-sm ${categoryFilter === c ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setCategoryFilter(c)}
                                >
                                    {getCatLabel(c)}
                                </button>
                            ))}
                        </div>
                    </div>



                    {/* Product Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                        {filteredProducts.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                <ShoppingCart size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                {t.noData}
                            </div>
                        ) : (
                            filteredProducts.map(p => {
                                const inCart = cart.find(i => i.productId === p.id);
                                return (
                                    <div
                                        key={p.id}
                                        className="card"
                                        style={{
                                            padding: '14px',
                                            cursor: 'pointer',
                                            border: inCart ? '2px solid var(--primary)' : '1px solid var(--border)',
                                            transition: 'all 0.15s ease',
                                        }}
                                        onClick={() => addToCart(p)}
                                    >
                                        <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px', lineHeight: 1.3 }}>
                                            {language === 'ta' ? (p.nameTa || p.nameEn) : p.nameEn}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>{p.category}</div>
                                        <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--primary)' }}>{formatCurrency(p.sellingPrice)}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            {p.stockQuantity} {p.unit} {language === 'ta' ? 'இருப்பு' : 'in stock'}
                                        </div>
                                        {inCart && (
                                            <div style={{ marginTop: '8px', background: 'var(--primary-light)', borderRadius: '4px', padding: '4px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--primary)', textAlign: 'center' }}>
                                                {inCart.quantity} {language === 'ta' ? 'கார்ட்டில்' : 'in cart'}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right: Cart */}
                <div style={{ position: 'sticky', top: '80px' }}>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title">
                                <ShoppingCart size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                {t.cart} ({cart.length})
                            </span>
                        </div>
                        <div className="card-body" style={{ padding: '0' }}>
                            {cart.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <ShoppingCart size={28} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                    <p style={{ fontSize: '13px' }}>{t.emptyCart}</p>
                                </div>
                            ) : (
                                <div>
                                    {cart.map(item => (
                                        <div key={item.productId} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: 600, flex: 1, paddingRight: '8px' }}>{item.productName}</span>
                                                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)', flexShrink: 0 }} onClick={() => removeFromCart(item.productId)}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => updateQty(item.productId, item.quantity - 1)}>
                                                        <Minus size={12} />
                                                    </button>
                                                    <span style={{ fontSize: '14px', fontWeight: 700, minWidth: '24px', textAlign: 'center' }}>{item.quantity}</span>
                                                    <button className="btn btn-secondary btn-sm btn-icon" onClick={() => updateQty(item.productId, item.quantity + 1)}>
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                                <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{formatCurrency(item.total)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                                {/* Discount */}
                                <div className="form-group">
                                    <label className="form-label">{t.discount}</label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        min={0}
                                        value={discount === 0 ? '' : discount}
                                        onChange={e => setDiscount(e.target.value === '' ? 0 : Number(e.target.value))}
                                        onFocus={e => e.target.select()}
                                        placeholder="0"
                                    />
                                </div>

                                {/* Payment Mode */}
                                <div className="form-group">
                                    <label className="form-label">{t.paymentMode}</label>
                                    <select className="form-select" value={paymentMode} onChange={e => setPaymentMode(e.target.value as PaymentMode)}>
                                        <option value="cash">{t.cash}</option>
                                        <option value="advance" disabled={totalBalance <= 0}>{t.advanceDeduction} ({formatCurrency(totalBalance)})</option>
                                    </select>
                                </div>

                                {/* Notes */}
                                <div className="form-group">
                                    <label className="form-label">{t.notes}</label>
                                    <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>

                                {/* Budget / Provided Amount */}
                                <div className="form-group" style={{ background: 'var(--primary-light)', padding: '12px', borderRadius: 'var(--radius)', marginBottom: '12px' }}>
                                    <label className="form-label" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                                        {t.totalAmountProvided}
                                    </label>
                                    <input
                                        className="form-input"
                                        type="number"
                                        placeholder="0"
                                        value={budget === 0 ? '' : budget}
                                        onChange={e => setBudget(Number(e.target.value))}
                                        onFocus={e => e.target.select()}
                                        style={{ border: '2px solid var(--primary)' }}
                                    />
                                </div>

                                {/* Totals */}
                                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>{t.subtotal}</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    {discount > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{t.discount}</span>
                                            <span style={{ color: 'var(--danger)' }}>-{formatCurrency(discount)}</span>
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                                        <span>{t.grandTotal}</span>
                                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(grandTotal)}</span>
                                    </div>
                                    {budget > 0 && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 900, marginTop: '8px', padding: '8px', background: 'var(--surface)', borderRadius: '4px', border: '2px dashed var(--primary)' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>{t.balance}</span>
                                            <span style={{ color: budget < grandTotal ? 'var(--danger)' : 'var(--success)' }}>
                                                {formatCurrency(budget - grandTotal)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button
                                    className="btn btn-primary w-full btn-lg"
                                    style={{ width: '100%', justifyContent: 'center' }}
                                    onClick={handleCompleteSale}
                                    disabled={isLimitReached}
                                >
                                    <CheckCircle size={18} />
                                    {t.completeSale}
                                </button>
                            </div>
                        )}
                    </div>
                </div>


                {/* Sale Success Modal */}
                {saleSuccess && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header" style={{ background: 'var(--primary-light)', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                                <button className="btn btn-ghost btn-icon" style={{ position: 'absolute', top: '12px', right: '12px' }} onClick={() => setSaleSuccess(null)}><X size={18} /></button>

                                {settings.logo ? (
                                    <img src={settings.logo} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain', marginBottom: '12px' }} />
                                ) : (
                                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🐄</div>
                                )}

                                <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>{settings.shopName}</h2>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>{settings.address}</p>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)' }}>
                                    <CheckCircle size={20} />
                                    <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{t.saleCompleted}</h3>
                                </div>
                            </div>
                            <div className="modal-body">
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.invoiceNumber}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--primary)' }}>{saleSuccess.id}</div>
                                </div>
                                <div style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: '16px' }}>
                                    {saleSuccess.items.map(item => (
                                        <div key={item.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                                            <span>{item.productName} × {item.quantity}</span>
                                            <span style={{ fontWeight: 600 }}>{formatCurrency(item.total)}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px' }}>
                                        <span>{t.grandTotal}</span>
                                        <span style={{ color: 'var(--primary)' }}>{formatCurrency(saleSuccess.totalAmount)}</span>
                                    </div>
                                    {saleSuccess.advanceUsed && (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)', marginTop: '4px' }}>
                                            <span>{t.advanceUsed}</span>
                                            <span>-{formatCurrency(saleSuccess.advanceUsed)}</span>
                                        </div>
                                    )}
                                    {saleSuccess.balanceDue && saleSuccess.balanceDue > 0 ? (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--danger)', marginTop: '4px', fontWeight: 700 }}>
                                            <span>{t.balanceDue}</span>
                                            <span>{formatCurrency(saleSuccess.balanceDue)}</span>
                                        </div>
                                    ) : null}
                                </div>
                                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <span className={`badge ${saleSuccess.paymentMode === 'cash' ? 'badge-blue' : 'badge-green'}`} style={{ fontSize: '13px', padding: '6px 12px' }}>
                                        {saleSuccess.paymentMode === 'cash' ? t.cash : t.advanceDeduction}
                                    </span>
                                </div>
                                {selectedCustomer?.whatsapp && (
                                    <button
                                        className="btn btn-secondary w-full"
                                        style={{ marginTop: '16px', color: '#25D366', borderColor: '#25D366' }}
                                        onClick={() => {
                                            const msg = parseTemplate(settings.whatsappInvoiceTemplate, {
                                                name: selectedCustomer?.name || '',
                                                invoice: saleSuccess.id,
                                                total: saleSuccess.totalAmount,
                                                advance: saleSuccess.advanceUsed || 0,
                                                balance: saleSuccess.balanceDue || 0
                                            });
                                            window.open(generateWhatsAppLink(selectedCustomer?.whatsapp || '', msg), '_blank');
                                        }}
                                    >
                                        <Send size={16} /> {t.sendToWhatsapp}
                                    </button>
                                )}

                                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        {saleSuccess.validationMethod === 'fingerprint' ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Fingerprint size={30} style={{ color: 'var(--primary)', marginBottom: '4px' }} />
                                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.fingerprint}</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ width: '100px', borderBottom: '1px solid var(--border)', marginBottom: '4px', height: '30px' }}>
                                                    {saleSuccess.signature && <img src={saleSuccess.signature} alt="sig" style={{ maxHeight: '100%', maxWidth: '100%' }} />}
                                                </div>
                                                <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.customerSignature}</div>
                                            </>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                            {t.generatedOn}: {formatDate(new Date().toISOString())} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ width: '100px', borderBottom: '1px solid var(--border)', marginBottom: '4px', height: '30px' }}></div>
                                            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{t.authorizedSignature}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setSaleSuccess(null)}>{t.close}</button>
                                <button className="btn btn-primary" onClick={() => { setSaleSuccess(null); window.location.href = '/invoices'; }}>
                                    {t.printInvoice}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {showCustomerDetails && selectedCustomer && (
                    <CustomerDetailsModal
                        t={t}
                        language={language}
                        customer={selectedCustomer}
                        transactions={transactions}
                        advances={advances}
                        onClose={() => setShowCustomerDetails(false)}
                    />
                )}

                {showSignaturePad && (
                    <SignaturePad
                        t={t}
                        onSave={(sig, method) => handleCheckout(sig, method)}
                        onCancel={() => setShowSignaturePad(false)}
                    />
                )}
            </div>
        </div>
    );
}
