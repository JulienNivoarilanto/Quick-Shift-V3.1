
import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Employee } from '../types';
import { Loader2, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EmployeeHourData {
    id: string;
    name: string;
    hours: number;
}

interface DashboardExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    employeeHoursList: EmployeeHourData[];
    allEmployees: Employee[];
    totalHours: number;
    isProPlus: boolean;
}

const DashboardExportModal: React.FC<DashboardExportModalProps> = ({ isOpen, onClose, employeeHoursList, allEmployees, totalHours, isProPlus }) => {
    const { t } = useLanguage();
    const [isGenerating, setIsGenerating] = useState(false);
    
    const availableColumns = useMemo(() => [
        { id: 'name', label: t('dashboard.csvHeaderStaff') },
        { id: 'email', label: t('dashboard.csvHeaderEmail') },
        { id: 'phone', label: t('dashboard.csvHeaderPhone') },
        { id: 'customId', label: t('modals.customIdLabel') },
        { id: 'role', label: t('modals.roleLabel') },
        { id: 'status', label: t('modals.statusLabel') },
        { id: 'hours', label: isProPlus ? t('dashboard.csvHeaderActualHours') : t('dashboard.csvHeaderHours') }
    ], [t, isProPlus]);
    
    const [selectedColumns, setSelectedColumns] = useState<string[]>(['name', 'email', 'phone', 'hours']);

    const handleColumnToggle = (columnId: string) => {
        setSelectedColumns(prev => 
            prev.includes(columnId) ? prev.filter(id => id !== columnId) : [...prev, columnId]
        );
    };

    const handleExport = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // FIX: Explicitly type the Map to ensure correct type inference for downstream objects.
        const employeeMap = new Map<string, Employee>(allEmployees.map(e => [e.id, e]));

        const headers = selectedColumns.map(colId => availableColumns.find(c => c.id === colId)?.label || colId);
        let csvContent = headers.join(',') + '\n';

        for (const empHourData of employeeHoursList) {
            const fullEmployee = employeeMap.get(empHourData.id);
            if (!fullEmployee) continue;

            const rowData: { [key: string]: any } = {
                ...fullEmployee,
                hours: empHourData.hours.toFixed(1)
            };

            const row = selectedColumns.map(colId => {
                const value = rowData[colId] ?? '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvContent += row.join(',') + '\n';
        }

        const totalRow = selectedColumns.map(colId => {
            if (colId === 'name') return `"${t('dashboard.csvTotal')}"`;
            if (colId === 'hours') return totalHours.toFixed(1);
            return '';
        }).join(',');
        csvContent += `\n${totalRow}\n`;

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const today = new Date().toISOString().split('T')[0];
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `staff_hours_analysis_${today}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsGenerating(false);
        onClose();
    };

    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handleExport} disabled={isGenerating || selectedColumns.length === 0} className="btn-primary w-32 flex justify-center">
                {isGenerating ? <Loader2 className="animate-spin" /> : <><Download size={16} className="mr-2" />{t('dashboard.exportButton')}</>}
            </button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('dashboard.exportTitle')} footer={footer}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('dashboard.exportDesc')}</p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('dashboard.selectColumns')}</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {availableColumns.map(col => (
                            <label key={col.id} className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(col.id)}
                                    onChange={() => handleColumnToggle(col.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-slate-800 dark:text-slate-200">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
             <style>{`
                .btn-primary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: white; background-color: #2563eb; transition: background-color 0.2s; }
                .btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
                .btn-primary:disabled { background-color: #93c5fd; cursor: not-allowed; }
                .btn-secondary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; background-color: #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #334155; }
                .btn-secondary:hover { background-color: #cbd5e1; }
                .dark .btn-secondary:hover { background-color: #475569; }
            `}</style>
        </Modal>
    );
};

export default DashboardExportModal;
