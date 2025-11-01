import React, { useState } from 'react';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import MobileLogin from './MobileLogin';
import MobileLayout from './MobileLayout';
import InstallPwaModal from './InstallPwaModal';

interface MobileAppProps {
  installPrompt: Event | null;
  onInstall: () => void;
}

const MobileApp: React.FC<MobileAppProps> = ({ installPrompt, onInstall }) => {
    const { employee, isLoading } = useMobileAuth();
    const [isInstallModalDismissed, setIsInstallModalDismissed] = useState(false);

    if (isLoading) {
        return null; // The auth provider already shows a spinner
    }

    const showInstallPrompt = installPrompt && !isInstallModalDismissed;

    return (
        <div className="bg-slate-100 dark:bg-blue-night-950 min-h-screen font-sans text-slate-800 dark:text-slate-200">
            {employee ? <MobileLayout /> : <MobileLogin />}
            {showInstallPrompt && (
                <InstallPwaModal 
                    installPrompt={installPrompt}
                    onInstall={onInstall}
                    onDismiss={() => setIsInstallModalDismissed(true)}
                />
            )}
        </div>
    );
};

export default MobileApp;