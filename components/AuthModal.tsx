import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Plan, BusinessType, ActivitySector } from '../types';
import { Check, Calendar, Users, BarChart3, CalendarOff, MailCheck, Loader2, CreditCard, AlertTriangle, Eye, EyeOff, Info, CheckCircle, Circle } from 'lucide-react';
import Logo from './Logo';
import { useCurrency } from '../contexts/CurrencyContext';
import { apiCreateStripeCheckoutSession } from '../services/api';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialView?: 'login' | 'register';
    initialPlan?: Plan;
}

type AuthView = 'login' | 'register' | 'forgotPassword' | 'forgotPasswordSuccess' | 'registerSuccess';

const FeatureItem: React.FC<{icon: React.ReactNode, title: string, description: string}> = ({icon, title, description}) => (
    <div className="flex items-start">
        <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 dark:bg-slate-800">
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-base font-semibold text-slate-800 dark:text-slate-200">{title}</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{description}</p>
        </div>
    </div>
);

const PasswordRequirement: React.FC<{isValid: boolean; text: string}> = ({ isValid, text }) => (
    <li className={`flex items-center text-xs transition-colors ${isValid ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {isValid ? <CheckCircle size={14} className="mr-2 flex-shrink-0"/> : <Circle size={14} className="mr-2 flex-shrink-0"/> }
        {text}
    </li>
);


const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialView = 'login', initialPlan = 'Pro' }) => {
    const [authView, setAuthView] = useState<AuthView>(initialView);
    const { login, register, verifyUser, forgotPassword, loginWithGoogle } = useAuth();
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const [error, setError] = useState('');
    
    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [plan, setPlan] = useState<Plan>(initialPlan);
    const [businessType, setBusinessType] = useState<BusinessType>('Company');
    const [activitySector, setActivitySector] = useState<ActivitySector | ''>('');
    const [companyName, setCompanyName] = useState('');
    const [address, setAddress] = useState('');
    
    const [registeredEmail, setRegisteredEmail] = useState('');

    // Password UI state
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [infoPopoverVisible, setInfoPopoverVisible] = useState(false);
    const [passwordValidity, setPasswordValidity] = useState({
        length: false,
        uppercase: false,
        number: false,
        special: false,
    });
    const infoButtonRef = useRef<HTMLButtonElement>(null);
    const infoPopoverRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);


    useEffect(() => {
        if (isOpen) {
            setAuthView(initialView);
            setPlan(initialPlan);
        }
    }, [isOpen, initialView, initialPlan]);

    useEffect(() => {
        if (!isOpen) return;

        setError('');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setBusinessType('Company');
        setActivitySector('');
        setCompanyName('');
        setAddress('');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setInfoPopoverVisible(false);
        setPasswordValidity({ length: false, uppercase: false, number: false, special: false });
        setIsProcessing(false);

    }, [authView, isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                infoPopoverRef.current?.contains(event.target as Node) ||
                infoButtonRef.current?.contains(event.target as Node)
            ) {
                return;
            }
            setInfoPopoverVisible(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const validatePassword = (pass: string) => {
        setPasswordValidity({
            length: pass.length >= 8,
            uppercase: /[A-Z]/.test(pass),
            number: /\d/.test(pass),
            special: /[^A-Za-z0-9]/.test(pass),
        });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPassword = e.target.value;
        setPassword(newPassword);
        validatePassword(newPassword);
    };


    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);
        try {
            const result = await login(email, password);
            if (!result.success) {
                if (result.reason === 'unverified') {
                    setError(t('auth.unverified'));
                } else {
                    setError(t('auth.invalidCredentials'));
                }
                setIsProcessing(false);
            } else {
                onClose();
            }
        } catch (err) {
            setError(t('auth.invalidCredentials'));
            setIsProcessing(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsProcessing(true);
        try {
            const result = await loginWithGoogle();
            if (result.success) {
                onClose();
            } else {
                setError(t('auth.googleLoginFailed'));
                setIsProcessing(false);
            }
        } catch (err) {
            setError(t('auth.googleLoginFailed'));
            setIsProcessing(false);
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);
        try {
            const result = await forgotPassword(email);
            if (result.success) {
                setAuthView('forgotPasswordSuccess');
            } else {
                setError(t(result.messageKey));
            }
        } catch(err) {
            setError(t('auth.invalidCredentials'));
        } finally {
            setIsProcessing(false);
        }
    };
    
    const planKeys: { [key in Plan]: string } = {
        'Gratuit': 'freePlan',
        'Pro': 'proPlan',
        'Pro Plus': 'proPlusPlan',
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const allValid = Object.values(passwordValidity).every(v => v);

        if (password !== confirmPassword) {
            setError(t('auth.passwordMismatch'));
            return;
        }
        if (!allValid) {
            setError(t('auth.passwordDoesNotMeetRequirements'));
            return;
        }
        
        const finalCompanyName = companyName.trim() || name.trim();
        if (!finalCompanyName) {
            setError(t('auth.companyNameRequired'));
            return;
        }

        setIsProcessing(true);

        if (plan !== 'Gratuit') {
            const registrationData = {
                name, email, password, plan, businessType,
                companyName: finalCompanyName,
                ...(activitySector && { activitySector }),
                ...(address && { address }),
            };
            try {
                await apiCreateStripeCheckoutSession(registrationData);
            } catch (err) {
                setError('Could not connect to payment service. Please try again.');
                setIsProcessing(false);
            }
            return;
        }

        // Free plan registration
        try {
            const result = await register({
                name,
                email,
                plan,
                businessType,
                companyName: finalCompanyName,
                ...(activitySector && { activitySector }),
                ...(address && { address }),
            }, password);

            if (!result.success) {
                if (result.reason === 'email-exists') {
                    setError(t('auth.emailExists'));
                } else {
                    setError(t('auth.registrationFailedUnknown'));
                }
                setIsProcessing(false);
            } else {
                setRegisteredEmail(email);
                setAuthView('registerSuccess');
            }
        } catch (err) {
            setError(t('auth.emailExists'));
            setIsProcessing(false);
        }
    };
    
    const handleProceedToLogin = () => {
        verifyUser(registeredEmail);
        setAuthView('login');
    };

    const getTitle = () => {
        switch (authView) {
            case 'login': return t('auth.welcomeBack');
            case 'register': return t('auth.createAccount');
            case 'registerSuccess': return t('auth.registrationSuccessTitle');
            case 'forgotPassword': return t('auth.forgotPasswordTitle');
            case 'forgotPasswordSuccess': return t('auth.resetLinkSentTitle');
            default: return '';
        }
    };

    const planDetails: { [key in Plan]: { key: string; featureCount: number } } = {
        'Gratuit': { key: 'freePlan', featureCount: 7 },
        'Pro': { key: 'proPlan', featureCount: 9 },
        'Pro Plus': { key: 'proPlusPlan', featureCount: 13 },
    };

    const buttonPrimaryClasses = "w-full py-2.5 px-5 bg-blue-600 text-white font-semibold rounded-lg transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()} size="5xl">
            <div className={`grid md:grid-cols-2 md:gap-10 ${authView === 'register' ? 'min-h-[640px]' : ''} text-slate-900 dark:text-slate-100`}>
                <div className="flex flex-col">
                     {authView === 'login' && (
                        <div className="text-center mb-6">
                            <p 
                                className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
                                onClick={() => setAuthView('register')}
                                dangerouslySetInnerHTML={{ __html: t('auth.dontHaveAccount', { signUp: `<button class="font-semibold text-blue-600 hover:underline dark:text-blue-400">${t('auth.signUp')}</button>` }) }}
                            >
                            </p>
                        </div>
                    )}

                    {error && <p className="mb-4 text-center text-sm text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 py-2.5 px-4 rounded-lg flex items-center justify-center"><AlertTriangle size={16} className="mr-2"/>{error}</p>}
                    
                    {authView === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4 flex-grow flex flex-col justify-center">
                            <div>
                                <label htmlFor="login-email" className="label-style">{t('auth.emailLabel')}</label>
                                <input id="login-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-style" disabled={isProcessing}/>
                            </div>
                            <div>
                                <label htmlFor="login-password" className="label-style">{t('auth.passwordLabel')}</label>
                                <input id="login-password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-style" disabled={isProcessing}/>
                            </div>
                             <div className="text-right">
                                <a href="#" className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400" onClick={(e) => {e.preventDefault(); setAuthView('forgotPassword');}}>
                                    {t('auth.forgotPassword')}
                                </a>
                            </div>
                            <button type="submit" className={buttonPrimaryClasses} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin" /> : t('auth.signIn')}
                            </button>
                            
                            <div className="flex items-center my-4">
                                <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
                                <span className="mx-4 text-sm text-slate-500 dark:text-slate-400">{t('auth.orSeparator')}</span>
                                <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
                            </div>
                            
                            <div className="space-y-3">
                                <button 
                                    type="button" 
                                    onClick={handleGoogleLogin}
                                    disabled={isProcessing}
                                    className="w-full flex justify-center items-center py-2.5 px-4 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : (
                                        <>
                                            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" className="mr-2 flex-shrink-0">
                                                <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
                                                <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                                                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29H0.957275C0.347727 8.51727 0 10.035 0 11.29C0 8.70682 0.527273 6.26318 1.42636 4.95818L4.335 7.20636C4.13636 7.74636 4.03364 8.32318 4.03364 8.95C4.03364 8.40682 3.78409 7.83 3.96409 7.29V10.71Z" fill="#FBBC05"/>
                                                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                                            </svg>
                                            {t('auth.continueWithGoogle')}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                    {authView === 'register' && (
                        <form onSubmit={handleRegister} className="space-y-4 overflow-y-auto pr-2 -mr-2">
                            <h4 className="font-semibold border-b dark:border-slate-700 pb-2">{t('profile.profileDetails')}</h4>
                            <div>
                                <label htmlFor="register-name" className="label-style">{t('auth.fullNameLabel')}</label>
                                <input id="register-name" name="name" type="text" value={name} onChange={e => setName(e.target.value)} required className="input-style" disabled={isProcessing}/>
                            </div>
                            <div>
                                <label htmlFor="register-email" className="label-style">{t('auth.emailLabel')}</label>
                                <input id="register-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-style" disabled={isProcessing}/>
                            </div>

                            <div className="relative">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label htmlFor="register-password" className="label-style !mb-0">{t('auth.passwordLabel')}</label>
                                            <button ref={infoButtonRef} type="button" onClick={() => setInfoPopoverVisible(prev => !prev)} aria-label={t('auth.showPasswordInfo')}>
                                                <Info size={16} className="text-slate-400 cursor-pointer" />
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <input 
                                                id="register-password" 
                                                name="password" 
                                                type={showPassword ? 'text' : 'password'} 
                                                value={password} 
                                                onChange={handlePasswordChange}
                                                onFocus={() => setInfoPopoverVisible(true)}
                                                required 
                                                className="input-style" 
                                                disabled={isProcessing}
                                            />
                                            <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500" aria-label={t('auth.togglePasswordVisibility')}>
                                                {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="register-confirm-password" className="label-style">{t('auth.confirmPasswordLabel')}</label>
                                        <div className="relative">
                                            <input 
                                                id="register-confirm-password" 
                                                name="confirmPassword" 
                                                type={showConfirmPassword ? 'text' : 'password'} 
                                                value={confirmPassword} 
                                                onChange={e => setConfirmPassword(e.target.value)} 
                                                required 
                                                className="input-style" 
                                                disabled={isProcessing}
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500" aria-label={t('auth.togglePasswordVisibility')}>
                                                {showConfirmPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {infoPopoverVisible && (
                                    <div ref={infoPopoverRef} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 p-3 bg-slate-800 text-white rounded-lg shadow-lg z-10">
                                        <p className="font-semibold text-sm mb-2">{t('auth.passwordReqTitle')}</p>
                                        <ul className="space-y-1">
                                            <PasswordRequirement isValid={passwordValidity.length} text={t('auth.passwordReqLength')} />
                                            <PasswordRequirement isValid={passwordValidity.uppercase} text={t('auth.passwordReqUppercase')} />
                                            <PasswordRequirement isValid={passwordValidity.number} text={t('auth.passwordReqNumber')} />
                                            <PasswordRequirement isValid={passwordValidity.special} text={t('auth.passwordReqSpecial')} />
                                        </ul>
                                    </div>
                                )}
                            </div>
                           
                            <h4 className="font-semibold border-b dark:border-slate-700 pb-2 pt-2">{t('auth.companyInfo')}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="businessType" className="label-style">{t('auth.businessTypeLabel')}</label>
                                    <select id="businessType" name="businessType" value={businessType} onChange={e => setBusinessType(e.target.value as BusinessType)} className="input-style appearance-none" disabled={isProcessing}>
                                        <option value="Company">{t('auth.businessTypeCompany')}</option>
                                        <option value="Individual">{t('auth.businessTypeIndividual')}</option>
                                        <option value="Other">{t('auth.businessTypeOther')}</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="activitySector" className="label-style">{t('auth.activitySectorLabel')}</label>
                                    <select id="activitySector" name="activitySector" value={activitySector} onChange={e => setActivitySector(e.target.value as ActivitySector)} className="input-style appearance-none" disabled={isProcessing}>
                                        <option value="">-- {t('modals.none')} --</option>
                                        <option value="Individual">{t('auth.activitySectorIndividual')}</option>
                                        <option value="Health">{t('auth.activitySectorHealth')}</option>
                                        <option value="Technology">{t('auth.activitySectorTechnology')}</option>
                                        <option value="Administration">{t('auth.activitySectorAdministration')}</option>
                                        <option value="Finance">{t('auth.activitySectorFinance')}</option>
                                        <option value="Commerce">{t('auth.activitySectorCommerce')}</option>
                                        <option value="Social">{t('auth.activitySectorSocial')}</option>
                                        <option value="Other">{t('auth.activitySectorOther')}</option>
                                    </select>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="companyName" className="label-style">{t('auth.companyNameLabel')}</label>
                                <input id="companyName" name="companyName" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder={t('auth.companyNamePlaceholder')} required className="input-style" disabled={isProcessing}/>
                            </div>
                             <div>
                                <label htmlFor="address" className="label-style">{t('auth.addressLabel')}</label>
                                <input id="address" name="address" type="text" value={address} onChange={e => setAddress(e.target.value)} className="input-style" disabled={isProcessing}/>
                            </div>
                            
                            <button type="submit" className={`${buttonPrimaryClasses} mt-4`} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin" /> : (plan === 'Gratuit' ? t('auth.createAccountButton') : t('auth.goToPayment'))}
                            </button>
                        </form>
                    )}
                    {authView === 'registerSuccess' && (
                        <div className="flex flex-col items-center justify-center text-center h-full py-8">
                            <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full">
                                <MailCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold">{t('auth.registrationSuccessTitle')}</h3>
                            <p
                                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                                dangerouslySetInnerHTML={{
                                    __html: t('auth.registrationSuccessBody', { email: `<strong class="font-medium text-slate-800 dark:text-slate-200">${registeredEmail}</strong>` })
                                }}
                            />
                            <button onClick={handleProceedToLogin} className={`mt-6 ${buttonPrimaryClasses}`}>
                                {t('auth.proceedToLogin')}
                            </button>
                        </div>
                    )}
                    {authView === 'forgotPassword' && (
                        <form onSubmit={handleForgotPassword} className="space-y-4 flex-grow flex flex-col justify-center">
                            <p className="text-sm text-center text-slate-600 dark:text-slate-400">{t('auth.forgotPasswordInstruction')}</p>
                            <div>
                                <label htmlFor="forgot-email" className="label-style">{t('auth.emailLabel')}</label>
                                <input id="forgot-email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-style" disabled={isProcessing}/>
                            </div>
                            <button type="submit" className={buttonPrimaryClasses} disabled={isProcessing}>
                                {isProcessing ? <Loader2 className="animate-spin" /> : t('auth.sendResetLink')}
                            </button>
                            <div className="text-center">
                                <button type="button" onClick={() => setAuthView('login')} className="font-semibold text-blue-600 hover:underline dark:text-blue-400 text-sm">
                                    {t('auth.backToLogin')}
                                </button>
                            </div>
                        </form>
                    )}
                    {authView === 'forgotPasswordSuccess' && (
                        <div className="flex flex-col items-center justify-center text-center h-full py-8">
                            <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full">
                                <MailCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="mt-4 text-xl font-bold">{t('auth.resetLinkSentTitle')}</h3>
                            <p
                                className="mt-2 text-sm text-slate-600 dark:text-slate-400"
                                dangerouslySetInnerHTML={{
                                    __html: t('auth.resetLinkSentBody', { email: `<strong class="font-medium text-slate-800 dark:text-slate-200">${email}</strong>` })
                                }}
                            />
                            <button onClick={() => setAuthView('login')} className={`mt-6 ${buttonPrimaryClasses}`}>
                                {t('auth.backToLogin')}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="hidden md:flex flex-col bg-slate-100 dark:bg-slate-950 p-8 rounded-lg h-full">
                    {authView === 'register' ? (() => {
                        const selectedPlanDetails = planDetails[plan];
                        const planKey = selectedPlanDetails.key;
                        const price = Number(t(`pricing.${planKey}Price`));
                        const features = Array.from({ length: selectedPlanDetails.featureCount }, (_, i) => t(`pricing.${planKey}Feature${i + 1}`));

                        return (
                            <div className="flex flex-col h-full">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">{t('auth.selectedPlanLabel')}</h3>
                                
                                <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 mb-6">
                                    {(['Gratuit', 'Pro', 'Pro Plus'] as Plan[]).map(planName => (
                                        <button
                                            key={planName}
                                            type="button"
                                            onClick={() => setPlan(planName)}
                                            className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                                                plan === planName
                                                    ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            {t(`pricing.${planKeys[planName]}Name`)}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex-grow space-y-3 pr-2 -mr-3 overflow-y-auto">
                                    <div className="flex justify-between items-baseline">
                                        <h4 className="font-bold text-xl text-slate-800 dark:text-slate-100">{t(`pricing.${planKey}Name`)}</h4>
                                        <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                            {price === 0 ? t('pricing.freePlanName') : `${formatCurrency(price)}`}
                                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{price > 0 ? t('pricing.perMonth') : ''}</span>
                                        </p>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t(`pricing.${planKey}Desc`)}</p>
                                    <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                                        {features.map((feature, index) => (
                                            <li key={index} className="flex items-start">
                                                <Check size={16} className="text-green-500 mr-2 mt-0.5 flex-shrink-0" /> 
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="mt-auto text-center pt-6">
                                    <p 
                                        className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer"
                                        onClick={() => setAuthView('login')}
                                        dangerouslySetInnerHTML={{ __html: t('auth.alreadyHaveAccount', { signIn: `<button class="font-semibold text-blue-600 hover:underline dark:text-blue-400">${t('auth.signIn')}</button>` }) }}
                                    >
                                    </p>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex flex-col items-center justify-center h-full">
                            <Logo className="w-16 h-16" />
                            <h3 className="mt-4 text-2xl font-bold text-center text-slate-800 dark:text-white">{t('appName')}</h3>
                            <p className="mt-2 text-center text-sm text-slate-600 dark:text-slate-400">
                                {t('landingPage.heroSubtitle')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
             <style>{`
                .label-style { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: #475569; text-align: left; }
                .dark .label-style { color: #cbd5e1; }
                .input-style { display: block; width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; color: #1e293b; transition: border-color 0.2s, box-shadow 0.2s; }
                .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .input-style:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4); }
            `}</style>
        </Modal>
    );
};

export default AuthModal;