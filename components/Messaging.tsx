import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { InboxMessage, MessageGroup, ChatMessage, Employee, Team, User, AbsenceType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Inbox, Users, MessageSquare as DirectMessageIcon, PlusCircle, Search, Edit, Trash2, Send, Paperclip, Smile, MoreVertical, X } from 'lucide-react';
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
    chatMessages: ChatMessage[];
    allUsers: (User | Employee)[];
    currentUser: User;
    onSendMessage: (conversationId: string, content: string) => void;
}> = ({ conversationId, chatMessages, allUsers, currentUser, onSendMessage }) => {
    const { t } = useLanguage();
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    const handleSend = () => {
        if (newMessage.trim()) {
            onSendMessage(conversationId, newMessage.trim());
            setNewMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {conversationMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-10">{t('messaging.noConversation')}</div>
                ) : (
                    conversationMessages.map(msg => {
                        const isSentByMe = msg.senderId === currentUser.id;
                        const sender = userMap.get(msg.senderId);
                        return (
                            <div key={msg.id} className={`flex items-end gap-2 ${isSentByMe ? 'justify-end' : ''}`}>
                                {!isSentByMe && <Avatar name={sender?.name || '?'} src={sender?.avatarUrl || null} className="w-8 h-8 rounded-full"/>}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${isSentByMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-200 dark:bg-slate-700 rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.content}</p>
                                    <p className={`text-xs mt-1 ${isSentByMe ? 'text-blue-200' : 'text-slate-500 dark:text-slate-400'}`}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        );
                    })
                )}
                 <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t dark:border-slate-700">
                <div className="relative">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && handleSend()}
                        placeholder={t('messaging.typeMessage')}
                        className="w-full pl-4 pr-24 py-3 rounded-full bg-slate-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <button className="p-2 text-slate-500 hover:text-blue-600"><Smile size={20}/></button>
                        <button className="p-2 text-slate-500 hover:text-blue-600"><Paperclip size={20}/></button>
                        <button onClick={handleSend} className="p-2.5 bg-blue-600 text-white rounded-full ml-1 hover:bg-blue-700 transition-colors"><Send size={20}/></button>
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
    const { inboxMessages, messageGroups, chatMessages, employees, teams, absenceTypes, onValidateRequest, onRefuseRequest, onFollowUpComplaint, onAddGroup, onUpdateGroup, onDeleteGroup, onSendMessage } = props;

    const [activeTab, setActiveTab] = useState<'inbox' | 'group' | 'direct'>('inbox');
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [groupSearchTerm, setGroupSearchTerm] = useState('');
    const [directSearchTerm, setDirectSearchTerm] = useState('');
    const [groupEditorModal, setGroupEditorModal] = useState<{ isOpen: boolean; group: MessageGroup | null }>({ isOpen: false, group: null });
    
    const allUsersForChat = useMemo(() => [...employees, ...props.users], [employees, props.users]);
    
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


    return (
        <div className="animate-slide-in-up">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('messaging.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">{t('messaging.description')}</p>

            <div className="mt-6 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button onClick={() => { setActiveTab('inbox'); handleSelectConversation(null); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'inbox' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><Inbox size={16}/> {t('messaging.inbox')}</button>
                    <button onClick={() => { setActiveTab('group'); handleSelectConversation(null); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'group' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><Users size={16}/> {t('messaging.groupChat')}</button>
                    <button onClick={() => { setActiveTab('direct'); handleSelectConversation(null); }} className={`flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'direct' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><DirectMessageIcon size={16}/> {t('messaging.directMessages')}</button>
                </nav>
            </div>

            <div className="mt-4">
                {/* Inbox View */}
                {activeTab === 'inbox' && (
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-4">
                        <div className="max-h-[70vh] overflow-y-auto">
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
                    <div className="grid grid-cols-12 gap-4 h-[75vh]">
                        <div className="col-span-4 bg-white dark:bg-slate-900 rounded-lg shadow-md p-4 flex flex-col">
                           {activeTab === 'group' && (
                                <>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-lg">{t('messaging.groupChat')}</h3>
                                        <button onClick={() => setGroupEditorModal({ isOpen: true, group: null })} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><PlusCircle size={20}/></button>
                                    </div>
                                    <div className="relative mb-2">
                                        <input type="text" placeholder={t('messaging.searchGroups')} value={groupSearchTerm} onChange={e => setGroupSearchTerm(e.target.value)} className="input-style w-full pl-8"/>
                                        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    </div>
                                    <div className="flex-grow overflow-y-auto -mx-4">
                                        {filteredGroups.length > 0 ? filteredGroups.map(group => {
                                            const memberCount = new Set([...group.memberIds, ...group.teamIds.flatMap(tid => teams.find(t => t.id === tid)?.memberIds || [])]).size;
                                            return (
                                                <div key={group.id} onClick={() => handleSelectConversation(group.id)} className={`flex items-center justify-between gap-3 p-3 mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedConversationId === group.id ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0"><Users size={20} /></div>
                                                        <div className="truncate">
                                                            <p className="font-semibold truncate">{group.name}</p>
                                                            <p className="text-xs text-slate-500">{memberCount} members</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex-shrink-0 flex items-center">
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
                                    <h3 className="font-bold text-lg mb-2">{t('messaging.directMessages')}</h3>
                                    <div className="relative mb-2">
                                        <input type="text" placeholder={t('employees.searchPlaceholder')} value={directSearchTerm} onChange={e => setDirectSearchTerm(e.target.value)} className="input-style w-full pl-8"/>
                                        <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
                                    </div>
                                    <div className="flex-grow overflow-y-auto -mx-4">
                                        {filteredDirectContacts.map(emp => (
                                            <div key={emp.id} onClick={() => handleSelectConversation(createDirectConversationId(emp.id))} className={`flex items-center gap-3 p-3 mx-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${selectedConversationId === createDirectConversationId(emp.id) ? 'bg-slate-100 dark:bg-slate-800' : ''}`}>
                                                <Avatar name={emp.name} src={emp.avatarUrl} className="w-10 h-10 rounded-full"/>
                                                <p className="font-semibold">{emp.name}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                           )}
                        </div>
                        <div className="col-span-8 bg-white dark:bg-slate-900 rounded-lg shadow-md flex flex-col">
                            {selectedConversationId ? (
                                <ChatWindow 
                                    conversationId={selectedConversationId}
                                    chatMessages={chatMessages}
                                    allUsers={allUsersForChat}
                                    currentUser={user!}
                                    onSendMessage={handleSendMessage}
                                />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                                    <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"><DirectMessageIcon size={32}/></div>
                                    <h4 className="font-bold text-lg">{activeTab === 'group' ? t('messaging.selectGroupToStart') : t('messaging.selectContactToStart')}</h4>
                                    <p className="text-sm">{t('messaging.noSelection')}</p>
                                </div>
                            )}
                        </div>
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
