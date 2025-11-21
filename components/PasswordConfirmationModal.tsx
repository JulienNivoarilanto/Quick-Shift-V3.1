import React, { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Loader2, AlertTriangle } from 'lucide-react';

interface PasswordConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
}

const PasswordConfirmationModal: React.FC<PasswordConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
    const { t } = useLanguage();
    const { reauthenticate } = useAuth();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsProcessing(true);

        try {
            const result = await reauthenticate(password);
            if (result.success) {
                onConfirm();
                onClose();
            } else {
                setError(t('profile.userManagement.incorrectPassword'));
            }
        } catch (err) {
            setError('An error occurred during authentication.');
        } finally {
            setIsProcessing(false);
        }
    };

    const footer = (
        <>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isProcessing}>
                {t('modals.cancel')}
            </button>
            <button 
                type="submit" 
                form="password-confirm-form"
                className="btn-primary w-28 flex justify-center"
                disabled={isProcessing || !password}
            >
                {isProcessing ? <Loader2 className="animate-spin" /> : t('modals.confirm')}
            </button>
        </>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={title || t('profile.userManagement.confirmActionTitle')} 
            footer={footer}
            size="md"
        >
            <form id="password-confirm-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-lg flex items-start text-sm">
                    <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <p>{description || t('profile.userManagement.confirmActionDescription')}</p>
                </div>

                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        {t('profile.userManagement.confirmPassword')}
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                </div>
            </form>
        </Modal>
    );
};

export default PasswordConfirmationModal;