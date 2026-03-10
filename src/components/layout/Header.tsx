import { useStore, useProducts } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Bell, Menu, LogOut, User as UserIcon } from 'lucide-react';
import { isLowStock, isExpiringSoon } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import SyncIndicator from '../SyncIndicator';

interface HeaderProps {
    title: string;
    onMenuClick?: () => void;
}

export default function Header({ title, onMenuClick }: HeaderProps) {
    const language = useStore((s) => s.language);
    const setLanguage = useStore((s) => s.setLanguage);
    const user = useStore((s) => s.user);
    const logout = useStore((s) => s.logout);
    const products = useProducts();
    const router = useRouter();

    const lowStockCount = products.filter(isLowStock).length;
    const expiringCount = products.filter(p => isExpiringSoon(p.expiryDate)).length;
    const alertCount = lowStockCount + expiringCount;

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                    className="btn btn-ghost btn-icon no-print"
                    onClick={onMenuClick}
                    style={{ marginLeft: '-8px' }}
                >
                    <Menu size={20} />
                </button>
                <div>
                    <h2 className="header-title">{title}</h2>
                </div>
            </div>

            <div className="header-actions">
                <SyncIndicator />
                {/* Language Toggle */}
                <div className="lang-toggle" style={{ marginRight: '12px' }}>
                    <button
                        className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                        onClick={() => setLanguage('en')}
                    >
                        EN
                    </button>
                    <button
                        className={`lang-btn ${language === 'ta' ? 'active' : ''}`}
                        onClick={() => setLanguage('ta')}
                    >
                        தமிழ்
                    </button>
                </div>

                {/* Notifications */}
                <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }}>
                    <Bell size={20} />
                    {alertCount > 0 && (
                        <span style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '16px',
                            height: '16px',
                            background: 'var(--danger)',
                            color: 'white',
                            borderRadius: '50%',
                            fontSize: '10px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            {alertCount}
                        </span>
                    )}
                </button>

                <div className="user-profile">
                    <div className="avatar">
                        {user?.username?.[0]?.toUpperCase() || 'A'}
                    </div>
                    <div className="user-info">
                        <span className="username">{user?.username || 'Admin'}</span>
                        <span className="role">{user?.role || 'Administrator'}</span>
                    </div>
                </div>

                <button
                    className="btn btn-ghost btn-icon logout-btn"
                    onClick={handleLogout}
                    title={language === 'ta' ? 'வெளியேறு' : 'Logout'}
                >
                    <LogOut size={20} />
                </button>
            </div>

            <style jsx>{`
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 4px 12px;
                    border-left: 1px solid var(--border);
                    margin-left: 8px;
                }
                .avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-weight: 700;
                    font-size: 13px;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                }
                .username {
                    font-size: 13px;
                    font-weight: 700;
                    color: var(--text);
                    line-height: 1;
                }
                .role {
                    font-size: 10px;
                    font-weight: 600;
                    color: var(--text-muted);
                    text-transform: capitalize;
                }
                .logout-btn {
                    color: var(--danger);
                }
                .logout-btn:hover {
                    background: #fff1f2;
                }
                .hamburger-menu {
                    display: flex;
                }
                @media (min-width: 1024px) {
                    .hamburger-menu {
                        display: none !important;
                    }
                }
            `}</style>
        </header>
    );
}
