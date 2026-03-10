import mongoose, { Schema } from 'mongoose';

// --- Customer Schema ---
const CustomerSchema = new Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    village: { type: String, required: true },
    mobile: { type: String, required: true },
    whatsapp: { type: String, required: true },
    languagePreference: { type: String, enum: ['en', 'ta'], default: 'en' },
    numberOfCattle: { type: Number, required: true },
    cattleType: { type: String, enum: ['cow', 'buffalo', 'mixed'], required: true },
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdAt: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
});

// --- Product Schema ---
const ProductSchema = new Schema({
    id: { type: String, required: true, unique: true },
    nameEn: { type: String, required: true },
    nameTa: { type: String, required: true },
    category: { type: String, required: true },
    costPrice: { type: Number, required: true },
    sellingPrice: { type: Number, required: true },
    unit: { type: String, required: true },
    stockQuantity: { type: Number, required: true },
    minStockAlert: { type: Number, required: true },
    supplierName: String,
    batchNumber: String,
    expiryDate: String,
    createdAt: { type: String, required: true },
    updatedAt: { type: Date, default: Date.now }
});

// --- Transaction Schema ---
const TransactionItemSchema = new Schema({
    productId: String,
    productName: String,
    quantity: Number,
    unitPrice: Number,
    discount: Number,
    total: Number
});

const TransactionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    date: { type: String, required: true },
    items: [TransactionItemSchema],
    subtotal: Number,
    discount: Number,
    totalAmount: Number,
    budgetProvided: Number,
    advanceUsed: Number,
    balanceDue: Number,
    paymentMode: { type: String, required: true },
    signature: String,
    validationMethod: String,
    notes: String,
    createdAt: { type: String, required: true }
});

// --- Advance Schema ---
const AdvanceSchema = new Schema({
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    monthlyDeduction: Number,
    remainingBalance: { type: Number, required: true },
    notes: String,
    createdAt: { type: String, required: true }
});

// --- Stock Inward Schema ---
const StockInwardSchema = new Schema({
    id: { type: String, required: true, unique: true },
    productId: { type: String, required: true },
    date: { type: String, required: true },
    quantity: { type: Number, required: true },
    costPrice: { type: Number, required: true },
    supplierName: String,
    invoiceNumber: String,
    notes: String,
    createdAt: { type: String, required: true }
});

// --- External Deduction Schema ---
const ExternalDeductionSchema = new Schema({
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    isProcessed: { type: Boolean, default: false },
    date: { type: String, required: true },
    createdAt: { type: String, required: true }
});

// --- Payout Schema ---
const PayoutSchema = new Schema({
    id: { type: String, required: true, unique: true },
    customerId: { type: String, required: true },
    amount: { type: Number, required: true },
    deductionAmount: Number,
    netAmount: { type: Number, required: true },
    date: { type: String, required: true },
    signature: String,
    notes: String,
    createdAt: { type: String, required: true }
});

// --- Shop Settings Schema ---
const SettingsSchema = new Schema({
    shopName: String,
    address: String,
    mobile: String,
    logo: String,
    maxPurchasesPerMonth: Number,
    enforceCustomerSelection: Boolean,
    whatsappAmountTemplate: String,
    whatsappInvoiceTemplate: String,
});

export const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const TransactionModel = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const AdvanceModel = mongoose.models.Advance || mongoose.model('Advance', AdvanceSchema);
export const StockInwardModel = mongoose.models.StockInward || mongoose.model('StockInward', StockInwardSchema);
export const ExternalDeductionModel = mongoose.models.ExternalDeduction || mongoose.model('ExternalDeduction', ExternalDeductionSchema);
export const PayoutModel = mongoose.models.Payout || mongoose.model('Payout', PayoutSchema);
export const SettingsModel = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
