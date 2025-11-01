import React from 'react';
import { Smartphone } from 'lucide-react';
import Logo from '../Logo';
import { useLanguage } from '../../contexts/LanguageContext';

interface InstallPwaModalProps {
  installPrompt: Event;
  onInstall: () => void;
  onDismiss: () => void;
}

const InstallPwaModal: React.FC<InstallPwaModalProps> = ({ installPrompt, onInstall, onDismiss }) => {
  const { t } = useLanguage();

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the A2HS prompt');
      } else {
        console.log('User dismissed the A2HS prompt');
      }
      onInstall(); // This will clear the prompt from the parent state and prevent it from showing again
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in-backdrop">
      <div className="bg-white dark:bg-blue-night-900 w-full max-w-md p-6 rounded-t-2xl shadow-lg animate-modal-content-slide-in">
        <div className="flex items-start">
          <Logo className="w-12 h-12 mr-4 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">{t('mobile.installTitle')}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('mobile.installDescription')}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button onClick={onDismiss} className="w-full px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
            {t('mobile.installNotNow')}
          </button>
          <button onClick={handleInstallClick} className="w-full flex items-center justify-center px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Smartphone size={20} className="mr-2" />
            {t('mobile.installAction')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPwaModal;
