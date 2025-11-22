import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { User, Employee, Shift, Role, Location, Department, Absence, AbsenceType, SpecialDay, SpecialDayType, InboxMessage, EmployeeAvailability, WeeklyAvailability, ContractType, EmployeeDocument, DocumentType, Meeting, Team, MessageGroup, ChatMessage } from '../types';
import * as api from '../services/api';
import { useAuth } from './AuthContext';

// All data related to a single company
interface CompanyDataContextType {
    employees: Employee[];
    shifts: Shift[];
    roles: Role[];
    locations: Location[];
    departments: Department[];
    teams: Team[];
    absences: Absence[];
    absenceTypes: AbsenceType[];
    specialDays: SpecialDay[];
    specialDayTypes: SpecialDayType[];
    inboxMessages: InboxMessage[];
    employeeAvailabilities: EmployeeAvailability[];
    employeeDocuments: EmployeeDocument[];
    documentTypes: DocumentType[];
    meetings: Meeting[];
    users: User[];
    messageGroups: MessageGroup[];
    chatMessages: ChatMessage[];
}

interface DataState extends CompanyDataContextType {
    isLoading: boolean;
    error: string | null;
}

// All data modification handlers
interface DataHandlerContextType {
    handleSaveEmployee: (employee: Employee, isNew: boolean) => Promise<void>;
    handleDeleteEmployee: (employeeId: string) => Promise<void>;
    handleBulkDeleteEmployees: (employeeIds: string[]) => Promise<void>;
    handleBulkAssignRole: (employeeIds: string[], roleName: string) => Promise<void>;
    handleSaveShift: (shift: Shift) => Promise<void>;
    handleDeleteShift: (shiftId: string) => Promise<void>;
    handleDeleteMultipleShifts: (shiftIds: string[]) => Promise<void>;
    handleUpdateShifts: (updatedShifts: Shift[]) => Promise<void>;
    handleAddRole: (name: string) => Promise<void>;
    handleUpdateRole: (id: string, name: string) => Promise<void>;
    handleDeleteRole: (id: string) => Promise<void>;
    handleAddLocation: (name: string, address?: string, latitude?: number, longitude?: number, radius?: number, isGeofencingEnabled?: boolean) => Promise<void>;
    handleUpdateLocation: (id: string, name: string, address?: string | null, latitude?: number | null, longitude?: number | null, radius?: number | null, isGeofencingEnabled?: boolean) => Promise<void>;
    handleDeleteLocation: (id: string) => Promise<void>;
    handleAddDepartment: (name: string) => Promise<void>;
    handleUpdateDepartment: (id: string, name: string) => Promise<void>;
    handleDeleteDepartment: (id: string) => Promise<void>;
    handleAddAbsenceType: (name: string, color: string) => Promise<void>;
    handleUpdateAbsenceType: (id: string, name: string, color: string) => Promise<void>;
    handleDeleteAbsenceType: (id: string) => Promise<void>;
    handleSaveAbsence: (absence: Absence) => Promise<void>;
    handleDeleteAbsence: (absenceId: string) => Promise<void>;
    handleAddSpecialDayType: (name: string, isHoliday: boolean) => Promise<void>;
    handleUpdateSpecialDayType: (id: string, name: string, isHoliday: boolean) => Promise<void>;
    handleDeleteSpecialDayType: (id: string) => Promise<void>;
    handleSaveSpecialDay: (specialDay: SpecialDay) => Promise<void>;
    handleDeleteSpecialDay: (specialDayId: string) => Promise<void>;
    handleValidateRequest: (messageId: string) => Promise<void>;
    handleRefuseRequest: (messageId: string, reason: string) => Promise<void>;
    handleFollowUpComplaint: (messageId: string) => Promise<void>;
    handleDeleteInboxMessage: (messageId: string) => Promise<void>;
    handleSaveEmployeeAvailability: (employeeId: string, availability: WeeklyAvailability) => Promise<void>;
    handleImportEmployees: (importedData: Array<Omit<Employee, 'id' | 'avatarUrl' | 'companyId'>>) => Promise<void>;
    handleBulkAddShifts: (newShifts: Array<Omit<Shift, 'id' | 'companyId'>>) => Promise<void>;
    handleSaveEmployeeDocument: (doc: EmployeeDocument) => Promise<void>;
    handleDeleteEmployeeDocument: (docId: string) => Promise<void>;
    handleBulkCreateEmployeeDocuments: (docs: Array<Omit<EmployeeDocument, 'id' | 'companyId'>>) => Promise<void>;
    handleAddDocumentType: (name: string, isUnique: boolean) => Promise<void>;
    handleUpdateDocumentType: (id: string, name: string, isUnique: boolean) => Promise<void>;
    handleDeleteDocumentType: (id: string) => Promise<void>;
    handleSaveMeeting: (meeting: Meeting) => Promise<void>;
    handleDeleteMeeting: (meetingId: string) => Promise<void>;
    handleDeleteMultipleMeetings: (meetingIds: string[]) => Promise<void>;
    handleDeleteHistoryItems: (items: { id: string; type: 'shifts' | 'absences' | 'meetings' }[]) => Promise<void>;
    handleCreateAdditionalUser: (userData: Omit<User, 'id' | 'companyId' | 'plan' | 'isVerified' | 'password'>, password: string) => Promise<{success: boolean, error?: string}>;
    handleUpdateUser: (user: User) => Promise<void>;
    handleDeleteUser: (userId: string) => Promise<void>;
    handleAddTeam: (teamData: Omit<Team, 'id' | 'companyId'>) => Promise<void>;
    handleUpdateTeam: (team: Team) => Promise<void>;
    handleDeleteTeam: (teamId: string) => Promise<void>;
    handleMarkConversationAsRead: (conversationId: string) => Promise<void>;
    handleAddMessageGroup: (groupData: Omit<MessageGroup, 'id' | 'companyId' | 'createdAt' | 'createdBy'>) => Promise<void>;
    handleUpdateMessageGroup: (group: MessageGroup) => Promise<void>;
    handleDeleteMessageGroup: (groupId: string) => Promise<void>;
    handleSendChatMessage: (messageData: Omit<ChatMessage, 'id' | 'companyId' | 'timestamp' | 'readBy' | 'senderName' | 'senderAvatarUrl'>) => Promise<void>;
    handleDeleteChatMessage: (messageId: string) => Promise<void>;
    handleBulkDeleteChatMessages: (messageIds: string[]) => Promise<void>;
}

interface DataContextType extends DataState, DataHandlerContextType {}

const DataContext = createContext<DataContextType | undefined>(undefined);

type Action =
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; payload: Partial<CompanyDataContextType> }
  | { type: 'FETCH_ERROR'; payload: string }
  | { type: 'SET_DATA'; payload: Partial<CompanyDataContextType> }
  | { type: 'CLEAR_DATA' };

const initialState: DataState = {
    employees: [], shifts: [], roles: [], locations: [], departments: [], teams: [], absences: [],
    absenceTypes: [], specialDays: [], specialDayTypes: [], inboxMessages: [], employeeAvailabilities: [],
    employeeDocuments: [], documentTypes: [], meetings: [], users: [],
    messageGroups: [], chatMessages: [],
    isLoading: true, // Start in loading state
    error: null,
};

const dataReducer = (state: DataState, action: Action): DataState => {
    switch(action.type) {
        case 'FETCH_START':
            return { ...state, isLoading: true, error: null };
        case 'FETCH_SUCCESS':
            return { ...state, isLoading: false, ...action.payload };
        case 'FETCH_ERROR':
            return { ...state, isLoading: false, error: action.payload };
        case 'SET_DATA':
            return { ...state, ...action.payload };
        case 'CLEAR_DATA':
            return { ...initialState, isLoading: false };
        default:
            return state;
    }
};

const generateAccessCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const DataProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(dataReducer, initialState);
    const { user, permissions } = useAuth();

    useEffect(() => {
        if (!user?.companyId) {
            dispatch({ type: 'CLEAR_DATA' });
            return;
        }

        dispatch({ type: 'FETCH_START' });
        let unsubscribeListeners: (() => void)[] = [];

        const setupDataStreams = async () => {
            try {
                // 1. Fetch static data and set up listeners
                const collections = [
                    'employees', 'roles', 'locations', 'departments',
                    'absenceTypes', 'specialDayTypes', 'employeeAvailabilities',
                    'documentTypes', 'users', 'shifts', 'absences', 'specialDays', 
                    'inboxMessages', 'employeeDocuments', 'meetings', 'teams',
                    'messageGroups', 'chatMessages'
                ];
                
                unsubscribeListeners = collections.map(collName => 
                    api.onCollectionSnapshot(
                        collName,
                        user.companyId!,
                        (data) => {
                             if (collName === 'employeeAvailabilities') {
                                data = data.map((av) => ({ ...av, id: av.employeeId, }));
                            }
                            dispatch({ type: 'SET_DATA', payload: { [collName]: data } })
                        },
                        (error) => console.error(`Real-time listener error for ${collName}:`, error)
                    )
                );

                // 3. Mark loading as complete
                dispatch({ type: 'FETCH_SUCCESS', payload: {} });
            } catch (error) {
                console.error("Failed to set up data streams:", error);
                dispatch({ type: 'FETCH_ERROR', payload: 'Failed to load company data.' });
            }
        };

        setupDataStreams();

        // Cleanup function
        return () => {
            unsubscribeListeners.forEach(unsub => unsub());
        };
    }, [user]);

    // Automatic Clock-Out for Pro Plus users
    useEffect(() => {
        if (user?.plan !== 'Pro Plus' || !user?.companyId) {
            return;
        }

        const autoClockOutInterval = setInterval(async () => {
            const now = new Date();
            const shiftsToAutoClockOut: Shift[] = [];

            state.shifts.forEach(shift => {
                const thirtyMinsAfterEnd = new Date(new Date(shift.endTime).getTime() + 30 * 60 * 1000);
                if (shift.actualStartTime && !shift.actualEndTime && now > thirtyMinsAfterEnd) {
                    shiftsToAutoClockOut.push({
                        ...shift,
                        actualEndTime: shift.endTime, // Clock out at scheduled end time
                    });
                }
            });

            if (shiftsToAutoClockOut.length > 0) {
                console.log(`Auto-clocking out ${shiftsToAutoClockOut.length} shifts.`);
                
                const updatePromises = shiftsToAutoClockOut.map(s => 
                    api.apiUpdateItem('shifts', s.id, s)
                );
                
                try {
                    await Promise.all(updatePromises);
                } catch (error) {
                    console.error("Failed to auto-clock out shifts:", error);
                }
            }
        }, 60000); // Check every minute

        return () => clearInterval(autoClockOutInterval);
    }, [user, state.shifts]);

    const handleSaveItem = async <K extends keyof CompanyDataContextType>(
        dataType: K,
        item: CompanyDataContextType[K][0],
        isNew: boolean
    ) => {
        if (!user?.companyId) return;

        try {
            const itemWithCompanyId = { ...item, companyId: user.companyId };
            if (isNew) {
                const { id, ...dataToCreate } = itemWithCompanyId as any; 
                await api.apiCreateItem(dataType.toString(), dataToCreate);
            } else {
                await api.apiUpdateItem(dataType.toString(), item.id, itemWithCompanyId);
            }
        } catch (error) {
            console.error(`Failed to save ${dataType}:`, error);
            throw error;
        }
    };

    const handleDeleteItem = async (collectionName: string, itemId: string) => {
        try {
            await api.apiDeleteItem(collectionName, itemId);
        } catch (error) {
            console.error(`Failed to delete from ${collectionName}:`, error);
            throw error;
        }
    };
    
    // --- Specific Handlers ---

    const handleSaveShift = (shift: Shift) => handleSaveItem('shifts', shift, !state.shifts.some(s => s.id === shift.id));
    const handleDeleteShift = (shiftId: string) => handleDeleteItem('shifts', shiftId);
    
    const handleSaveEmployee = async (employee: Employee, isNew: boolean) => {
        let employeeToSave = { ...employee };
        if (isNew && user?.plan === 'Pro Plus' && !employeeToSave.accessCode) {
            employeeToSave.accessCode = generateAccessCode();
        }
        await handleSaveItem('employees', employeeToSave, isNew);
    };

    const handleDeleteEmployee = async (employeeId: string) => {
        try {
            await api.apiDeleteItem('employees', employeeId);
        } catch (error) {
            console.error("Failed to delete employee", error);
        }
    };
    
    const handleBulkDeleteEmployees = (employeeIds: string[]) => api.apiBulkDeleteItems('employees', employeeIds);
    const handleBulkAssignRole = (employeeIds: string[], roleName: string) => api.apiBulkUpdateItems('employees', employeeIds, { role: roleName });


    const handleUpdateShifts = (updatedShifts: Shift[]) => api.apiUpdateAllShifts(updatedShifts, user!.companyId);
    const handleDeleteMultipleShifts = (shiftIds: string[]) => api.apiBulkDeleteShifts(shiftIds);

    const handleAddRole = async (name: string) => { await api.apiCreateItem('roles', { name, companyId: user!.companyId }) };
    const handleUpdateRole = async (id: string, name: string) => { await api.apiUpdateItem('roles', id, { id, name, companyId: user!.companyId }) };
    const handleDeleteRole = async (id: string) => { await api.apiDeleteItem('roles', id) };

    const handleAddLocation = async (name: string, address?: string, latitude?: number, longitude?: number, radius?: number, isGeofencingEnabled?: boolean) => { await api.apiCreateItem('locations', { name, address, latitude, longitude, radius, isGeofencingEnabled, companyId: user!.companyId }) };
    const handleUpdateLocation = async (id: string, name: string, address?: string | null, latitude?: number | null, longitude?: number | null, radius?: number | null, isGeofencingEnabled?: boolean) => { await api.apiUpdateItem('locations', id, { id, name, address, latitude, longitude, radius, isGeofencingEnabled, companyId: user!.companyId }) };
    const handleDeleteLocation = async (id: string) => { await api.apiDeleteItem('locations', id) };

    const handleAddDepartment = async (name: string) => { await api.apiCreateItem('departments', { name, companyId: user!.companyId }) };
    const handleUpdateDepartment = async (id: string, name: string) => { await api.apiUpdateItem('departments', id, { id, name, companyId: user!.companyId }) };
    const handleDeleteDepartment = async (id: string) => { await api.apiDeleteItem('departments', id) };

    const handleAddTeam = async (teamData: Omit<Team, 'id' | 'companyId'>) => { await api.apiCreateItem('teams', { ...teamData, companyId: user!.companyId }) };
    const handleUpdateTeam = async (team: Team) => { await api.apiUpdateItem('teams', team.id, team) };
    const handleDeleteTeam = async (teamId: string) => { await api.apiDeleteItem('teams', teamId) };
    
    const handleAddAbsenceType = async (name: string, color: string) => { await api.apiCreateItem('absenceTypes', { name, color, companyId: user!.companyId }) };
    const handleUpdateAbsenceType = async (id: string, name: string, color: string) => { await api.apiUpdateItem('absenceTypes', id, { id, name, color, companyId: user!.companyId }) };
    const handleDeleteAbsenceType = async (id: string) => { await api.apiDeleteItem('absenceTypes', id) };
    
    const handleSaveAbsence = (absence: Absence) => handleSaveItem('absences', absence, !state.absences.some(a => a.id === absence.id));
    const handleDeleteAbsence = (absenceId: string) => handleDeleteItem('absences', absenceId);
    
    const handleAddSpecialDayType = async (name: string, isHoliday: boolean) => { await api.apiCreateItem('specialDayTypes', { name, isHoliday, companyId: user!.companyId }) };
    const handleUpdateSpecialDayType = async (id: string, name: string, isHoliday: boolean) => { await api.apiUpdateItem('specialDayTypes', id, { id, name, isHoliday, companyId: user!.companyId }) };
    const handleDeleteSpecialDayType = async (id: string) => { await api.apiDeleteItem('specialDayTypes', id) };

    const handleSaveSpecialDay = (specialDay: SpecialDay) => handleSaveItem('specialDays', specialDay, !state.specialDays.some(sd => sd.id === specialDay.id));
    const handleDeleteSpecialDay = (specialDayId: string) => handleDeleteItem('specialDays', specialDayId);

    const handleValidateRequest = async (messageId: string) => {
        const processorName = user?.name || 'Admin';
        const message = state.inboxMessages.find(m => m.id === messageId);
        if (!message || !message.startDate || !message.endDate || !message.absenceTypeId) return;
        
        const newAbsence: Omit<Absence, 'id'> = { employeeId: message.employeeId, absenceTypeId: message.absenceTypeId, startDate: message.startDate, endDate: message.endDate, companyId: user!.companyId };
        await api.apiCreateItem('absences', newAbsence);
        
        // Update status - pass only changed fields
        await api.apiUpdateItem<InboxMessage>('inboxMessages', messageId, { status: 'validated', processedBy: processorName });
    };
    
    const handleRefuseRequest = async (messageId: string, reason: string) => {
        const processorName = user?.name || 'Admin';
        // Update status - pass only changed fields
        await api.apiUpdateItem<InboxMessage>('inboxMessages', messageId, { status: 'refused', refusalReason: reason, processedBy: processorName });
    }

    const handleFollowUpComplaint = async (messageId: string) => {
        const processorName = user?.name || 'Admin';
        // Update status - pass only changed fields
        await api.apiUpdateItem<InboxMessage>('inboxMessages', messageId, { status: 'followed-up', processedBy: processorName });
    }

    const handleDeleteInboxMessage = (messageId: string) => handleDeleteItem('inboxMessages', messageId);

    const handleSaveEmployeeAvailability = (employeeId: string, availability: WeeklyAvailability) => handleSaveItem('employeeAvailabilities', { id: employeeId, employeeId, availability, companyId: user!.companyId }, !state.employeeAvailabilities.some(ea => ea.id === employeeId));

    const handleImportEmployees = async (importedData: Array<Omit<Employee, 'id' | 'avatarUrl' | 'companyId'>>) => {
        if (!user?.companyId) return;
        
        const existingEmails = new Set(state.employees.map(e => e.email.toLowerCase()));
        const newEmployees: Array<Omit<Employee, 'id' | 'avatarUrl' | 'companyId'>> = [];
        
        importedData.forEach(data => {
            const email = data.email?.toLowerCase();
            if (email && data.name && !existingEmails.has(email)) {
                let accessCode = data.accessCode;
                if (user?.plan === 'Pro Plus' && !accessCode) {
                    accessCode = generateAccessCode();
                }
                newEmployees.push({
                    name: data.name,
                    email: data.email,
                    phone: data.phone || '',
                    gender: data.gender || 'Prefer not to say',
                    role: data.role || 'Unassigned',
                    accessCode: accessCode,
                    birthDate: data.birthDate,
                    status: data.status,
                    customId: data.customId,
                    address: data.address,
                    hiringDate: data.hiringDate,
                    contractType: data.contractType,
                });
                existingEmails.add(email);
            }
        });
        
        if (newEmployees.length > 0) {
            try {
                await api.apiBulkCreateEmployees(newEmployees, user.companyId);
                alert(`${newEmployees.length} new employee(s) imported.`);
            } catch (error) {
                console.error("Failed to import employees:", error);
                alert("An error occurred during import. Please check the console for details.");
            }
        } else {
            alert("No new employees to import. They may already exist or the data was invalid.");
        }
    };

    const handleBulkAddShifts = async (newShifts: Array<Omit<Shift, 'id' | 'companyId'>>) => {
        if (!user?.companyId) return;
        try {
            await api.apiBulkCreateShifts(newShifts, user.companyId);
        } catch(error) {
            console.error("Failed to bulk add shifts", error);
            throw error;
        }
    }

    const handleSaveEmployeeDocument = (doc: EmployeeDocument) => handleSaveItem('employeeDocuments', doc, !state.employeeDocuments.some(d => d.id === doc.id));
    const handleDeleteEmployeeDocument = (docId: string) => handleDeleteItem('employeeDocuments', docId);

    const handleBulkCreateEmployeeDocuments = async (docs: Array<Omit<EmployeeDocument, 'id' | 'companyId'>>) => {
        if (!user?.companyId) return;
        try {
            await api.apiBulkCreateEmployeeDocuments(docs, user.companyId);
            alert(`${docs.length} new document(s) imported.`);
        } catch (error) {
            console.error("Failed to import documents:", error);
            alert("An error occurred during document import.");
        }
    };

    const handleAddDocumentType = async (name: string, isUnique: boolean) => { await api.apiCreateItem('documentTypes', { name, isUnique, companyId: user!.companyId }) };
    const handleUpdateDocumentType = async (id: string, name: string, isUnique: boolean) => { await api.apiUpdateItem('documentTypes', id, { id, name, isUnique, companyId: user!.companyId }) };
    const handleDeleteDocumentType = async (id: string) => { await api.apiDeleteItem('documentTypes', id) };

    const handleSaveMeeting = (meeting: Meeting) => handleSaveItem('meetings', meeting, !state.meetings.some(m => m.id === meeting.id));
    const handleDeleteMeeting = (meetingId: string) => handleDeleteItem('meetings', meetingId);
    const handleDeleteMultipleMeetings = (meetingIds: string[]) => api.apiBulkDeleteItems('meetings', meetingIds);

    const handleDeleteHistoryItems = (items: { id: string; type: 'shifts' | 'absences' | 'meetings' }[]) => {
        const itemsToDelete = items.map(item => ({ collection: item.type, id: item.id }));
        return api.apiBulkDeleteMixedItems(itemsToDelete);
    };

    const handleCreateAdditionalUser = (userData: Omit<User, 'id' | 'companyId' | 'plan' | 'isVerified' | 'password'>, password: string) => {
        if (!user) return Promise.resolve({ success: false, error: 'Not authenticated' });
        if (state.users.length >= permissions.userLimit) {
            return Promise.resolve({ success: false, error: `User limit of ${permissions.userLimit} reached.` });
        }
        const userWithCompanyData = { ...userData, companyId: user.companyId, plan: user.plan };
        return api.apiCreateAdditionalUser(userWithCompanyData, password);
    };
    const handleUpdateUser = (userToUpdate: User) => handleSaveItem('users', userToUpdate, false);
    const handleDeleteUser = (userId: string) => handleDeleteItem('users', userId);
    
    const handleAddMessageGroup = async (groupData: Omit<MessageGroup, 'id' | 'companyId' | 'createdAt' | 'createdBy'>) => {
        if (!user) return;
        await api.apiCreateItem('messageGroups', {
            ...groupData,
            companyId: user.companyId,
            createdAt: new Date(),
            createdBy: user.id
        });
    };
    const handleUpdateMessageGroup = (group: MessageGroup) => handleSaveItem('messageGroups', group, false);
    const handleDeleteMessageGroup = (groupId: string) => handleDeleteItem('messageGroups', groupId);
    const handleSendChatMessage = async (messageData: Omit<ChatMessage, 'id' | 'companyId' | 'timestamp' | 'readBy' | 'senderName' | 'senderAvatarUrl'>) => {
        if (!user) return;
        const fullMessageData = {
            ...messageData,
            companyId: user.companyId,
            senderName: user.name,
            senderAvatarUrl: user.avatarUrl,
            timestamp: new Date(),
            readBy: [user.id],
        };
        await api.apiCreateItem('chatMessages', fullMessageData);
    };
    const handleDeleteChatMessage = (messageId: string) => handleDeleteItem('chatMessages', messageId);
    const handleBulkDeleteChatMessages = (messageIds: string[]) => api.apiBulkDeleteItems('chatMessages', messageIds);

    const handleMarkConversationAsRead = async (conversationId: string) => {
        if (!user) return;
        const unreadMessageIds = state.chatMessages
            .filter(msg => msg.conversationId === conversationId && !msg.readBy.includes(user.id))
            .map(msg => msg.id);
    
        if (unreadMessageIds.length > 0) {
            try {
                await api.apiMarkMessagesAsRead(unreadMessageIds, user.id);
                // The onSnapshot listener will automatically update the state.
            } catch (error) {
                console.error("Failed to mark messages as read:", error);
            }
        }
    };


    const value: DataContextType = { 
        ...state, 
        handleSaveEmployee, handleDeleteEmployee, handleSaveShift, handleDeleteShift, 
        handleDeleteMultipleShifts, handleUpdateShifts, handleAddRole, handleUpdateRole, handleDeleteRole,
        handleAddLocation, handleUpdateLocation, handleDeleteLocation, handleAddDepartment, handleUpdateDepartment,
        handleDeleteDepartment, handleAddAbsenceType, handleUpdateAbsenceType, handleDeleteAbsenceType,
        handleSaveAbsence, handleDeleteAbsence, handleAddSpecialDayType, handleUpdateSpecialDayType,
        handleDeleteSpecialDayType, handleSaveSpecialDay, handleDeleteSpecialDay, handleValidateRequest,
        handleRefuseRequest, handleFollowUpComplaint, handleDeleteInboxMessage, handleSaveEmployeeAvailability, handleImportEmployees,
        handleBulkAddShifts, handleBulkDeleteEmployees, handleBulkAssignRole,
        handleSaveEmployeeDocument, handleDeleteEmployeeDocument, handleBulkCreateEmployeeDocuments,
        handleAddDocumentType, handleUpdateDocumentType, handleDeleteDocumentType,
        handleSaveMeeting, handleDeleteMeeting, handleDeleteMultipleMeetings,
        handleDeleteHistoryItems,
        handleCreateAdditionalUser, handleUpdateUser, handleDeleteUser,
        handleAddTeam, handleUpdateTeam, handleDeleteTeam,
        handleMarkConversationAsRead,
        handleAddMessageGroup, handleUpdateMessageGroup, handleDeleteMessageGroup,
        handleSendChatMessage, handleDeleteChatMessage, handleBulkDeleteChatMessages,
    };
    
    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};