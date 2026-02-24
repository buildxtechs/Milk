'use client';

import { useState } from 'react';
import { useStore, useProducts, useStockInwards } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { StockInward } from '@/lib/types';
import { generateStockInwardId, formatDate, formatCurrency, isLowStock, isExpiringSoon, todayStr } from '@/lib/utils';
import { Plus, Search, AlertTriangle, Archive, X, Package } from 'lucide-react';

export default function StockPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const products = useProducts();
    const stockInwards = useStockInwards();
    const addStockInward = useStore((s) => s.addStockInward);
    const updateStock = useStore((s) => s.updateStock);
    const updateProduct = useStore((s) => s.updateProduct);

    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'stock' | 'inward'>('stock');
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const filtered = products.filter(p =>
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        p.nameTa.includes(search) ||
        p.supplierName.toLowerCase().includes(search.toLowerCase())
    );

    const lowStockProducts = products.filter(isLowStock);
    const expiringProducts = products.filter(p => isExpiringSoon(p.expiryDate));
    const totalStockValue = products.reduce((s, p) => s + p.stockQuantity * p.costPrice, 0);

    const handleSave = (data: Omit<StockInward, 'id' | 'createdAt'>) => {
        addStockInward({ ...data, id: generateStockInwardId(), createdAt: new Date().toISOString() });
        updateStock(data.productId, data.quantity);
        // Update cost price if changed
        updateProduct(data.productId, { costPrice: data.costPrice });
        showToast(t.stockUpdated);
        setShowModal(false);
    };

    const getCategoryBadge = (cat: string) => {
        const map: Record<string, string> = {
            theevanam: 'badge-green', medical: 'badge-red', supplements: 'badge-blue',
            accessories: 'badge-orange', other: 'badge-gray'
        };
        return map[cat] || 'badge-gray';
    };

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.stock}</h1>
                    <p className="page-subtitle">{products.length} {language === 'ta' ? 'மொத்த பொருட்கள்' : 'total products'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> {t.addStock}
                </button>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
                <div className="stat-card">
                    <div className="stat-icon blue"><Archive size={22} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த பொருட்கள்' : 'Total Products'}</div>
                        <div className="stat-value">{products.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Package size={22} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'இருப்பு மதிப்பு' : 'Stock Value'}</div>
                        <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalStockValue)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><AlertTriangle size={22} /></div>
                    <div>
                        <div className="stat-label">{t.lowStockItems}</div>
                        <div className="stat-value">{lowStockProducts.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon yellow"><AlertTriangle size={22} /></div>
                    <div>
                        <div className="stat-label">{t.expiryAlert}</div>
                        <div className="stat-value">{expiringProducts.length}</div>
                    </div>
                </div>
            </div>

            {/* Alerts */}
            {lowStockProducts.length > 0 && (
                <div className="alert alert-warning">
                    <AlertTriangle size={16} />
                    {t.lowStockItems}: {lowStockProducts.map(p => language === 'ta' ? p.nameTa || p.nameEn : p.nameEn).join(', ')}
                </div>
            )}
            {expiringProducts.length > 0 && (
                <div className="alert alert-error">
                    <AlertTriangle size={16} />
                    {t.expiryAlert}: {expiringProducts.map(p => `${language === 'ta' ? p.nameTa || p.nameEn : p.nameEn} (${formatDate(p.expiryDate!)})`).join(', ')}
                </div>
            )}

            <div className="tabs">
                <div className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                    {t.stockLevel}
                </div>
                <div className={`tab ${activeTab === 'inward' ? 'active' : ''}`} onClick={() => setActiveTab('inward')}>
                    {t.stockInward}
                </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {activeTab === 'stock' && (
                <div className="card">
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{t.productName}</th>
                                    <th>{t.category}</th>
                                    <th>{t.stockQuantity}</th>
                                    <th>{t.minStockAlert}</th>
                                    <th>{t.costPrice}</th>
                                    <th>{t.sellingPrice}</th>
                                    <th>{t.expiryDate}</th>
                                    <th>{t.status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            <Archive size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                            {t.noData}
                                        </td>
                                    </tr>
                                ) : (
                                    filtered.map(p => {
                                        const low = isLowStock(p);
                                        const expiring = isExpiringSoon(p.expiryDate);
                                        return (
                                            <tr key={p.id} style={{ background: low ? 'rgba(239,68,68,0.03)' : undefined }}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}>{p.id}</td>
                                                <td style={{ fontWeight: 600 }}>{language === 'ta' ? p.nameTa || p.nameEn : p.nameEn}</td>
                                                <td><span className={`badge ${getCategoryBadge(p.category)}`}>{p.category}</span></td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: 700, color: low ? 'var(--danger)' : 'var(--text-primary)' }}>
                                                            {p.stockQuantity} {p.unit}
                                                        </span>
                                                        {low && <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />}
                                                    </div>
                                                    <div className="progress-bar" style={{ marginTop: '4px', width: '80px' }}>
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: `${Math.min(100, (p.stockQuantity / Math.max(p.minStockAlert * 3, 1)) * 100)}%`,
                                                                background: low ? 'var(--danger)' : 'var(--primary)'
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td>{p.minStockAlert}</td>
                                                <td>{formatCurrency(p.costPrice)}</td>
                                                <td style={{ fontWeight: 600 }}>{formatCurrency(p.sellingPrice)}</td>
                                                <td>
                                                    {p.expiryDate ? (
                                                        <span style={{ color: expiring ? 'var(--danger)' : 'var(--text-primary)', fontWeight: expiring ? 600 : 400 }}>
                                                            {formatDate(p.expiryDate)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${p.stockQuantity === 0 ? 'badge-red' : low ? 'badge-yellow' : 'badge-green'}`}>
                                                        {p.stockQuantity === 0 ? t.outOfStock : low ? t.lowStock : t.inStock}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'inward' && (
                <div className="card">
                    <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>{t.date}</th>
                                    <th>{t.productName}</th>
                                    <th>{t.quantity}</th>
                                    <th>{t.costPrice}</th>
                                    <th>{t.supplierName}</th>
                                    <th>{t.invoiceNo}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stockInwards.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            <Archive size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                            {t.noData}
                                        </td>
                                    </tr>
                                ) : (
                                    stockInwards.map(s => {
                                        const product = products.find(p => p.id === s.productId);
                                        return (
                                            <tr key={s.id}>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)' }}>{s.id}</td>
                                                <td>{formatDate(s.date)}</td>
                                                <td style={{ fontWeight: 600 }}>{product ? (language === 'ta' ? product.nameTa || product.nameEn : product.nameEn) : s.productId}</td>
                                                <td style={{ fontWeight: 600 }}>{s.quantity}</td>
                                                <td>{formatCurrency(s.costPrice)}</td>
                                                <td>{s.supplierName}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{s.invoiceNumber || '-'}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <StockInwardModal
                    t={t}
                    language={language}
                    products={products}
                    onSave={handleSave}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    );
}

function StockInwardModal({ t, language, products, onSave, onClose }: {
    t: Translations;
    language: string;
    products: ReturnType<typeof useProducts>;
    onSave: (data: Omit<StockInward, 'id' | 'createdAt'>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        productId: products[0]?.id || '',
        date: todayStr(),
        quantity: 0,
        costPrice: products[0]?.costPrice || 0,
        supplierName: products[0]?.supplierName || '',
        invoiceNumber: '',
        notes: '',
    });

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === productId);
        setForm(f => ({
            ...f,
            productId,
            costPrice: product?.costPrice || 0,
            supplierName: product?.supplierName || '',
        }));
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h3 className="modal-title">{t.addStock}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">{t.productName} *</label>
                            <select className="form-select" required value={form.productId} onChange={e => handleProductChange(e.target.value)}>
                                {products.map(p => <option key={p.id} value={p.id}>{language === 'ta' ? p.nameTa || p.nameEn : p.nameEn} ({p.id})</option>)}
                            </select>
                        </div>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.date} *</label>
                                <input className="form-input" type="date" required value={form.date} onChange={e => set('date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.quantity} *</label>
                                <input className="form-input" type="number" min={1} required value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.costPrice} (₹)</label>
                                <input className="form-input" type="number" step="0.01" min={0} value={form.costPrice} onChange={e => set('costPrice', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.supplierName}</label>
                                <input className="form-input" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.invoiceNo}</label>
                                <input className="form-input" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t.notes}</label>
                            <textarea className="form-textarea" value={form.notes} onChange={e => set('notes', e.target.value)} />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>{t.cancel}</button>
                        <button type="submit" className="btn btn-primary">{t.save}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
