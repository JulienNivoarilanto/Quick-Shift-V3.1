import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { DataProvider } from './contexts/DataContext';
import MobileApp from './components/mobile/MobileApp';
import { MobileAuthProvider } from './contexts/MobileAuthContext';
import { MobileDataProvider } from './contexts/MobileDataContext';
import LoadingSpinner from './components/LoadingSpinner';
import * as api from './services/api';
import { Loader2, MailCheck } from 'lucide-react';


const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

const AppWrapper = () => (
    <AuthProvider>
        <DataProvider>
        <App />
        </DataProvider>
    </AuthProvider>
);

const MobileAppWrapper = ({ installPrompt, onInstall }: { installPrompt: Event | null, onInstall: () => void }) => (
    <MobileAuthProvider>
        <MobileDataProvider>
            <MobileApp installPrompt={installPrompt} onInstall={onInstall} />
        </MobileDataProvider>
    </MobileAuthProvider>
);

const RegistrationVerificationView = ({ email }: { email: string }) => {
    const { t } = useLanguage();
    return (
        <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-blue-night-950">
            <div className="p-8 bg-white dark:bg-blue-night-900 rounded-lg shadow-md text-center max-w-lg">
                <div className="flex justify-center mb-4">
                    <div className="p-4 bg-green-100 dark:bg-green-900/50 rounded-full">
                        <MailCheck className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-green-600">{t('auth.registrationSuccessTitle')}</h2>
                <p 
                    className="mt-2 text-gray-600 dark:text-gray-400"
                    dangerouslySetInnerHTML={{
                        __html: t('auth.registrationSuccessBody', { email: `<strong>${email}</strong>` })
                    }}
                />
                <a href="/" className="mt-6 inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">
                    {t('auth.proceedToLogin')}
                </a>
            </div>
        </div>
    );
};


const RegistrationErrorView = ({ error }: { error: string }) => {
    const { t } = useLanguage();
    return (
         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-blue-night-950">
            <div className="p-8 bg-white dark:bg-blue-night-900 rounded-lg shadow-md text-center max-w-md">
                <h2 className="text-2xl font-bold text-red-600">Registration Failed</h2>
                <p className="mt-2">{error}</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">{t('auth.goToHomepage')}</a>
            </div>
        </div>
    );
};

const RegistrationCanceledView = () => {
    const { t } = useLanguage();
    return (
         <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-blue-night-950">
            <div className="p-8 bg-white dark:bg-blue-night-900 rounded-lg shadow-md text-center max-w-md">
                <h2 className="text-2xl font-bold text-yellow-600">{t('auth.paymentCanceledTitle')}</h2>
                <p className="mt-2">{t('auth.paymentCanceledBody')}</p>
                <a href="/" className="mt-4 inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">{t('auth.goToHomepage')}</a>
            </div>
        </div>
    );
};


const SimpleRouter = () => {
  const path = window.location.pathname;
  const isEmployeeLoggedIn = !!localStorage.getItem('quickshift-employee');
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<'idle' | 'processing' | 'success' | 'error' | 'canceled'>('idle');
  const [registrationError, setRegistrationError] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const { t } = useLanguage();
  
  useEffect(() => {
    const handlePaymentStatus = async () => {
        const urlParams = new URLSearchParams(window.location.search);
        
        if (urlParams.get('payment') === 'success') {
            const pendingRegistrationRaw = sessionStorage.getItem('pendingRegistration');
            if (pendingRegistrationRaw) {
                setRegistrationStatus('processing');
                try {
                    const { userData, password, price } = JSON.parse(pendingRegistrationRaw);
                    const result = await api.apiRegister(userData, password, price);
                    if (result.success) {
                        sessionStorage.removeItem('pendingRegistration');
                        setRegisteredEmail(userData.email);
                        setRegistrationStatus('success');
                    } else {
                        setRegistrationStatus('error');
                        if (result.reason === 'email-exists') {
                            setRegistrationError(t('auth.emailExistsPaid'));
                        } else {
                            setRegistrationError(t('auth.registrationFailedPaid'));
                        }
                    }
                } catch (e) {
                    console.error('Failed to process pending registration', e);
                    setRegistrationStatus('error');
                    setRegistrationError('An error occurred during registration. Please contact support.');
                }
            } else {
                 setRegistrationStatus('error');
                 setRegistrationError('No pending registration found. Your payment may have succeeded, but we could not create your account. Please contact support.');
            }
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.get('payment') === 'cancel') {
            sessionStorage.removeItem('pendingRegistration');
            setRegistrationStatus('canceled');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };
    handlePaymentStatus();
  }, [t]);


  useEffect(() => {
    if (path.startsWith('/mobile')) {
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js').then(registration => {
            console.log('SW registered: ', registration);
          }).catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
          });
        });
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setInstallPrompt(e);
        console.log('`beforeinstallprompt` event was fired.');
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, [path]);

  if (registrationStatus === 'processing') return <LoadingSpinner />;
  if (registrationStatus === 'success') return <RegistrationVerificationView email={registeredEmail} />;
  if (registrationStatus === 'error') return <RegistrationErrorView error={registrationError} />;
  if (registrationStatus === 'canceled') return <RegistrationCanceledView />;


  if (isEmployeeLoggedIn) {
    if (path !== '/mobile') {
      window.location.replace('/mobile');
      return <LoadingSpinner />;
    }
    return <MobileAppWrapper installPrompt={installPrompt} onInstall={() => setInstallPrompt(null)} />;
  } else {
    if (path.startsWith('/mobile')) {
      return <MobileAppWrapper installPrompt={installPrompt} onInstall={() => setInstallPrompt(null)} />;
    }
    return <AppWrapper />;
  }
};

root.render(
  <React.StrictMode>
    <ThemeProvider>
        <LanguageProvider>
            <CurrencyProvider>
                <SimpleRouter />
            </CurrencyProvider>
        </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);