'use client';

import { useState } from 'react';
import { useStore, useCustomers, useTransactions, useAdvances } from '@/lib/store';
import { translations, Translations } from '@/lib/translations';
import { Customer, CattleType, Language } from '@/lib/types';
import { generateCustomerId, formatDate, generateAdvanceId, todayStr } from '@/lib/utils';
import { Plus, Search, Edit2, Trash2, Eye, X, Users, Phone, Wallet, Upload, Download } from 'lucide-react';
import CustomerDetailsModal from '@/components/customers/CustomerDetailsModal';
import { useRouter } from 'next/navigation';
import { downloadCustomerTemplate } from '@/lib/excel-template';


export default function CustomersPage() {
    const language = useStore((s) => s.language);
    const t = translations[language];
    const customers = useCustomers();
    const transactions = useTransactions();
    const advances = useAdvances();
    const addCustomer = useStore((s) => s.addCustomer);
    const updateCustomer = useStore((s) => s.updateCustomer);
    const deleteCustomer = useStore((s) => s.deleteCustomer);
    const addAdvance = useStore((s) => s.addAdvance);
    const updateAdvance = useStore((s) => s.updateAdvance);
    const router = useRouter();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(''), 3000);
    };

    const handleSave = (data: Omit<Customer, 'id' | 'createdAt'>) => {
        if (editingCustomer) {
            updateCustomer(editingCustomer.id, data);
            showToast(t.savedSuccess);
        } else {
            const id = generateCustomerId(customers.map(c => c.id));
            addCustomer({
                ...data,
                id,
                createdAt: new Date().toISOString(),
            });
            showToast(t.savedSuccess);
        }
        setShowModal(false);
        setEditingCustomer(null);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const XLSX = await import('xlsx');
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];


                let addedCount = 0;
                let advanceCount = 0;
                let currentExistingIds = customers.map(c => c.id);
                let currentAdvanceIds = advances.map(a => a.id);

                data.forEach((row) => {
                    const id = String(row['Member Number'] || row['Member ID'] || row.id || generateCustomerId(currentExistingIds));
                    const newCustomer: Customer = {
                        id,
                        name: row.Name || row.name || 'Unknown',
                        village: row.Village || row.village || '',
                        mobile: String(row.Mobile || row.mobile || ''),
                        whatsapp: String(row.Whatsapp || row.whatsapp || ''),
                        languagePreference: (row['Language Preference'] || row.language || 'ta') as Language,
                        numberOfCattle: Number(row['Number of Cattle'] || row.count || 1),
                        cattleType: (row['Cattle Type (cow, buffalo, or mixed)'] || row['Cattle Type'] || row.type || 'cow').toLowerCase() as CattleType,
                        bankName: row['Bank Name'] || row.bank || '',
                        accountNumber: String(row['Account Number'] || row.account || ''),
                        ifscCode: row['IFSC Code'] || row.ifsc || '',
                        status: 'active',
                        createdAt: new Date().toISOString(),
                    };
                    addCustomer(newCustomer);
                    currentExistingIds.push(id);
                    addedCount++;

                    // Handle Finance Data (Amount Provided)
                    const amountProvided = Number(row['Amount Provided'] || row.amount || 0);
                    if (amountProvided > 0) {
                        const advId = generateAdvanceId(currentAdvanceIds);
                        let advDate = row.Date || row.date || todayStr();

                        // Handle Excel numeric date if necessary
                        if (typeof advDate === 'number') {
                            const date = new Date((advDate - (25567 + 1)) * 86400 * 1000);
                            advDate = date.toISOString().split('T')[0];
                        }

                        addAdvance({
                            id: advId,
                            customerId: id,
                            amount: amountProvided,
                            remainingBalance: amountProvided,
                            date: String(advDate),
                            notes: 'Imported via Excel',
                            createdAt: new Date().toISOString(),
                        });
                        currentAdvanceIds.push(advId);
                        advanceCount++;
                    }
                });

                showToast(`${addedCount} customers and ${advanceCount} finance records imported`);
            } catch (err) {
                console.error(err);
                showToast('Error parsing Excel file');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = ''; // Reset input
    };

    const handleDelete = (id: string) => {
        if (confirm(t.deleteConfirm)) {
            deleteCustomer(id);
            showToast(t.deletedSuccess);
        }
    };

    const filtered = customers.filter(c => {
        const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.village.toLowerCase().includes(search.toLowerCase()) ||
            c.mobile.includes(search) ||
            c.id.toLowerCase().includes(search.toLowerCase());
        const matchStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchSearch && matchStatus;
    }).sort((a, b) => {
        const balanceA = advances.filter(adv => adv.customerId === a.id).reduce((s, adv) => s + adv.remainingBalance, 0);
        const balanceB = advances.filter(adv => adv.customerId === b.id).reduce((s, adv) => s + adv.remainingBalance, 0);

        if (balanceA === 0 && balanceB !== 0) return 1;
        if (balanceA !== 0 && balanceB === 0) return -1;
        return balanceB - balanceA; // Descending by amount
    });

    return (
        <div>
            {toast && <div className="alert alert-success" style={{ position: 'fixed', top: '80px', right: '20px', zIndex: 2000, width: 'auto' }}>{toast}</div>}

            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t.customerList}</h1>
                    <p className="page-subtitle">{customers.length} {language === 'ta' ? 'மொத்த வாடிக்கையாளர்கள்' : 'total customers'}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="file"
                        id="excel-upload"
                        style={{ display: 'none' }}
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileUpload}
                    />
                    <button className="btn btn-secondary" onClick={() => document.getElementById('excel-upload')?.click()}>
                        <Upload size={16} /> {language === 'ta' ? 'எக்செல் பதிவேற்று' : 'Upload Excel'}
                    </button>
                    <button className="btn btn-secondary" onClick={downloadCustomerTemplate}>
                        <Download size={16} /> {language === 'ta' ? 'டெம்ப்ளேட் தரவிறக்கம்' : 'Download Template'}
                    </button>
                    <button className="btn btn-primary" onClick={() => { setEditingCustomer(null); setShowModal(true); }}>
                        <Plus size={16} /> {t.addCustomer2}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
                    <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                        placeholder={`${t.search} ${t.customers}...`}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select className="form-select" style={{ width: 'auto' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}>
                    <option value="all">{t.all}</option>
                    <option value="active">{t.active}</option>
                    <option value="inactive">{t.inactive}</option>
                </select>
            </div>

            {/* Table */}
            <div className="card">
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                    <table>
                        <thead>
                            <tr>
                                <th>{t.memberNumber}</th>
                                <th>{t.fullName}</th>
                                <th>{t.village}</th>
                                <th>{t.mobile}</th>
                                <th>{t.cattleType}</th>
                                <th>{t.numberOfCattle}</th>
                                <th>{language === 'ta' ? 'வழங்கப்பட்ட தொகை' : 'Amount Provided'}</th>
                                <th>{t.status}</th>
                                <th>{t.actions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                        <Users size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                                        {t.noData}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((c, index) => (
                                    <tr key={c.id}>
                                        <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: 'var(--primary)' }}>{c.id}</td>
                                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                                        <td>{c.village}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                                                {c.mobile}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge badge-green">
                                                {c.cattleType === 'cow' ? t.cow : c.cattleType === 'buffalo' ? t.buffalo : t.mixed}
                                            </span>
                                        </td>
                                        <td>{c.numberOfCattle}</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>₹</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    data-index={index}
                                                    data-field="amount-provided"
                                                    style={{ width: '100px', height: '32px', padding: '0 8px', fontSize: '13px' }}
                                                    defaultValue={advances.filter(a => a.customerId === c.id).reduce((sum, a) => sum + a.amount, 0)}
                                                    onBlur={(e) => {
                                                        const newVal = Number(e.target.value);
                                                        const customerAdvances = advances.filter(a => a.customerId === c.id);

                                                        if (customerAdvances.length > 0) {
                                                            // For simplicity in this direct edit, we update the first advance 
                                                            // or adjust the first one to match the total if they want to manage it this way.
                                                            // Usually, "Amount Provided" in this context refers to their initial/total credit.
                                                            const firstAdv = customerAdvances[0];
                                                            if (firstAdv.amount !== newVal) {
                                                                const diff = newVal - firstAdv.amount;
                                                                updateAdvance(firstAdv.id, {
                                                                    amount: newVal,
                                                                    remainingBalance: Math.max(0, firstAdv.remainingBalance + diff)
                                                                });
                                                            }
                                                        } else if (newVal > 0) {
                                                            const newAdvId = generateAdvanceId(advances.map(a => a.id));
                                                            addAdvance({
                                                                id: newAdvId,
                                                                customerId: c.id,
                                                                date: todayStr(),
                                                                amount: newVal,
                                                                remainingBalance: newVal,
                                                                monthlyDeduction: 0,
                                                                notes: 'Added via inline edit',
                                                                createdAt: new Date().toISOString()
                                                            });
                                                        }
                                                    }}
                                                    onKeyDown={(e: any) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            const nextEl = document.querySelector(`input[data-field="amount-provided"][data-index="${index + 1}"]`) as HTMLInputElement;
                                                            if (nextEl) {
                                                                nextEl.focus();
                                                                nextEl.select();
                                                            } else {
                                                                e.target.blur();
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${c.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                                                {c.status === 'active' ? t.active : t.inactive}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setViewingCustomer(c)} title={t.view}>
                                                    <Eye size={14} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--primary)' }} onClick={() => {
                                                    router.push(`/finance?search=${c.id}`);
                                                }} title={t.addAmount}>
                                                    <Wallet size={16} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm btn-icon" onClick={() => { setEditingCustomer(c); setShowModal(true); }} title={t.edit}>
                                                    <Edit2 size={14} />
                                                </button>
                                                <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => handleDelete(c.id)} title={t.delete}>
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <CustomerModal
                    t={t}
                    language={language}
                    customer={editingCustomer}
                    onSave={handleSave}
                    onClose={() => { setShowModal(false); setEditingCustomer(null); }}
                />
            )}

            {/* View Modal */}
            {viewingCustomer && (
                <CustomerDetailsModal
                    t={t}
                    language={language}
                    customer={viewingCustomer}
                    transactions={transactions}
                    advances={advances}
                    onClose={() => setViewingCustomer(null)}
                />
            )}
        </div>
    );
}

// ── Customer Form Modal ───────────────────────────────────────
function CustomerModal({
    t, language, customer, onSave, onClose
}: {
    t: Translations;
    language: Language;
    customer: Customer | null;
    onSave: (data: Omit<Customer, 'id' | 'createdAt'>) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState({
        name: customer?.name || '',
        village: customer?.village || '',
        mobile: customer?.mobile || '',
        whatsapp: customer?.whatsapp || '',
        languagePreference: (customer?.languagePreference || 'ta') as Language,
        numberOfCattle: customer?.numberOfCattle || 1,
        cattleType: (customer?.cattleType || 'cow') as CattleType,
        bankName: customer?.bankName || '',
        accountNumber: customer?.accountNumber || '',
        ifscCode: customer?.ifscCode || '',
        status: (customer?.status || 'active') as 'active' | 'inactive',
    });

    const set = (field: string, value: unknown) => setForm(f => ({ ...f, [field]: value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="modal-overlay">
            <div className="modal modal-lg">
                <div className="modal-header">
                    <h3 className="modal-title">{customer ? t.editCustomer : t.addCustomer2}</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">{t.fullName} *</label>
                                <input className="form-input" required value={form.name} onChange={e => set('name', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.village} *</label>
                                <input className="form-input" required value={form.village} onChange={e => set('village', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.mobile} *</label>
                                <input className="form-input" required type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.whatsapp}</label>
                                <input className="form-input" type="tel" value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.languagePreference}</label>
                                <select className="form-select" value={form.languagePreference} onChange={e => set('languagePreference', e.target.value)}>
                                    <option value="en">English</option>
                                    <option value="ta">தமிழ்</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.cattleType} *</label>
                                <select className="form-select" value={form.cattleType} onChange={e => set('cattleType', e.target.value)}>
                                    <option value="cow">{t.cow}</option>
                                    <option value="buffalo">{t.buffalo}</option>
                                    <option value="mixed">{t.mixed}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.numberOfCattle} *</label>
                                <input className="form-input" type="number" min={1} required value={form.numberOfCattle} onChange={e => set('numberOfCattle', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">{t.status}</label>
                                <select className="form-select" value={form.status} onChange={e => set('status', e.target.value)}>
                                    <option value="active">{t.active}</option>
                                    <option value="inactive">{t.inactive}</option>
                                </select>
                            </div>
                        </div>

                        {/* Bank Details */}
                        <div style={{ marginTop: '16px', padding: '16px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px' }}>{t.bankDetails} ({language === 'ta' ? 'விருப்பமானது' : 'Optional'})</div>
                            <div className="form-grid">
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{t.bankName}</label>
                                    <input className="form-input" value={form.bankName} onChange={e => set('bankName', e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{t.accountNumber}</label>
                                    <input className="form-input" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} />
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{t.ifscCode}</label>
                                    <input className="form-input" value={form.ifscCode} onChange={e => set('ifscCode', e.target.value)} />
                                </div>
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


