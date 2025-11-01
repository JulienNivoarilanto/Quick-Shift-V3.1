

import React, { useState } from 'react';
import { HelpCircle, LayoutDashboard, Calendar, Users, Settings as SettingsIcon, Smartphone, FileText, Gauge, History as HistoryIcon, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const AccordionItem: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    isOpen: boolean;
    onClick: () => void;
}> = ({ title, icon, children, isOpen, onClick }) => {
    return (
        <div className="border-b border-slate-200 dark:border-slate-800">
            <h2>
                <button
                    type="button"
                    className="flex items-center justify-between w-full p-4 font-semibold text-left text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={onClick}
                    aria-expanded={isOpen}
                >
                    <div className="flex items-center">
                        {icon}
                        <span>{title}</span>
                    </div>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </h2>
            <div
                className={`grid grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : ''}`}
            >
                <div className="overflow-hidden">
                    <div className="p-4 pt-0 text-slate-600 dark:text-slate-300">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};


const UserGuide: React.FC = () => {
    const { t } = useLanguage();
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const sections = [
        {
            icon: <LayoutDashboard className="w-6 h-6 mr-3 text-blue-600 dark:text-blue-400" />,
            key: 'dashboard',
        },
        {
            icon: <Calendar className="w-6 h-6 mr-3 text-green-600 dark:text-green-400" />,
            key: 'schedule',
        },
        {
            icon: <Users className="w-6 h-6 mr-3 text-yellow-600 dark:text-yellow-400" />,
            key: 'employees',
        },
        {
            icon: <FileText className="w-6 h-6 mr-3 text-indigo-600 dark:text-indigo-400" />,
            key: 'referencing',
        },
        {
            icon: <Gauge className="w-6 h-6 mr-3 text-teal-600 dark:text-teal-400" />,
            key: 'timeclock',
        },
        {
            icon: <HistoryIcon className="w-6 h-6 mr-3 text-orange-600 dark:text-orange-400" />,
            key: 'history',
        },
        {
            icon: <SettingsIcon className="w-6 h-6 mr-3 text-red-600 dark:text-red-400" />,
            key: 'settings',
        },
        {
            icon: <Smartphone className="w-6 h-6 mr-3 text-purple-600 dark:text-purple-400" />,
            key: 'mobile',
        }
    ];
    
    const handleToggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-md animate-slide-in-up">
            <div className="flex items-center mb-6 pb-4 border-b dark:border-slate-800">
                <HelpCircle className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t('userGuide.title')}</h1>
            </div>
            
            <p className="mb-6 text-lg text-slate-600 dark:text-slate-400">
                {t('userGuide.intro')}
            </p>

            <div className="border border-slate-200 dark:border-slate-800 rounded-lg">
                {sections.map((section, index) => (
                    <AccordionItem
                        key={section.key}
                        icon={section.icon}
                        title={t(`userGuide.${section.key}.title`)}
                        isOpen={openIndex === index}
                        onClick={() => handleToggle(index)}
                    >
                        {t(`userGuide.${section.key}.content`)}
                    </AccordionItem>
                ))}
            </div>

            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
                <p>{t('userGuide.outro')}</p>
            </div>
        </div>
    );
};

export default UserGuide;