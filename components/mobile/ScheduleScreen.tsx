
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useMobileData } from '../../contexts/MobileDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Shift, Location, Department } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const ShiftRow: React.FC<{ shift: Shift, locations: Location[], departments: Department[], language: 'en' | 'fr' }> = ({ shift, locations, departments, language }) => {
    const formatTime = (date: Date) => new Date(date).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });
    const location = locations.find(l => l.id === shift.locationId);
    const department = departments.find(d => d.id === shift.departmentId);
    return (
        <div className="bg-blue-50 dark:bg-blue-900/50 p-3 rounded-lg border-l-4 border-blue-500">
            <p className="font-mono font-semibold text-blue-800 dark:text-blue-200">{formatTime(shift.startTime)} - {formatTime(shift.endTime)}</p>
            {(location || department) && (
                <div className="mt-1 pt-1 border-t border-blue-200 dark:border-blue-800/50 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                    {location && <p>Loc: {location.name}</p>}
                    {department && <p>Dept: {department.name}</p>}
                </div>
            )}
        </div>
    );
};

const DayCard: React.FC<{ date: Date, shifts: Shift[], t: (key: string) => string, locations: Location[], departments: Department[], language: 'en' | 'fr' }> = ({ date, shifts, t, locations, departments, language }) => {
    const shiftsForDay = shifts.filter(s => isSameDay(new Date(s.startTime), date)).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    return (
        <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md">
            <div className="flex justify-between items-baseline pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                <p className="font-bold text-lg text-slate-800 dark:text-slate-100">{date.toLocaleDateString(language, { weekday: 'long' })}</p>
                <p className="text-base text-slate-500 dark:text-slate-400">{date.toLocaleDateString(language, { month: 'short', day: 'numeric' })}</p>
            </div>
            {shiftsForDay.length > 0 ? (
                <div className="space-y-3">
                    {shiftsForDay.map(shift => <ShiftRow key={shift.id} shift={shift} locations={locations} departments={departments} language={language} />)}
                </div>
            ) : (
                <p className="text-base text-center py-4 text-slate-400 dark:text-slate-500">{t('mobile.dayOff')}</p>
            )}
        </div>
    );
};

const MiniCalendar: React.FC<{
    shifts: Shift[];
    onDateSelect: (date: Date) => void;
    selectedDate: Date;
    language: 'en' | 'fr';
}> = ({ shifts, onDateSelect, selectedDate, language }) => {
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = useMemo(() => {
        const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const days: Date[] = [];
        while (date.getMonth() === viewDate.getMonth()) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [viewDate]);

    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
    const startingDay = (firstDayOfMonth + 6) % 7; // Monday is 0

    const shiftsByDate = useMemo(() => {
        const map = new Map<string, boolean>();
        shifts.forEach(shift => {
            map.set(new Date(shift.startTime).toISOString().split('T')[0], true);
        });
        return map;
    }, [shifts]);

    const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const weekDays = language === 'fr' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    return (
        <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-3">
                <button onClick={prevMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronLeft size={20}/></button>
                <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{viewDate.toLocaleDateString(language, { month: 'long', year: 'numeric' })}</h3>
                <button onClick={nextMonth} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><ChevronRight size={20}/></button>
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {weekDays.map(day => <div key={day}>{day}</div>)}
            </div>
             <div className="grid grid-cols-7 gap-y-2 mt-2">
                {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`}></div>)}
                {daysInMonth.map(day => {
                    const isToday = isSameDay(day, new Date());
                    const isSelected = isSameDay(day, selectedDate);
                    const hasShift = shiftsByDate.has(day.toISOString().split('T')[0]);
                    
                    let dayClasses = "w-8 h-8 flex items-center justify-center rounded-full transition-colors relative";
                    if(isSelected) dayClasses += " bg-blue-600 text-white font-bold";
                    else if(isToday) dayClasses += " bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold";
                    else dayClasses += " hover:bg-slate-100 dark:hover:bg-slate-800";

                    return (
                        <div key={day.toISOString()} className="flex justify-center">
                            <button onClick={() => onDateSelect(day)} className={dayClasses}>
                                {day.getDate()}
                                {hasShift && <div className={`absolute bottom-1 w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-blue-500'}`}></div>}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const ScheduleScreen: React.FC = () => {
    const { shifts, isLoading, locations, departments } = useMobileData();
    const { t, language } = useLanguage();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const dayRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

    if (isLoading) {
        return <div className="p-4"><LoadingSpinner /></div>;
    }

    const today = new Date();
    today.setHours(0,0,0,0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week

    const daysToRender = useMemo(() => {
        const days = [];
        for (let i = 0; i < 14; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        return days;
    }, [startOfWeek]);

    const handleDateSelect = (date: Date) => {
        setSelectedDate(date);
        const dateString = date.toISOString().split('T')[0];
        const element = dayRefs.current.get(dateString);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }
    };

    return (
        <div className="p-4 md:p-6 animate-slide-in-up">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('mobile.upcomingShifts')}</h1>
            </header>
            
            <div className="space-y-8">
                <MiniCalendar shifts={shifts} onDateSelect={handleDateSelect} selectedDate={selectedDate} language={language} />

                <div>
                    <h2 className="font-bold text-xl text-slate-700 dark:text-slate-200 mb-3">{t('mobile.currentWeek')}</h2>
                    <div className="space-y-4">
                        {daysToRender.slice(0, 7).map(date => {
                            const dateString = date.toISOString().split('T')[0];
                            return (
                                // FIX: Wrapped ref callback in a block to ensure it returns void, as `Map.prototype.set` returns the map instance, which is not a valid ref callback return type.
                                <div key={dateString} ref={el => { dayRefs.current.set(dateString, el); }}>
                                    <DayCard date={date} shifts={shifts} t={t} locations={locations} departments={departments} language={language} />
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div>
                    <h2 className="font-bold text-xl text-slate-700 dark:text-slate-200 mb-3">{t('mobile.nextWeek')}</h2>
                    <div className="space-y-4">
                         {daysToRender.slice(7, 14).map(date => {
                            const dateString = date.toISOString().split('T')[0];
                            return (
                                // FIX: Wrapped ref callback in a block to ensure it returns void, as `Map.prototype.set` returns the map instance, which is not a valid ref callback return type.
                                <div key={dateString} ref={el => { dayRefs.current.set(dateString, el); }}>
                                    <DayCard date={date} shifts={shifts} t={t} locations={locations} departments={departments} language={language} />
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleScreen;
