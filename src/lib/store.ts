import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Customer, Product, Transaction, Advance, StockInward, ShopSettings, User, Payout, ExternalDeduction } from './types';
import { Language } from './types';

interface AppState {
    // Language
    language: Language;
    setLanguage: (lang: Language) => void;

    // Customers
    customers: Customer[];
    addCustomer: (customer: Customer) => void;
    updateCustomer: (id: string, updates: Partial<Customer>) => void;
    deleteCustomer: (id: string) => void;
    standardizeAllCustomerIds: () => void;

    // Products
    products: Product[];
    addProduct: (product: Product) => void;
    updateProduct: (id: string, updates: Partial<Product>) => void;
    deleteProduct: (id: string) => void;
    updateStock: (productId: string, quantityChange: number) => void;

    // Transactions (POS)
    transactions: Transaction[];
    addTransaction: (transaction: Transaction) => void;
    updateTransaction: (id: string, updates: Partial<Transaction>) => void;
    deleteTransaction: (id: string) => void;

    // Advances
    advances: Advance[];
    addAdvance: (advance: Advance) => void;
    updateAdvance: (id: string, updates: Partial<Advance>) => void;
    deleteAdvance: (id: string) => void;
    applyMonthlyDeductions: (customerId: string) => void;
    deductBalance: (customerId: string, amount: number) => void;

    // Stock Inward
    stockInwards: StockInward[];
    addStockInward: (inward: StockInward) => void;

    // Payouts & Deductions
    payouts: Payout[];
    addPayout: (payout: Payout) => void;
    deletePayout: (id: string) => void;
    externalDeductions: ExternalDeduction[];
    addExternalDeduction: (deduction: ExternalDeduction) => void;
    updateExternalDeduction: (id: string, updates: Partial<ExternalDeduction>) => void;
    deleteExternalDeduction: (id: string) => void;

    // Auth
    user: User | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => boolean;
    logout: () => void;

    // Settings
    settings: ShopSettings;
    updateSettings: (updates: Partial<ShopSettings>) => void;

    // Data Management
    lastResetMonth: string | null;
    clearData: (categories: string[]) => void;
    performMonthlyReset: () => void;

    // Sync Management
    pendingSync: SyncChange[];
    isSyncing: boolean;
    syncData: () => Promise<void>;
    clearPendingSync: () => void;
    fetchInitialData: () => Promise<void>;
}

export interface SyncChange {
    type: string;
    action: 'upsert' | 'delete';
    data?: any;
    id?: string;
    timestamp: number;
}

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            // Language
            language: 'en',
            setLanguage: (lang) => set({ language: lang }),

            // Customers
            customers: [],
            addCustomer: (customer) =>
                set((state) => ({
                    customers: [...state.customers, customer],
                    pendingSync: [...state.pendingSync, { type: 'customers', action: 'upsert', data: customer, timestamp: Date.now() }]
                })),
            updateCustomer: (id, updates) =>
                set((state) => {
                    const updatedCustomers = state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
                    const customer = updatedCustomers.find(c => c.id === id);
                    return {
                        customers: updatedCustomers,
                        pendingSync: [...state.pendingSync, { type: 'customers', action: 'upsert', data: customer, timestamp: Date.now() }]
                    };
                }),
            deleteCustomer: (id) =>
                set((state) => ({
                    customers: state.customers.filter((c) => c.id !== id),
                    transactions: state.transactions.filter((t) => t.customerId !== id),
                    advances: state.advances.filter((a) => a.customerId !== id),
                    payouts: state.payouts.filter((p) => p.customerId !== id),
                    externalDeductions: state.externalDeductions.filter((d) => d.customerId !== id),
                    pendingSync: [...state.pendingSync, { type: 'customers', action: 'delete', id, timestamp: Date.now() }]
                })),
            standardizeAllCustomerIds: () =>
                set((state) => {
                    const { normalizeCustomerId } = require('@/lib/utils');
                    const newPendingChanges: SyncChange[] = [];
                    const idMap: Record<string, string> = {};

                    // 1. Normalize Customer IDs
                    const updatedCustomers = state.customers.map(c => {
                        const newId = normalizeCustomerId(c.id);
                        idMap[c.id] = newId;
                        return { ...c, id: newId };
                    });

                    // 2. Update Transactions
                    const updatedTransactions = state.transactions.map(t => {
                        const newId = idMap[t.customerId] || t.customerId;
                        return { ...t, customerId: newId };
                    });

                    // 3. Update Advances
                    const updatedAdvances = state.advances.map(a => {
                        const newId = idMap[a.customerId] || a.customerId;
                        return { ...a, customerId: newId };
                    });

                    // 4. Update Payouts
                    const updatedPayouts = state.payouts.map(p => {
                        const newId = idMap[p.customerId] || p.customerId;
                        return { ...p, customerId: newId };
                    });

                    // 5. Update External Deductions
                    const updatedExternalDeductions = state.externalDeductions.map(d => {
                        const newId = idMap[d.customerId] || d.customerId;
                        return { ...d, customerId: newId };
                    });

                    // Note: In local storage mode, we just update the state.
                    // Syncing all these changes at once might be large, but necessary for consistency.
                    // For now, we'll just update state. Real sync would need batch handling.

                    return {
                        customers: updatedCustomers,
                        transactions: updatedTransactions,
                        advances: updatedAdvances,
                        payouts: updatedPayouts,
                        externalDeductions: updatedExternalDeductions
                    };
                }),

            // Products
            products: [],
            addProduct: (product) =>
                set((state) => ({
                    products: [...state.products, product],
                    pendingSync: [...state.pendingSync, { type: 'products', action: 'upsert', data: product, timestamp: Date.now() }]
                })),
            updateProduct: (id, updates) =>
                set((state) => {
                    const updatedProducts = state.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
                    const product = updatedProducts.find(p => p.id === id);
                    return {
                        products: updatedProducts,
                        pendingSync: [...state.pendingSync, { type: 'products', action: 'upsert', data: product, timestamp: Date.now() }]
                    };
                }),
            deleteProduct: (id) =>
                set((state) => ({
                    products: state.products.filter((p) => p.id !== id),
                    pendingSync: [...state.pendingSync, { type: 'products', action: 'delete', id, timestamp: Date.now() }]
                })),
            updateStock: (productId, quantityChange) =>
                set((state) => {
                    const updatedProducts = state.products.map((p) =>
                        p.id === productId
                            ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + quantityChange) }
                            : p
                    );
                    const product = updatedProducts.find(p => p.id === productId);
                    return {
                        products: updatedProducts,
                        pendingSync: [...state.pendingSync, { type: 'products', action: 'upsert', data: product, timestamp: Date.now() }]
                    };
                }),

            // Transactions
            transactions: [],
            addTransaction: (transaction) =>
                set((state) => {
                    // Strip large signature from sync queue to save space.
                    // We will re-attach it during the actual syncData call.
                    const { signature, ...syncItemData } = transaction;
                    
                    return {
                        transactions: [...state.transactions, transaction],
                        pendingSync: [...state.pendingSync, { type: 'transactions', action: 'upsert', data: syncItemData, timestamp: Date.now() }]
                    };
                }),
            updateTransaction: (id, updates) =>
                set((state) => {
                    const updatedTransactions = state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t));
                    const transaction = updatedTransactions.find(t => t.id === id);
                    return {
                        transactions: updatedTransactions,
                        pendingSync: [...state.pendingSync, { type: 'transactions', action: 'upsert', data: transaction, timestamp: Date.now() }]
                    };
                }),
            deleteTransaction: (id) =>
                set((state) => ({
                    transactions: state.transactions.filter((t) => t.id !== id),
                    pendingSync: [...state.pendingSync, { type: 'transactions', action: 'delete', id, timestamp: Date.now() }]
                })),

            // Advances
            advances: [],
            addAdvance: (advance) =>
                set((state) => ({
                    advances: [...state.advances, advance],
                    pendingSync: [...state.pendingSync, { type: 'advances', action: 'upsert', data: advance, timestamp: Date.now() }]
                })),
            updateAdvance: (id, updates) =>
                set((state) => {
                    const updatedAdvances = state.advances.map((a) => (a.id === id ? { ...a, ...updates } : a));
                    const advance = updatedAdvances.find(a => a.id === id);
                    return {
                        advances: updatedAdvances,
                        pendingSync: [...state.pendingSync, { type: 'advances', action: 'upsert', data: advance, timestamp: Date.now() }]
                    };
                }),
            deleteAdvance: (id) =>
                set((state) => ({
                    advances: state.advances.filter((a) => a.id !== id),
                    pendingSync: [...state.pendingSync, { type: 'advances', action: 'delete', id, timestamp: Date.now() }]
                })),
            applyMonthlyDeductions: (customerId) =>
                set((state) => {
                    const newPendingChanges: SyncChange[] = [];
                    const updatedAdvances = state.advances.map((a) => {
                        if (a.customerId !== customerId || a.remainingBalance <= 0) return a;
                        const deduction = Math.min(a.monthlyDeduction || 0, a.remainingBalance);
                        const newAdvance = { ...a, remainingBalance: a.remainingBalance - deduction };
                        newPendingChanges.push({ type: 'advances', action: 'upsert', data: newAdvance, timestamp: Date.now() });
                        return newAdvance;
                    });
                    return {
                        advances: updatedAdvances,
                        pendingSync: [...state.pendingSync, ...newPendingChanges]
                    };
                }),
            deductBalance: (customerId, amount) =>
                set((state) => {
                    let remainingToDeduct = amount;
                    const newPendingChanges: SyncChange[] = [];
                    const newAdvances = state.advances.map((a) => {
                        if (a.customerId !== customerId || a.remainingBalance <= 0 || remainingToDeduct <= 0) return a;
                        const deduction = Math.min(remainingToDeduct, a.remainingBalance);
                        remainingToDeduct -= deduction;
                        const newAdvance = { ...a, remainingBalance: a.remainingBalance - deduction };
                        newPendingChanges.push({ type: 'advances', action: 'upsert', data: newAdvance, timestamp: Date.now() });
                        return newAdvance;
                    });
                    return {
                        advances: newAdvances,
                        pendingSync: [...state.pendingSync, ...newPendingChanges]
                    };
                }),

            // Stock Inward
            stockInwards: [],
            addStockInward: (inward) =>
                set((state) => ({
                    stockInwards: [...state.stockInwards, inward],
                    pendingSync: [...state.pendingSync, { type: 'stockInwards', action: 'upsert', data: inward, timestamp: Date.now() }]
                })),

            // Payouts & Deductions
            payouts: [],
            addPayout: (payout) => set((state) => {
                const updatedExternalDeductions = state.externalDeductions.map(d =>
                    d.customerId === payout.customerId && !d.isProcessed
                        ? { ...d, isProcessed: true }
                        : d
                );

                // Strip large signature from sync queue
                const { signature, ...syncPayoutData } = payout;

                const syncChanges: SyncChange[] = [
                    { type: 'payouts', action: 'upsert', data: syncPayoutData, timestamp: Date.now() }
                ];

                updatedExternalDeductions.forEach(d => {
                    if (d.customerId === payout.customerId && d.isProcessed) {
                        syncChanges.push({ type: 'externalDeductions', action: 'upsert', data: d, timestamp: Date.now() });
                    }
                });

                return {
                    payouts: [...state.payouts, payout],
                    externalDeductions: updatedExternalDeductions,
                    pendingSync: [...state.pendingSync, ...syncChanges]
                };
            }),
            deletePayout: (id) => set((state) => ({
                payouts: state.payouts.filter((p) => p.id !== id),
                pendingSync: [...state.pendingSync, { type: 'payouts', action: 'delete', id, timestamp: Date.now() }]
            })),
            externalDeductions: [],
            addExternalDeduction: (deduction) => set((state) => ({
                externalDeductions: [...state.externalDeductions, deduction],
                pendingSync: [...state.pendingSync, { type: 'externalDeductions', action: 'upsert', data: deduction, timestamp: Date.now() }]
            })),
            updateExternalDeduction: (id, updates) => set((state) => {
                const updatedDeductions = state.externalDeductions.map((d) => (d.id === id ? { ...d, ...updates } : d));
                const deduction = updatedDeductions.find(d => d.id === id);
                return {
                    externalDeductions: updatedDeductions,
                    pendingSync: [...state.pendingSync, { type: 'externalDeductions', action: 'upsert', data: deduction, timestamp: Date.now() }]
                };
            }),
            deleteExternalDeduction: (id) => set((state) => ({
                externalDeductions: state.externalDeductions.filter((d) => d.id !== id),
                pendingSync: [...state.pendingSync, { type: 'externalDeductions', action: 'delete', id, timestamp: Date.now() }]
            })),

            // Auth
            user: null,
            isAuthenticated: false,
            login: (username, password) => {
                if ((username === 'Admin' && password === 'Kalai@85') || (username === 'staff' && password === 'staff')) {
                    const user: User = {
                        id: username === 'Admin' ? 'U001' : 'U002',
                        username,
                        role: username === 'Admin' ? 'admin' : 'staff',
                    };
                    set({ user, isAuthenticated: true });
                    return true;
                }
                return false;
            },
            logout: () => set({ user: null, isAuthenticated: false }),

            // Settings
            settings: {
                shopName: 'Theevanam Shop',
                address: '123, Main Street, Village Name',
                mobile: '9876543210',
                maxPurchasesPerMonth: 1000,
                enforceCustomerSelection: true,
                whatsappAmountTemplate: 'வணக்கம் {name}, உங்கள் கணக்கில் ₹{amount} சேர்க்கப்பட்டுள்ளது. உங்கள் தற்போதைய இருப்பு ₹{balance}.',
                whatsappInvoiceTemplate: 'வணக்கம் {name}, உங்கள் கொள்முதலுக்கு நன்றி! இன்வாய்ஸ்: {invoice}. மொத்தம்: ₹{total}. பயன்படுத்தப்பட்ட முன்பணம்: ₹{advance}. மீதமுள்ள தொகை: ₹{balance}.',
            },
            updateSettings: (updates) =>
                set((state) => {
                    const newSettings = { ...state.settings, ...updates };
                    return {
                        settings: newSettings,
                        pendingSync: [...state.pendingSync, { type: 'settings', action: 'upsert', data: newSettings, timestamp: Date.now() }]
                    };
                }),

            // Data Management
            lastResetMonth: null,
            clearData: (categories) => set((state) => {
                const updates: any = {};
                if (categories.includes('transactions')) updates.transactions = [];
                if (categories.includes('advances')) updates.advances = [];
                if (categories.includes('stock')) updates.stockInwards = [];
                if (categories.includes('customers')) updates.customers = [];
                if (categories.includes('payouts')) updates.payouts = [];
                if (categories.includes('externalDeductions')) updates.externalDeductions = [];
                return updates;
            }),
            performMonthlyReset: () => set(() => {
                return {
                    lastResetMonth: new Date().toISOString().substring(0, 7),
                };
            }),

            // Sync Management
            pendingSync: [],
            isSyncing: false,
            syncData: async () => {
                const state = (useStore.getState as any)();
                if (state.pendingSync.length === 0 || state.isSyncing) return;

                set({ isSyncing: true });
                try {
                    // Re-attach signatures to transaction data before sending to server
                    const changesWithSignatures = state.pendingSync.map((change: any) => {
                        if (change.type === 'transactions' && change.action === 'upsert' && !change.data.signature) {
                            const fullTxn = state.transactions.find((t: any) => t.id === change.data.id);
                            if (fullTxn?.signature) {
                                return { ...change, data: { ...change.data, signature: fullTxn.signature } };
                            }
                        }
                        if (change.type === 'payouts' && change.action === 'upsert' && !change.data.signature) {
                            const fullPayout = state.payouts.find((p: any) => p.id === change.data.id);
                            if (fullPayout?.signature) {
                                return { ...change, data: { ...change.data, signature: fullPayout.signature } };
                            }
                        }
                        return change;
                    });

                    const response = await fetch('/api/sync', {
                        method: 'POST',
                        body: JSON.stringify({ changes: changesWithSignatures }),
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (response.ok) {
                        set({ pendingSync: [] });
                        console.log('Sync successful');
                    }
                } catch (error) {
                    console.error('Sync failed:', error);
                } finally {
                    set({ isSyncing: false });
                }
            },
            clearPendingSync: () => set({ pendingSync: [] }),
            fetchInitialData: async () => {
                try {
                    const response = await fetch('/api/sync');
                    if (response.ok) {
                        const data = await response.json();
                        const currentState = (useStore.getState as any)();
                        set({
                            customers: data.customers || [],
                            products: data.products || [],
                            transactions: data.transactions || [],
                            advances: data.advances || [],
                            stockInwards: data.stockInwards || [],
                            externalDeductions: data.externalDeductions || [],
                            payouts: data.payouts || [],
                            settings: data.settings || currentState.settings
                        });
                    }
                } catch (error) {
                    console.error('Failed to fetch initial data:', error);
                }
            }
        }),
        {
            name: 'theevanam-shop-storage',
        }
    )
);

// Selector hooks
export const useLanguage = () => useStore((s) => s.language);
export const useCustomers = () => useStore((s) => s.customers);
export const useProducts = () => useStore((s) => s.products);
export const useTransactions = () => useStore((s) => s.transactions);
export const useAdvances = () => useStore((s) => s.advances);
export const useStockInwards = () => useStore((s) => s.stockInwards);
export const useSettings = () => useStore((s) => s.settings);
export const usePayouts = () => useStore((s) => s.payouts);
export const useExternalDeductions = () => useStore((s) => s.externalDeductions);
