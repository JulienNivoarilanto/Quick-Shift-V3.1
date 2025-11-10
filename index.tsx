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
import { MailCheck, Loader2 } from 'lucide-react';
import firebase from 'firebase/compat/app';


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

const RegistrationVerificationView = ({ email }: { email: string | null }) => {
    const { t } = useLanguage();
    const [isChecking, setIsChecking] = useState(!!email);
    const [isUserFound, setIsUserFound] = useState(false);

    useEffect(() => {
        if (!email) {
            // Fallback for flows without email, just wait 5s.
            const timer = setTimeout(() => setIsChecking(false), 5000);
            return () => clearTimeout(timer);
        }

        // Poll for user creation by webhook.
        const pollInterval = 2000; // every 2 seconds
        const maxAttempts = 10; // for 20 seconds
        let attempts = 0;
        let intervalId: number;

        const pollForUser = async () => {
            attempts++;
            try {
                const methods = await firebase.auth().fetchSignInMethodsForEmail(email);
                if (methods.length > 0) {
                    setIsUserFound(true);
                    setIsChecking(false);
                    // The backend (Stripe webhook or auth.onCreate trigger) is responsible for sending the verification email.
                    // This polling confirms account creation for a better UX.
                    clearInterval(intervalId);
                } else if (attempts >= maxAttempts) {
                    setIsChecking(false); // Stop checking after timeout
                    clearInterval(intervalId);
                }
            } catch (error) {
                console.error("Polling for user failed:", error);
                setIsChecking(false); // Stop on error
                clearInterval(intervalId);
            }
        };

        // Start polling
        intervalId = setInterval(pollForUser, pollInterval);
        // Initial check
        pollForUser();

        // Cleanup
        return () => clearInterval(intervalId);
    }, [email]);

    const message = t('auth.paymentSuccessBody');

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
                    dangerouslySetInnerHTML={{ __html: message }}
                />
                <div className="mt-6">
                    {isChecking ? (
                        <div className="flex flex-col items-center animate-slide-in-up">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <Loader2 className="animate-spin mr-2" />
                                <span>{t('auth.finalizingAccount')}</span>
                            </div>
                            <button disabled className="mt-2 inline-block bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg cursor-wait">
                                {t('auth.proceedToLogin')}
                            </button>
                        </div>
                    ) : (
                        <a href="/" className="inline-block bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg animate-slide-in-up">
                            {t('auth.proceedToLogin')}
                        </a>
                    )}
                </div>
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

  if (path === '/payment/success') {
    const urlParams = new URLSearchParams(window.location.search);
    const email = urlParams.get('email');
    return <RegistrationVerificationView email={email} />;
  }

  if (path === '/payment/cancel') {
    return <RegistrationCanceledView />;
  }

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