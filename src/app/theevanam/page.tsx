'use client';

import { useState } from 'react';
import { useStore, useProducts } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Product } from '@/lib/types';
import { generateProductId, formatDate, formatCurrency, isLowStock, isExpiringSoon } from '@/lib/utils';
import { Plus, Search, Edit2, Trash2, AlertTriangle, Leaf, X, TrendingUp, Package } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function TheevanamPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const products = useProducts();
    const addProduct = useStore((s) => s.addProduct);
    const updateProduct = useStore((s) => s.updateProduct);
    const deleteProduct = useStore((s) => s.deleteProduct);

    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    // Only Theevanam (Cattle Feed) products
    const theevanamProducts = products.filter(p => p.category === 'theevanam');
    const filtered = theevanamProducts.filter(p =>
        p.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        p.nameTa.includes(search) ||
        p.supplierName.toLowerCase().includes(search.toLowerCase())
    );

    const totalStock = theevanamProducts.reduce((s, p) => s + p.stockQuantity, 0);
    const totalValue = theevanamProducts.reduce((s, p) => s + p.stockQuantity * p.sellingPrice, 0);
    const lowStockItems = theevanamProducts.filter(isLowStock);

    const chartData = theevanamProducts.slice(0, 8).map(p => ({
        name: (language === 'ta' ? p.nameTa : p.nameEn).slice(0, 12),
        stock: p.stockQuantity,
        value: p.stockQuantity * p.sellingPrice,
    }));

    const handleSave = (data: Omit<Product, 'id' | 'createdAt'>) => {
        const productData = { ...data, category: 'theevanam' as const };
        if (editingProduct) {
            updateProduct(editingProduct.id, productData);
        } else {
            addProduct({ ...productData, id: generateProductId(products.map(p => p.id)), createdAt: new Date().toISOString() });
        }
        showToast(t.savedSuccess);
        setShowModal(false);
        setEditingProduct(null);
    };

    const handleDelete = (id: string) => {
        if (confirm(t.deleteConfirm)) { deleteProduct(id); showToast(t.deletedSuccess); }
    };

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Leaf size={24} style={{ color: 'var(--primary)' }} />
                        {t.theevanam}
                    </h1>
                    <p className="page-subtitle">{language === 'ta' ? 'கால்நடை தீவன மேலாண்மை' : 'Cattle Feed Management'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => { setEditingProduct(null); setShowModal(true); }}>
                    <Plus size={16} /> {language === 'ta' ? 'தீவனம் சேர்' : 'Add Theevanam'}
                </button>
            </div>

            {/* Stats */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-icon green"><Leaf size={22} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த பொருட்கள்' : 'Total Products'}</div>
                        <div className="stat-value">{theevanamProducts.length}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={22} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'மொத்த இருப்பு' : 'Total Stock'}</div>
                        <div className="stat-value">{totalStock}</div>
                        <div className="stat-sub">{language === 'ta' ? 'அலகுகள்' : 'units'}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><TrendingUp size={22} /></div>
                    <div>
                        <div className="stat-label">{language === 'ta' ? 'இருப்பு மதிப்பு' : 'Stock Value'}</div>
                        <div className="stat-value" style={{ fontSize: '18px' }}>{formatCurrency(totalValue)}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon red"><AlertTriangle size={22} /></div>
                    <div>
                        <div className="stat-label">{t.lowStockAlert}</div>
                        <div className="stat-value">{lowStockItems.length}</div>
                        <div className="stat-sub">{language === 'ta' ? 'பொருட்கள்' : 'products'}</div>
                    </div>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockItems.length > 0 && (
                <div className="alert alert-warning">
                    <AlertTriangle size={16} />
                    {language === 'ta' ? 'குறைந்த இருப்பு' : 'Low Stock'}: {lowStockItems.map(p => language === 'ta' ? p.nameTa || p.nameEn : p.nameEn).join(', ')}
                </div>
            )}

            {/* Chart */}
            {chartData.length > 0 && (
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <span className="card-title">{language === 'ta' ? 'தீவன இருப்பு நிலை' : 'Theevanam Stock Levels'}</span>
                    </div>
                    <div className="card-body">
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip />
                                <Bar dataKey="stock" fill="#16a34a" radius={[4, 4, 0, 0]} name={language === 'ta' ? 'இருப்பு' : 'Stock'} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="search-bar">
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input placeholder={`${t.search} ${t.theevanam}...`} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            {/* Table */}
            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.productName}</th>
                                <th>{t.costPrice}</th>
                                <th>{t.sellingPrice}</th>
                                <th>{t.unit}</th>
                                <th>{t.stockQuantity}</th>
                                <th>{t.minStockAlert}</th>
                                <th>{t.supplierName}</th>
                                <th>{t.status}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Leaf size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {language === 'ta' ? 'தீவன பொருட்கள் இல்லை. புதிய பொருளை சேர்க்கவும்.' : 'No Theevanam products. Add your first product.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(p => {
                                    const low = isLowStock(p);
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{language === 'ta' ? (p.nameTa || p.nameEn) : p.nameEn}</div>
                                                {language === 'ta' && p.nameTa && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.nameEn}</div>}
                                            </td>
                                            <td>{formatCurrency(p.costPrice)}</td>
                                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(p.sellingPrice)}</td>
                                            <td>{p.unit}</td>
                                            <td>
                                                <span style={{ fontWeight: 700, color: low ? 'var(--danger)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {p.stockQuantity}
                                                    {low && <AlertTriangle size={12} style={{ color: 'var(--danger)' }} />}
                                                </span>
                                            </td>
                                            <td>{p.minStockAlert}</td>
                                            <td>{p.supplierName || '-'}</td>
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
                <TheevanamModal
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

function TheevanamModal({ t, language, product, onSave, onClose }: {
    t: Translations;
    language: string;
    product: Product | null;
    onSave: (data: Omit<Product, 'id' | 'createdAt'>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        nameEn: product?.nameEn || '',
        nameTa: product?.nameTa || '',
        category: 'theevanam' as const,
        costPrice: product?.costPrice || 0,
        sellingPrice: product?.sellingPrice || 0,
        unit: (product?.unit || 'kg') as 'kg' | 'packet' | 'bottle' | 'liter' | 'piece',
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
                    <h3 className="modal-title">
                        <Leaf size={18} style={{ display: 'inline', marginRight: '8px', color: 'var(--primary)' }} />
                        {product ? (language === 'ta' ? 'தீவனம் திருத்து' : 'Edit Theevanam') : (language === 'ta' ? 'தீவனம் சேர்' : 'Add Theevanam')}
                    </h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.productName} (English) *</label>
                                <input className="form-input" required value={form.nameEn} onChange={e => set('nameEn', e.target.value)} placeholder="e.g. Cattle Feed Premium" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.productName} (தமிழ்)</label>
                                <input className="form-input" value={form.nameTa} onChange={e => set('nameTa', e.target.value)} style={{ fontFamily: 'Noto Sans Tamil, sans-serif' }} placeholder="எ.கா. கால்நடை தீவனம்" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.unit} *</label>
                                <select className="form-select" value={form.unit} onChange={e => set('unit', e.target.value)}>
                                    <option value="kg">kg</option>
                                    <option value="packet">packet</option>
                                    <option value="liter">liter</option>
                                    <option value="piece">piece</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.costPrice} (₹) *</label>
                                <input className="form-input" type="number" step="0.01" min={0} required value={form.costPrice} onChange={e => set('costPrice', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.sellingPrice} (₹) *</label>
                                <input className="form-input" type="number" step="0.01" min={0} required value={form.sellingPrice} onChange={e => set('sellingPrice', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.stockQuantity} *</label>
                                <input className="form-input" type="number" min={0} required value={form.stockQuantity} onChange={e => set('stockQuantity', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.minStockAlert}</label>
                                <input className="form-input" type="number" min={0} value={form.minStockAlert} onChange={e => set('minStockAlert', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.supplierName}</label>
                                <input className="form-input" value={form.supplierName} onChange={e => set('supplierName', e.target.value)} />
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
