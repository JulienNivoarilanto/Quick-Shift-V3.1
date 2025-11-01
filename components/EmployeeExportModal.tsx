import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { Employee, Role, ContractType } from '../types';
import { Loader2, Download } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface EmployeeExportModalProps {
    onClose: () => void;
    allEmployees: Employee[];
    allRoles: Role[];
}

const ALL_STATUSES: Employee['status'][] = ['active', 'inactive', 'suspended'];
const ALL_CONTRACT_TYPES: ContractType[] = ['permanent', 'temporary', 'internship', 'volunteer', 'interim', 'apprenticeship', 'professionalization', 'part-time', 'seasonal'];

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

const EmployeeExportModal: React.FC<EmployeeExportModalProps> = ({ onClose, allEmployees, allRoles }) => {
    const { t } = useLanguage();
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Filters
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
    const [format, setFormat] = useState<ExportFormat>('csv');

    const filteredEmployees = useMemo(() => {
        return allEmployees.filter(employee => {
            const roleMatch = roleFilter === 'all' || employee.role === roleFilter;
            const statusMatch = statusFilter === 'all' || employee.status === statusFilter;
            const contractMatch = contractTypeFilter === 'all' || employee.contractType === contractTypeFilter;
            return roleMatch && statusMatch && contractMatch;
        });
    }, [allEmployees, roleFilter, statusFilter, contractTypeFilter]);
    
    const generateCsv = (data: Employee[]) => {
        const headers = [
            "Name", "Email", "Phone", "Gender", "Role", "Status", "Birth Date", "Address", "Hiring Date", "Contract Type", "Custom ID", "Access Code"
        ];
        let csvContent = headers.join(',') + '\n';

        data.forEach(emp => {
            const row = [
                `"${emp.name.replace(/"/g, '""')}"`,
                emp.email,
                emp.phone,
                emp.gender,
                emp.role,
                emp.status,
                emp.birthDate ? new Date(emp.birthDate).toLocaleDateString() : '',
                `"${(emp.address || '').replace(/"/g, '""')}"`,
                emp.hiringDate ? new Date(emp.hiringDate).toLocaleDateString() : '',
                emp.contractType || '',
                emp.customId || '',
                emp.accessCode || ''
            ].join(',');
            csvContent += row + '\n';
        });

        return csvContent;
    };

    const generatePdfHtml = (data: Employee[]) => {
        const headers = ["Name", "Email", "Phone", "Role", "Status"];
        const tableRows = data.map(emp => `
            <tr>
                <td>${emp.name}</td>
                <td>${emp.email}</td>
                <td>${emp.phone || 'N/A'}</td>
                <td>${emp.role}</td>
                <td>${t(`status.${emp.status}`)}</td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html><html><head><title>Employee List</title><style>
                body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; } tr:nth-child(even) { background-color: #f9f9f9; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style></head><body><h1>Employee List (${data.length} employees)</h1>
            <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    };

    const handleExport = async () => {
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate generation time

        const today = new Date().toISOString().split('T')[0];
        const fileName = `employee_export_${today}`;
        
        switch (format) {
            case 'csv':
            case 'xlsx': // Note: For XLSX, a library like 'xlsx' would be needed. Here we fallback to CSV.
                const csvData = generateCsv(filteredEmployees);
                const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `${fileName}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                break;
            case 'pdf':
                const html = generatePdfHtml(filteredEmployees);
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
            {isGenerating ? <><Loader2 className="animate-spin mr-2" size={18} /> {t('modals.generating')}</> : <><Download size={18} className="mr-2" /> {t('employees.exportButton', { count: filteredEmployees.length })}</>}
        </button>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={t('employees.exportTitle')} footer={footer}>
            <div className="space-y-6">
                <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('employees.filters')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('employees.allRoles')}</label>
                            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700">
                                <option value="all">{t('employees.allRoles')}</option>
                                {allRoles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('modals.statusLabel')}</label>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700">
                                <option value="all">{t('employees.allStatuses')}</option>
                                {ALL_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{t('modals.contractTypeLabel')}</label>
                            <select value={contractTypeFilter} onChange={e => setContractTypeFilter(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-slate-900 dark:border-slate-700">
                                <option value="all">{t('employees.allContracts')}</option>
                                {ALL_CONTRACT_TYPES.map(c => <option key={c} value={c}>{t(`contract.${c}`)}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('modals.exportFormat')}</h4>
                    <div className="flex space-x-2 rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
                        {(['csv', 'xlsx', 'pdf'] as ExportFormat[]).map(f => (
                            <button key={f} onClick={() => setFormat(f)} className={`w-full text-center px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${format === f ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-white/50'}`}>
                                {f.toUpperCase()}
                            </button>
                        ))}
                    </div>
                     <p className="text-xs text-slate-500 mt-1">{t('employees.xlsxNote')}</p>
                </div>
            </div>
        </Modal>
    );
};

export default EmployeeExportModal;