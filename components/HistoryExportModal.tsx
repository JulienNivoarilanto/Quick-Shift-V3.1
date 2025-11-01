import React, { useState } from 'react';
import Modal from './Modal';
import { Employee, Shift, Absence, Meeting } from '../types';
import { Loader2, Download, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

// FIX: Updated UnifiedHistoryItem to include Meeting type to match the definition in History.tsx
interface UnifiedHistoryItem {
    id: string;
    type: 'Presence' | 'Lateness' | 'Absence' | 'Meeting';
    date: Date;
    employeeId: string;
    details: string;
    hours?: number;
    rawItem: Shift | Absence | Meeting;
}

interface HistoryExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: UnifiedHistoryItem[];
    employees: Employee[];
}

const HistoryExportModal: React.FC<HistoryExportModalProps> = ({ isOpen, onClose, data, employees }) => {
    const { t } = useLanguage();
    const [format, setFormat] = useState<ExportFormat>('csv');
    const [isGenerating, setIsGenerating] = useState(false);

    const employeeMap = new Map<string, Employee>(employees.map(e => [e.id, e]));

    const generateCsv = () => {
        const headers = ["Date", "Employee Name", "Type", "Details", "Hours"];
        let csvContent = headers.join(',') + '\n';

        data.forEach(item => {
            const emp: Employee | undefined = employeeMap.get(item.employeeId);
            const row = [
                item.date.toLocaleDateString(),
                `"${emp ? emp.name.replace(/"/g, '""') : 'N/A'}"`,
                item.type,
                `"${item.details.replace(/"/g, '""')}"`,
                item.hours ? item.hours.toFixed(2) : ''
            ].join(',');
            csvContent += row + '\n';
        });

        return csvContent;
    };

    const generatePdfHtml = () => {
        const headers = ["Date", "Employee", "Type", "Details", "Hours"];
        const tableRows = data.map(item => {
            const emp: Employee | undefined = employeeMap.get(item.employeeId);
            return `
                <tr>
                    <td>${item.date.toLocaleDateString()}</td>
                    <td>${emp ? emp.name : 'N/A'}</td>
                    <td>${item.type}</td>
                    <td>${item.details}</td>
                    <td>${item.hours ? `${item.hours.toFixed(2)}h` : '-'}</td>
                </tr>
            `;
        }).join('');

        return `
            <!DOCTYPE html><html><head><title>History Export</title><style>
                body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 10px; }
                th { background-color: #f2f2f2; } tr:nth-child(even) { background-color: #f9f9f9; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style></head><body><h1>History Report (${data.length} records)</h1>
            <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    };

    const handleExport = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 500)); 

        const today = new Date().toISOString().split('T')[0];
        const fileName = `history_export_${today}`;
        
        switch (format) {
            case 'csv':
            case 'xlsx':
                const csvData = generateCsv();
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `${fileName}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                break;
            case 'pdf':
                const html = generatePdfHtml();
                const newWindow = window.open('', '_blank');
                newWindow?.document.write(html);
                newWindow?.document.close();
                newWindow?.focus();
                setTimeout(() => newWindow?.print(), 500);
                break;
        }
        setIsGenerating(false);
        onClose();
    };

    const footer = (
         <button type="button" onClick={handleExport} disabled={isGenerating} className="w-full sm:w-auto flex justify-center items-center px-6 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
            {isGenerating ? <><Loader2 className="animate-spin mr-2" size={18} /> {t('modals.generating')}</> : <><Download size={18} className="mr-2" /> {t('modals.generateExport')}</>}
        </button>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('history.exportTitle')} footer={footer}>
            <div className="space-y-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('history.exportDescription')}</p>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('history.exportFormat')}</label>
                    <div className="flex space-x-2 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
                        {(['csv', 'xlsx', 'pdf'] as ExportFormat[]).map(f => (
                            <button key={f} onClick={() => setFormat(f)} className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${format === f ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50'}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    {format === 'xlsx' && <p className="text-xs text-slate-500 mt-1">{t('employees.xlsxNote')}</p>}
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                    <p className="text-sm text-green-800 dark:text-green-300">
                        {t('employees.exportButton', { count: data.length })}
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default HistoryExportModal;