import { Transaction, ShopSettings, Advance, ExternalDeduction } from './types';
import { translations } from './translations';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval, addDays } from 'date-fns';

// ── ID Generation ─────────────────────────────────────────────
export function normalizeCustomerId(id: string | number): string {
    const numPart = String(id).replace(/\D/g, '');
    const num = parseInt(numPart, 10);
    if (isNaN(num)) return String(id);
    return `CUST-${String(num).padStart(3, '0')}`;
}

export function generateCustomerId(existingIds: string[]): string {
    const nums = existingIds
        .map(id => parseInt(String(id).replace(/\D/g, ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.reduce((max, n) => (n > max ? n : max), 0) + 1;
    return `CUST-${String(next).padStart(3, '0')}`;
}

export function generateInvoiceId(existingIds: string[]): string {
    const nums = existingIds
        .filter(id => id.startsWith('INV-'))
        .map(id => parseInt(id.replace('INV-', ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.reduce((max, n) => (n > max ? n : max), 0) + 1;
    return `INV-${String(next).padStart(5, '0')}`;
}

export function generateProductId(existingIds: string[]): string {
    const nums = existingIds
        .filter(id => id.startsWith('PRD-'))
        .map(id => parseInt(id.replace('PRD-', ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.reduce((max, n) => (n > max ? n : max), 0) + 1;
    return `PRD-${String(next).padStart(4, '0')}`;
}

export function generateAdvanceId(existingIds: string[]): string {
    const nums = existingIds
        .filter(id => id.startsWith('ADV-'))
        .map(id => parseInt(id.replace('ADV-', ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.reduce((max, n) => (n > max ? n : max), 0) + 1;
    return `ADV-${String(next).padStart(4, '0')}`;
}


export function generateStockInwardId(): string {
    return `STK-${Date.now()}`;
}

export function generateExternalDeductionId(existingIds: string[]): string {
    const nums = existingIds
        .filter(id => id.startsWith('DED-'))
        .map(id => parseInt(id.replace('DED-', ''), 10))
        .filter(n => !isNaN(n));
    const next = nums.reduce((max, n) => (n > max ? n : max), 0) + 1;
    return `DED-${String(next).padStart(4, '0')}`;
}

// ── Date Helpers ──────────────────────────────────────────────
export function formatDate(dateStr: string): string {
    try {
        return format(parseISO(dateStr), 'dd/MM/yyyy');
    } catch {
        return dateStr;
    }
}

export function formatDateLong(dateStr: string): string {
    try {
        return format(parseISO(dateStr), 'dd MMMM yyyy');
    } catch {
        return dateStr;
    }
}

export function formatTime(dateStr: string): string {
    try {
        return format(parseISO(dateStr), 'hh:mm a');
    } catch {
        return '';
    }
}

export function todayStr(): string {
    return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonthStr(): string {
    return format(new Date(), 'yyyy-MM');
}

export function getMonthLabel(monthStr: string): string {
    try {
        return format(parseISO(`${monthStr}-01`), 'MMMM yyyy');
    } catch {
        return monthStr;
    }
}


// ── Monthly Sales Summary ──────────────────────────────────────
export function getMonthlySummary(
    customerId: string,
    month: string,
    transactions: Transaction[]
): { customerId: string; month: string; totalSpent: number; transactions: Transaction[]; } { // Changed MonthlySummary to its type definition
    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(parseISO(`${month}-01`));

    const customerTransactions = transactions.filter(
        t => t.customerId === customerId &&
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    );

    const totalSpent = customerTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

    return {
        customerId,
        month,
        totalSpent,
        transactions: customerTransactions,
    };
}

// ── Purchase Limit Check ──────────────────────────────────────
export function getMonthlyPurchaseCount(
    customerId: string,
    month: string,
    transactions: Transaction[]
): number {
    const monthStart = startOfMonth(parseISO(`${month}-01`));
    const monthEnd = endOfMonth(parseISO(`${month}-01`));
    return transactions.filter(
        t => t.customerId === customerId &&
            isWithinInterval(parseISO(t.date), { start: monthStart, end: monthEnd })
    ).length;
}

// ── Currency Formatting ───────────────────────────────────────
export function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Stock Helpers ─────────────────────────────────────────────
export function isLowStock(product: { stockQuantity: number; minStockAlert: number }): boolean {
    return product.stockQuantity <= product.minStockAlert;
}

export function isExpiringSoon(expiryDate?: string, daysThreshold = 30): boolean {
    if (!expiryDate) return false;
    try {
        const expiry = parseISO(expiryDate);
        const threshold = addDays(new Date(), daysThreshold);
        return expiry <= threshold;
    } catch {
        return false;
    }
}

// ── Excel Export ──────────────────────────────────────────────
export async function exportToExcel(data: Record<string, unknown>[], filename: string): Promise<void> {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ── WhatsApp Integration ──────────────────────────────────────
export function generateWhatsAppLink(mobile: string, message: string): string {
    const cleanMobile = mobile.replace(/\D/g, '');
    const mobileWithCode = cleanMobile.length === 10 ? `91${cleanMobile}` : cleanMobile;
    return `https://wa.me/${mobileWithCode}?text=${encodeURIComponent(message)}`;
}

export function parseTemplate(template: string, tokens: Record<string, string | number>): string {
    if (!template) return '';
    let result = template;
    Object.entries(tokens).forEach(([key, value]) => {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });
    return result;
}

/**
 * Calculates a customer's total outstanding balance (debt).
 * Formula: Sum of remaining advance balances - Sum of unprocessed external deductions.
 */
export const calculateCustomerBalance = (
    customerId: string,
    advances: Advance[],
    externalDeductions: ExternalDeduction[] = []
): number => {
    const totalAdvances = advances
        .filter(a => a.customerId === customerId)
        .reduce((sum, a) => sum + a.remainingBalance, 0);

    const totalUnprocessedDeductions = externalDeductions
        .filter(d => d.customerId === customerId && !d.isProcessed)
        .reduce((sum, d) => sum + d.amount, 0);

    return Math.max(0, totalAdvances - totalUnprocessedDeductions);
};

export function generatePOSWhatsAppMessage(
    txn: Transaction,
    customerName: string,
    oldBalance: number,
    currentBalance: number,
    settings: ShopSettings
): string {
    const productList = txn.items.map((item, i) =>
        `   • ${item.productName} x ${item.quantity}`
    ).join('\n');

    return `🐄 *${settings.shopName}*\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `வணக்கம் *${customerName}* 🙏\n` +
        `உங்கள் கொள்முதலுக்கு நன்றி!\n\n` +
        `📦 *கொள்முதல் விவரம்*\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `📅 தேதி: ${formatDate(txn.date)}\n\n` +
        `🛒 *எடுத்த பொருட்கள்:*\n` +
        `${productList}\n\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `💰 *கணக்கு விவரம்*\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `🏮 பழைய இருப்பு       : ${formatCurrency(oldBalance)}\n` +
        `🏮 கொள்முதல் (+)      : ${formatCurrency(txn.totalAmount)}\n` +
        `━━━━━━━━━━━━━━━━━\n` +
        `🏮 *தற்போதைய இருப்பு : ${formatCurrency(currentBalance)}*\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `🙏 நன்றி! மீண்டும் வாங்க வாருங்கள்.\n` +
        (settings.mobile ? `📞 தொடர்புக்கு: ${settings.mobile}` : '');
}


// ── Clamp ─────────────────────────────────────────────────────
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
