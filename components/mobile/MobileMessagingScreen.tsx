import React, { useState, useMemo, useRef, FC, useEffect } from 'react';
import { useMobileData } from '../../contexts/MobileDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Loader2, Send, Users, User, MessageSquare as MessageIcon, ArrowLeft, History, Plus } from 'lucide-react';
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

const StatusBadge: FC<{ status: InboxMessage['status'] }> = ({ status }) => {
    const { t } = useLanguage();
    const styles = {
        validated: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        refused: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'followed-up': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{t(`inbox.status${status.charAt(0).toUpperCase() + status.slice(1).replace('-','')}`)}</span>;
};

const RequestHistoryItem: FC<{ message: InboxMessage }> = ({ message }) => {
    return (
        <div className="p-3 bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800">
            <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{message.subject}</span>
                <span className="text-xs text-slate-500">{new Date(message.date).toLocaleDateString()}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 line-clamp-2">{message.body}</p>
            <div className="flex justify-between items-center">
                <StatusBadge status={message.status} />
                {message.status === 'refused' && message.refusalReason && (
                    <span className="text-xs text-red-500 italic ml-2 truncate max-w-[150px]">{message.refusalReason}</span>
                )}
            </div>
        </div>
    );
};

const SegmentedControl: FC<{
    tabs: { id: string; label: string; hasNotification?: boolean }[];
    activeTab: string;
    onTabChange: (id: string) => void;
}> = ({ tabs, activeTab, onTabChange }) => (
    <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1">
        {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`w-full text-center px-2 py-1.5 text-sm font-semibold rounded-md transition-colors relative ${
                    activeTab === tab.id
                        ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-700/50'
                }`}
            >
                {tab.label}
                 {tab.hasNotification && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
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
    const { users, inboxMessages, absenceTypes, submitRequest, messageGroups, chatMessages, isLoading: isDataLoading, sendChatMessage, markConversationAsRead } = useMobileData();
    const [activeTab, setActiveTab] = useState<'absence' | 'complaint' | 'group' | 'direct'>('group');
    
    // Sub-states for viewing history vs creating new request
    const [viewingAbsenceHistory, setViewingAbsenceHistory] = useState(false);
    const [viewingComplaintHistory, setViewingComplaintHistory] = useState(false);

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

    const [seenRequestIds, setSeenRequestIds] = useState<Set<string>>(() => {
        const seen = localStorage.getItem('quickshift-seen-requests');
        return seen ? new Set(JSON.parse(seen)) : new Set();
    });

    const unreadAbsenceCount = useMemo(() => 
        inboxMessages.filter(m => m.type === 'absence-request' && m.status !== 'pending' && !seenRequestIds.has(m.id)).length,
        [inboxMessages, seenRequestIds]
    );

    const unreadComplaintCount = useMemo(() => 
        inboxMessages.filter(m => m.type === 'complaint' && m.status !== 'pending' && !seenRequestIds.has(m.id)).length,
        [inboxMessages, seenRequestIds]
    );

    const unreadGroupMessagesCount = useMemo(() => 
        messageGroups.reduce((count, group) => {
            const hasUnread = chatMessages.some(msg => 
                msg.conversationId === group.id && 
                employee && !msg.readBy.includes(employee.id)
            );
            return hasUnread ? count + 1 : count;
        }, 0),
        [chatMessages, messageGroups, employee]
    );

    const unreadDirectMessagesCount = useMemo(() => {
        const directConversationsWithUnread = new Set();
        chatMessages.forEach(msg => {
            const isGroupMsg = messageGroups.some(g => g.id === msg.conversationId);
            if (!isGroupMsg && employee && !msg.readBy.includes(employee.id)) {
                directConversationsWithUnread.add(msg.conversationId);
            }
        });
        return directConversationsWithUnread.size;
    }, [chatMessages, messageGroups, employee]);

    useEffect(() => {
        if (activeTab === 'absence' || activeTab === 'complaint') {
            const newSeenIds = new Set(seenRequestIds);
            let updated = false;
            inboxMessages.forEach(msg => {
                if (msg.status !== 'pending' && !newSeenIds.has(msg.id)) {
                    newSeenIds.add(msg.id);
                    updated = true;
                }
            });
            if (updated) {
                setSeenRequestIds(newSeenIds);
                localStorage.setItem('quickshift-seen-requests', JSON.stringify(Array.from(newSeenIds)));
            }
        }
    }, [activeTab, inboxMessages, seenRequestIds]);

    const directConversations = useMemo(() => {
        if (!employee) return [];

        const messagesByConversation = chatMessages.reduce((acc, msg) => {
            if (messageGroups.some(g => g.id === msg.conversationId)) {
                return acc;
            }
            
            if (!msg.conversationId.includes(employee.id)) {
                return acc;
            }

            if (!acc[msg.conversationId]) {
                acc[msg.conversationId] = [];
            }
            acc[msg.conversationId].push(msg);
            return acc;
        }, {} as Record<string, ChatMessage[]>);

        return Object.entries(messagesByConversation)
            .map(([conversationId, messages]) => {
                const lastMessage = messages.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                
                const participantIds = conversationId.split('--');
                const otherUserId = participantIds.find(id => id !== employee.id);
                
                const otherUser = users.find(u => u.id === otherUserId);
                
                if (!otherUser) return null;

                return {
                    id: conversationId,
                    otherUser: otherUser,
                    lastMessage: lastMessage,
                };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null)
            .sort((a, b) => new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime());

    }, [chatMessages, messageGroups, users, employee]);


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
                setViewingAbsenceHistory(true); // Switch to history to show the new request
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
                setViewingComplaintHistory(true); // Switch to history
            } else {
                setModalInfo({ isOpen: true, title: t('mobile.errorTitle'), body: t('mobile.errorBody') });
            }
        }
    };
    
    const inputStyle = "w-full px-4 py-3 text-base border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg bg-white dark:bg-slate-800";
    const labelStyle = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";
    const buttonStyle = "w-full flex justify-center items-center px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 transition-transform transform hover:scale-105";

    const tabs = [
        { id: 'group', label: t('mobile.tabGroups'), hasNotification: unreadGroupMessagesCount > 0 },
        { id: 'direct', label: t('mobile.tabDirect'), hasNotification: unreadDirectMessagesCount > 0 },
        { id: 'absence', label: t('mobile.tabAbsence'), hasNotification: unreadAbsenceCount > 0 },
        { id: 'complaint', label: t('mobile.tabComplaint'), hasNotification: unreadComplaintCount > 0 },
    ];

    const handleSendMessageWrapper = (conversationId: string, content: string) => {
        sendChatMessage({ conversationId, content });
    };
    
    const handleConversationOpen = (conversation: { id: string; name: string; type: 'group' | 'direct'; avatar: React.ReactNode }) => {
        setSelectedConversation(conversation);
        markConversationAsRead(conversation.id);
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
                <SegmentedControl 
                    tabs={tabs} 
                    activeTab={activeTab} 
                    onTabChange={(id) => setActiveTab(id as 'group' | 'direct' | 'absence' | 'complaint')} 
                />
             </div>
            
            <div className="px-4 md:px-6 pb-4">
                {activeTab === 'absence' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button 
                                onClick={() => setViewingAbsenceHistory(!viewingAbsenceHistory)}
                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full"
                            >
                                {viewingAbsenceHistory ? <><Plus size={16} className="mr-1"/> New Request</> : <><History size={16} className="mr-1"/> View History</>}
                            </button>
                        </div>
                        
                        {viewingAbsenceHistory ? (
                            <div className="space-y-3">
                                {inboxMessages.filter(m => m.type === 'absence-request').length > 0 ? (
                                    inboxMessages.filter(m => m.type === 'absence-request').map(msg => (
                                        <RequestHistoryItem key={msg.id} message={msg} />
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-slate-500 dark:text-slate-400">No absence request history.</p>
                                )}
                            </div>
                        ) : (
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
                    </>
                )}
                 {activeTab === 'complaint' && (
                    <>
                        <div className="flex justify-end mb-4">
                            <button 
                                onClick={() => setViewingComplaintHistory(!viewingComplaintHistory)}
                                className="text-sm font-semibold text-blue-600 dark:text-blue-400 flex items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full"
                            >
                                {viewingComplaintHistory ? <><Plus size={16} className="mr-1"/> New Complaint</> : <><History size={16} className="mr-1"/> View History</>}
                            </button>
                        </div>

                        {viewingComplaintHistory ? (
                             <div className="space-y-3">
                                {inboxMessages.filter(m => m.type === 'complaint').length > 0 ? (
                                    inboxMessages.filter(m => m.type === 'complaint').map(msg => (
                                        <RequestHistoryItem key={msg.id} message={msg} />
                                    ))
                                ) : (
                                    <p className="text-center py-8 text-slate-500 dark:text-slate-400">No complaint history.</p>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleComplaintSubmit} className="space-y-4">
                                <div><label htmlFor="complaint-body" className={labelStyle}>{t('mobile.complaint')}</label><textarea id="complaint-body" value={complaintData.body} onChange={e => setComplaintData({ body: e.target.value })} required rows={5} placeholder={t('mobile.complaintPlaceholder')} className={inputStyle}></textarea></div>
                                <button type="submit" disabled={isSubmitting} className={buttonStyle}>{isSubmitting ? <Loader2 className="animate-spin" /> : t('mobile.submitComplaint')}</button>
                            </form>
                        )}
                    </>
                 )}
                 {activeTab === 'group' && (
                     <div className="space-y-2">
                         {messageGroups.length > 0 ? messageGroups.map(group => (
                             <div key={group.id} onClick={() => handleConversationOpen({ id: group.id, name: group.name, type: 'group', avatar: <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={20} /></div> })} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={24} /></div>
                                <p className="font-semibold truncate">{group.name}</p>
                            </div>
                         )) : <p className="text-center py-10 text-slate-500">{t('messaging.noGroups')}</p>}
                     </div>
                 )}
                  {activeTab === 'direct' && (
                     <div className="space-y-2">
                         {directConversations.length > 0 ? directConversations.map(convo => {
                            if (!convo) return null;
                            const { otherUser, lastMessage } = convo;
                            return (
                                <div 
                                    key={convo.id} 
                                    onClick={() => handleConversationOpen({ 
                                        id: convo.id, 
                                        name: otherUser.name, 
                                        type: 'direct', 
                                        avatar: <Avatar name={otherUser.name} src={otherUser.avatarUrl} className="w-10 h-10 rounded-full"/> 
                                    })} 
                                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    <Avatar name={otherUser.name} src={otherUser.avatarUrl} className="w-12 h-12 rounded-full"/>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-baseline">
                                            <p className="font-semibold truncate">{otherUser.name}</p>
                                            <p className="text-xs text-slate-400 flex-shrink-0">{timeAgo(new Date(lastMessage.timestamp))}</p>
                                        </div>
                                        <p className="text-sm text-slate-500 truncate">{lastMessage.content}</p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <p className="text-center py-10 text-slate-500">{t('messaging.noMessages')}</p>
                        )}
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