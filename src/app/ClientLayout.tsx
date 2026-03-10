'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import SyncManager from '@/components/SyncManager';

const pageTitles: Record<string, { en: string; ta: string }> = {
    '/': { en: 'Dashboard', ta: 'டாஷ்போர்டு' },
    '/customers': { en: 'Customers', ta: 'வாடிக்கையாளர்கள்' },
    '/customers/credits': { en: 'Amount Credits', ta: 'தொகை வரவுகள்' },
    '/customers/whatsapp': { en: 'WhatsApp Share', ta: 'வாட்ஸ்அப் பகிர்வு' },
    '/milk': { en: 'Milk Collection', ta: 'பால் சேகரிப்பு' },
    '/theevanam': { en: 'Theevanam', ta: 'தீவனம்' },
    '/products': { en: 'Products', ta: 'பொருட்கள்' },
    '/pos': { en: 'POS / Sales', ta: 'விற்பனை' },
    '/invoices': { en: 'Invoices', ta: 'இன்வாய்ஸ்' },
    '/advances': { en: 'Advances', ta: 'முன்பணம்' },
    '/stock': { en: 'Stock', ta: 'இருப்பு' },
    '/reports': { en: 'Reports', ta: 'அறிக்கைகள்' },
    '/settings': { en: 'Settings', ta: 'அமைப்புகள்' },
    '/db': { en: 'Database', ta: 'தரவுத்தளம்' },
    '/login': { en: 'Login', ta: 'உள்நுழைவு' },
};

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const language = useStore((s) => s.language);
    const isAuthenticated = useStore((s) => s.isAuthenticated);
    const lastResetMonth = useStore((s) => s.lastResetMonth);
    const performMonthlyReset = useStore((s) => s.performMonthlyReset);

    // Protection logic & Monthly Reset Check
    useEffect(() => {
        if (!isAuthenticated && pathname !== '/login') {
            router.push('/login');
            return;
        }

        if (isAuthenticated && pathname === '/login') {
            router.push('/');
            return;
        }

        // Close sidebar on route change (for mobile)
        setSidebarOpen(false);

        // Monthly Reset check
        if (isAuthenticated) {
            const currentMonth = new Date().toISOString().substring(0, 7);
            if (lastResetMonth !== currentMonth) {
                console.log('New month detected. Performing monthly reset...');
                performMonthlyReset();
            }
        }
    }, [isAuthenticated, pathname, router, lastResetMonth, performMonthlyReset]);

    const pageInfo = pageTitles[pathname] || { en: 'Theevanam Shop', ta: 'தீவனம் கடை' };
    const title = language === 'ta' ? pageInfo.ta : pageInfo.en;

    // Special case for login page: hide sidebar and header
    if (pathname === '/login') {
        return <div className={`app-layout login-mode ${language === 'ta' ? 'lang-ta' : ''}`}>{children}</div>;
    }

    // Only render the full layout if authenticated
    if (!isAuthenticated) return null;

    return (
        <div className={`app-layout ${language === 'ta' ? 'lang-ta' : ''}`}>
            <SyncManager />
            {sidebarOpen && <div className="sidebar-overlay no-print" onClick={() => setSidebarOpen(false)} />}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className={`main-content ${!sidebarOpen ? 'expanded' : ''}`}>
                <Header title={title} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <main className="page-content">
                    {children}
                </main>
            </div>
        </div>
    );
}
