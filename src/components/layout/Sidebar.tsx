'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore, useSettings } from '@/lib/store';
import { translations } from '@/lib/translations';
import {
    LayoutDashboard, Users, Droplets, Leaf, Package, ShoppingCart,
    FileText, Wallet, Archive, BarChart3, X, Settings, Trash2, Download,
    ArrowDownCircle, Database
} from 'lucide-react';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar() {
    const pathname = usePathname();
    const language = useStore((s) => s.language);
    const settings = useSettings();
    const t = translations[language];

    const navItems = [
        { href: '/', icon: LayoutDashboard, label: t.dashboard, section: 'main' },
        { href: '/pos', icon: ShoppingCart, label: t.pos, section: 'main' },
        { href: '/customers', icon: Users, label: t.customers, section: 'main' },
        { href: '/customers/credits', icon: Wallet, label: t.amountCredits, section: 'main' },
        { href: '/finance', icon: Wallet, label: t.finance, section: 'operations' },
        { href: '/invoices', icon: FileText, label: t.invoiceData, section: 'operations' },
        { href: '/audit', icon: Archive, label: t.audit, section: 'operations' },
        { href: '/export', icon: Archive, label: t.exportData, section: 'operations' },
        { href: '/theevanam', icon: Leaf, label: t.theevanam, section: 'inventory' },
        { href: '/products', icon: Package, label: t.products, section: 'inventory' },
        { href: '/payout', icon: ArrowDownCircle, label: t.payout, section: 'finance' },
        { href: '/stock', icon: Archive, label: t.stock, section: 'inventory' },
        { href: '/reports', icon: BarChart3, label: t.reports, section: 'inventory' },
        { href: '/reports/member-summary', icon: FileText, label: language === 'ta' ? 'உறுப்பினர் சுருக்கம்' : 'Member Summary', section: 'inventory' },
        { href: '/reports/payslip', icon: FileText, label: language === 'ta' ? 'மாதாந்திர பேஸ்லிப்' : 'Monthly Payslip', section: 'inventory' },
        { href: '/db', icon: Database, label: t.database, section: 'system' },
        { href: '/settings', icon: Settings, label: t.settings, section: 'system' },
    ];

    const sections = [
        { key: 'main', label: language === 'ta' ? 'முக்கிய' : 'Main' },
        { key: 'operations', label: language === 'ta' ? 'செயல்பாடுகள்' : 'Operations' },
        { key: 'inventory', label: language === 'ta' ? 'சரக்கு விவரங்கள்' : 'Inventory' },
        { key: 'system', label: language === 'ta' ? 'அமைப்பு' : 'System' },
    ];

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {settings.logo ? (
                        <img src={settings.logo} alt="Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                    ) : (
                        <div className="logo-icon">🐄</div>
                    )}
                    <div>
                        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>{settings.shopName}</h1>
                        <p style={{ color: '#64748b' }}>{t.appTagline}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {sections.map((section) => {
                    const items = navItems.filter((i) => i.section === section.key);
                    return (
                        <div key={section.key} style={{ marginBottom: '16px' }}>
                            <div className="nav-section-label" style={{ color: '#475569', marginBottom: '8px' }}>{section.label}</div>
                            {items.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon className="nav-icon" size={18} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center' }}>
                    {language === 'ta' ? 'பதிப்பு 1.0 • தீவனம் கடை' : 'v1.0 • Theevanam Shop'}
                </div>
            </div>
        </aside>
    );
}
