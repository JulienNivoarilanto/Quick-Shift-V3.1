import React, { useState, useMemo, useRef, FC, useEffect } from 'react';
import { useMobileData } from '../../contexts/MobileDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Loader2, Send, Users, User, MessageSquare as MessageIcon, ArrowLeft } from 'lucide-react';
import Modal from '../Modal';
import { AbsenceType, InboxMessage, MessageGroup, ChatMessage, Employee, User as WebUser } from '../../types';
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
                className={`w-full text-center px-2 py-1.5 text-sm font-semibold rounded-md transition-colors ${
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

const ChatConversation: FC<{
    conversation: { id: string; name: string; avatar: React.ReactNode };
    onBack: () => void;
    chatMessages: ChatMessage[];
    currentUser: Employee;
    onSendMessage: (conversationId: string, content: string) => void;
}> = ({ conversation, onBack, chatMessages, currentUser, onSendMessage }) => {
    const { t } = useLanguage();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const conversationMessages = useMemo(() =>
        chatMessages
            .filter(msg => msg.conversationId === conversation.id)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        [chatMessages, conversation.id]
    );
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    }, [conversationMessages]);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(conversation.id, newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-white dark:bg-blue-night-900 rounded-xl shadow-md">
            <header className="flex items-center p-3 border-b dark:border-slate-800 flex-shrink-0">
                <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 mr-2"><ArrowLeft size={20} /></button>
                {conversation.avatar}
                <h3 className="font-bold text-lg truncate ml-3">{conversation.name}</h3>
            </header>
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {conversationMessages.length > 0 ? conversationMessages.map(msg => {
                    const isSentByMe = msg.senderId === currentUser.id;
                    return (
                        <div key={msg.id} className={`flex items-end gap-2 ${isSentByMe ? 'justify-end' : ''}`}>
                            {!isSentByMe && <Avatar name={msg.senderName || '?'} src={msg.senderAvatarUrl || null} className="w-8 h-8 rounded-full"/>}
                            <div className={`max-w-[80%] p-3 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-none'}`}>
                                {!isSentByMe && <p className="text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">{msg.senderName}</p>}
                                <p className="text-sm">{msg.content}</p>
                                <p className={`text-xs mt-1 text-right ${isSentByMe ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>{timeAgo(new Date(msg.timestamp))}</p>
                            </div>
                        </div>
                    );
                }) : <p className="text-center text-slate-500 py-10">{t('messaging.noConversation')}</p>}
                <div ref={messagesEndRef} />
            </div>
             <div className="p-2 border-t dark:border-slate-800 flex-shrink-0">
                <div className="relative">
                     <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder={t('messaging.typeMessage')}
                        className="w-full pl-4 pr-12 py-3 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={handleSend} className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"><Send size={20}/></button>
                </div>
            </div>
        </div>
    );
};


const MobileMessagingScreen: React.FC = () => {
    const { t } = useLanguage();
    const { employee } = useMobileAuth();
    const { users, absenceTypes, submitRequest, messageGroups, chatMessages, isLoading: isDataLoading, sendChatMessage } = useMobileData();
    const [activeTab, setActiveTab] = useState<'absence' | 'complaint' | 'group' | 'direct'>('group');

    const [absenceData, setAbsenceData] = useState({
        absenceTypeId: absenceTypes[0]?.id || '',
        startDate: toInputDateString(new Date()),
        endDate: toInputDateString(new Date()),
        body: '',
    });

    const [complaintData, setComplaintData] = useState({ body: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [modalInfo, setModalInfo] = useState<{ isOpen: boolean, title: string, body: string }>({ isOpen: false, title: '', body: '' });

    const [selectedConversation, setSelectedConversation] = useState<{ id: string; name: string; type: 'group' | 'direct'; avatar: React.ReactNode } | null>(null);

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
        { id: 'group', label: t('mobile.tabGroups') },
        { id: 'direct', label: t('mobile.tabDirect') },
        { id: 'absence', label: t('mobile.tabAbsence') },
        { id: 'complaint', label: t('mobile.tabComplaint') },
    ];

    const handleSendMessageWrapper = (conversationId: string, content: string) => {
        sendChatMessage({ conversationId, content });
    };

    const createDirectConversationId = (otherUserId: string) => {
        if (!employee) return '';
        return [employee.id, otherUserId].sort().join('--');
    };

    if (selectedConversation) {
        return (
            <div className="p-4 md:p-6 animate-slide-in-up">
                <ChatConversation 
                    conversation={selectedConversation}
                    onBack={() => setSelectedConversation(null)}
                    chatMessages={chatMessages}
                    currentUser={employee!}
                    onSendMessage={handleSendMessageWrapper}
                />
            </div>
        );
    }
    
    return (
        <div className="animate-slide-in-up">
             <div className="p-4 md:p-6">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('mobile.messaging')}</h1>
                </header>
                <SegmentedControl tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
             </div>
            
            <div className="px-4 md:px-6 pb-4">
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
                     <div className="space-y-2">
                         {messageGroups.length > 0 ? messageGroups.map(group => (
                             <div key={group.id} onClick={() => setSelectedConversation({ id: group.id, name: group.name, type: 'group', avatar: <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={20} /></div> })} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={24} /></div>
                                <p className="font-semibold truncate">{group.name}</p>
                            </div>
                         )) : <p className="text-center py-10 text-slate-500">{t('messaging.noGroups')}</p>}
                     </div>
                 )}
                  {activeTab === 'direct' && (
                     <div className="space-y-2">
                        {users.map(webUser => (
                            <div key={webUser.id} onClick={() => setSelectedConversation({ id: createDirectConversationId(webUser.id), name: webUser.name, type: 'direct', avatar: <Avatar name={webUser.name} src={webUser.avatarUrl} className="w-10 h-10 rounded-full"/> })} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <Avatar name={webUser.name} src={webUser.avatarUrl} className="w-12 h-12 rounded-full"/>
                                <p className="font-semibold">{webUser.name}</p>
                            </div>
                        ))}
                     </div>
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
