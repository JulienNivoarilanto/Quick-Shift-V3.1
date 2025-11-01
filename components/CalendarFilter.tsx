import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, Role, Department } from '../types';
import { Filter, X, Download, UserMinus, Repeat, Plus, Lightbulb, Lock, Unlock, CheckSquare, XSquare, Trash2, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import MultiSelectDropdown from './MultiSelectDropdown';
import { Permissions } from '../contexts/AuthContext';


interface CalendarFilterProps {
    employees: Employee[];
    roles: Role[];
    departments: Department[];
    onFilterChange: (filters: { employeeIds: string[], roleNames: string[], departmentIds: string[] }) => void;
    onExportClick: () => void;
    onAddAbsenceClick: () => void;
    onBulkAddClick: () => void;
    onAddShiftClick: () => void;
    onAddMeetingClick: () => void;
    onTourClick: () => void;
    permissions: Permissions;
    isLocked: boolean;
    onToggleLock: () => void;
    isSelectionModeActive: boolean;
    onToggleSelectionMode: () => void;
    selectedShiftIds: string[];
    selectedMeetingIds: string[];
    onDeleteSelected: () => void;
}


const SearchableEmployeeSelect: React.FC<{
    employees: Employee[];
    selectedEmployeeIds: string[];
    onSelectionChange: (ids: string[]) => void;
}> = ({ employees, selectedEmployeeIds, onSelectionChange }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedEmployees = useMemo(() => employees.filter(e => selectedEmployeeIds.includes(e.id)), [employees, selectedEmployeeIds]);

    const availableEmployees = useMemo(() => {
        return employees
            .filter(e => !selectedEmployeeIds.includes(e.id))
            .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [employees, selectedEmployeeIds, searchTerm]);

    const handleSelect = (employeeId: string) => {
        onSelectionChange([...selectedEmployeeIds, employeeId]);
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleDeselect = (employeeId: string) => {
        onSelectionChange(selectedEmployeeIds.filter(id => id !== employeeId));
    };
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);


    return (
        <div className="relative" ref={wrapperRef}>
            <label htmlFor="employeeFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('calendarFilter.filterByEmployee')}</label>
            <div className="flex flex-wrap gap-1 items-center w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 min-h-[42px]">
                {selectedEmployees.map(emp => (
                    <div key={emp.id} className="flex items-center bg-blue-100 dark:bg-blue-night-900 text-blue-800 dark:text-blue-night-200 rounded-full px-2 py-0.5 text-sm">
                        <span>{emp.name}</span>
                        <button onClick={() => handleDeselect(emp.id)} className="ml-1.5 text-blue-600 dark:text-blue-night-300 hover:text-blue-800 dark:hover:text-blue-night-100">
                            <X size={12} />
                        </button>
                    </div>
                ))}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder={t('calendarFilter.searchEmployees')}
                    className="flex-grow bg-transparent focus:outline-none p-1"
                />
            </div>
            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-blue-night-800 border dark:border-blue-night-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {availableEmployees.length > 0 ? (
                        availableEmployees.map(emp => (
                            <div
                                key={emp.id}
                                onClick={() => handleSelect(emp.id)}
                                className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-night-700"
                            >
                                {emp.name}
                            </div>
                        ))
                    ) : (
                         <div className="px-4 py-2 text-gray-500">{t('calendarFilter.noResults')}</div>
                    )}
                </div>
            )}
        </div>
    );
};


const CalendarFilter: React.FC<CalendarFilterProps> = (props) => {
    const { 
        employees, roles, departments, onFilterChange, onExportClick, onAddAbsenceClick, 
        onBulkAddClick, onAddShiftClick, onAddMeetingClick, onTourClick, permissions, isLocked, onToggleLock,
        isSelectionModeActive, onToggleSelectionMode, selectedShiftIds, selectedMeetingIds, onDeleteSelected 
    } = props;
    const { t } = useLanguage();
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
    const [selectedRoleNames, setSelectedRoleNames] = useState<string[]>([]);
    const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    const updateFilters = (updatedFilters: Partial<{employeeIds: string[], roleNames: string[], departmentIds: string[]}>) => {
         const newFilters = {
            employeeIds: updatedFilters.employeeIds ?? selectedEmployeeIds,
            roleNames: updatedFilters.roleNames ?? selectedRoleNames,
            departmentIds: updatedFilters.departmentIds ?? selectedDepartmentIds
        };
        onFilterChange(newFilters);
    };

    const handleEmployeeChange = (ids: string[]) => {
        setSelectedEmployeeIds(ids);
        updateFilters({ employeeIds: ids });
    };

    const handleRoleChange = (names: string[]) => {
        setSelectedRoleNames(names);
        updateFilters({ roleNames: names });
    };

    const handleDepartmentChange = (ids: string[]) => {
        setSelectedDepartmentIds(ids);
        updateFilters({ departmentIds: ids });
    };
    
    const handleClearFilters = () => {
        setSelectedEmployeeIds([]);
        setSelectedRoleNames([]);
        setSelectedDepartmentIds([]);
        onFilterChange({ employeeIds: [], roleNames: [], departmentIds: [] });
    }
    
    const activeFilterCount = selectedEmployeeIds.length + selectedRoleNames.length + selectedDepartmentIds.length;
    const hasActiveFilters = activeFilterCount > 0;

    const roleOptions = useMemo(() => roles.map(role => ({ id: role.name, name: role.name })), [roles]);
    const selectedCount = selectedShiftIds.length + selectedMeetingIds.length;

    return (
        <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center font-semibold text-gray-800 dark:text-white"
                    >
                        <Filter size={20} className="mr-2" />
                        {t('calendarFilter.title')}
                    </button>
                    {hasActiveFilters && (
                        <span className="text-sm font-normal bg-blue-100 dark:bg-blue-night-800 text-blue-800 dark:text-blue-night-200 px-2 py-1 rounded-full">
                            {t('calendarFilter.active', { count: activeFilterCount })}
                        </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        data-tour-id="schedule-lock"
                        onClick={onToggleLock}
                        title={isLocked ? t('schedule.unlock') : t('schedule.lock')}
                        className={`p-2 rounded-lg transition-colors duration-300 ${
                            isLocked
                            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
                            : 'text-slate-600 dark:text-slate-300 bg-slate-200 hover:bg-slate-300 dark:bg-blue-night-700 dark:hover:bg-blue-night-600'
                        }`}
                    >
                        {isLocked ? <Lock size={20} /> : <Unlock size={20} />}
                    </button>
                    <button
                        data-tour-id="schedule-multiselect"
                        onClick={onToggleSelectionMode}
                        disabled={isLocked}
                        title={isSelectionModeActive ? t('schedule.cancelSelection') : t('schedule.selectShifts')}
                        className="p-2 rounded-lg transition-colors bg-gray-500 hover:bg-gray-600 text-white disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                    >
                        {isSelectionModeActive ? <XSquare size={20}/> : <CheckSquare size={20}/>}
                    </button>
                    {isSelectionModeActive && selectedCount > 0 && (
                        <button
                            onClick={onDeleteSelected}
                            title={t('schedule.deleteSelected', { count: selectedCount })}
                            className="p-2 rounded-lg transition-colors bg-red-600 hover:bg-red-700 text-white"
                        >
                           <Trash2 size={20} />
                        </button>
                    )}

                    <div className="h-6 border-l border-slate-300 dark:border-slate-600 mx-1"></div>

                    <button
                        onClick={onExportClick}
                        disabled={!permissions.canExport}
                        title={permissions.canExport ? t('schedule.export') : t('tooltips.proFeature')}
                        className="p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={onAddAbsenceClick}
                        disabled={!permissions.canAddAbsence || isLocked}
                        title={permissions.canAddAbsence ? t('schedule.addAbsence') : t('tooltips.proFeature')}
                        className="p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <UserMinus size={20} />
                    </button>
                    <button
                        data-tour-id="schedule-add-meeting"
                        onClick={onAddMeetingClick}
                        disabled={isLocked}
                        title={t('schedule.addMeeting')}
                        className="p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Users size={20} />
                    </button>
                    <button
                        data-tour-id="schedule-bulk-add"
                        onClick={onBulkAddClick}
                        disabled={isLocked}
                        title={t('schedule.bulkAdd')}
                        className="p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Repeat size={20} />
                    </button>
                    <button
                        onClick={onAddShiftClick}
                        disabled={isLocked}
                        title={t('schedule.addShift')}
                        className="p-2 rounded-lg transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    >
                        <Plus size={20} />
                    </button>
                    <div className="h-6 border-l border-slate-300 dark:border-slate-600 mx-1"></div>
                     <button 
                        onClick={onTourClick}
                        title={t('tour.quickTips')}
                        className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
                        aria-label={t('tour.quickTips')}
                     >
                        <Lightbulb size={20} className="text-yellow-400" />
                    </button>
                </div>
            </div>
            {showFilters && (
                <div className="mt-4 pt-4 border-t dark:border-blue-night-800 grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <SearchableEmployeeSelect 
                            employees={employees} 
                            selectedEmployeeIds={selectedEmployeeIds}
                            onSelectionChange={handleEmployeeChange}
                        />
                    </div>
                    <div>
                        <MultiSelectDropdown
                            label={t('calendarFilter.filterByRole')}
                            options={roleOptions}
                            selectedIds={selectedRoleNames}
                            onSelectionChange={handleRoleChange}
                            placeholder={t('employees.allRoles')}
                        />
                    </div>
                     <div>
                        <MultiSelectDropdown
                            label={t('calendarFilter.filterByDepartment')}
                            options={departments}
                            selectedIds={selectedDepartmentIds}
                            onSelectionChange={handleDepartmentChange}
                            placeholder={t('calendarFilter.allDepartments')}
                        />
                    </div>
                    <div className="lg:col-span-4 flex items-end">
                        <button 
                            onClick={handleClearFilters}
                            disabled={!hasActiveFilters}
                            className="w-full lg:w-auto flex items-center justify-center bg-gray-200 hover:bg-gray-300 dark:bg-blue-night-800 dark:hover:bg-blue-night-700 text-gray-700 dark:text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X size={16} className="mr-2"/>
                            {t('calendarFilter.clearAll')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarFilter;