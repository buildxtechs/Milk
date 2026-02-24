'use client';

import { useState } from 'react';
import { useStore, useProducts } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Product, ProductCategory, StockUnit } from '@/lib/types';
import { generateProductId, formatDate, formatCurrency, isLowStock, isExpiringSoon } from '@/lib/utils';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Package, X } from 'lucide-react';

const CATEGORIES: ProductCategory[] = ['theevanam', 'medical', 'supplements', 'accessories', 'other'];
const UNITS: StockUnit[] = ['kg', 'packet', 'bottle', 'liter', 'piece', 'bag'];

export default function ProductsPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const products = useProducts();
    const addProduct = useStore((s) => s.addProduct);
    const updateProduct = useStore((s) => s.updateProduct);
    const deleteProduct = useStore((s) => s.deleteProduct);

    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<ProductCategory | 'all'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    const filtered = products.filter(p => {
        const matchSearch = p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
            p.nameTa.includes(search) ||
            p.supplierName.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
        return matchSearch && matchCat;
    });

    const getCategoryLabel = (cat: ProductCategory) => {
        const map: Record<ProductCategory, string> = {
            theevanam: t.theevanamFeed,
            medical: t.medical,
            supplements: t.supplements,
            accessories: t.accessories,
            other: t.other,
        };
        return map[cat];
    };

    const getCategoryBadge = (cat: ProductCategory) => {
        const map: Record<ProductCategory, string> = {
            theevanam: 'badge-green',
            medical: 'badge-red',
            supplements: 'badge-blue',
            accessories: 'badge-orange',
            other: 'badge-gray',
        };
        return map[cat];
    };

    const handleSave = (data: Omit<Product, 'id' | 'createdAt'>) => {
        if (editingProduct) {
            updateProduct(editingProduct.id, data);
        } else {
            addProduct({ ...data, id: generateProductId(products.map(p => p.id)), createdAt: new Date().toISOString() });
        }
        showToast(t.savedSuccess);
        setShowModal(false);
        setEditingProduct(null);
    };

    const handleDelete = (id: string) => {
        if (confirm(t.deleteConfirm)) { deleteProduct(id); showToast(t.deletedSuccess); }
    };

    const lowStockProducts = products.filter(isLowStock);
    const expiringProducts = products.filter(p => isExpiringSoon(p.expiryDate));

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.productList}</h1>
                    <p className="page-subtitle">{products.length} {language === 'ta' ? 'மொத்த பொருட்கள்' : 'total products'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowModal(true); }}>
                    <Plus size={16} /> {t.addProduct}
                </button>
            </div>

            {/* Alerts */}
            {lowStockProducts.length > 0 && (
                <div className="alert alert-warning">
                    <AlertTriangle size={16} />
                    {lowStockProducts.length} {language === 'ta' ? 'பொருட்கள் குறைந்த இருப்பில் உள்ளன' : 'products are low on stock'}:
                    {lowStockProducts.map(p => language === 'ta' ? p.nameTa : p.nameEn).join(', ')}
                </div>
            )}
            {expiringProducts.length > 0 && (
                <div className="alert alert-error">
                    <AlertTriangle size={16} />
                    {expiringProducts.length} {language === 'ta' ? 'பொருட்கள் விரைவில் காலாவதியாகும்' : 'products expiring soon'}
                </div>
            )}

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search} ${t.products}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as ProductCategory | 'all')}>
                    <option value="all">{t.all}</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{getCategoryLabel(c)}</option>)}
                </select>
            </div>

            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.productName}</th>
                                <th>{t.category}</th>
                                <th>{t.sellingPrice}</th>
                                <th>{t.unit}</th>
                                <th>{t.stockQuantity}</th>
                                <th>{t.supplierName}</th>
                                <th>{t.expiryDate}</th>
                                <th>{t.status}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Package size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => {
                                    const low = isLowStock(p);
                                    const expiring = isExpiringSoon(p.expiryDate);
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{language === 'ta' ? p.nameTa : p.nameEn}</div>
                                                {language === 'ta' && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.nameEn}</div>}
                                            </td>
                                            <td><span className={`badge ${getCategoryBadge(p.category)}`}>{getCategoryLabel(p.category)}</span></td>
                                            <td style={{ fontWeight: 600 }}>{formatCurrency(p.sellingPrice)}</td>
                                            <td>{p.unit}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 600, color: low ? 'var(--danger)' : 'var(--text-primary)' }}>{p.stockQuantity}</span>
                                                    {low && <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />}
                                                </div>
                                            </td>
                                            <td>{p.supplierName}</td>
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
                                            <td>
                                                <div style={{ display: 'flex', gap: '4px' }}>
                                                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingProduct(p); setShowModal(true); }}><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(p.id)}><Trash2 size={14} /></button>
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

            {showModal && (
                <ProductModal
                    t={t}
                    language={language}
                    product={editingProduct}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingProduct(null); }}
                />
            )}
        </div>
    );
}

function ProductModal({
    t, language, product, onSave, onClose
}: {
    t: Translations;
    language: string;
    product: Product | null;
    onSave: (data: Omit<Product, 'id' | 'createdAt'>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        nameEn: product?.nameEn || '',
        nameTa: product?.nameTa || '',
        category: (product?.category || 'theevanam') as ProductCategory,
        costPrice: product?.costPrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        unit: (product?.unit || 'kg') as StockUnit,
        stockQuantity: product?.stockQuantity || 0,
        minStockAlert: product?.minStockAlert || 5,
        supplierName: product?.supplierName || '',
        batchNumber: product?.batchNumber || '',
        expiryDate: product?.expiryDate || '',
    });

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3 className="modal-title">{product ? t.editProduct : t.addProduct}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.productName} (English) *</label>
                                <input className="form-input" required value={form.nameEn} onChange={e => set('nameEn', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.productName} (தமிழ்)</label>
                                <input className="form-input" value={form.nameTa} onChange={e => set('nameTa', e.target.value)} style={{ fontFamily: 'Noto Sans Tamil, sans-serif' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.category} *</label>
                                <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c === 'theevanam' ? t.theevanamFeed : c === 'medical' ? t.medical : c === 'supplements' ? t.supplements : c === 'accessories' ? t.accessories : t.other}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.unit} *</label>
                                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.costPrice} (₹) *</label>
                                <input className="form-input" type="number" step="0.01" min={0} required value={form.costPrice} onChange={e => set('costPrice', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.sellingPrice} (₹) *</label>
                                <input className="form-input" type="number" step="0.01" min={0} required value={form.sellingPrice} onChange={e => set('sellingPrice', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.stockQuantity} *</label>
                                <input className="form-input" type="number" min={0} required value={form.stockQuantity} onChange={e => set('stockQuantity', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.minStockAlert}</label>
                                <input className="form-input" type="number" min={0} value={form.minStockAlert} onChange={e => set('minStockAlert', Number(e.target.value))} onFocus={e => e.target.select()} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.supplierName}</label>
                                <input className="form-input" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.batchNumber}</label>
                                <input className="form-input" value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.expiryDate} ({language === 'ta' ? 'மருத்துவத்திற்கு' : 'for Medical'})</label>
                                <input className="form-input" type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
                            </div>
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
