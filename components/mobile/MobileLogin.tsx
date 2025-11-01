import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import Logo from '../Logo';
import { Loader2, Key, Mail } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';
import ThemeToggle from '../ThemeToggle';

const MobileLogin: React.FC = () => {
    const { login, isLoading: isAuthLoading } = useMobileAuth();
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [accessCode, setAccessCode] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const formRef = useRef<HTMLFormElement>(null);
    const hiddenInputRef = useRef<HTMLInputElement>(null);

    const handleFormSubmit = useCallback(async (event?: React.FormEvent) => {
        event?.preventDefault();
        if (isSubmitting || isAuthLoading) return;

        setError('');
        setIsSubmitting(true);
        const success = await login(email, accessCode);
        if (!success) {
            setError(t('mobile.loginError'));
            setAccessCode(''); // Clear code on error for re-entry
        }
        setIsSubmitting(false);
    }, [email, accessCode, login, t, isSubmitting, isAuthLoading]);

    useEffect(() => {
        if (accessCode.length === 6) {
            handleFormSubmit();
        }
    }, [accessCode, handleFormSubmit]);


    const isLoading = isSubmitting || isAuthLoading;

    const inputWrapperStyle = "relative";
    const textInputStyle = "w-full pl-10 pr-4 py-3 text-base border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500";
    const iconStyle = "absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500";
    const labelStyle = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 text-left";

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-slate-100 dark:bg-blue-night-950">
            <div className="absolute top-4 right-4 flex items-center space-x-2">
                <LanguageSwitcher />
                <ThemeToggle />
            </div>
            <div className="w-full max-w-sm mx-auto text-center">
                <Logo className="w-20 h-20 mx-auto text-blue-600 dark:text-blue-400" />
                <h1 className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-100">{t('mobile.loginTitle')}</h1>
                <p className="mt-1 text-base text-slate-600 dark:text-slate-400">{t('mobile.loginSubtitle')}</p>

                <form ref={formRef} onSubmit={handleFormSubmit} className="mt-8 space-y-6 text-left">
                    <div className={inputWrapperStyle}>
                         <label htmlFor="email-input" className={labelStyle}>{t('auth.emailLabel')}</label>
                        <Mail size={20} className={iconStyle} style={{top: 'calc(50% + 10px)'}} />
                        <input
                            id="email-input"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('auth.emailLabel')}
                            required
                            className={textInputStyle}
                        />
                    </div>
                     <div className={inputWrapperStyle}>
                        <label htmlFor="access-code" className={labelStyle}>{t('mobile.accessCodePlaceholder')}</label>
                        <div
                            onClick={() => hiddenInputRef.current?.focus()}
                            className="relative mt-1 flex justify-center space-x-2 cursor-text"
                        >
                            {Array.from({ length: 6 }).map((_, index) => {
                                const digit = accessCode[index];
                                const isActive = index === accessCode.length;
                                return (
                                    <div
                                        key={index}
                                        className={`w-12 h-14 flex items-center justify-center text-3xl font-bold border-2 rounded-lg transition-all
                                            ${isActive && !isLoading ? 'border-blue-500' : 'border-slate-300 dark:border-slate-600'}
                                            ${digit ? '!border-slate-400 dark:!border-slate-500' : ''}
                                        `}
                                    >
                                        {digit ? '•' : ''}
                                        {isActive && !isLoading && (
                                            <div className="absolute w-px h-7 bg-blue-500 animate-blink" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <input
                            id="access-code"
                            ref={hiddenInputRef}
                            type="tel"
                            value={accessCode}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '');
                                setAccessCode(value);
                            }}
                            autoFocus
                            maxLength={6}
                            className="absolute opacity-0 w-0 h-0"
                            autoComplete="one-time-code"
                            disabled={isLoading}
                        />
                    </div>
                    
                    {error && <p className="text-sm text-center text-red-600 dark:text-red-400">{error}</p>}

                    <button
                        type="submit"
                        disabled={isLoading || accessCode.length !== 6}
                        className="w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : t('mobile.loginButton')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MobileLogin;