

import React, { useState, useMemo } from 'react';
import { Shift, Employee, Role, Location, Department, Absence, AbsenceType, SpecialDay, SpecialDayType, EmployeeAvailability, ClockingStatus, Meeting, Team } from '../types';
import ShiftCard from './ShiftCard';
import AbsenceCard from './AbsenceCard';
import MeetingCard from './MeetingCard';
import Modal from './Modal';
import ShiftEditor from './ShiftEditor';
import AbsenceEditor from './AbsenceEditor';
import MeetingEditor from './MeetingEditor';
import CalendarFilter from './CalendarFilter';
import SpecialDayEditor from './SpecialDayEditor';
import ExportModal from './ExportModal';
import FeatureTour, { TourStep } from './FeatureTour';
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckSquare, XSquare, UserMinus, Star, Download, ZoomIn, ZoomOut, Lock, Unlock, Lightbulb, Repeat, Users, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import BulkShiftEditor from './BulkShiftEditor';

const getWeekDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        week.push(day);
    }
    return week;
};

const getTwoWeeksDays = (date: Date): Date[] => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const twoWeeks: Date[] = [];
    for (let i = 0; i < 14; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        twoWeeks.push(day);
    }
    return twoWeeks;
};

const getMonthGridDays = (date: Date): Date[] => {
    const month = date.getMonth();
    const year = date.getFullYear();
    const firstDayOfMonth = new Date(year, month, 1);
    
    const days: Date[] = [];
    const startDate = new Date(firstDayOfMonth);
    const dayOfWeek = startDate.getDay();
    // Adjust start date to the beginning of the week (Monday)
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
    startDate.setDate(startDate.getDate() - offset);

    // Always render 6 weeks for a consistent grid layout
    for (let i = 0; i < 42; i++) { 
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
    }
    return days;
};


const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const isDateBetween = (date: Date, start: Date, end: Date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0,0,0,0);
    const startDate = new Date(start);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(end);
    endDate.setHours(0,0,0,0);
    return checkDate >= startDate && checkDate <= endDate;
}


interface ScheduleCalendarProps {
    employees: Employee[];
    roles: Role[];
    shifts: Shift[];
    locations: Location[];
    departments: Department[];
    absences: Absence[];
    absenceTypes: AbsenceType[];
    specialDays: SpecialDay[];
    specialDayTypes: SpecialDayType[];
    employeeAvailabilities: EmployeeAvailability[];
    meetings: Meeting[];
    teams: Team[];
    onSaveShift: (shift: Shift) => void;
    onDeleteShift: (shiftId: string) => void;
    onDeleteMultipleShifts: (shiftIds: string[]) => void;
    onUpdateShifts: (shifts: Shift[]) => void;
    onSaveAbsence: (absence: Absence) => void;
    onDeleteAbsence: (absenceId: string) => void;
    onSaveSpecialDay: (specialDay: SpecialDay) => void;
    onDeleteSpecialDay: (specialDayId: string) => void;
    onBulkAddShifts: (newShifts: Array<Omit<Shift, 'id' | 'companyId'>>) => Promise<void>;
    onSaveMeeting: (meeting: Meeting) => Promise<void>;
    onDeleteMeeting: (meetingId: string) => Promise<void>;
    onDeleteMultipleMeetings: (meetingIds: string[]) => Promise<void>;
}

const scheduleTourSteps: TourStep[] = [
    { selector: "[data-tour-id='schedule-drag-shift']", titleKey: 'tour.schedule.dragDropTitle', contentKey: 'tour.schedule.dragDropContent', position: 'right' },
    { selector: "[data-tour-id='schedule-quick-add']", titleKey: 'tour.schedule.quickAddTitle', contentKey: 'tour.schedule.quickAddContent', position: 'bottom' },
    { selector: "[data-tour-id='schedule-bulk-add']", titleKey: 'tour.schedule.bulkAddTitle', contentKey: 'tour.schedule.bulkAddContent', position: 'bottom' },
    { selector: "[data-tour-id='schedule-add-meeting']", titleKey: 'tour.schedule.addMeetingTitle', contentKey: 'tour.schedule.addMeetingContent', position: 'bottom' },
    { selector: "[data-tour-id='schedule-multiselect']", titleKey: 'tour.schedule.multiSelectTitle', contentKey: 'tour.schedule.multiSelectContent', position: 'left' },
    { selector: "[data-tour-id='schedule-zoom']", titleKey: 'tour.schedule.zoomTitle', contentKey: 'tour.schedule.zoomContent', position: 'bottom' },
    { selector: "[data-tour-id='schedule-lock']", titleKey: 'tour.schedule.lockTitle', contentKey: 'tour.schedule.lockContent', position: 'left' },
    { selector: "[data-tour-id='schedule-filters']", titleKey: 'tour.schedule.filterTitle', contentKey: 'tour.schedule.filterContent', position: 'bottom' },
];


const ScheduleCalendar: React.FC<ScheduleCalendarProps> = (props) => {
    const { 
        employees, roles, shifts, locations, departments, absences, absenceTypes, specialDays, specialDayTypes,
        employeeAvailabilities, meetings, teams, onSaveShift, onDeleteShift, onDeleteMultipleShifts, onUpdateShifts, onSaveAbsence, onDeleteAbsence,
        onSaveSpecialDay, onDeleteSpecialDay, onBulkAddShifts, onSaveMeeting, onDeleteMeeting, onDeleteMultipleMeetings
    } = props;
    
    const { user, permissions } = useAuth();
    const { t, language } = useLanguage();
    const { theme } = useTheme();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [draggedItemId, setDraggedItemId] = useState<{ id: string; type: 'shift' | 'meeting' } | null>(null);
    const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
    const [view, setView] = useState<'week' | 'two-weeks' | 'month'>('week');
    const [zoomLevel, setZoomLevel] = useState(1); // 0: compact, 1: default, 2: detailed
    const [isLocked, setIsLocked] = useState(false);
    
    // Modal States
    const [shiftEditorState, setShiftEditorState] = useState<{isOpen: boolean, shift: Shift | null, date?: Date}>({isOpen: false, shift: null});
    const [absenceEditorState, setAbsenceEditorState] = useState<{isOpen: boolean, absence: Absence | null}>({isOpen: false, absence: null});
    const [specialDayEditorState, setSpecialDayEditorState] = useState<{isOpen: boolean, specialDay: SpecialDay | null, date: Date | null}>({isOpen: false, specialDay: null, date: null});
    const [meetingEditorState, setMeetingEditorState] = useState<{isOpen: boolean, meeting: Meeting | null, date?: Date}>({isOpen: false, meeting: null});
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
    const [dayDetailModal, setDayDetailModal] = useState<{isOpen: boolean, date: Date | null}>({isOpen: false, date: null});
    const [deleteConfirm, setDeleteConfirm] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void}>({isOpen: false, title: '', message: '', onConfirm: () => {}});

    const [isSelectionModeActive, setIsSelectionModeActive] = useState(false);
    const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([]);
    const [selectedMeetingIds, setSelectedMeetingIds] = useState<string[]>([]);
    
    const [filters, setFilters] = useState<{ employeeIds: string[], roleNames: string[], departmentIds: string[] }>({ employeeIds: [], roleNames: [], departmentIds: [] });
    const [isTourActive, setIsTourActive] = useState(false);

    const formatDay = (date: Date) => date.toLocaleDateString(language, { weekday: 'short' }).toUpperCase();

    const activeEmployees = useMemo(() => employees.filter(e => e.status === 'active'), [employees]);

    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
    const twoWeeksDays = useMemo(() => getTwoWeeksDays(currentDate), [currentDate]);
    const monthGridDays = useMemo(() => getMonthGridDays(currentDate), [currentDate]);
    
    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const filteredCalendarItems = useMemo(() => {
        const employeeMap = new Map<string, Employee>(employees.map(e => [e.id, e]));

        const filterByEmployee = (employeeId: string) => {
            const employee = employeeMap.get(employeeId);
            if (!employee) return false;
            const employeeMatch = filters.employeeIds.length === 0 || filters.employeeIds.includes(employee.id);
            const roleMatch = filters.roleNames.length === 0 || filters.roleNames.includes(employee.role);
            return employeeMatch && roleMatch;
        };

        const filteredShifts = shifts.filter(shift => {
            if (!shift.employeeId) return true;
            if (!filterByEmployee(shift.employeeId)) return false;
            const departmentMatch = filters.departmentIds.length === 0 || (shift.departmentId && filters.departmentIds.includes(shift.departmentId));
            return departmentMatch;
        });
        
        const filteredAbsences = absences.filter(absence => filterByEmployee(absence.employeeId));

        const filteredMeetings = meetings.filter(meeting => {
            const allInvolved = [meeting.organizerId, ...meeting.participantIds];
            const shouldBeVisible = allInvolved.some(empId => filterByEmployee(empId));
            if (!shouldBeVisible) return false;
            const departmentMatch = filters.departmentIds.length === 0 || !meeting.locationId || (locations.find(l => l.id === meeting.locationId)?.name === departments.find(d => filters.departmentIds.includes(d.id))?.name); // Simple approximation
            return departmentMatch;
        });

        return { shifts: filteredShifts, absences: filteredAbsences, meetings: filteredMeetings };

    }, [shifts, absences, meetings, employees, locations, departments, filters]);


    const firstShiftTargetInfo = useMemo(() => {
        const days = view === 'week' ? weekDays : twoWeeksDays;
        for (const day of days) {
            const shift = filteredCalendarItems.shifts.find(s => !!s.employeeId && isDateBetween(day, s.startTime, s.endTime));
            if (shift) {
                return { day: day, shiftId: shift.id };
            }
        }
        return null;
    }, [view, weekDays, twoWeeksDays, filteredCalendarItems.shifts]);


    const handlePrev = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            if (view === 'week') {
                newDate.setDate(newDate.getDate() - 7);
            } else if (view === 'two-weeks') {
                newDate.setDate(newDate.getDate() - 14);
            } else {
                newDate.setMonth(newDate.getMonth() - 1);
            }
            return newDate;
        });
    };
    const handleNext = () => {
        setCurrentDate(d => {
            const newDate = new Date(d);
            if (view === 'week') {
                newDate.setDate(newDate.getDate() + 7);
            } else if (view === 'two-weeks') {
                newDate.setDate(newDate.getDate() + 14);
            } else {
                newDate.setMonth(newDate.getMonth() + 1);
            }
            return newDate;
        });
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, day: Date) => {
        e.preventDefault();
        setDragOverDate(null);
        setDraggedItemId(null);
        if (isLocked) return;
    
        if (day < today) {
            alert("Cannot move items to a past date.");
            return;
        }

        const id = e.dataTransfer.getData('id');
        const type = e.dataTransfer.getData('type');
    
        if (!id || !type) return;

        const holidayOnDay = specialDays.find(sd => {
            const type = specialDayTypes.find(sdt => sdt.id === sd.typeId);
            return isSameDay(sd.date, day) && type?.isHoliday && sd.coverage === 'all-day';
        });
    
        if (holidayOnDay) {
            alert("Cannot move item to a holiday.");
            return;
        }

        if (type === 'shift') {
            const originalShift = shifts.find(s => s.id === id);
            if (!originalShift) return;

            const duration = new Date(originalShift.endTime).getTime() - new Date(originalShift.startTime).getTime();
            const newStartTime = new Date(day);
            newStartTime.setHours(new Date(originalShift.startTime).getHours(), new Date(originalShift.startTime).getMinutes(), new Date(originalShift.startTime).getSeconds(), new Date(originalShift.startTime).getMilliseconds());
            const newEndTime = new Date(newStartTime.getTime() + duration);

            if (originalShift.employeeId) {
                const hasAbsenceConflict = absences.some(absence => absence.employeeId === originalShift.employeeId && isDateBetween(day, absence.startDate, absence.endDate));
                if (hasAbsenceConflict) {
                    alert("Cannot move shift to a day where the employee is absent.");
                    return;
                }

                const hasOverlap = shifts.some(s => s.id !== id && s.employeeId === originalShift.employeeId && newStartTime < new Date(s.endTime) && newEndTime > new Date(s.startTime));
                if (hasOverlap) {
                    alert(t('schedule.errorShiftConflictAlert'));
                    return;
                }
            }
        
            const updatedShift = { ...originalShift, startTime: newStartTime, endTime: newEndTime };
            onSaveShift(updatedShift);
        } else if (type === 'meeting') {
            const originalMeeting = meetings.find(m => m.id === id);
            if (!originalMeeting) return;
            
            const duration = new Date(originalMeeting.endTime).getTime() - new Date(originalMeeting.startTime).getTime();
            const newStartTime = new Date(day);
            newStartTime.setHours(new Date(originalMeeting.startTime).getHours(), new Date(originalMeeting.startTime).getMinutes(), new Date(originalMeeting.startTime).getSeconds(), new Date(originalMeeting.startTime).getMilliseconds());
            const newEndTime = new Date(newStartTime.getTime() + duration);
    
            const allInvolvedIds = Array.from(new Set([originalMeeting.organizerId, ...originalMeeting.participantIds]));
            
            for (const empId of allInvolvedIds) {
                const employee = employees.find(e => e.id === empId);
                const hasAbsenceConflict = absences.some(absence => absence.employeeId === empId && isDateBetween(day, absence.startDate, absence.endDate));
                if (hasAbsenceConflict) {
                    alert(`Cannot move meeting. ${employee?.name} is absent.`);
                    return;
                }
                
                const hasMeetingOverlap = meetings.some(m => {
                    if (m.id === id) return false;
                    const isOrganizerOrParticipant = m.organizerId === empId || m.participantIds.includes(empId);
                    if (!isOrganizerOrParticipant) return false;
                    return newStartTime < new Date(m.endTime) && newEndTime > new Date(m.startTime);
                });
                if (hasMeetingOverlap) {
                     alert(`Cannot move meeting. Conflicts with another meeting for ${employee?.name}.`);
                     return;
                }
            }
            
            const updatedMeeting = { ...originalMeeting, startTime: newStartTime, endTime: newEndTime };
            onSaveMeeting(updatedMeeting);
        }
    };

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, id: string, type: 'shift' | 'meeting') => {
        if (isLocked) return;
        e.dataTransfer.setData('id', id);
        e.dataTransfer.setData('type', type);
        setDraggedItemId({ id, type });
    };

    // Modal Openers
    const openAddShiftModal = (date: Date) => { 
        const isPastDay = date < today;
        if (isLocked || isPastDay) return;
        setShiftEditorState({isOpen: true, shift: null, date}); 
    }
    const openEditShiftModal = (shift: Shift) => {
        setShiftEditorState({isOpen: true, shift: shift});
    }
    const openAddAbsenceModal = () => { if (!isLocked) setAbsenceEditorState({isOpen: true, absence: null}); }
    const openEditAbsenceModal = (absence: Absence) => {
        setAbsenceEditorState({isOpen: true, absence: absence});
    }
    const openSpecialDayModal = (date: Date) => {
        if (isLocked) return;
        const existing = specialDays.find(sd => isSameDay(sd.date, date));
        setSpecialDayEditorState({ isOpen: true, specialDay: existing || null, date });
    }
    const openDayDetailModal = (date: Date) => { if (!isLocked) setDayDetailModal({isOpen: true, date: date}); }

    const openAddMeetingModal = (date: Date) => {
        if (isLocked) return;
        setMeetingEditorState({isOpen: true, meeting: null, date});
    };
    const openEditMeetingModal = (meeting: Meeting) => {
        setMeetingEditorState({isOpen: true, meeting: meeting});
    };


    const handleShiftSave = (shift: Shift) => { 
        onSaveShift(shift); 
        setShiftEditorState({isOpen: false, shift: null}); 
    }
    const requestShiftDelete = (shiftId: string) => {
        setDeleteConfirm({
            isOpen: true,
            title: t('modals.confirmDeleteShift'),
            message: 'This action cannot be undone.',
            onConfirm: () => {
                onDeleteShift(shiftId);
                setDeleteConfirm({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };
    const requestMeetingDelete = (meetingId: string) => {
        setDeleteConfirm({
            isOpen: true,
            title: t('modals.confirmDeleteMeeting'),
            message: 'This action cannot be undone.',
            onConfirm: () => {
                onDeleteMeeting(meetingId);
                setDeleteConfirm({ isOpen: false, title: '', message: '', onConfirm: () => {} });
            }
        });
    };

     const handleDeleteSelected = () => {
        const totalSelected = selectedShiftIds.length + selectedMeetingIds.length;
        if (totalSelected > 0) {
            setDeleteConfirm({
                isOpen: true,
                title: t('modals.confirmDeleteMultiple', { count: totalSelected }),
                message: 'This action cannot be undone.',
                onConfirm: () => {
                    if (selectedShiftIds.length > 0) onDeleteMultipleShifts(selectedShiftIds);
                    if (selectedMeetingIds.length > 0) onDeleteMultipleMeetings(selectedMeetingIds);
                    setSelectedShiftIds([]);
                    setSelectedMeetingIds([]);
                    setIsSelectionModeActive(false);
                    setDeleteConfirm({ isOpen: false, title: '', message: '', onConfirm: () => {} });
                }
            });
        }
    }
    
    // Regular savers/deleters
    const handleAbsenceSave = (absence: Absence) => { onSaveAbsence(absence); setAbsenceEditorState({isOpen: false, absence: null}); }
    const handleSpecialDaySave = (specialDay: SpecialDay) => { onSaveSpecialDay(specialDay); setSpecialDayEditorState({isOpen: false, specialDay: null, date: null}); }
    const handleMeetingSave = (meeting: Meeting) => { onSaveMeeting(meeting); setMeetingEditorState({isOpen: false, meeting: null}); }
    const handleAbsenceDelete = (absenceId: string) => { onDeleteAbsence(absenceId); setAbsenceEditorState({isOpen: false, absence: null}); }
    const handleSpecialDayDelete = (specialDayId: string) => { onDeleteSpecialDay(specialDayId); setSpecialDayEditorState({isOpen: false, specialDay: null, date: null}); }
    
    const toggleSelectionMode = () => { setIsSelectionModeActive(!isSelectionModeActive); setSelectedShiftIds([]); setSelectedMeetingIds([]); }
    const toggleShiftSelection = (shiftId: string) => setSelectedShiftIds(prev => prev.includes(shiftId) ? prev.filter(id => id !== shiftId) : [...prev, shiftId]);
    const toggleMeetingSelection = (meetingId: string) => setSelectedMeetingIds(prev => prev.includes(meetingId) ? prev.filter(id => id !== meetingId) : [...prev, meetingId]);
    
    const handleZoomIn = () => setZoomLevel(level => Math.min(level + 1, 2));
    const handleZoomOut = () => setZoomLevel(level => Math.max(level - 1, 0));
    const toggleLock = () => setIsLocked(prev => !prev);


    const getClockingStatus = (shift: Shift): ClockingStatus => {
        if (user?.plan !== 'Pro Plus' || !shift.employeeId) {
            return 'future';
        }

        const now = new Date();
        const employeeAbsence = filteredCalendarItems.absences.find(a =>
            a.employeeId === shift.employeeId &&
            isDateBetween(shift.startTime, a.startDate, a.endDate)
        );

        if (employeeAbsence) return 'absent';
        if (shift.actualStartTime) return 'present';
        if (new Date(shift.startTime) < now && !shift.actualStartTime) return 'not-clocked-in';

        return 'future';
    };

    const HeaderDisplay = () => {
        if (view === 'week' || view === 'two-weeks') {
            const days = view === 'week' ? weekDays : twoWeeksDays;
            const startDate = days[0];
            const endDate = days[days.length - 1];
    
            const startMonth = startDate.toLocaleDateString(language, { month: 'long' });
            const endMonth = endDate.toLocaleDateString(language, { month: 'long' });
            const startDay = startDate.getDate();
            const endDay = endDate.getDate();
            const startYear = startDate.getFullYear();
            const endYear = endDate.getFullYear();
    
            let mainText, yearText;
    
            if (startYear !== endYear) {
                mainText = `${startDate.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString(language, { month: 'short', day: 'numeric', year: 'numeric' })}`;
                yearText = null;
            } else if (startMonth !== endMonth) {
                mainText = `${startDate.toLocaleDateString(language, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(language, { month: 'short', day: 'numeric' })}`;
                yearText = startYear.toString();
            } else {
                if (language === 'fr') {
                    mainText = `${startDay} - ${endDay} ${startMonth}`;
                } else {
                    mainText = `${startMonth} ${startDay} - ${endDay}`;
                }
                yearText = startYear.toString();
            }
            
            return (
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white whitespace-nowrap">
                    <span>{mainText}</span>
                    {yearText && <span className="ml-2 font-semibold text-gray-400 dark:text-gray-500">{yearText}</span>}
                </h2>
            );
        }
    
        // Month view
        return (
             <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                {currentDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}
            </h2>
        );
    };
    
    const zoomLevelLabels: { [key: number]: string } = {
        0: t('schedule.zoomLevelCompact'),
        1: t('schedule.zoomLevelDefault'),
        2: t('schedule.zoomLevelDetailed'),
    };
    
    const dayDetailFooter = (
        <button 
            onClick={() => { setDayDetailModal({isOpen: false, date: null}); openAddShiftModal(dayDetailModal.date!); }} 
            disabled={isLocked || (dayDetailModal.date && dayDetailModal.date < today)} 
            className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
            <Plus size={20} className="mr-2" />
            {t('schedule.addShift')}
        </button>
    );

    const isWeeklyView = view === 'week' || view === 'two-weeks';
    const daysToRender = isWeeklyView ? (view === 'week' ? weekDays : twoWeeksDays) : monthGridDays;


    return (
        <div className="h-full flex flex-col">
            {isTourActive && <FeatureTour steps={scheduleTourSteps} onClose={() => setIsTourActive(false)} />}
             <header className="flex flex-col md:flex-row items-center justify-between mb-4 gap-4">
                <div className="flex items-center space-x-2">
                    <button onClick={handlePrev} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-800 transition-colors"><ChevronLeft /></button>
                    <div className="text-center w-72 flex items-center justify-center">
                        <HeaderDisplay />
                    </div>
                    <button onClick={handleNext} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-800 transition-colors"><ChevronRight /></button>
                     <div className="flex items-center bg-gray-200 dark:bg-blue-night-800 rounded-lg p-1 ml-4">
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'week' ? 'bg-blue-600 dark:bg-blue-night-200 dark:text-blue-night-900 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>{t('schedule.week')}</button>
                        <button onClick={() => setView('two-weeks')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'two-weeks' ? 'bg-blue-600 dark:bg-blue-night-200 dark:text-blue-night-900 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>{t('schedule.twoWeeks')}</button>
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm rounded-md transition-colors ${view === 'month' ? 'bg-blue-600 dark:bg-blue-night-200 dark:text-blue-night-900 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}>{t('schedule.month')}</button>
                    </div>
                     {view !== 'month' && (
                        <div data-tour-id="schedule-zoom" className="flex items-center bg-gray-200 dark:bg-blue-night-800 rounded-lg p-1 ml-2">
                            <button onClick={handleZoomOut} disabled={zoomLevel === 0 || view === 'two-weeks'} title={t('schedule.zoomOut')} className="p-1.5 rounded-md disabled:opacity-50 text-gray-600 dark:text-gray-300"><ZoomOut size={18}/></button>
                            <span className="text-xs font-semibold w-20 text-center text-gray-600 dark:text-gray-300">
                                {view === 'two-weeks' ? zoomLevelLabels[0] : zoomLevelLabels[zoomLevel]}
                            </span>
                            <button onClick={handleZoomIn} disabled={zoomLevel === 2 || view === 'two-weeks'} title={t('schedule.zoomIn')} className="p-1.5 rounded-md disabled:opacity-50 text-gray-600 dark:text-gray-300"><ZoomIn size={18}/></button>
                        </div>
                    )}
                </div>
            </header>
            
            <div data-tour-id="schedule-filters" className="mb-4">
                <CalendarFilter 
                    employees={employees} roles={roles} departments={departments} onFilterChange={setFilters} 
                    onExportClick={() => setIsExportModalOpen(true)}
                    onAddAbsenceClick={openAddAbsenceModal}
                    onBulkAddClick={() => setIsBulkAddModalOpen(true)}
                    onAddShiftClick={() => openAddShiftModal(new Date())}
                    onAddMeetingClick={() => openAddMeetingModal(new Date())}
                    onTourClick={() => setIsTourActive(true)}
                    permissions={permissions}
                    isLocked={isLocked}
                    onToggleLock={toggleLock}
                    isSelectionModeActive={isSelectionModeActive}
                    onToggleSelectionMode={toggleSelectionMode}
                    selectedShiftIds={selectedShiftIds}
                    selectedMeetingIds={selectedMeetingIds}
                    onDeleteSelected={handleDeleteSelected}
                />
            </div>

            {isWeeklyView ? (
                 <div className="flex-1 grid grid-cols-7 gap-2">
                    {daysToRender.map((day, dayIndex) => {
                        const openShiftsForDay = filteredCalendarItems.shifts.filter(s => !s.employeeId && isSameDay(s.startTime, day)).sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                        const assignedShiftsForDay = filteredCalendarItems.shifts.filter(s => !!s.employeeId && isDateBetween(day, s.startTime, s.endTime)).sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
                        const absencesForDay = filteredCalendarItems.absences.filter(a => isDateBetween(day, a.startDate, a.endDate));
                        const meetingsForDay = filteredCalendarItems.meetings.filter(m => isSameDay(m.startTime, day)).sort((a,b) => a.startTime.getTime() - b.startTime.getTime());
                        
                        const isDragOver = dragOverDate && isSameDay(dragOverDate, day);
                        const specialDayForDay = specialDays.find(sd => isSameDay(sd.date, day));
                        const specialDayType = specialDayForDay ? specialDayTypes.find(sdt => sdt.id === specialDayForDay.typeId) : null;
                        const isHoliday = specialDayType?.isHoliday && specialDayForDay?.coverage === 'all-day';
                        const isPastDay = day < today;
                        const currentZoomLevel = view === 'two-weeks' ? 0 : zoomLevel;

                        return (
                            <div key={day.toISOString()}
                                onDragOver={(e) => { if (isLocked) return; e.preventDefault(); setDragOverDate(day); }}
                                onDragLeave={() => setDragOverDate(null)}
                                onDrop={(e) => handleDrop(e, day)}
                                onDoubleClick={isLocked || isPastDay ? undefined : () => openAddShiftModal(day)}
                                data-tour-id={dayIndex === 2 ? "schedule-quick-add" : undefined}
                                className={`rounded-lg p-2 flex flex-col transition-colors duration-200 
                                    ${isDragOver ? 'bg-blue-100 dark:bg-blue-night-800' : 'bg-gray-50 dark:bg-blue-night-900'}
                                    ${isHoliday ? 'bg-gray-200 dark:bg-blue-night-950/50' : ''}
                                `}
                            >
                                <div className="flex justify-between items-center text-center mb-2 pb-2 border-b-2 dark:border-blue-night-800">
                                    <div className="text-left">
                                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{formatDay(day)}</p>
                                        <p className="text-lg font-bold">{day.getDate()}</p>
                                    </div>
                                    <div className="flex items-center">
                                        <button onClick={(e) => { e.stopPropagation(); openSpecialDayModal(day); }} disabled={isLocked} className="p-1 rounded-full text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors disabled:opacity-50 disabled:hover:bg-transparent">
                                            <Star size={16} className={specialDayForDay ? 'fill-current' : ''}/>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 h-full overflow-y-auto pr-1">
                                    {isHoliday && <div className="text-center p-2 text-sm font-semibold text-gray-500 dark:text-gray-400">{specialDayType?.name}</div>}

                                    {meetingsForDay.map(meeting => {
                                        const isMeetingLocked = new Date(meeting.endTime) < new Date();
                                        return (
                                            <div key={meeting.id} className={`transition-opacity duration-300 ${draggedItemId?.type === 'meeting' && draggedItemId.id === meeting.id ? 'opacity-30' : 'opacity-100'}`}>
                                                <MeetingCard
                                                    meeting={meeting}
                                                    employees={employees}
                                                    onClick={() => openEditMeetingModal(meeting)}
                                                    onDelete={requestMeetingDelete}
                                                    onDragStart={(e, meetingId) => handleDragStart(e, meetingId, 'meeting')}
                                                    isSelectionModeActive={isSelectionModeActive}
                                                    isSelected={selectedMeetingIds.includes(meeting.id)}
                                                    onToggleSelect={toggleMeetingSelection}
                                                    zoomLevel={currentZoomLevel}
                                                    isLocked={isLocked || isMeetingLocked}
                                                />
                                            </div>
                                        );
                                    })}

                                    {openShiftsForDay.length > 0 && (
                                        <div className="pt-2">
                                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 text-center border-b dark:border-blue-night-800 pb-1">{t('schedule.openShifts')}</h4>
                                            <div className="space-y-2 pt-1">
                                                {openShiftsForDay.map(shift => {
                                                    const isShiftLocked = shift.endTime < new Date() || !!shift.actualStartTime;
                                                    return (
                                                        <div key={shift.id} className={`transition-opacity duration-300 ${draggedItemId?.type === 'shift' && draggedItemId.id === shift.id ? 'opacity-30' : 'opacity-100'}`}>
                                                            <ShiftCard shift={shift} location={locations.find(l => l.id === shift.locationId)} department={departments.find(d => d.id === shift.departmentId)} onClick={() => openEditShiftModal(shift)} onDelete={requestShiftDelete} isSelectionModeActive={false} isSelected={false} onToggleSelect={() => {}} onDragStart={(e, shiftId) => handleDragStart(e, shiftId, 'shift')} zoomLevel={currentZoomLevel} isLocked={isLocked || isShiftLocked} />
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {(openShiftsForDay.length > 0 && (assignedShiftsForDay.length > 0 || absencesForDay.length > 0)) && <hr className="border-gray-200 dark:border-blue-night-800 my-2"/>}
                                    
                                    {absencesForDay.map(absence => {
                                        const isAbsenceLocked = absence.endDate < new Date();
                                        return <AbsenceCard key={absence.id} absence={absence} employee={employees.find(e => e.id === absence.employeeId)} absenceType={absenceTypes.find(at => at.id === absence.absenceTypeId)} onClick={() => openEditAbsenceModal(absence)} onDelete={handleAbsenceDelete} zoomLevel={currentZoomLevel} isLocked={isLocked || isAbsenceLocked} />
                                    })}
                                    {assignedShiftsForDay.map(shift => {
                                        const isShiftLocked = shift.endTime < new Date() || !!shift.actualStartTime;
                                        return (
                                            <div key={shift.id} className={`transition-opacity duration-300 ${draggedItemId?.type === 'shift' && draggedItemId.id === shift.id ? 'opacity-30' : 'opacity-100'}`} data-tour-id={firstShiftTargetInfo && isSameDay(day, firstShiftTargetInfo.day) && shift.id === firstShiftTargetInfo.shiftId ? 'schedule-drag-shift' : undefined}>
                                                <ShiftCard shift={shift} employee={employees.find(e => e.id === shift.employeeId)} location={locations.find(l => l.id === shift.locationId)} department={departments.find(d => d.id === shift.departmentId)} onDragStart={(e, shiftId) => handleDragStart(e, shiftId, 'shift')} onClick={() => openEditShiftModal(shift)} onDelete={requestShiftDelete} isSelectionModeActive={isSelectionModeActive} isSelected={selectedShiftIds.includes(shift.id)} onToggleSelect={toggleShiftSelection} zoomLevel={currentZoomLevel} isLocked={isLocked || isShiftLocked} clockingStatus={getClockingStatus(shift)} />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-1 border-l border-t dark:border-blue-night-800">
                    {/* Month header */}
                    {weekDays.map(day => <div key={day.getDay()} className="text-center py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 border-b dark:border-blue-night-800">{formatDay(day)}</div>)}
                    {/* Month grid */}
                    {daysToRender.map((day, index) => {
                         const shiftsForDay = filteredCalendarItems.shifts.filter(s => s.employeeId && isSameDay(s.startTime, day));
                         const absencesForDay = filteredCalendarItems.absences.filter(a => isDateBetween(day, a.startDate, a.endDate));
                         const meetingsForDay = filteredCalendarItems.meetings.filter(m => isSameDay(m.startTime, day));
                         const totalEvents = shiftsForDay.length + absencesForDay.length + meetingsForDay.length;

                         const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                         const isTodayDate = isSameDay(day, new Date());
                         const isPastDay = day < today;
                         return (
                            <div 
                                key={index}
                                onClick={() => openDayDetailModal(day)}
                                onDoubleClick={isLocked || isPastDay ? undefined : () => openAddShiftModal(day)}
                                className={`relative border-r border-b dark:border-blue-night-800 p-2 flex flex-col transition-colors
                                ${isCurrentMonth ? 'bg-white dark:bg-blue-night-900' : 'bg-gray-50 dark:bg-blue-night-950 text-gray-400'}
                                ${isLocked || isPastDay ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-night-800'}`}>
                                <div className={`flex justify-center items-center w-6 h-6 rounded-full text-sm ${isTodayDate ? 'bg-blue-600 dark:bg-blue-night-200 text-white dark:text-blue-night-900' : ''}`}>
                                    {day.getDate()}
                                </div>
                                <div className="flex-grow mt-2 space-y-1">
                                     {meetingsForDay.slice(0,1).map(meeting => (
                                         <div key={meeting.id} className="h-1.5 w-full rounded-full bg-purple-500 dark:bg-purple-400"></div>
                                     ))}
                                     {shiftsForDay.slice(0, 1).map(shift => {
                                        const emp = employees.find(e => e.id === shift.employeeId);
                                        const roleColor = emp ? (roles.find(r => r.name === emp.role) ? 'bg-blue-500 dark:bg-blue-night-500' : 'bg-gray-400 dark:bg-blue-night-700') : 'bg-gray-400 dark:bg-blue-night-700';
                                        return <div key={shift.id} className={`h-1.5 w-full rounded-full ${roleColor}`}></div>
                                     })}
                                     {absencesForDay.slice(0, 1).map(absence => {
                                         const at = absenceTypes.find(t => t.id === absence.absenceTypeId);
                                         const absenceColor = theme === 'dark' ? '#adb5bd' : at?.color;
                                         return <div key={absence.id} className={`h-1.5 w-full rounded-full`} style={{backgroundColor: absenceColor || '#ccc'}}></div>
                                     })}
                                     {totalEvents > 3 && 
                                        <div className="text-xs text-gray-500 dark:text-gray-400">+{totalEvents - 3} more</div>
                                     }
                                </div>
                            </div>
                         );
                    })}
                </div>
            )}
            
            {shiftEditorState.isOpen && (
                <ShiftEditor 
                    shift={shiftEditorState.shift} 
                    employees={activeEmployees}
                    locations={locations}
                    departments={departments}
                    selectedDate={shiftEditorState.date}
                    onSave={handleShiftSave}
                    onCancel={() => setShiftEditorState({isOpen: false, shift: null})}
                    onDelete={onDeleteShift}
                    allAbsences={absences}
                    absenceTypes={absenceTypes}
                    allSpecialDays={specialDays}
                    allSpecialDayTypes={specialDayTypes}
                    allEmployeeAvailabilities={employeeAvailabilities}
                    allShifts={shifts}
                />
            )}
             {absenceEditorState.isOpen && (
                <AbsenceEditor
                    absence={absenceEditorState.absence}
                    employees={activeEmployees}
                    absenceTypes={absenceTypes}
                    onSave={handleAbsenceSave}
                    onCancel={() => setAbsenceEditorState({isOpen: false, absence: null})}
                    onDelete={onDeleteAbsence}
                    allShifts={shifts}
                    allSpecialDays={specialDays}
                    allSpecialDayTypes={specialDayTypes}
                />
            )}
            {specialDayEditorState.isOpen && specialDayEditorState.date && (
                <SpecialDayEditor 
                    date={specialDayEditorState.date}
                    specialDay={specialDayEditorState.specialDay}
                    specialDayTypes={specialDayTypes}
                    onSave={handleSpecialDaySave}
                    onCancel={() => setSpecialDayEditorState({isOpen: false, specialDay: null, date: null})}
                    onDelete={handleSpecialDayDelete}
                />
            )}
            {meetingEditorState.isOpen && (
                <MeetingEditor
                    isOpen={true}
                    onClose={() => setMeetingEditorState({ isOpen: false, meeting: null })}
                    meeting={meetingEditorState.meeting}
                    selectedDate={meetingEditorState.date}
                    employees={activeEmployees}
                    locations={locations}
                    allShifts={shifts}
                    allAbsences={absences}
                    allMeetings={meetings}
                    onSave={handleMeetingSave}
                    onDelete={onDeleteMeeting}
                />
            )}
             <Modal 
                isOpen={dayDetailModal.isOpen} 
                onClose={() => setDayDetailModal({isOpen: false, date: null})} 
                title={t('schedule.dayScheduleTitle', { date: dayDetailModal.date?.toLocaleDateString() || '' })}
                footer={dayDetailFooter}
             >
                {dayDetailModal.date && (
                    <div>
                        <div className="max-h-96 overflow-y-auto space-y-2 pr-2 -mr-2">
                            {filteredCalendarItems.meetings.filter(m => isSameDay(m.startTime, dayDetailModal.date!)).map(meeting => {
                                const isMeetingLocked = new Date(meeting.endTime) < new Date();
                                return <MeetingCard key={meeting.id} meeting={meeting} employees={employees} onClick={() => openEditMeetingModal(meeting)} onDelete={requestMeetingDelete} onDragStart={(e, meetingId) => handleDragStart(e, meetingId, 'meeting')} isSelectionModeActive={isSelectionModeActive} isSelected={selectedMeetingIds.includes(meeting.id)} onToggleSelect={toggleMeetingSelection} zoomLevel={2} isLocked={isLocked || isMeetingLocked}/>
                            })}
                            {filteredCalendarItems.absences.filter(a => isDateBetween(dayDetailModal.date!, a.startDate, a.endDate)).map(absence => {
                                const isAbsenceLocked = absence.endDate < new Date();
                                return <AbsenceCard key={absence.id} absence={absence} employee={employees.find(e => e.id === absence.employeeId)} absenceType={absenceTypes.find(at => at.id === absence.absenceTypeId)} onClick={() => openEditAbsenceModal(absence)} onDelete={handleAbsenceDelete} zoomLevel={2} isLocked={isLocked || isAbsenceLocked}/>
                            })}
                            {filteredCalendarItems.shifts.filter(s => isSameDay(s.startTime, dayDetailModal.date!)).sort((a,b)=>a.startTime.getTime() - b.startTime.getTime()).map(shift => {
                                const isShiftLocked = shift.endTime < new Date() || !!shift.actualStartTime;
                                return <ShiftCard key={shift.id} shift={shift} employee={employees.find(e => e.id === shift.employeeId)} location={locations.find(l => l.id === shift.locationId)} department={departments.find(d => d.id === shift.departmentId)} onDragStart={(e,shiftId) => handleDragStart(e, shiftId, 'shift')} onClick={() => openEditShiftModal(shift)} onDelete={requestShiftDelete} isSelectionModeActive={false} isSelected={false} onToggleSelect={()=>{}} zoomLevel={2} isLocked={isLocked || isShiftLocked} clockingStatus={getClockingStatus(shift)} />
                            })}
                             {(filteredCalendarItems.shifts.filter(s => isSameDay(s.startTime, dayDetailModal.date!)).length === 0 &&
                               filteredCalendarItems.absences.filter(a => isDateBetween(dayDetailModal.date!, a.startDate, a.endDate)).length === 0 &&
                               filteredCalendarItems.meetings.filter(m => isSameDay(m.startTime, dayDetailModal.date!)).length === 0) &&
                                <p className="text-center text-gray-500 py-4">No events scheduled for this day.</p>
                             }
                        </div>
                    </div>
                )}
             </Modal>
             {deleteConfirm.isOpen && (
                <Modal
                    isOpen={true}
                    onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
                    title={deleteConfirm.title}
                    size="sm"
                    footer={
                        <>
                            <button onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} className="btn-secondary">{t('modals.cancel')}</button>
                            <button onClick={deleteConfirm.onConfirm} className="btn-danger flex items-center"><Trash2 size={16} className="mr-2"/>{t('modals.confirm')}</button>
                        </>
                    }
                >
                    <div className="flex items-start">
                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                            <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
                        </div>
                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                            <p className="text-sm text-gray-500">{deleteConfirm.message}</p>
                        </div>
                    </div>
                </Modal>
             )}
             <ExportModal 
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                currentDate={currentDate}
                employees={employees}
                roles={roles}
                shifts={shifts}
                locations={locations}
                departments={departments}
                absences={absences}
                absenceTypes={absenceTypes}
                specialDays={specialDays}
                specialDayTypes={specialDayTypes}
            />
            <BulkShiftEditor
                isOpen={isBulkAddModalOpen}
                onClose={() => setIsBulkAddModalOpen(false)}
                onBulkSave={onBulkAddShifts}
                employees={activeEmployees}
                locations={locations}
                departments={departments}
                teams={teams}
                allShifts={shifts}
                allAbsences={absences}
                allSpecialDays={specialDays}
                allSpecialDayTypes={specialDayTypes}
            />
             <style>{`.btn-danger { color: white; background-color: #dc2626; } .btn-danger:hover { background-color: #b91c1c; }`}</style>
        </div>
    );
};

export default ScheduleCalendar;