import React, { useState, useEffect, useRef } from 'react';
import { useMobileAuth } from '../../contexts/MobileAuthContext';
import { useMobileData } from '../../contexts/MobileDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Clock, MapPin, Briefcase, Coffee, LogIn, LogOut, CheckCircle, AlertTriangle, Loader2, Users, Link as LinkIcon } from 'lucide-react';
import LoadingSpinner from '../LoadingSpinner';
import Avatar from '../Avatar';

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

const TodayScreen: React.FC = () => {
    const { employee, logout } = useMobileAuth();
    const { shifts, meetings, allEmployees, isLoading, updateShift, locations, departments } = useMobileData();
    const { t, language } = useLanguage();
    const [now, setNow] = useState(new Date());
    const [isCheckingLocation, setIsCheckingLocation] = useState(false);
    const [locationError, setLocationError] = useState('');
    const [clickState, setClickState] = useState<{ time: number | null, action: 'in' | 'out' | null }>({ time: null, action: null });
    const [toast, setToast] = useState<{ message: string | null; visible: boolean }>({ message: null, visible: false });
    const toastTimeoutRef = useRef<number | null>(null);

     useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    if (isLoading || !employee) {
        return <div className="p-4"><LoadingSpinner /></div>;
    }

    const today = new Date();
    const todaysShift = shifts.find(shift => isSameDay(new Date(shift.startTime), today));
    const todaysMeetings = meetings.filter(meeting => {
        const meetingDate = new Date(meeting.startTime);
        return isSameDay(meetingDate, today) && (meeting.organizerId === employee?.id || meeting.participantIds.includes(employee?.id || ''));
    }).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());


    const locationName = locations.find(l => l.id === todaysShift?.locationId)?.name;
    const departmentName = departments.find(d => d.id === todaysShift?.departmentId)?.name;

    const formatTime = (date: Date) => new Date(date).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit', hour12: false });
    
    const handleClockAction = (action: 'in' | 'out') => {
        if (!todaysShift) return;
    
        const now = Date.now();
        const doubleClickThreshold = 2000; // 2 seconds
    
        if (toastTimeoutRef.current) {
            clearTimeout(toastTimeoutRef.current);
            toastTimeoutRef.current = null;
        }
    
        if (!clickState.time || (now - clickState.time >= doubleClickThreshold) || clickState.action !== action) {
            setClickState({ time: now, action: action });
            const message = action === 'in' ? t('mobile.doubleClickClockIn') : t('mobile.doubleClickClockOut');
            
            setToast({ message, visible: true });
    
            toastTimeoutRef.current = window.setTimeout(() => {
                setClickState({ time: null, action: null });
                setToast(prev => ({ ...prev, visible: false }));
            }, doubleClickThreshold);
            return; 
        }
    
        setClickState({ time: null, action: null });
        setToast({ message: null, visible: false });

        const location = locations.find(l => l.id === todaysShift.locationId);
        const requiresGeofence = location && typeof location.latitude === 'number' && typeof location.longitude === 'number' && typeof location.radius === 'number' && location.isGeofencingEnabled;
    
        const performUpdate = () => {
            const update = action === 'in' 
                ? { actualStartTime: new Date() } 
                : { actualEndTime: new Date() };
            const updatedShift = { ...todaysShift, ...update };
            updateShift(updatedShift);
        };
    
        if (!requiresGeofence) {
            performUpdate();
            return;
        }

        if (window.isSecureContext === false) {
            setLocationError("Location features require a secure connection (HTTPS). Please ensure you are accessing this page over HTTPS.");
            return;
        }
    
        setLocationError('');
        setIsCheckingLocation(true);
    
        const requestLocationAndClock = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const distance = getDistance(latitude, longitude, location!.latitude!, location!.longitude!);
                    
                    if (distance <= location!.radius!) {
                        performUpdate();
                    } else {
                        setLocationError(`You are not close enough to your workplace to clock ${action}. You are approximately ${Math.round(distance)} meters away.`);
                    }
                    setIsCheckingLocation(false);
                },
                (error) => {
                    let message = "Could not get your location. ";
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            message += "Permission denied. To use geofencing, please allow location access in your browser.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message += "Location information is unavailable. Please check your device's location settings.";
                            break;
                        case error.TIMEOUT:
                            message += "The request to get your location timed out.";
                            break;
                        default:
                            message += "An unknown error occurred.";
                            break;
                    }
                    setLocationError(message);
                    setIsCheckingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        };
    
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
                if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                    requestLocationAndClock();
                } else if (permissionStatus.state === 'denied') {
                    setLocationError("Location access is blocked. Please enable it in your browser's site settings to use this feature.");
                    setIsCheckingLocation(false);
                }
            });
        } else {
            requestLocationAndClock();
        }
    };

    const handleClockIn = () => handleClockAction('in');
    const handleClockOut = () => handleClockAction('out');
    
    const renderTimeClock = () => {
        if (!todaysShift) {
            return (
                <div className="text-center py-8">
                    <Coffee size={40} className="mx-auto text-slate-400 dark:text-slate-500" />
                    <p className="mt-3 font-semibold text-lg text-slate-700 dark:text-slate-300">{t('mobile.noShiftToday')}</p>
                </div>
            );
        }

        const scheduledStartTime = new Date(todaysShift.startTime);
        const { actualStartTime, actualEndTime } = todaysShift;

        const clockInGracePeriod = 10 * 60 * 1000;
        const clockInTimeStart = new Date(scheduledStartTime.getTime() - clockInGracePeriod);
        
        const canClockIn = now.getTime() >= clockInTimeStart.getTime();
        
        if (isCheckingLocation) {
            return (
                <div className="text-center p-6">
                    <Loader2 className="mx-auto animate-spin text-blue-500" size={32} />
                    <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-3">Checking your location...</p>
                </div>
            );
        }

        if (locationError) {
            return (
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="mx-auto text-red-500 mb-2" size={24}/>
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Location Check Failed</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">{locationError}</p>
                </div>
            );
        }

        if (actualStartTime && actualEndTime) {
            return (
                <div className="text-center p-6">
                    <CheckCircle className="mx-auto text-green-500 mb-2" size={32}/>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('mobile.clockedOut')}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t('mobile.clockInTime')}: {formatTime(new Date(actualStartTime))} | {t('mobile.clockOutTime')}: {formatTime(new Date(actualEndTime))}
                    </p>
                </div>
            );
        }

        if (actualStartTime) {
            return (
                <div className="text-center p-4 space-y-3">
                     <p className="text-base text-slate-600 dark:text-slate-300">{t('mobile.clockedInAt', { time: formatTime(new Date(actualStartTime)) })}</p>
                    <div className="relative">
                        {toast.message && clickState.action === 'out' && (
                             <div className={`absolute top-0 left-1/2 -translate-x-1/2 z-0 transition-all duration-300 ease-out ${toast.visible ? '-translate-y-[120%] opacity-100' : 'translate-y-0 opacity-0'}`}>
                                <span className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                    {toast.message}
                                </span>
                            </div>
                        )}
                        <button onClick={handleClockOut} className="relative z-10 w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-4 rounded-lg transition-transform hover:scale-105 shadow-lg shadow-red-500/20">
                            <LogOut size={20} className="mr-2"/>
                            {t('mobile.clockOut')}
                        </button>
                    </div>
                </div>
            )
        }
        
        return (
            <div className="text-center p-4 space-y-3">
                 {!canClockIn && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                        {t('mobile.canClockInAt', { time: formatTime(clockInTimeStart)})}
                    </p>
                )}
                <div className="relative">
                    {toast.message && clickState.action === 'in' && (
                         <div className={`absolute top-0 left-1/2 -translate-x-1/2 z-0 transition-all duration-300 ease-out ${toast.visible ? '-translate-y-[120%] opacity-100' : 'translate-y-0 opacity-0'}`}>
                            <span className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                                {toast.message}
                            </span>
                        </div>
                    )}
                    <button onClick={handleClockIn} disabled={!canClockIn} className="relative z-10 w-full flex items-center justify-center bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg disabled:bg-slate-400 dark:disabled:bg-slate-700 disabled:cursor-not-allowed transition-transform hover:scale-105 shadow-lg shadow-green-500/20">
                        <LogIn size={20} className="mr-2"/>
                        {t('mobile.clockIn')}
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="animate-slide-in-up">
            <header className="relative bg-gradient-to-b from-blue-100 to-slate-100 dark:from-blue-night-800 dark:to-blue-night-950 text-slate-800 dark:text-slate-100 pb-28">
                <div className="flex justify-between items-center p-4">
                    <div className="text-sm font-semibold">{today.toLocaleDateString(language, { weekday: 'long' })}</div>
                    <button
                        onClick={logout}
                        className="p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20"
                        aria-label={t('mobile.logout')}
                    >
                        <LogOut size={20} />
                    </button>
                </div>
                <div className="absolute -bottom-1 left-0 w-full text-slate-100 dark:text-blue-night-950 z-10">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 120">
                        <path fill="currentColor" d="M1440,120H0V0c0,0,263.9,118.6,720,118.6S1440,0,1440,0V120z"></path>
                    </svg>
                </div>
            </header>
            
            <main className="relative z-20 -mt-32 p-4 md:p-6 space-y-6">
                 <div className="text-center">
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                        {t('mobile.greeting', { name: employee.name.split(' ')[0] })}
                    </h1>
                    <div className="relative inline-block">
                        <div className="w-32 h-32 p-1.5 bg-white dark:bg-slate-800 shadow-xl rounded-full">
                            <Avatar name={employee.name} src={employee.avatarUrl} className="w-full h-full rounded-full" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">{employee.name}</h2>
                 </div>
            
                {todaysMeetings.length > 0 && (
                     <div className="bg-white dark:bg-blue-night-900 p-5 rounded-2xl shadow-md">
                         <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('modals.todaysMeeting')}</h2>
                         <div className="space-y-4">
                            {todaysMeetings.map(meeting => {
                                const isFinished = new Date(meeting.endTime) < now;
                                const organizer = allEmployees.find(e => e.id === meeting.organizerId);
                                const participants = allEmployees.filter(e => meeting.participantIds.includes(e.id));
                                const location = locations.find(l => l.id === meeting.locationId);
                                return (
                                    <div key={meeting.id} className={`p-3 rounded-lg border-l-4 ${isFinished ? 'border-slate-400 bg-slate-50 dark:bg-slate-800/50' : 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'}`}>
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-slate-800 dark:text-slate-100">{meeting.subject}</p>
                                            <p className={`text-sm font-mono font-semibold ${isFinished ? 'text-slate-500' : 'text-purple-800 dark:text-purple-200'}`}>
                                                {formatTime(meeting.startTime)} - {formatTime(meeting.endTime)}
                                            </p>
                                        </div>
                                        {isFinished ? (
                                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{t('modals.meetingFinished')}</p>
                                        ) : (
                                            <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 space-y-2">
                                                {organizer && <p><strong>Organizer:</strong> {organizer.name}</p>}
                                                {participants.length > 0 && <p><strong>Attendees:</strong> {participants.map(p => p.name).join(', ')}</p>}
                                                {meeting.type === 'remote' && meeting.link && (
                                                    <a href={meeting.link} target="_blank" rel="noopener noreferrer" className="flex items-center font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                                        <LinkIcon size={14} className="mr-1.5"/> Join Meeting
                                                    </a>
                                                )}
                                                {meeting.type === 'in-person' && location && <p><strong>Location:</strong> {location.name}</p>}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                         </div>
                     </div>
                )}

                <div className="bg-white dark:bg-blue-night-900 p-5 rounded-2xl shadow-md">
                    <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">{t('mobile.todaysShift')}</h2>
                    {todaysShift && (
                        <div className="space-y-4 mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                            <div className="flex items-center">
                                <Clock size={24} className="text-blue-500 dark:text-blue-400 mr-4 flex-shrink-0" />
                                <div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('mobile.time')}</p>
                                    <p className="font-mono text-lg font-semibold text-slate-800 dark:text-slate-100">{formatTime(todaysShift.startTime)} - {formatTime(todaysShift.endTime)}</p>
                                </div>
                            </div>
                            {locationName && (
                                <div className="flex items-center">
                                    <MapPin size={24} className="text-blue-500 dark:text-blue-400 mr-4 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('mobile.location')}</p>
                                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-100">{locationName}</p>
                                    </div>
                                </div>
                            )}
                             {departmentName && (
                                <div className="flex items-center">
                                    <Briefcase size={24} className="text-blue-500 dark:text-blue-400 mr-4 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('mobile.department')}</p>
                                        <p className="font-semibold text-lg text-slate-800 dark:text-slate-100">{departmentName}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {renderTimeClock()}
                </div>
            </main>
        </div>
    );
};

export default TodayScreen;