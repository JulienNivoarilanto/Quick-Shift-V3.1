import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Mail, CheckCircle, Clock } from 'lucide-react';
import { InboxMessage, Employee, AbsenceType } from '../types';
import MessageItem from './MessageItem';
import { useLanguage } from '../contexts/LanguageContext';

interface InboxProps {
    messages: InboxMessage[];
    employees: Employee[];
    absenceTypes: AbsenceType[];
    onValidateRequest: (messageId: string) => void;
    onRefuseRequest: (messageId: string, reason: string) => void;
    onFollowUpComplaint: (messageId: string) => void;
}

const Inbox: React.FC<InboxProps> = (props) => {
    const { messages, employees, absenceTypes, onValidateRequest, onRefuseRequest, onFollowUpComplaint } = props;
    const { t } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const pendingMessagesCount = useMemo(() => {
        return messages.filter(m => m.status === 'pending').length;
    }, [messages]);

    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [messages]);

    const filteredMessages = useMemo(() => {
        if (activeTab === 'pending') {
            return sortedMessages.filter(m => m.status === 'pending');
        } else {
            return sortedMessages.filter(m => m.status !== 'pending');
        }
    }, [sortedMessages, activeTab]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                const isModalClick = (event.target as Element).closest('[role="dialog"]');
                if (!isModalClick) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full bg-gray-200 dark:bg-blue-night-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-blue-night-700 transition-colors duration-200"
                aria-label="Toggle inbox"
            >
                <Mail size={20} />
                {pendingMessagesCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {pendingMessagesCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-blue-night-900 border border-gray-200 dark:border-blue-night-800 rounded-lg shadow-xl z-20 overflow-hidden">
                    <div className="p-3 border-b border-gray-200 dark:border-blue-night-800 bg-gray-50 dark:bg-blue-night-950">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-gray-800 dark:text-white">{t('header.inbox')}</h3>
                        </div>
                        <div className="flex p-1 bg-gray-200 dark:bg-blue-night-800 rounded-lg">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'pending' ? 'bg-white dark:bg-blue-night-900 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-blue-night-700'}`}
                            >
                                {t('inbox.statusPending')} {pendingMessagesCount > 0 && `(${pendingMessagesCount})`}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-1 text-xs font-semibold rounded-md transition-colors ${activeTab === 'history' ? 'bg-white dark:bg-blue-night-900 text-blue-600 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-blue-night-700'}`}
                            >
                                {t('history.title')}
                            </button>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {filteredMessages.length > 0 ? (
                            filteredMessages.map(message => {
                                const employee = employees.find(e => e.id === message.employeeId);
                                const absenceType = message.absenceTypeId ? absenceTypes.find(at => at.id === message.absenceTypeId) : undefined;
                                if (!employee) return null;

                                return (
                                    <MessageItem
                                        key={message.id}
                                        message={message}
                                        employee={employee}
                                        absenceType={absenceType}
                                        onValidate={onValidateRequest}
                                        onRefuse={onRefuseRequest}
                                        onFollowUp={onFollowUpComplaint}
                                    />
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
                                {activeTab === 'pending' ? (
                                    <>
                                        <CheckCircle size={40} className="mb-2 text-green-500 opacity-50"/>
                                        <p className="text-sm font-semibold">{t('inbox.emptyTitle')}</p>
                                        <p className="text-xs">{t('inbox.emptySubtitle')}</p>
                                    </>
                                ) : (
                                    <>
                                        <Clock size={40} className="mb-2 opacity-50"/>
                                        <p className="text-sm font-semibold">No history</p>
                                        <p className="text-xs">Processed requests will appear here.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;