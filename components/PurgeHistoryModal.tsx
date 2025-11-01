import React, { useState } from 'react';
import Modal from './Modal';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface PurgeHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPurge: (startDate: Date, endDate: Date) => Promise<void>;
}

const toInputDateString = (date: Date): string => date.toISOString().split('T')[0];

const PurgeHistoryModal: React.FC<PurgeHistoryModalProps> = ({ isOpen, onClose, onPurge }) => {
    const { t } = useLanguage();
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const oneMonthAgo = new Date(twoWeeksAgo);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const [startDate, setStartDate] = useState(toInputDateString(oneMonthAgo));
    const [endDate, setEndDate] = useState(toInputDateString(twoWeeksAgo));
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const validateDates = (start: string, end: string): boolean => {
        const endDateObj = new Date(end + 'T23:59:59');
        if (endDateObj > twoWeeksAgo) {
            setError(t('history.purgeInvalidDate'));
            return false;
        }
        if (new Date(start) > new Date(end)) {
             setError('Start date cannot be after end date.');
             return false;
        }
        setError('');
        return true;
    };
    
    const handlePurge = async () => {
        if (!validateDates(startDate, endDate)) return;

        if (window.confirm(t('history.confirmPurge', { start: startDate, end: endDate }))) {
            setIsProcessing(true);
            try {
                await onPurge(new Date(startDate + 'T00:00:00'), new Date(endDate + 'T23:59:59'));
                alert(t('history.purgeSuccess'));
                onClose();
            } catch (err) {
                console.error(err);
                setError(t('history.purgeError'));
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handlePurge} disabled={isProcessing} className="btn-danger p-2" title={t('history.purge')}>
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20}/>}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('history.purgeTitle')} footer={footer}>
            <div className="space-y-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm flex items-start">
                    <AlertTriangle className="w-8 h-8 mr-3 flex-shrink-0" />
                    <div>
                        <p className="font-bold">{t('history.purgeDescription')}</p>
                        <p className="mt-1">{t('history.purgeWarning')}</p>
                    </div>
                </div>
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('modals.dateRange')}</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); validateDates(e.target.value, endDate); }}
                            max={toInputDateString(twoWeeksAgo)}
                            className="input-style"
                        />
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); validateDates(startDate, e.target.value); }}
                            min={startDate}
                            max={toInputDateString(twoWeeksAgo)}
                            className="input-style"
                        />
                    </div>
                </div>
            </div>
             <style>{`
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; }
                .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; }
                .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
                .btn-danger { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #dc2626; }
                .dark .btn-danger:disabled { background-color: #450a0a; }
            `}</style>
        </Modal>
    );
};

export default PurgeHistoryModal;