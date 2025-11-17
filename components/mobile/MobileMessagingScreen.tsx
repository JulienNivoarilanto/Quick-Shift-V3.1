import React, { useState, useMemo, useRef, FC } from 'react';
import { useMobileData } from '../../contexts/MobileDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Loader2, Send, Users, User, MessageSquare as MessageIcon, FileText } from 'lucide-react';
import Modal from '../Modal';
import { AbsenceType, InboxMessage, MessageGroup, ChatMessage, Employee } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import Avatar from '../Avatar';

const toInputDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const timeAgo = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

const SegmentedControl: FC<{
    tabs: { id: string; label: string; }[];
    activeTab: string;
    onTabChange: (id: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => (
    <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                    activeTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
            >
                {tab.label}
            </button>
        ))}
    </div>
);


const MobileMessagingScreen: React.FC = () => {
    const { t, language } = useLanguage();
    const { employee } = useMobileAuth();
    const { absenceTypes, submitRequest, inboxMessages, messageGroups, chatMessages, isLoading: isDataLoading, sendChatMessage, allEmployees } = useMobileData();
    const [activeTab, setActiveTab] = useState<'absence' | 'complaint' | 'group' | 'direct'>('absence');

    const [absenceData, setAbsenceData] = useState({
        absenceTypeId: absenceTypes[0]?.id || '',
        startDate: toInputDateString(new Date()),
        endDate: toInputDateString(new Date()),
        body: '',
    });

    const [complaintData, setComplaintData] = useState({ body: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ isOpen: boolean, title: string, body: string }>({ isOpen: false, title: '', body: '' });

    const handleAbsenceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.confirm(t('mobile.confirmAbsenceRequest'))) {
            setIsSubmitting(true);
            const endDateObj = new Date(absenceData.endDate + 'T00:00:00');
            endDateObj.setHours(23, 59, 59, 999);
            const success = await submitRequest({
                type: 'absence-request',
                subject: `Absence Request: ${absenceTypes.find(at => at.id === absenceData.absenceTypeId)?.name || 'Unknown'}`,
                body: absenceData.body,
                absenceTypeId: absenceData.absenceTypeId,
                startDate: new Date(absenceData.startDate + 'T00:00:00'),
                endDate: endDateObj,
            });
            setIsSubmitting(false);
            if (success) {
                setModalInfo({ isOpen: true, title: t('mobile.requestSuccessTitle'), body: t('mobile.requestSuccessBody') });
                setAbsenceData({ absenceTypeId: absenceTypes[0]?.id || '', startDate: toInputDateString(new Date()), endDate: toInputDateString(new Date()), body: '' });
            } else {
                 setModalInfo({ isOpen: true, title: t('mobile.errorTitle'), body: t('mobile.errorBody') });
            }
        }
    };

    const handleComplaintSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (window.confirm(t('mobile.confirmComplaint'))) {
            setIsSubmitting(true);
            const success = await submitRequest({
                type: 'complaint',
                subject: t('mobile.complaint'),
                body: complaintData.body,
            });
            setIsSubmitting(false);
            if (success) {
                setModalInfo({ isOpen: true, title: t('mobile.requestSuccessTitle'), body: t('mobile.requestSuccessBody') });
                setComplaintData({ body: '' });
            } else {
                setModalInfo({ isOpen: true, title: t('mobile.errorTitle'), body: t('mobile.errorBody') });
            }
        }
    };
    
    const inputStyle = "w-full px-4 py-3 text-base border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg bg-white dark:bg-slate-800";
    const labelStyle = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const buttonStyle = "w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-transform transform hover:scale-105";

    const tabs = [
        { id: 'absence', label: t('mobile.absenceRequest') },
        { id: 'complaint', label: t('mobile.complaint') },
        { id: 'group', label: t('mobile.group') },
        { id: 'direct', label: t('mobile.direct') },
    ];

    return (
        <div className="p-4 md:p-6 animate-slide-in-up">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('mobile.messaging')}</h1>
            </header>

            <SegmentedControl tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
            
            <div className="mt-6">
                {activeTab === 'absence' && (
                     <form onSubmit={handleAbsenceSubmit} className="space-y-4">
                        <div><label htmlFor="absenceTypeId" className={labelStyle}>{t('modals.absenceTypeLabel')}</label><select id="absenceTypeId" value={absenceData.absenceTypeId} onChange={e => setAbsenceData({...absenceData, absenceTypeId: e.target.value})} required className={inputStyle}>{absenceTypes.map(at => <option key={at.id} value={at.id}>{at.name}</option>)}</select></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label htmlFor="startDate" className={labelStyle}>{t('mobile.startDate')}</label><input id="startDate" type="date" value={absenceData.startDate} onChange={e => setAbsenceData({...absenceData, startDate: e.target.value})} required className={inputStyle} /></div>
                            <div><label htmlFor="endDate" className={labelStyle}>{t('mobile.endDate')}</label><input id="endDate" type="date" value={absenceData.endDate} min={absenceData.startDate} onChange={e => setAbsenceData({...absenceData, endDate: e.target.value})} required className={inputStyle} /></div>
                        </div>
                        <div><label htmlFor="body" className={labelStyle}>{t('mobile.message')}</label><textarea id="body" value={absenceData.body} onChange={e => setAbsenceData({...absenceData, body: e.target.value})} rows={3} placeholder={t('mobile.messagePlaceholder')} className={inputStyle}></textarea></div>
                        <button type="submit" disabled={isSubmitting} className={buttonStyle}>{isSubmitting ? <Loader2 className="animate-spin" /> : t('mobile.submitRequest')}</button>
                    </form>
                )}
                 {activeTab === 'complaint' && (
                    <form onSubmit={handleComplaintSubmit} className="space-y-4">
                        <div><label htmlFor="complaint-body" className={labelStyle}>{t('mobile.complaint')}</label><textarea id="complaint-body" value={complaintData.body} onChange={e => setComplaintData({ body: e.target.value })} required rows={5} placeholder={t('mobile.complaintPlaceholder')} className={inputStyle}></textarea></div>
                        <button type="submit" disabled={isSubmitting} className={buttonStyle}>{isSubmitting ? <Loader2 className="animate-spin" /> : t('mobile.submitComplaint')}</button>
                    </form>
                 )}
                 {activeTab === 'group' && (
                     <div><p className="text-center py-10 text-slate-500">Group chat coming soon.</p></div>
                 )}
                  {activeTab === 'direct' && (
                     <div><p className="text-center py-10 text-slate-500">Direct messages coming soon.</p></div>
                 )}
            </div>


            <Modal
                isOpen={modalInfo.isOpen}
                onClose={() => setModalInfo({ isOpen: false, title: '', body: '' })}
                title={modalInfo.title}
                footer={<button onClick={() => setModalInfo({isOpen: false, title: '', body: ''})} className="btn-primary">{t('mobile.close')}</button>}
            >
                <p>{modalInfo.body}</p>
            </Modal>
        </div>
    );
};

export default MobileMessagingScreen;
