import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { InboxMessage, MessageGroup, ChatMessage, Employee, Team, User, AbsenceType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Users, MessageSquare as DirectMessageIcon, PlusCircle, Search, Edit, Trash2, Send, Paperclip, Smile, MoreVertical, X, CheckSquare, XSquare } from 'lucide-react';
import MessageItem from './MessageItem';
import Modal from './Modal';
import Avatar from './Avatar';
import MultiSelectDropdown from './MultiSelectDropdown';

// #region PROPS
interface MessagingProps {
    inboxMessages: InboxMessage[];
    messageGroups: MessageGroup[];
    chatMessages: ChatMessage[];
    employees: Employee[];
    teams: Team[];
    users: User[];
    absenceTypes: AbsenceType[];
    onValidateRequest: (messageId: string) => void;
    onRefuseRequest: (messageId: string, reason: string) => void;
    onFollowUpComplaint: (messageId: string) => void;
    onAddGroup: (groupData: Omit<MessageGroup, 'id' | 'companyId' | 'createdAt' | 'createdBy'>) => void;
    onUpdateGroup: (group: MessageGroup) => void;
    onDeleteGroup: (groupId: string) => void;
    onSendMessage: (messageData: Omit<ChatMessage, 'id' | 'companyId' | 'timestamp' | 'readBy' | 'senderName' | 'senderAvatarUrl'>) => void;
    onDeleteMessage: (messageId: string) => void;
    onMarkConversationAsRead: (conversationId: string) => void;
    onBulkDeleteMessages: (messageIds: string[]) => void;
}
// #endregion

// #region Group Editor Modal
interface GroupEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (groupData: Omit<MessageGroup, 'id' | 'companyId' | 'createdAt' | 'createdBy'> | MessageGroup) => void;
    groupToEdit: MessageGroup | null;
    employees: Employee[];
    teams: Team[];
}

const GroupEditorModal: FC<GroupEditorModalProps> = ({ isOpen, onClose, onSave, groupToEdit, employees, teams }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
    const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setName(groupToEdit?.name || '');
            setSelectedMemberIds(groupToEdit?.memberIds || []);
            setSelectedTeamIds(groupToEdit?.teamIds || []);
        }
    }, [isOpen, groupToEdit]);

    const handleSave = () => {
        if (!name.trim()) return;
        const groupData = {
            name: name.trim(),
            memberIds: selectedMemberIds,
            teamIds: selectedTeamIds,
        };
        if (groupToEdit) {
            onSave({ ...groupToEdit, ...groupData });
        } else {
            onSave(groupData);
        }
        onClose();
    };

    const employeeOptions = useMemo(() => employees.map(e => ({ id: e.id, name: e.name })), [employees]);
    const teamOptions = useMemo(() => teams.map(t => ({ id: t.id, name: t.name })), [teams]);

    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handleSave} className="btn-primary">{t('modals.save')}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={groupToEdit ? t('messaging.editGroup') : t('messaging.createGroup')} footer={footer} size="2xl">
            <div className="space-y-4">
                <div>
                    <label className="label-style">{t('messaging.groupName')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-style"/>
                </div>
                <MultiSelectDropdown
                    label={t('messaging.addMembers')}
                    options={employeeOptions}
                    selectedIds={selectedMemberIds}
                    onSelectionChange={setSelectedMemberIds}
                    placeholder={t('messaging.searchEmployees')}
                />
                <MultiSelectDropdown
                    label={t('messaging.addTeams')}
                    options={teamOptions}
                    selectedIds={selectedTeamIds}
                    onSelectionChange={setSelectedTeamIds}
                    placeholder={t('messaging.searchTeams')}
                />
            </div>
             <style>{`.label-style { display: block; margin-bottom: 0.5rem; } .input-style { width: 100%; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #d1d5db; } .dark .input-style { background-color: #1e293b; border-color: #4b5563; }`}</style>
        </Modal>
    );
};
// #endregion

// #region SHARED COMPONENTS
const ChatWindow: FC<{
    conversationId: string;
    conversationName: string;
    conversationAvatar: React.ReactNode;
    chatMessages: ChatMessage[];
    allUsers: (User | Employee)[];
    currentUser: User;
    onSendMessage: (conversationId: string, content: string) => void;
    onDeleteMessage: (messageId: string) => void;
    onBulkDeleteMessages: (messageIds: string[]) => void;
}> = ({ conversationId, conversationName, conversationAvatar, chatMessages, allUsers, currentUser, onSendMessage, onDeleteMessage, onBulkDeleteMessages }) => {
    const { t } = useLanguage();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const emojiPickerRef = useRef<HTMLDivElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    
    // Selection State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);

    const EMOJIS = ['😊', '😂', '❤️', '👍', '🙏', '🎉', '🤔', '😢'];

    const conversationMessages = useMemo(() => 
        chatMessages
            .filter(msg => msg.conversationId === conversationId)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
        [chatMessages, conversationId]
    );

    const userMap = useMemo(() => new Map(allUsers.map(u => [u.id, u])), [allUsers]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationMessages]);

     useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(event.target as Node) &&
                emojiButtonRef.current &&
                !emojiButtonRef.current.contains(event.target as Node)
            ) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(conversationId, newMessage.trim());
            setNewMessage('');
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setNewMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };
    
    const toggleSelectionMode = () => {
        setIsSelectionMode(!isSelectionMode);
        setSelectedMessageIds([]);
    };

    const handleSelectMessage = (id: string) => {
        if (!isSelectionMode) return;
        setSelectedMessageIds(prev => 
            prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        if (selectedMessageIds.length === 0) return;
        if (window.confirm(t('modals.confirmDeleteMultiple', {count: selectedMessageIds.length}))) {
            onBulkDeleteMessages(selectedMessageIds);
            setSelectedMessageIds([]);
            setIsSelectionMode(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow-md overflow-hidden">
            {/* Header: Group/User Name */}
            <div className="p-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 flex-shrink-0 h-16">
                <div className="flex items-center gap-3 truncate">
                    {conversationAvatar}
                    <div className="truncate">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white truncate">{conversationName}</h3>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isSelectionMode ? (
                        <>
                            <span className="text-sm font-semibold mr-2">{selectedMessageIds.length} selected</span>
                            <button onClick={handleBulkDelete} disabled={selectedMessageIds.length === 0} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50">
                                <Trash2 size={20} />
                            </button>
                            <button onClick={toggleSelectionMode} className="p-2 text-slate-600 hover:bg-slate-200 rounded-full">
                                <XSquare size={20} />
                            </button>
                        </>
                    ) : (
                        <button onClick={toggleSelectionMode} className="p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 rounded-full" title="Select Messages">
                            <CheckSquare size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {conversationMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">{t('messaging.noConversation')}</div>
                ) : (
                    conversationMessages.map(msg => {
                        const isSentByMe = msg.senderId === currentUser.id;
                        const sender = userMap.get(msg.senderId);
                        const isSelected = selectedMessageIds.includes(msg.id);
                        
                        return (
                            <div 
                                key={msg.id} 
                                onClick={() => handleSelectMessage(msg.id)}
                                className={`flex items-end gap-2 group ${isSentByMe ? 'justify-end' : ''} ${isSelectionMode ? 'cursor-pointer' : ''}`}
                            >
                                {isSelectionMode && (
                                    <div className={`flex-shrink-0 ${isSentByMe ? 'order-last ml-2' : 'order-first mr-2'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected} 
                                            onChange={() => handleSelectMessage(msg.id)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none" 
                                        />
                                    </div>
                                )}
                                
                                {!isSentByMe && !isSelectionMode && <Avatar name={sender?.name || '?'} src={sender?.avatarUrl || null} className="w-8 h-8 rounded-full flex-shrink-0"/>}
                                
                                <div className={`flex flex-col ${isSentByMe ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[60%] relative`}>
                                    {!isSentByMe && (
                                        <div className="flex items-baseline justify-between w-full">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1 mb-1 truncate">
                                                {msg.senderName || sender?.name || 'Unknown'}
                                            </span>
                                        </div>
                                    )}
                                    <div className={`p-3 rounded-2xl relative ${isSentByMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-none'} ${isSelected ? 'ring-2 ring-yellow-400' : ''}`}>
                                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                                        <p className={`text-[10px] mt-1 text-right ${isSentByMe ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    
                                    {!isSelectionMode && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete message?')) onDeleteMessage(msg.id); }} 
                                            className={`absolute top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-100 dark:bg-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${isSentByMe ? '-left-8' : '-right-8'}`}
                                        >
                                            <Trash2 size={14} className="text-red-500"/>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                 <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t dark:border-slate-700 flex-shrink-0 bg-white dark:bg-slate-900">
                <div className="relative">
                    {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-full right-0 mb-2 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-2 grid grid-cols-4 gap-2 w-40 z-10">
                            {EMOJIS.map(emoji => (
                                <button key={emoji} onClick={() => handleEmojiSelect(emoji)} className="text-xl p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder={t('messaging.typeMessage')}
                        disabled={isSelectionMode}
                        className="w-full pl-4 pr-20 py-3 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <button ref={emojiButtonRef} onClick={() => setShowEmojiPicker(prev => !prev)} disabled={isSelectionMode} className="p-2 text-slate-500 hover:text-blue-600 disabled:opacity-50"><Smile size={20}/></button>
                        <button onClick={handleSend} disabled={isSelectionMode} className="p-2.5 bg-blue-600 text-white rounded-full ml-1 hover:bg-blue-700 transition-colors disabled:bg-slate-400"><Send size={20}/></button>
                    </div>
                </div>
            </div>
        </div>
    );
};
// #endregion

const Messaging: FC<MessagingProps> = (props) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { inboxMessages, messageGroups, chatMessages, employees, teams, absenceTypes, onValidateRequest, onRefuseRequest, onFollowUpComplaint, onAddGroup, onUpdateGroup, onDeleteGroup, onSendMessage, onDeleteMessage, onMarkConversationAsRead, onBulkDeleteMessages } = props;

    const [activeTab, setActiveTab] = useState<'inbox' | 'group' | 'direct'>('inbox');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [directSearchTerm, setDirectSearchTerm] = useState('');
    const [groupEditorModal, setGroupEditorModal] = useState<{ isOpen: boolean; group: MessageGroup | null }>({ isOpen: false, group: null });
    
    const allUsersForChat = useMemo(() => [...employees, ...props.users], [employees, props.users]);

    const unreadInboxCount = useMemo(() => inboxMessages.filter(m => m.status === 'pending').length, [inboxMessages]);

    const unreadMessages = useMemo(() => chatMessages.filter(msg => user && !msg.readBy.includes(user.id)), [chatMessages, user]);
    
    const unreadGroupMessages = useMemo(() => 
        unreadMessages.filter(msg => messageGroups.some(g => g.id === msg.conversationId)),
        [unreadMessages, messageGroups]
    );

    const unreadDirectMessages = useMemo(() =>
        unreadMessages.filter(msg => !messageGroups.some(g => g.id === msg.conversationId)),
        [unreadMessages, messageGroups]
    );

    const unreadCountByConversation = useMemo(() => 
        unreadMessages.reduce((acc, msg) => {
            acc[msg.conversationId] = (acc[msg.conversationId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    [unreadMessages]);

    // Auto-mark as read if new messages arrive while the conversation is open
    useEffect(() => {
        if (selectedConversationId) {
            onMarkConversationAsRead(selectedConversationId);
        }
    }, [selectedConversationId, chatMessages, onMarkConversationAsRead]);
    
    const filteredGroups = useMemo(() => {
        return messageGroups.filter(group => group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()));
    }, [messageGroups, groupSearchTerm]);

    const filteredDirectContacts = useMemo(() => {
        return employees.filter(emp => emp.name.toLowerCase().includes(directSearchTerm.toLowerCase()));
    }, [employees, directSearchTerm]);


    const createDirectConversationId = (employeeId: string) => {
        if (!user) return '';
        return [user.id, employeeId].sort().join('--');
    };

    const handleSendMessage = (conversationId: string, content: string) => {
        if(!user) return;
        onSendMessage({
            conversationId,
            content,
            senderId: user.id
        });
    }

    const handleSelectConversation = (id: string | null) => {
        setSelectedConversationId(id);
        if(id) {
            onMarkConversationAsRead(id);
        }
    };

    const handleSaveGroup = (groupData: Omit<MessageGroup, 'id' | 'companyId' | 'createdAt' | 'createdBy'> | MessageGroup) => {
        if ('id' in groupData) {
            onUpdateGroup(groupData);
        } else {
            onAddGroup(groupData);
        }
    };

    const handleDeleteGroup = (group: MessageGroup) => {
        if(window.confirm(t('messaging.confirmDeleteGroup', {name: group.name}))) {
            onDeleteGroup(group.id);
            if(selectedConversationId === group.id) {
                setSelectedConversationId(null);
            }
        }
    };

    const getConversationDetails = () => {
        if (activeTab === 'group') {
            const group = messageGroups.find(g => g.id === selectedConversationId);
            if (!group) return null;
            return {
                title: group.name,
                avatar: <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 flex-shrink-0"><Users size={20} /></div>
            };
        } else {
             if (!selectedConversationId || !user) return null;
             const parts = selectedConversationId.split('--');
             const otherId = parts.find(id => id !== user.id);
             const contact = allUsersForChat.find(u => u.id === otherId);
             if (!contact) return null;
             return {
                 title: contact.name,
                 avatar: <Avatar name={contact.name} src={contact.avatarUrl} className="w-10 h-10 rounded-full flex-shrink-0"/>
             }
        }
    }

    const selectedDetails = getConversationDetails();


    return (
        <div className="animate-slide-in-up h-[calc(100vh-7rem)] flex flex-col">
            <div className="flex justify-between items-start flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('messaging.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('messaging.description')}</p>
                </div>
                {selectedDetails && (
                    <div className="md:hidden bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-semibold max-w-[150px] truncate">
                        {selectedDetails.title}
                    </div>
                )}
            </div>

            <div className="mt-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => { setActiveTab('inbox'); handleSelectConversation(null); }} className={`relative flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inbox' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <Inbox size={16}/> {t('messaging.inbox')}
                        {unreadInboxCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{unreadInboxCount}</span>}
                    </button>
                    <button onClick={() => { setActiveTab('group'); handleSelectConversation(null); }} className={`relative flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'group' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <Users size={16}/> {t('messaging.groupChat')}
                        {unreadGroupMessages.length > 0 && <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{unreadGroupMessages.length}</span>}
                    </button>
                    <button onClick={() => { setActiveTab('direct'); handleSelectConversation(null); }} className={`relative flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'direct' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                        <DirectMessageIcon size={16}/> {t('messaging.directMessages')}
                        {unreadDirectMessages.length > 0 && <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">{unreadDirectMessages.length}</span>}
                    </button>
                </nav>
            </div>

            <div className="mt-4 flex-grow overflow-hidden relative">
                {/* Inbox View */}
                {activeTab === 'inbox' && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 h-full flex flex-col">
                        <div className="flex-grow overflow-y-auto">
                           {inboxMessages.length > 0 ? (
                                inboxMessages.sort((a,b) => b.date.getTime() - a.date.getTime()).map(message => {
                                    const employee = employees.find(e => e.id === message.employeeId);
                                    if(!employee) return null;
                                    return (
                                        <MessageItem
                                            key={message.id}
                                            message={message}
                                            employee={employee}
                                            absenceType={absenceTypes.find(at => at.id === message.absenceTypeId)}
                                            onValidate={onValidateRequest}
                                            onRefuse={onRefuseRequest}
                                            onFollowUp={onFollowUpComplaint}
                                            onDelete={props.onDeleteMessage}
                                        />
                                    );
                                })
                           ) : (
                                <p className="text-center py-10 text-slate-500">{t('messaging.noMessages')}</p>
                           )}
                        </div>
                    </div>
                )}
                
                {/* Group and Direct Chat Views */}
                {(activeTab === 'group' || activeTab === 'direct') && (
                    <div className="grid grid-cols-12 gap-4 h-full">
                        <div className="col-span-12 md:col-span-4 bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 flex flex-col h-full overflow-hidden">
                           {activeTab === 'group' && (
                                <>
                                    <div className="flex justify-between items-center mb-2 flex-shrink-0">
                                        <h3 className="font-bold text-lg">{t('messaging.groupChat')}</h3>
                                        <button onClick={() => setGroupEditorModal({ isOpen: true, group: null })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><PlusCircle size={20}/></button>
                                    </div>
                                    <div className="relative mb-2 flex-shrink-0">
                                        <input type="text" placeholder={t('messaging.searchGroups')} value={groupSearchTerm} onChange={e => setGroupSearchTerm(e.target.value)} className="input-style w-full"/>
                                    </div>
                                    <div className="flex-grow overflow-y-auto -mx-2 px-2">
                                        {filteredGroups.length > 0 ? filteredGroups.map(group => {
                                            const memberCount = new Set([...group.memberIds, ...group.teamIds.flatMap(tid => teams.find(t => t.id === tid)?.memberIds || [])]).size;
                                            const unreadCount = unreadCountByConversation[group.id] || 0;
                                            return (
                                                <div key={group.id} onClick={() => handleSelectConversation(group.id)} className={`flex items-center justify-between gap-3 p-3 my-1 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedConversationId === group.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={20} /></div>
                                                        <div className="truncate">
                                                            <p className="font-semibold truncate">{group.name}</p>
                                                            <p className="text-xs text-slate-500">{memberCount} members</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 flex items-center">
                                                         {unreadCount > 0 && <span className="mr-2 px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">{unreadCount}</span>}
                                                        <button onClick={(e) => { e.stopPropagation(); setGroupEditorModal({isOpen: true, group}); }} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><Edit size={16} /></button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group); }} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            )
                                        }) : <p className="text-center py-10 text-sm text-slate-500">{t('messaging.noGroups')}</p>}
                                    </div>
                                </>
                           )}
                           {activeTab === 'direct' && (
                                <>
                                    <h3 className="font-bold text-lg mb-2 flex-shrink-0">{t('messaging.directMessages')}</h3>
                                    <div className="relative mb-2 flex-shrink-0">
                                        <input type="text" placeholder={t('messaging.searchContacts')} value={directSearchTerm} onChange={e => setDirectSearchTerm(e.target.value)} className="input-style w-full"/>
                                    </div>
                                    <div className="flex-grow overflow-y-auto -mx-2 px-2">
                                        {filteredDirectContacts.map(emp => {
                                            const conversationId = createDirectConversationId(emp.id);
                                            const unreadCount = unreadCountByConversation[conversationId] || 0;
                                            return (
                                            <div key={emp.id} onClick={() => handleSelectConversation(conversationId)} className={`flex items-center justify-between gap-3 p-3 my-1 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedConversationId === conversationId ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={emp.name} src={emp.avatarUrl} className="w-10 h-10 rounded-full"/>
                                                    <p className="font-semibold">{emp.name}</p>
                                                </div>
                                                {unreadCount > 0 && <span className="px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">{unreadCount}</span>}
                                            </div>
                                        )})}
                                    </div>
                                </>
                           )}
                        </div>
                        <div className="col-span-12 md:col-span-8 h-full hidden md:block">
                            {selectedConversationId && selectedDetails ? (
                                <ChatWindow 
                                    conversationId={selectedConversationId}
                                    conversationName={selectedDetails.title}
                                    conversationAvatar={selectedDetails.avatar}
                                    chatMessages={chatMessages}
                                    allUsers={allUsersForChat}
                                    currentUser={user!}
                                    onSendMessage={handleSendMessage}
                                    onDeleteMessage={onDeleteMessage}
                                    onBulkDeleteMessages={onBulkDeleteMessages}
                                />
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"><DirectMessageIcon size={32}/></div>
                                    <h4 className="font-bold text-lg">{activeTab === 'group' ? t('messaging.selectGroupToStart') : t('messaging.selectContactToStart')}</h4>
                                    <p className="text-sm">{t('messaging.noSelection')}</p>
                                </div>
                            )}
                        </div>
                        {/* Mobile overlay for chat window */}
                        {selectedConversationId && selectedDetails && (
                            <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-blue-night-950">
                                 <div className="flex flex-col h-full">
                                    <div className="flex items-center p-2 border-b dark:border-gray-700">
                                        <button onClick={() => setSelectedConversationId(null)} className="p-2 mr-2"><X size={24}/></button>
                                        <span className="font-bold">{selectedDetails.title}</span>
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <ChatWindow 
                                            conversationId={selectedConversationId}
                                            conversationName={selectedDetails.title}
                                            conversationAvatar={selectedDetails.avatar}
                                            chatMessages={chatMessages}
                                            allUsers={allUsersForChat}
                                            currentUser={user!}
                                            onSendMessage={handleSendMessage}
                                            onDeleteMessage={onDeleteMessage}
                                            onBulkDeleteMessages={onBulkDeleteMessages}
                                        />
                                    </div>
                                 </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
            
            {groupEditorModal.isOpen && (
                <GroupEditorModal
                    isOpen={true}
                    onClose={() => setGroupEditorModal({ isOpen: false, group: null })}
                    groupToEdit={groupEditorModal.group}
                    onSave={handleSaveGroup}
                    employees={employees}
                    teams={teams}
                />
            )}

            <style>{`
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #f8fafc; } .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; }
                .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
            `}</style>
        </div>
    );
};

export default Messaging;