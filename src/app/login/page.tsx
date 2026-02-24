'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { translations } from '@/lib/translations';
import { Leaf, Lock, User as UserIcon, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const login = useStore((s) => s.login);
    const isAuthenticated = useStore((s) => s.isAuthenticated);
    const language = useStore((s) => s.language);
    const setLanguage = useStore((s) => s.setLanguage);
    const router = useRouter();

    const t = translations[language];

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Artificial delay for premium feel
        await new Promise(r => setTimeout(r, 800));

        const success = login(username, password);
        if (success) {
            router.push('/');
        } else {
            setError(language === 'ta' ? 'தவறான பயனர்பெயர் அல்லது கடவுச்சொல்' : 'Invalid username or password');
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-visual">
                <div className="visual-overlay"></div>
                <div className="visual-content">
                    <div className="brand-badge">
                        <Leaf size={24} />
                        <span>{language === 'ta' ? 'தீவனம் கடை' : 'Theevanam Shop'}</span>
                    </div>
                    <h2>{language === 'ta' ? 'நவீன முறையில் உங்கள் கடையை நிர்வகிக்கவும்' : 'Modernize your shop management effortlessly.'}</h2>
                    <p>{language === 'ta' ? 'சிறந்த தொழில்நுட்பத்துடன் உங்கள் வணிகத்தை அடுத்த நிலைக்கு எடுத்துச் செல்லுங்கள்.' : 'Powering local dairy and feed businesses with state-of-the-art tools.'}</p>
                </div>
            </div>

            <div className="login-form-side">
                <div className="login-container">
                    <div className="login-card">
                        <div className="login-header">
                            <h1>{language === 'ta' ? 'வணக்கம்!' : 'Welcome Back'}</h1>
                            <p>{language === 'ta' ? 'உள்நுழைய உங்கள் விவரங்களை உள்ளிடவும்' : 'Please enter your details to sign in'}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="login-form">
                            <div className="form-group">
                                <label>{language === 'ta' ? 'பயனர்பெயர்' : 'Username'}</label>
                                <div className="input-wrapper">
                                    <UserIcon size={18} className="input-icon" />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="e.g. admin"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>{language === 'ta' ? 'கடவுச்சொல்' : 'Password'}</label>
                                <div className="input-wrapper">
                                    <Lock size={18} className="input-icon" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="login-error animate-shake">{error}</div>}

                            <button type="submit" className="login-button" disabled={loading}>
                                {loading ? (
                                    <span className="loader"></span>
                                ) : (
                                    <>
                                        {language === 'ta' ? 'உள்நுழைக' : 'Sign In'}
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="login-footer">
                            <div className="lang-switcher">
                                <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
                                <span className="divider"></span>
                                <button className={language === 'ta' ? 'active' : ''} onClick={() => setLanguage('ta')}>தமிழ்</button>
                            </div>
                            <p className="hint">
                                {language === 'ta' ? 'நிர்வாக அணுகல்: admin / admin' : 'Admin access: admin / admin'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .login-page {
                    min-height: 100vh;
                    width: 100vw;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    background: #ffffff;
                }

                .login-visual {
                    position: relative;
                    background-image: url('https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&q=80&w=2000');
                    background-size: cover;
                    background-position: center;
                    display: flex;
                    align-items: flex-end;
                    padding: 80px;
                    color: white;
                    overflow: hidden;
                }

                .visual-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(to top, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.2));
                }

                .visual-content {
                    position: relative;
                    z-index: 10;
                    max-width: 600px;
                    animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .brand-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(34, 197, 94, 0.2);
                    backdrop-filter: blur(8px);
                    padding: 8px 16px;
                    border-radius: 100px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    margin-bottom: 24px;
                    font-weight: 700;
                    font-size: 14px;
                    color: #4ade80;
                }

                .visual-content h2 {
                    font-size: 42px;
                    font-weight: 800;
                    line-height: 1.1;
                    margin-bottom: 16px;
                    letter-spacing: -0.02em;
                }

                .visual-content p {
                    font-size: 18px;
                    opacity: 0.8;
                    line-height: 1.6;
                }

                .login-form-side {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 40px;
                    background: white;
                }

                .login-container {
                    width: 100%;
                    max-width: 380px;
                    animation: fade-in 0.8s ease-out;
                }

                .login-header {
                    margin-bottom: 32px;
                }

                .login-header h1 {
                    font-size: 32px;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.01em;
                    margin-bottom: 8px;
                }

                .login-header p {
                    color: #64748b;
                    font-size: 15px;
                }

                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .form-group label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #475569;
                    margin-left: 2px;
                }

                .input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    color: #94a3b8;
                    transition: color 0.2s;
                }

                .form-group input {
                    width: 100%;
                    padding: 12px 16px 12px 42px;
                    border: 2px solid #f1f5f9;
                    border-radius: 12px;
                    font-size: 15px;
                    transition: all 0.2s;
                    outline: none;
                    background: #f8fafc;
                }

                .form-group input:focus {
                    border-color: #22c55e;
                    background: white;
                    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.08);
                }

                .form-group input:focus + .input-icon {
                    color: #22c55e;
                }

                .toggle-password {
                    position: absolute;
                    right: 12px;
                    color: #94a3b8;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    transition: color 0.2s;
                }

                .toggle-password:hover { color: #475569; }

                .login-error {
                    background: #fef2f2;
                    color: #dc2626;
                    padding: 12px;
                    border-radius: 10px;
                    font-size: 13px;
                    font-weight: 600;
                    text-align: center;
                    border: 1px solid #fee2e2;
                }

                .login-button {
                    background: #0f172a;
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 12px;
                    font-size: 15px;
                    font-weight: 800;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.2s;
                    margin-top: 8px;
                }

                .login-button:hover:not(:disabled) {
                    background: #1e293b;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1);
                }

                .login-button:active:not(:disabled) { transform: translateY(0); }

                .login-button:disabled { opacity: 0.7; cursor: not-allowed; }

                .login-footer {
                    margin-top: 40px;
                    text-align: center;
                }

                .lang-switcher {
                    display: inline-flex;
                    align-items: center;
                    background: #f1f5f9;
                    padding: 4px;
                    border-radius: 100px;
                    margin-bottom: 16px;
                }

                .lang-switcher button {
                    background: none;
                    border: none;
                    padding: 6px 16px;
                    font-size: 13px;
                    font-weight: 700;
                    color: #64748b;
                    cursor: pointer;
                    border-radius: 100px;
                    transition: all 0.2s;
                }

                .lang-switcher button.active {
                    background: white;
                    color: #16a34a;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
                }

                .hint {
                    color: #94a3b8;
                    font-size: 12px;
                    font-style: italic;
                }

                .loader {
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    border-top-color: white;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px); }
                    75% { transform: translateX(4px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 2; }

                @media (max-width: 1000px) {
                    .login-page { grid-template-columns: 1fr; }
                    .login-visual { display: none; }
                }
            `}</style>
        </div>
    );
}
