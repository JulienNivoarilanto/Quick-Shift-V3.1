import React, { useState } from 'react';
import { Home, Calendar, Send } from 'lucide-react';
import TodayScreen from './TodayScreen';
import ScheduleScreen from './ScheduleScreen';
import MobileMessagingScreen from './MobileMessagingScreen';
import { useLanguage } from '../../contexts/LanguageContext';

type ActiveView = 'today' | 'schedule' | 'requests';

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 group relative ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
  >
    <div className={`absolute top-0 left-1/2 -translate-x-1/2 h-1 rounded-full bg-blue-600 dark:bg-blue-400 transition-all duration-300 ${isActive ? 'w-8' : 'w-0'}`}></div>
    {icon}
    <span className={`text-xs mt-1 font-semibold ${isActive ? '' : 'group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>{label}</span>
  </button>
);

const MobileLayout: React.FC = () => {
    const [activeView, setActiveView] = useState<ActiveView>('today');
    const { t } = useLanguage();

    const renderView = () => {
        switch (activeView) {
            case 'today': return <TodayScreen />;
            case 'schedule': return <ScheduleScreen />;
            case 'requests': return <MobileMessagingScreen />;
            default: return <TodayScreen />;
        }
    };

    return (
        <div className="flex flex-col h-screen">
            <main className="flex-1 overflow-y-auto pb-20 bg-slate-100 dark:bg-blue-night-950">
                {renderView()}
            </main>
            <footer className="fixed bottom-0 left-0 right-0 bg-white dark:bg-blue-night-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
                <nav className="flex justify-around items-center h-16">
                    <NavItem icon={<Home size={24} />} label={t('mobile.today')} isActive={activeView === 'today'} onClick={() => setActiveView('today')} />
                    <NavItem icon={<Calendar size={24} />} label={t('mobile.schedule')} isActive={activeView === 'schedule'} onClick={() => setActiveView('schedule')} />
                    <NavItem icon={<Send size={24} />} label={t('mobile.messaging')} isActive={activeView === 'requests'} onClick={() => setActiveView('requests')} />
                </nav>
            </footer>
        </div>
    );
};

export default MobileLayout;