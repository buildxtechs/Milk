'use client';

import { Transaction, ShopSettings } from '@/lib/types';
import { formatDate, formatCurrency } from '@/lib/utils';

interface ThermalInvoiceProps {
    transaction: Transaction;
    customerName: string;
    customerPhone: string;
    oldBalance: number;
    currentBalance: number;
    settings: ShopSettings;
}

export default function ThermalInvoice({
    transaction,
    customerName,
    customerPhone,
    oldBalance,
    currentBalance,
    settings
}: ThermalInvoiceProps) {
    const divider = '━━━━━━━━━━━━━━━━━';

    return (
        <div id="thermal-receipt" style={{
            fontFamily: '"Noto Sans Tamil", "Inter", monospace',
            fontSize: '12px',
            lineHeight: 1.6,
            color: '#000',
            background: '#fff',
            width: '72mm',
            padding: '4mm',
            margin: '0 auto',
        }}>
            {/* Shop Header */}
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>🐄 {settings.shopName}</div>
                <div>{divider}</div>
            </div>

            {/* Greeting */}
            <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '12px' }}>வணக்கம் <strong>{customerName}</strong> 🙏</div>
                <div style={{ fontSize: '11px' }}>உங்கள் கொள்முதலுக்கு நன்றி!</div>
            </div>

            {/* Purchase Details */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>📦 கொள்முதல் விவரம்</div>
                <div>{divider}</div>
                <div>📅 தேதி: {formatDate(transaction.date)}</div>
            </div>

            {/* Items */}
            <div style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: 'bold' }}>🛒 எடுத்த பொருட்கள்:</div>
                {transaction.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginLeft: '8px', fontSize: '11px' }}>
                        <span>• {item.productName} x {item.quantity}</span>
                        <span>{formatCurrency(item.total)}</span>
                    </div>
                ))}
            </div>

            {/* Account Summary */}
            <div style={{ marginBottom: '8px' }}>
                <div>{divider}</div>
                <div style={{ fontWeight: 'bold' }}>💰 கணக்கு விவரம்</div>
                <div>{divider}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🏮 பழைய இருப்பு</span>
                    <span>: {formatCurrency(oldBalance)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>🏮 கொள்முதல் (+)</span>
                    <span>: {formatCurrency(transaction.totalAmount)}</span>
                </div>
                <div>{divider}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                    <span>🏮 தற்போதைய இருப்பு</span>
                    <span>: {formatCurrency(currentBalance)}</span>
                </div>
                <div>{divider}</div>
            </div>

            {/* Signature / Verification */}
            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                {transaction.validationMethod === 'fingerprint' ? (
                    <div style={{ border: '1px solid #000', padding: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
                            {transaction.fingerprintName ? 'கைரேகை சரிபார்க்கப்பட்டது' : 'FINGERPRINT VERIFIED'}
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                            {transaction.fingerprintName}
                        </div>
                    </div>
                ) : (
                    <div style={{ paddingTop: '20px', borderTop: '1px dashed #000', textAlign: 'center', fontSize: '10px' }}>
                        வாடிக்கையாளர் கையொப்பம் / Customer Signature
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
                <div style={{ fontWeight: 'bold' }}>🙏 நன்றி! மீண்டும் வாங்க வாருங்கள்.</div>
                {settings.mobile && (
                    <div style={{ marginTop: '4px' }}>📞 தொடர்புக்கு: {settings.mobile}</div>
                )}
            </div>
        </div>
    );
}
