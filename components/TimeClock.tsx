import React, { useState, useEffect, useMemo, FC } from 'react';
import { Employee, Shift, Absence, AbsenceType, Role, Department } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
// FIX: Added 'X' icon to lucide-react imports to resolve an undefined component error.
import { LogIn, LogOut, Clock, UserMinus, UserX, UserCheck, X } from 'lucide-react';
import Avatar from './Avatar';
import MultiSelectDropdown from './MultiSelectDropdown';

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
const LATENESS_THRESHOLD = 5 * 60 * 1000; // 5 minutes

interface TimeClockProps {
    employees: Employee[];
    shifts: Shift[];
    absences: Absence[];
    absenceTypes: AbsenceType[];
    roles: Role[];
    departments: Department[];
}

interface StatusCardProps {
    title: string;
    count: number;
    icon: React.ReactNode;
    children: React.ReactNode;
    colorClass: string;
}

const StatusCard: FC<StatusCardProps> = ({ title, count, icon, children, colorClass }) => (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-md flex flex-col">
        <div className="flex justify-between items-center pb-2 border-b dark:border-slate-800">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center">
                <span className={`mr-3 p-2 rounded-lg ${colorClass}`}>{icon}</span>
                {title}
            </h3>
            <span className={`text-xl font-bold px-2 rounded-md ${colorClass}`}>{count}</span>
        </div>
        <div className="pt-3 space-y-2 flex-grow overflow-y-auto pr-1">
            {children}
        </div>
    </div>
);

const EmployeeRow: FC<{ employee: Employee, shift?: Shift, children: React.ReactNode }> = ({ employee, shift, children }) => {
    const { t } = useLanguage();
    return (
        <div className="flex items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <Avatar name={employee.name} src={employee.avatarUrl} className="w-9 h-9 rounded-full mr-3" />
            <div className="flex-grow">
                <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{employee.name}</p>
                {shift && <p className="text-xs text-slate-500 dark:text-slate-400">{t('timeclock.shiftTime', { start: new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), end: new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</p>}
            </div>
            <div className="text-right text-xs font-medium flex-shrink-0">{children}</div>
        </div>
    );
};

const TimeClock: FC<TimeClockProps> = ({ employees, shifts, absences, absenceTypes, roles, departments }) => {
    const { t } = useLanguage();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filters, setFilters] = useState({ roleNames: [] as string[], departmentIds: [] as string[] });

    useEffect(() => {
        const timerId = setInterval(() => setCurrentTime(new Date()), 30000); // Auto-refresh every 30 seconds
        return () => clearInterval(timerId);
    }, []);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    const trackingData = useMemo(() => {
        const today = new Date();
        const activeEmployees = employees.filter(e => e.status === 'active');

        // Apply filters
        const filteredEmployees = activeEmployees.filter(emp => {
            const roleMatch = filters.roleNames.length === 0 || filters.roleNames.includes(emp.role);
            // Department filter will be applied on a per-shift basis
            return roleMatch;
        });

        const employeeIds = new Set(filteredEmployees.map(e => e.id));
        const todaysShifts = shifts.filter(s => isSameDay(new Date(s.startTime), today) && s.employeeId && employeeIds.has(s.employeeId));
        const todaysAbsences = absences.filter(a => employeeIds.has(a.employeeId) && isSameDay(today, a.startDate)); // Simple check for today

        const clockedIn: { emp: Employee; shift: Shift }[] = [];
        const late: { emp: Employee; shift: Shift; minutes: number }[] = [];
        const clockedOut: { emp: Employee; shift: Shift }[] = [];
        const absent: { emp: Employee; absence: Absence }[] = [];
        
        const scheduledEmployeeIds = new Set<string>();

        todaysAbsences.forEach(absence => {
            const emp = employeeMap.get(absence.employeeId);
            if (emp) {
                absent.push({ emp, absence });
                scheduledEmployeeIds.add(emp.id);
            }
        });

        todaysShifts.forEach(shift => {
            if (scheduledEmployeeIds.has(shift.employeeId!)) return; // Absence takes precedence

            const deptMatch = filters.departmentIds.length === 0 || (shift.departmentId && filters.departmentIds.includes(shift.departmentId));
            if (!deptMatch) return;

            const emp = employeeMap.get(shift.employeeId!);
            if (!emp) return;

            scheduledEmployeeIds.add(emp.id);

            if (shift.actualEndTime) {
                clockedOut.push({ emp, shift });
            } else if (shift.actualStartTime) {
                const lateness = new Date(shift.actualStartTime).getTime() - new Date(shift.startTime).getTime();
                if (lateness > LATENESS_THRESHOLD) {
                    late.push({ emp, shift, minutes: Math.round(lateness / 60000) });
                } else {
                    clockedIn.push({ emp, shift });
                }
            }
        });
        
        const notScheduled = filteredEmployees.filter(emp => !scheduledEmployeeIds.has(emp.id));
        
        return { clockedIn, late, clockedOut, absent, notScheduled };
    }, [currentTime, employees, shifts, absences, filters]);

    const roleOptions = useMemo(() => roles.map(r => ({ id: r.name, name: r.name })), [roles]);
    const departmentOptions = useMemo(() => departments.map(d => ({ id: d.id, name: d.name })), [departments]);

    return (
        <div className="animate-slide-in-up h-full flex flex-col">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('timeclock.title')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('timeclock.description')}</p>

            <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MultiSelectDropdown label={t('dashboard.filterByRole')} options={roleOptions} selectedIds={filters.roleNames} onSelectionChange={roleNames => setFilters(f => ({...f, roleNames}))} placeholder={t('employees.allRoles')} />
                    <MultiSelectDropdown label={t('dashboard.filterByDepartment')} options={departmentOptions} selectedIds={filters.departmentIds} onSelectionChange={departmentIds => setFilters(f => ({...f, departmentIds}))} placeholder={t('calendarFilter.allDepartments')} />
                    <div className="flex items-end">
                        <button onClick={() => setFilters({roleNames: [], departmentIds: []})} className="w-full flex items-center justify-center p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 text-sm min-h-[42px]"><X size={16} className="mr-2"/>{t('calendarFilter.clearAll')}</button>
                    </div>
                </div>
            </div>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatusCard title={t('timeclock.clockedIn')} count={trackingData.clockedIn.length} icon={<LogIn size={20} />} colorClass="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    {trackingData.clockedIn.length > 0 ? trackingData.clockedIn.map(({ emp, shift }) => (
                        <EmployeeRow key={emp.id} employee={emp} shift={shift}>
                            <span className="text-green-600 dark:text-green-400">{t('timeclock.clockedInAt', { time: new Date(shift.actualStartTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</span>
                        </EmployeeRow>
                    )) : <p className="text-sm text-center text-slate-500">{t('timeclock.noOneClockedIn')}</p>}
                </StatusCard>

                 <StatusCard title={t('timeclock.late')} count={trackingData.late.length} icon={<Clock size={20} />} colorClass="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                    {trackingData.late.length > 0 ? trackingData.late.map(({ emp, shift, minutes }) => (
                        <EmployeeRow key={emp.id} employee={emp} shift={shift}>
                            <span className="text-yellow-600 dark:text-yellow-400">{t('timeclock.minutesLate', { minutes })}</span>
                        </EmployeeRow>
                    )) : <p className="text-sm text-center text-slate-500">{t('timeclock.noOneLate')}</p>}
                </StatusCard>

                <StatusCard title={t('timeclock.clockedOut')} count={trackingData.clockedOut.length} icon={<LogOut size={20} />} colorClass="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
                     {trackingData.clockedOut.length > 0 ? trackingData.clockedOut.map(({ emp, shift }) => (
                        <EmployeeRow key={emp.id} employee={emp} shift={shift}>
                             <span className="text-slate-500">{t('timeclock.clockedOutAt', { time: new Date(shift.actualEndTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })}</span>
                        </EmployeeRow>
                    )) : <p className="text-sm text-center text-slate-500">{t('timeclock.noOneClockedOut')}</p>}
                </StatusCard>

                <StatusCard title={t('timeclock.absent')} count={trackingData.absent.length} icon={<UserMinus size={20} />} colorClass="bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                     {trackingData.absent.length > 0 ? trackingData.absent.map(({ emp, absence }) => {
                         const absenceType = absenceTypes.find(at => at.id === absence.absenceTypeId);
                         return (
                            <div key={emp.id} className="flex items-center p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                <Avatar name={emp.name} src={emp.avatarUrl} className="w-9 h-9 rounded-full mr-3" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm text-slate-700 dark:text-slate-200">{emp.name}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{absenceType?.name || 'Absence'}</p>
                                </div>
                            </div>
                         )
                     }) : <p className="text-sm text-center text-slate-500">{t('timeclock.noOneAbsent')}</p>}
                </StatusCard>
            </div>
        </div>
    );
};

export default TimeClock;