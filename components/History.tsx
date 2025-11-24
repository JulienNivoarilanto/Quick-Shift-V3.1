import React, { useState, useMemo, FC } from 'react';
import { Employee, Shift, Absence, AbsenceType, Location, Department, Meeting } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { History as HistoryIcon, Filter, X, Download, Trash2, AlertTriangle, CheckSquare, Clock, UserMinus, UserCheck, Users } from 'lucide-react';
import MultiSelectDropdown from './MultiSelectDropdown';
import PurgeHistoryModal from './PurgeHistoryModal';
import HistoryExportModal from './HistoryExportModal';
import Avatar from './Avatar';
import Modal from './Modal';

type HistoryItemType = 'Presence' | 'Lateness' | 'Absence' | 'Meeting';

interface UnifiedHistoryItem {
    id: string; // Synthetic ID for UI keys
    type: HistoryItemType;
    date: Date;
    employeeId: string;
    details: string;
    hours?: number;
    rawItem: Shift | Absence | Meeting;
    rawType: 'shifts' | 'absences' | 'meetings';
}

interface HistoryProps {
    employees: Employee[];
    shifts: Shift[];
    absences: Absence[];
    absenceTypes: AbsenceType[];
    locations: Location[];
    departments: Department[];
    meetings: Meeting[];
    onDeleteHistoryItems: (items: { id: string; type: 'shifts' | 'absences' | 'meetings' }[]) => Promise<void>;
}

const toInputDateString = (date: Date): string => date.toISOString().split('T')[0];

const History: FC<HistoryProps> = (props) => {
    const { employees, shifts, absences, absenceTypes, locations, departments, meetings, onDeleteHistoryItems } = props;
    const { t } = useLanguage();
    const { user } = useAuth();
    const isProPlus = user?.plan === 'Pro Plus';
    const LATENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const [filters, setFilters] = useState({
        startDate: toInputDateString(thirtyDaysAgo),
        endDate: toInputDateString(today),
        employeeIds: [] as string[],
        absenceTypeIds: [] as string[],
        departmentIds: [] as string[],
        locationIds: [] as string[],
    });
    const [sort, setSort] = useState<'dateDesc' | 'dateAsc' | 'nameAsc'>('dateDesc');
    const [selectedItems, setSelectedItems] = useState<{ id: string; type: 'shifts' | 'absences' | 'meetings' }[]>([]);
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);


    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
    const absenceTypeMap = useMemo(() => new Map(absenceTypes.map(at => [at.id, at])), [absenceTypes]);

    const unifiedHistory = useMemo(() => {
        const history: UnifiedHistoryItem[] = [];
        const todayForComparison = new Date();

        // Process shifts for presence and lateness
        shifts.forEach(shift => {
            if (shift.startTime > todayForComparison || !shift.employeeId) return;

            const shiftHours = (shift.endTime.getTime() - shift.startTime.getTime()) / 3600000;
            const employee = employeeMap.get(shift.employeeId);
            if (!employee) return;

            const location = locations.find(l => l.id === shift.locationId);
            const department = departments.find(d => d.id === shift.departmentId);

            if (isProPlus && shift.actualStartTime) {
                const lateness = new Date(shift.actualStartTime).getTime() - new Date(shift.startTime).getTime();
                if (lateness > LATENESS_THRESHOLD) {
                    history.push({
                        id: `lateness-${shift.id}`,
                        type: 'Lateness',
                        date: new Date(shift.startTime),
                        employeeId: shift.employeeId,
                        details: t('history.latenessDetails', { minutes: Math.round(lateness / 60000) }),
                        hours: shiftHours,
                        rawItem: shift,
                        rawType: 'shifts'
                    });
                }
            }
            
            history.push({
                id: shift.id,
                type: 'Presence',
                date: new Date(shift.startTime),
                employeeId: shift.employeeId,
                details: `${shift.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${shift.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${location ? ` @ ${location.name}` : ''}${department ? ` (${department.name})` : ''}`,
                hours: shiftHours,
                rawItem: shift,
                rawType: 'shifts'
            });
        });

        // Process absences
        absences.forEach(absence => {
             if (absence.startDate > todayForComparison) return;
             const absenceType = absenceTypeMap.get(absence.absenceTypeId);
             if (!absenceType) return;
             
             for (let d = new Date(absence.startDate); d <= absence.endDate; d.setDate(d.getDate() + 1)) {
                 if (d > todayForComparison) break;
                 history.push({
                    id: `${absence.id}-${d.toISOString().split('T')[0]}`,
                    type: 'Absence',
                    date: new Date(d),
                    employeeId: absence.employeeId,
                    details: absenceType.name,
                    rawItem: absence,
                    rawType: 'absences'
                });
             }
        });
        
        // Process meetings
        meetings.forEach(meeting => {
            if (meeting.startTime > todayForComparison) return;
            const meetingHours = (meeting.endTime.getTime() - meeting.startTime.getTime()) / 3600000;
            const organizer = employeeMap.get(meeting.organizerId);
            if (!organizer) return;
            
            let details = meeting.subject;
            if(meeting.participantIds.length > 0) {
                details += ` with ${meeting.participantIds.length} participant(s)`;
            }

            history.push({
                id: meeting.id,
                type: 'Meeting',
                date: new Date(meeting.startTime),
                employeeId: meeting.organizerId,
                details: details,
                hours: meetingHours,
                rawItem: meeting,
                rawType: 'meetings'
            });
        });

        return history;
    }, [shifts, absences, meetings, employees, absenceTypes, locations, departments, isProPlus, t]);

    const filteredAndSortedHistory = useMemo(() => {
        const start = new Date(filters.startDate + 'T00:00:00');
        const end = new Date(filters.endDate + 'T23:59:59');
        
        const filtered = unifiedHistory.filter(item => {
            if (item.date < start || item.date > end) return false;
            if (filters.employeeIds.length > 0 && !filters.employeeIds.includes(item.employeeId)) return false;
    
            if (filters.absenceTypeIds.length > 0) {
                if (item.type !== 'Absence') return false;
                const absence = item.rawItem as Absence;
                if (!filters.absenceTypeIds.includes(absence.absenceTypeId)) return false;
            }
    
            if (filters.departmentIds.length > 0) {
                if (item.type === 'Absence') return false;
                const shiftOrMeeting = item.rawItem as Shift | Meeting;
                const departmentId = (shiftOrMeeting as Shift).departmentId;
                if (!departmentId || !filters.departmentIds.includes(departmentId)) return false;
            }
            
            if (filters.locationIds.length > 0) {
                if (item.type === 'Absence') return false;
                const shiftOrMeeting = item.rawItem as Shift | Meeting;
                const locationId = shiftOrMeeting.locationId;
                if (!locationId || !filters.locationIds.includes(locationId)) return false;
            }
    
            return true;
        });

        return filtered.sort((a, b) => {
            switch (sort) {
                case 'dateAsc': return a.date.getTime() - b.date.getTime();
                case 'nameAsc': 
                    const nameA = employeeMap.get(a.employeeId)?.name || '';
                    const nameB = employeeMap.get(b.employeeId)?.name || '';
                    return nameA.localeCompare(nameB) || (b.date.getTime() - a.date.getTime());
                default: return b.date.getTime() - a.date.getTime();
            }
        });

    }, [unifiedHistory, filters, sort, employeeMap]);

    const handleFilterChange = (change: Partial<typeof filters>) => {
        setFilters(prev => ({ ...prev, ...change }));
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: toInputDateString(thirtyDaysAgo),
            endDate: toInputDateString(today),
            employeeIds: [], absenceTypeIds: [], departmentIds: [], locationIds: [],
        });
    };
    
    const handleToggleSelection = (item: UnifiedHistoryItem) => {
        const itemIdentifier = { id: (item.rawItem as any).id, type: item.rawType };
        setSelectedItems(prev => {
            const existingIndex = prev.findIndex(i => i.id === itemIdentifier.id && i.type === itemIdentifier.type);
            if (existingIndex > -1) {
                return prev.filter((_, index) => index !== existingIndex);
            } else {
                // For absences, ensure we only add it once even if it spans multiple days
                if(item.rawType === 'absences' && prev.some(i => i.id === itemIdentifier.id && i.type === 'absences')) {
                    return prev;
                }
                return [...prev, itemIdentifier];
            }
        });
    };
    
    const handleDeleteSelected = () => {
        if(selectedItems.length > 0) {
            setShowDeleteConfirm(true);
        }
    };
    
    const confirmDeleteSelected = () => {
        onDeleteHistoryItems(selectedItems);
        setSelectedItems([]);
        setShowDeleteConfirm(false);
    };
    
    const handleConfirmPurge = async (startDate: Date, endDate: Date) => {
        const itemsToDelete: { id: string; type: 'shifts' | 'absences' | 'meetings' }[] = [
            ...shifts
                .filter(s => s.startTime >= startDate && s.startTime <= endDate)
                .map(s => ({ id: s.id, type: 'shifts' as const })),
            ...absences
                .filter(a => new Date(a.startDate) <= endDate && new Date(a.endDate) >= startDate)
                .map(a => ({ id: a.id, type: 'absences' as const })),
            ...meetings
                .filter(m => m.startTime >= startDate && m.startTime <= endDate)
                .map(m => ({ id: m.id, type: 'meetings' as const })),
        ];
        
        if (itemsToDelete.length > 0) {
            await onDeleteHistoryItems(itemsToDelete);
            alert(t('history.purgeSuccess'));
        } else {
            alert('No items found in the selected date range to purge.');
        }
    };

    const getTypePill = (type: HistoryItemType) => {
        const styles = {
            Presence: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
            Absence: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300',
            Lateness: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
            Meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        }[type];
        const icon = {
            Presence: <UserCheck size={14} />,
            Absence: <UserMinus size={14} />,
            Lateness: <Clock size={14} />,
            Meeting: <Users size={14} />,
        }[type];
        return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
                {icon}
                <span className="ml-1.5">{t(`history.type${type}`)}</span>
            </span>
        );
    };


    return (
        <div className="animate-slide-in-up">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('history.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('history.description')}</p>

            <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md space-y-4">
                {/* Filter Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    <div className="xl:col-span-2">
                        <label className="label-style">{t('history.byDate')}</label>
                        <div className="flex items-center gap-2">
                            <input type="date" value={filters.startDate} onChange={e => handleFilterChange({ startDate: e.target.value })} className="input-style"/>
                            <input type="date" value={filters.endDate} onChange={e => handleFilterChange({ endDate: e.target.value })} min={filters.startDate} className="input-style"/>
                        </div>
                    </div>
                     <MultiSelectDropdown label={t('history.byEmployee')} options={employees.map(e => ({id: e.id, name: e.name}))} selectedIds={filters.employeeIds} onSelectionChange={ids => handleFilterChange({employeeIds: ids})} placeholder={t('referencing.allEmployees')} />
                     <MultiSelectDropdown label={t('history.byAbsenceType')} options={absenceTypes.map(at => ({id: at.id, name: at.name}))} selectedIds={filters.absenceTypeIds} onSelectionChange={ids => handleFilterChange({absenceTypeIds: ids})} placeholder={t('history.allAbsenceTypes')} />
                     <MultiSelectDropdown label={t('history.byDepartment')} options={departments.map(d => ({id: d.id, name: d.name}))} selectedIds={filters.departmentIds} onSelectionChange={ids => handleFilterChange({departmentIds: ids})} placeholder={t('calendarFilter.allDepartments')} />
                     <MultiSelectDropdown label={t('history.byLocation')} options={locations.map(l => ({id: l.id, name: l.name}))} selectedIds={filters.locationIds} onSelectionChange={ids => handleFilterChange({locationIds: ids})} placeholder={t('settings.locations')} />
                    
                    <div className="xl:col-span-3">
                        <label className="label-style">{t('history.sort')}</label>
                        <select value={sort} onChange={e => setSort(e.target.value as any)} className="input-style">
                            <option value="dateDesc">{t('history.sortDateDesc')}</option>
                            <option value="dateAsc">{t('history.sortDateAsc')}</option>
                            <option value="nameAsc">{t('history.sortNameAsc')}</option>
                        </select>
                    </div>

                    <div className="flex items-end gap-2 xl:col-span-3">
                        <button onClick={handleClearFilters} className="btn-secondary w-full"><X size={16} className="mr-2"/>{t('calendarFilter.clearAll')}</button>
                        <button onClick={() => setIsExportModalOpen(true)} className="btn-secondary w-full"><Download size={16} className="mr-2"/>{t('history.export')}</button>
                        <button onClick={() => setIsPurgeModalOpen(true)} className="btn-danger w-full"><Trash2 size={16} className="mr-2"/>{t('history.purge')}</button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {selectedItems.length > 0 && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-lg flex justify-between items-center mb-2">
                             <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">{t('employees.selectedCount', { count: selectedItems.length })}</span>
                             <button onClick={handleDeleteSelected} className="btn-danger-sm"><Trash2 size={14} className="mr-1"/> {t('history.deleteSelected', { count: selectedItems.length })}</button>
                        </div>
                    )}
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-blue-night-800 text-xs uppercase text-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3 w-10"><CheckSquare size={16} /></th>
                                <th className="px-4 py-3">{t('history.tableDate')}</th>
                                <th className="px-4 py-3">{t('history.tableEmployee')}</th>
                                <th className="px-4 py-3">{t('history.tableType')}</th>
                                <th className="px-4 py-3">{t('history.tableDetails')}</th>
                                <th className="px-4 py-3">{t('history.tableHours')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedHistory.map(item => {
                                const emp = employeeMap.get(item.employeeId);
                                const isSelected = selectedItems.some(i => i.id === (item.rawItem as any).id && i.type === item.rawType);
                                return (
                                    <tr key={item.id} className="border-b dark:border-blue-night-700 hover:bg-gray-50 dark:hover:bg-blue-night-800/50">
                                        <td className="px-4 py-2"><input type="checkbox" checked={isSelected} onChange={() => handleToggleSelection(item)} className="h-4 w-4 rounded" /></td>
                                        <td className="px-4 py-2 font-medium">{item.date.toLocaleDateString()}</td>
                                        <td className="px-4 py-2">
                                            {emp ? (
                                                <div className="flex items-center">
                                                    <Avatar name={emp.name} src={emp.avatarUrl} className="w-7 h-7 rounded-full mr-2" />
                                                    {emp.name}
                                                </div>
                                            ) : 'N/A'}
                                        </td>
                                        <td className="px-4 py-2">{getTypePill(item.type)}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{item.details}</td>
                                        <td className="px-4 py-2 font-mono">{item.hours ? `${item.hours.toFixed(2)}h` : '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                     {filteredAndSortedHistory.length === 0 && <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('history.noHistory')}</p>}
                </div>
            </div>

            {isPurgeModalOpen && (
                <PurgeHistoryModal isOpen={true} onClose={() => setIsPurgeModalOpen(false)} onPurge={handleConfirmPurge} />
            )}

            {isExportModalOpen && (
                <HistoryExportModal 
                    isOpen={true} 
                    onClose={() => setIsExportModalOpen(false)} 
                    data={filteredAndSortedHistory}
                    employees={employees}
                />
            )}
            
            {showDeleteConfirm && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowDeleteConfirm(false)}
                    title={t('history.deleteSelected', {count: selectedItems.length})}
                    size="sm"
                    footer={<><button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">{t('modals.cancel')}</button><button onClick={confirmDeleteSelected} className="btn-danger">{t('modals.confirm')}</button></>}
                >
                    <p>{t('history.confirmDelete', { count: selectedItems.length })}</p>
                </Modal>
            )}

            <style>{`
                .label-style { display: block; margin-bottom: 0.25rem; font-size: 0.75rem; font-weight: 500; color: #64748b; }
                .dark .label-style { color: #94a3b8; }
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; }
                .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .btn-secondary { display: flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; }
                .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
                .btn-danger { display: flex; align-items: center; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #dc2626; }
                .btn-danger-sm { display: flex; align-items: center; padding: 0.25rem 0.75rem; border-radius: 0.5rem; font-size: 0.75rem; font-weight: 600; color: #dc2626; background-color: #fee2e2; }
                .dark .btn-danger-sm { color: #f87171; background-color: rgba(153, 27, 27, 0.4); }

            `}</style>
        </div>
    );
};

export default History;