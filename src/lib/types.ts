// ============================================================
// THEEVANAM SHOP - Core TypeScript Types
// ============================================================

export type Language = 'en' | 'ta';
export type CattleType = 'cow' | 'buffalo' | 'mixed';
export type PaymentMode = 'cash' | 'advance';
export type ProductCategory = 'theevanam' | 'medical' | 'supplements' | 'accessories' | 'other';
export type CustomerStatus = 'active' | 'inactive';
export type StockUnit = 'kg' | 'packet' | 'bottle' | 'liter' | 'piece' | 'bag';

// ── Shop Settings ─────────────────────────────────────────────
export interface ShopSettings {
    shopName: string;
    address: string;
    mobile: string;
    logo?: string; // Base64 data URL
    maxPurchasesPerMonth: number;
    enforceCustomerSelection: boolean;
    whatsappAmountTemplate: string;
    whatsappInvoiceTemplate: string;
}

// ── Customer ─────────────────────────────────────────────────
export interface Customer {
    id: string;                          // Auto-generated (e.g. CUST-001)
    name: string;
    village: string;
    mobile: string;
    whatsapp: string;
    languagePreference: Language;
    numberOfCattle: number;
    cattleType: CattleType;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    status: CustomerStatus;
    createdAt: string;                   // ISO date string
}


// ── Product ───────────────────────────────────────────────────
export interface Product {
    id: string;
    nameEn: string;
    nameTa: string;
    category: ProductCategory;
    costPrice: number;
    sellingPrice: number;
    unit: StockUnit;
    stockQuantity: number;
    minStockAlert: number;
    supplierName: string;
    batchNumber?: string;
    expiryDate?: string;                 // YYYY-MM-DD (for medical)
    createdAt: string;
}

// ── Transaction (POS Sale) ────────────────────────────────────
export interface TransactionItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    total: number;
}

export interface Transaction {
    id: string;                          // Invoice number
    customerId: string;
    date: string;                        // YYYY-MM-DD
    items: TransactionItem[];
    subtotal: number;
    discount: number;
    totalAmount: number;
    budgetProvided?: number;
    advanceUsed?: number;
    balanceDue?: number;
    paymentMode: PaymentMode;
    signature?: string;                  // Base64 data URL
    validationMethod?: 'signature' | 'fingerprint';
    fingerprintName?: string;
    notes?: string;
    createdAt: string;
}

// ── Advance ───────────────────────────────────────────────────
export interface Advance {
    id: string;
    customerId: string;
    date: string;
    amount: number;
    monthlyDeduction?: number;
    remainingBalance: number;
    notes?: string;
    createdAt: string;
}

// ── Stock Inward ──────────────────────────────────────────────
export interface StockInward {
    id: string;
    productId: string;
    date: string;
    quantity: number;
    costPrice: number;
    supplierName: string;
    invoiceNumber?: string;
    notes?: string;
    createdAt: string;
}

// ── Payouts & Deductions ──────────────────────────────────────
export interface ExternalDeduction {
    id: string;
    customerId: string;
    amount: number;
    reason: string;
    isProcessed: boolean;
    date: string;
    createdAt: string;
}

export interface Payout {
    id: string;
    customerId: string;
    amount: number;          // Total balance deducted
    deductionAmount: number; // From external deductions
    netAmount: number;       // Final cash paid to customer
    date: string;
    signature: string;
    fingerprintName?: string;
    notes?: string;
    createdAt: string;
}

export interface MonthlySummary {
    customerId: string;
    month: string;                       // YYYY-MM
    totalSpent: number;
    transactions: Transaction[];
}

// ── User / Auth ─────────────────────────────────────────────
export interface User {
    id: string;
    username: string;
    role: 'admin' | 'staff';
}

// ── Dashboard Stats ───────────────────────────────────────────
export interface DashboardStats {
    totalCustomers: number;
    activeCustomers: number;
    totalProductSales: number;
    outstandingAdvances: number;
    lowStockProducts: number;
}
