import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Shift, AbsenceType, Location, Department, InboxMessage, Meeting, Employee, MessageGroup, ChatMessage, User } from '../types';
import * as api from '../services/api';
import { useMobileAuth } from './MobileAuthContext';

interface MobileDataContextType {
    shifts: Shift[];
    absenceTypes: AbsenceType[];
    locations: Location[];
    departments: Department[];
    inboxMessages: InboxMessage[];
    meetings: Meeting[];
    allEmployees: Employee[];
    users: User[];
    messageGroups: MessageGroup[];
    chatMessages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    refetchData: () => void;
    submitRequest: (data: any) => Promise<boolean>;
    updateShift: (shift: Shift) => Promise<void>;
    sendChatMessage: (messageData: Omit<ChatMessage, 'id' | 'companyId' | 'timestamp' | 'readBy' | 'senderId' | 'senderName' | 'senderAvatarUrl'>) => Promise<boolean>;
    markConversationAsRead: (conversationId: string) => Promise<void>;
}

const MobileDataContext = createContext<MobileDataContextType | undefined>(undefined);

export const MobileDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { employee } = useMobileAuth();
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [messageGroups, setMessageGroups] = useState<MessageGroup[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!employee) return;

        setIsLoading(true);
        setError(null);
        try {
            const data = await api.apiGetMobileData(employee.id, employee.companyId);
            setShifts(data.shifts);
            setAbsenceTypes(data.absenceTypes);
            setLocations(data.locations);
            setDepartments(data.departments);
            setInboxMessages(data.inboxMessages);
            setMeetings(data.meetings);
            setAllEmployees(data.allEmployees);
            setMessageGroups(data.messageGroups);
            setChatMessages(data.chatMessages);
            setUsers(data.users);
        } catch (err) {
            console.error(err);
            setError("Failed to load schedule data.");
        } finally {
            setIsLoading(false);
        }
    }, [employee]);
    
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const submitRequest = async (requestData: any): Promise<boolean> => {
        if (!employee) return false;
        try {
            const dataToSend = {
                ...requestData,
                employeeId: employee.id,
                companyId: employee.companyId,
            };
            await api.apiSubmitRequest(dataToSend);
            // After submitting, refetch data to show the new request in history
            fetchData();
            return true;
        } catch (error) {
            console.error("Failed to submit request", error);
            return false;
        }
    };

    const sendChatMessage = async (messageData: Omit<ChatMessage, 'id' | 'companyId' | 'timestamp' | 'readBy' | 'senderId' | 'senderName' | 'senderAvatarUrl'>): Promise<boolean> => {
        if (!employee) return false;
        try {
            const messageToSend = {
                ...messageData,
                senderId: employee.id,
                senderName: employee.name,
                senderAvatarUrl: employee.avatarUrl,
                timestamp: new Date(),
                readBy: [employee.id],
                companyId: employee.companyId
            };
            const newMsg = await api.apiCreateItem('chatMessages', messageToSend);
            setChatMessages(prev => [...prev, newMsg]);
            return true;
        } catch (error) {
            console.error("Failed to send chat message", error);
            return false;
        }
    };

    const updateShift = async (updatedShift: Shift) => {
        if (!employee) return;
        const originalShifts = [...shifts];

        // Optimistic update
        setShifts(prevShifts => 
            prevShifts.map(s => s.id === updatedShift.id ? updatedShift : s)
        );

        try {
            await api.apiUpdateItem('shifts', updatedShift.id, updatedShift);
        } catch (error) {
            console.error("Failed to update shift:", error);
            // Revert on failure
            setShifts(originalShifts);
            setError("Failed to update your shift. Please try again.");
        }
    };

    const markConversationAsRead = async (conversationId: string) => {
        if (!employee) return;
    
        const unreadMessageIds = chatMessages
            .filter(msg => msg.conversationId === conversationId && !msg.readBy.includes(employee.id))
            .map(msg => msg.id);
    
        if (unreadMessageIds.length > 0) {
            // Optimistic update
            setChatMessages(prev => prev.map(msg => 
                unreadMessageIds.includes(msg.id)
                    ? { ...msg, readBy: [...msg.readBy, employee.id] }
                    : msg
            ));
            try {
                await api.apiMarkMessagesAsRead(unreadMessageIds, employee.id);
            } catch (error) {
                console.error("Failed to mark mobile messages as read", error);
                // Snapshot listener will eventually correct the state if this fails.
            }
        }
    };
    
    const value = {
        shifts,
        absenceTypes,
        locations,
        departments,
        inboxMessages,
        meetings,
        allEmployees,
        users,
        messageGroups,
        chatMessages,
        isLoading,
        error,
        refetchData: fetchData,
        submitRequest,
        updateShift,
        sendChatMessage,
        markConversationAsRead,
    };

    return (
        <MobileDataContext.Provider value={value}>
            {children}
        </MobileDataContext.Provider>
    );
};


export const useMobileData = (): MobileDataContextType => {
    const context = useContext(MobileDataContext);
    if (context === undefined) {
        throw new Error('useMobileData must be used within a MobileDataProvider');
    }
    return context;
};