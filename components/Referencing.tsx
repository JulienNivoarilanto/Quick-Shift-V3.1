import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { Employee, EmployeeDocument, DocumentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, PlusCircle, AlertTriangle, Edit, Trash2, Upload, Download, Search, X, Filter, ChevronDown, LayoutGrid, Users, CheckCircle, Lightbulb } from 'lucide-react';
import Avatar from './Avatar';
import Modal from './Modal';
import DocumentEditor from './DocumentEditor';
import DocumentImportModal from './DocumentImportModal';
import FeatureTour, { TourStep } from './FeatureTour';

// Helper to determine document status with normalized dates
const getDocumentStatus = (doc: EmployeeDocument): 'expired' | 'expiringSoon' | 'valid' => {
    if (!doc.expirationDate) return 'valid';
    const expDate = new Date(doc.expirationDate);
    expDate.setHours(0, 0, 0, 0); 
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If today is on or after the expiration date, it's expired.
    if (today >= expDate) return 'expired';

    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    if (expDate <= thirtyDaysFromNow) return 'expiringSoon';
    return 'valid';
};


const StatusBadge: FC<{ status: 'expired' | 'expiringSoon' | 'valid' }> = ({ status }) => {
    const { t } = useLanguage();
    const styles = {
        expired: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        expiringSoon: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
        valid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>{t(`referencing.status.${status}`)}</span>;
};

const ValidityBadge: FC<{ isValid: boolean }> = ({ isValid }) => {
    const { t } = useLanguage();
    const styles = isValid 
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    const text = isValid ? t('referencing.valid') : t('referencing.invalid');
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>{text}</span>;
};


interface ActionOnExpirationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onActionSelect: (status: Employee['status']) => void;
    employee: Employee;
    document: EmployeeDocument;
}

const ActionOnExpirationModal: FC<ActionOnExpirationModalProps> = ({ isOpen, onClose, onActionSelect, employee, document }) => {
    const { t } = useLanguage();
    const footer = <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('referencing.actionOnExpirationTitle')} footer={footer} size="lg">
            <p className="text-slate-600 dark:text-slate-400 mb-6" dangerouslySetInnerHTML={{ __html: t('referencing.actionOnExpirationDesc', { docName: `<strong>${document.name}</strong>`, empName: `<strong>${employee.name}</strong>` }) }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => onActionSelect('active')} className="p-4 border rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800">
                    <p className="font-semibold">{t('referencing.keepActive')}</p>
                    <p className="text-xs text-slate-500">Employee remains active.</p>
                </button>
                <button onClick={() => onActionSelect('inactive')} className="p-4 border rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800">
                     <p className="font-semibold">{t('referencing.setToInactive')}</p>
                    <p className="text-xs text-slate-500">Employee becomes inactive.</p>
                </button>
                <button onClick={() => onActionSelect('suspended')} className="p-4 border rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-800">
                     <p className="font-semibold">{t('referencing.suspend')}</p>
                    <p className="text-xs text-slate-500">Employee is suspended.</p>
                </button>
            </div>
        </Modal>
    );
};

const SearchableEmployeeFilter: FC<{ employees: Employee[]; selectedId: string; onSelectionChange: (id: string) => void; }> = ({ employees, selectedId, onSelectionChange }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedId), [employees, selectedId]);

    const availableEmployees = useMemo(() => {
        return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [employees, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    return (
        <div ref={wrapperRef} className="relative">
            <label className="label-style">{t('referencing.filterByEmployee')}</label>
            {selectedEmployee ? (
                <div className="w-full flex justify-between items-center p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700">
                    <span>{selectedEmployee.name}</span>
                    <button onClick={() => onSelectionChange('all')}><X size={16} /></button>
                </div>
            ) : (
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onFocus={() => setIsOpen(true)} placeholder={t('calendarFilter.searchEmployees')} className="w-full p-2 pl-10 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700"/>
                </div>
            )}
            {isOpen && !selectedEmployee && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-blue-night-800 border dark:border-blue-night-700 rounded-md shadow-lg max-h-60 overflow-auto">
                    {availableEmployees.map(emp => (
                        <div key={emp.id} onClick={() => { onSelectionChange(emp.id); setIsOpen(false); setSearchTerm(''); }} className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-blue-night-700">{emp.name}</div>
                    ))}
                    {availableEmployees.length === 0 && <div className="px-4 py-2 text-gray-500">{t('calendarFilter.noResults')}</div>}
                </div>
            )}
        </div>
    );
};


interface ReferencingProps {
    employees: Employee[];
    documents: EmployeeDocument[];
    documentTypes: DocumentType[];
    onSaveDocument: (doc: EmployeeDocument) => void;
    onDeleteDocument: (docId: string) => void;
    onBulkCreateDocuments: (docs: Array<Omit<EmployeeDocument, 'id' | 'companyId'>>) => void;
    onSaveEmployee: (employee: Employee, isNew: boolean) => void;
}

const referencingTourSteps: TourStep[] = [
    { selector: "[data-tour-id='ref-filters']", titleKey: 'tour.referencing.filterTitle', contentKey: 'tour.referencing.filterContent', position: 'bottom' },
    { selector: "[data-tour-id='ref-import']", titleKey: 'tour.referencing.importTitle', contentKey: 'tour.referencing.importContent', position: 'left' },
    { selector: "[data-tour-id='ref-view-toggle']", titleKey: 'tour.referencing.viewTitle', contentKey: 'tour.referencing.viewContent', position: 'bottom' },
    { selector: "[data-tour-id='ref-add']", titleKey: 'tour.referencing.addTitle', contentKey: 'tour.referencing.addContent', position: 'left' },
    { selector: "[data-tour-id='ref-action']", titleKey: 'tour.referencing.actionTitle', contentKey: 'tour.referencing.actionContent', position: 'bottom' },
];

const Referencing: FC<ReferencingProps> = (props) => {
    const { employees, documents, documentTypes, onSaveDocument, onDeleteDocument, onBulkCreateDocuments, onSaveEmployee } = props;
    const { t } = useLanguage();

    const [viewMode, setViewMode] = useState<'list' | 'employee'>('list');
    const [showFilters, setShowFilters] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [employeeFilter, setEmployeeFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    
    const [editorModal, setEditorModal] = useState<{ isOpen: boolean; doc: EmployeeDocument | null }>({ isOpen: false, doc: null });
    const [importModal, setImportModal] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
    const [actionModal, setActionModal] = useState<{ isOpen: boolean; doc: EmployeeDocument | null; emp: Employee | null }>({isOpen: false, doc: null, emp: null});
    const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean; doc: EmployeeDocument | null; emp: Employee | null; newStatus: Employee['status'] | null; }>({ isOpen: false, doc: null, emp: null, newStatus: null });
    const [successModal, setSuccessModal] = useState<{ isOpen: boolean; message: string; }>({ isOpen: false, message: "" });
    const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
    const [dismissedDocIds, setDismissedDocIds] = useState<Set<string>>(new Set());
    const [isTourActive, setIsTourActive] = useState(false);

    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);
    const docTypeMap = useMemo(() => new Map(documentTypes.map(dt => [dt.id, dt.name])), [documentTypes]);

    const expiringAndExpiredDocs = useMemo(() => {
        return documents
            .map(doc => ({ ...doc, status: getDocumentStatus(doc) }))
            .filter(doc => (doc.status === 'expired' || doc.status === 'expiringSoon'))
            .filter(doc => !dismissedDocIds.has(doc.id))
            .sort((a, b) => (a.expirationDate?.getTime() || 0) - (b.expirationDate?.getTime() || 0));
    }, [documents, dismissedDocIds]);

    const filteredDocuments = useMemo(() => {
        return documents.filter(doc => {
            const employee = employeeMap.get(doc.employeeId);
            if (!employee) return false;

            const searchMatch = searchTerm === '' ||
                doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (doc.number && doc.number.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const employeeMatch = employeeFilter === 'all' || doc.employeeId === employeeFilter;
            const typeMatch = typeFilter === 'all' || doc.typeId === typeFilter;
            const statusMatch = statusFilter === 'all' || getDocumentStatus(doc) === statusFilter;

            return searchMatch && employeeMatch && typeMatch && statusMatch;
        });
    }, [documents, searchTerm, employeeFilter, typeFilter, statusFilter, employeeMap]);

    const documentsByEmployee = useMemo(() => {
        return filteredDocuments.reduce((acc, doc) => {
            const empId = doc.employeeId;
            if (!acc[empId]) {
                acc[empId] = [];
            }
            acc[empId].push(doc);
            return acc;
        }, {} as { [key: string]: EmployeeDocument[] });
    }, [filteredDocuments]);
    
    const handleDismissNotification = (e: React.MouseEvent, docId: string) => {
        e.stopPropagation();
        setDismissedDocIds(prev => new Set(prev).add(docId));
    };

    const handleActionSelect = (newStatus: Employee['status']) => {
        const { doc, emp } = actionModal;
        setActionModal({ isOpen: false, doc: null, emp: null });
        setConfirmationModal({ isOpen: true, doc, emp, newStatus });
    };

    const handleFinalConfirm = () => {
        const { emp, doc, newStatus } = confirmationModal;
        if (!emp || !doc || !newStatus) return;

        onSaveEmployee({ ...emp, status: newStatus }, false);
        if (doc.isValid) {
            onSaveDocument({ ...doc, isValid: false });
        }
        
        setDismissedDocIds(prev => new Set(prev).add(doc.id));

        setConfirmationModal({ isOpen: false, doc: null, emp: null, newStatus: null });

        const successMessage = t('referencing.actionSuccessBody', { 
            empName: `<strong>${emp.name}</strong>`, 
            status: `<strong>${t(`status.${newStatus}`)}</strong>` 
        });
        setSuccessModal({ isOpen: true, message: successMessage });
    };


    const handleDelete = (docId: string, docName: string) => {
        if(window.confirm(t('referencing.confirmDelete', { name: docName }))) {
            onDeleteDocument(docId);
        }
    };
    
    const handleExport = () => {
        const headers = ["Document Name", "Employee Name", "Type", "Number", "Expiration Date", "Validity", "Status"];
        let csvContent = headers.join(',') + '\n';

        filteredDocuments.forEach(doc => {
            const emp = employeeMap.get(doc.employeeId);
            const status = getDocumentStatus(doc);
            const isCurrentlyValid = doc.isValid && status !== 'expired';
            
            const row = [
                `"${doc.name.replace(/"/g, '""')}"`,
                `"${emp ? emp.name.replace(/"/g, '""') : 'N/A'}"`,
                `"${docTypeMap.get(doc.typeId) || 'N/A'}"`,
                doc.number || '',
                doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : '',
                isCurrentlyValid ? 'Valid' : 'Invalid',
                status
            ].join(',');
            csvContent += row + '\n';
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `document_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleEmployeeExpansion = (empId: string) => {
        setExpandedEmployees(prev => {
            const newSet = new Set(prev);
            if (newSet.has(empId)) {
                newSet.delete(empId);
            } else {
                newSet.add(empId);
            }
            return newSet;
        });
    };

    
    return (
        <div className="animate-slide-in-up">
            {isTourActive && <FeatureTour steps={referencingTourSteps} onClose={() => setIsTourActive(false)} />}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('referencing.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{t('referencing.description')}</p>
                </div>
                <button onClick={() => setIsTourActive(true)} title={t('tour.quickTips')} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors flex-shrink-0 ml-4" aria-label={t('tour.quickTips')}>
                    <Lightbulb size={20} className="text-yellow-400" />
                </button>
            </div>
            
            {/* Expiration Alerts */}
            <div className="mb-6 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center mb-3">
                    <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                    {t('referencing.expiringDocuments')}
                </h3>
                {expiringAndExpiredDocs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-40 overflow-y-auto pr-2">
                        {expiringAndExpiredDocs.map((doc, index) => {
                            const emp = employeeMap.get(doc.employeeId);
                            const isExpired = doc.status === 'expired';
                            return (
                                <div key={doc.id} className={`relative p-2 rounded-lg border-l-4 flex flex-col justify-between ${isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-500' : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'}`}>
                                    <button 
                                        onClick={(e) => handleDismissNotification(e, doc.id)}
                                        className="absolute top-1 right-1 p-0.5 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                        title={t('referencing.dismissNotification')}
                                        aria-label={t('referencing.dismissNotification')}
                                    >
                                        <X size={12} />
                                    </button>
                                    <div>
                                        <p className="font-semibold text-sm truncate pr-4">{doc.name}</p>
                                        <p className="text-xs text-slate-600 dark:text-slate-300">{t('referencing.documentFor')} <span className="font-medium">{emp?.name || '...'}</span></p>
                                    </div>
                                    <div className="flex justify-between items-end mt-1">
                                        <p className={`text-xs font-bold ${isExpired ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                                            {isExpired ? t('referencing.expiredOn', { date: new Date(doc.expirationDate!).toLocaleDateString() }) : t('referencing.expiresOn', { date: new Date(doc.expirationDate!).toLocaleDateString() })}
                                        </p>
                                        {isExpired && emp && (
                                            <button data-tour-id={index === 0 && isExpired ? 'ref-action' : undefined} onClick={() => setActionModal({ isOpen: true, doc, emp })} className="text-xs font-semibold bg-slate-800 text-white px-1.5 py-0.5 rounded-md hover:bg-slate-700">{t('referencing.action')}</button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : <p className="text-sm text-slate-500 dark:text-slate-400">{t('referencing.noExpiringDocuments')}</p>}
            </div>

            {/* Main Content */}
            <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">{t('referencing.allDocuments')}</h3>
                    <div className="flex items-center gap-2">
                         <div data-tour-id="ref-view-toggle" className="flex items-center bg-gray-200 dark:bg-blue-night-800 rounded-lg p-1">
                            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-gray-400'}`} title={t('referencing.viewByList')}><LayoutGrid size={20} /></button>
                            <button onClick={() => setViewMode('employee')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'employee' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-gray-400'}`} title={t('referencing.viewByEmployee')}><Users size={20} /></button>
                        </div>
                        <div className="h-6 border-l border-gray-300 dark:border-gray-700"></div>
                         <button onClick={handleExport} title={t('referencing.exportDocuments')} className="p-2 rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white"><Download size={20} /></button>
                        <button data-tour-id="ref-import" onClick={() => setImportModal({ isOpen: true, employee: employeeMap.get(employeeFilter) || null })} disabled={employeeFilter === 'all'} title={t('referencing.importDocuments')} className="p-2 rounded-lg transition-colors bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"><Upload size={20} /></button>
                        <button data-tour-id="ref-add" onClick={() => setEditorModal({ isOpen: true, doc: null })} title={t('referencing.addDocument')} className="p-2 rounded-lg transition-colors bg-blue-600 hover:bg-blue-700 text-white"><PlusCircle size={20} /></button>
                    </div>
                </div>
                
                {/* Filters */}
                <div className="mb-4">
                    <button data-tour-id="ref-filters" onClick={() => setShowFilters(f => !f)} className="flex items-center text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                        <Filter size={16} className="mr-2" /> {t('employees.filters')} <ChevronDown size={16} className={`ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    {showFilters && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-slide-in-up">
                           <div className="lg:col-span-2">
                             <SearchableEmployeeFilter employees={employees} selectedId={employeeFilter} onSelectionChange={setEmployeeFilter} />
                           </div>
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700">
                                <option value="all">{t('referencing.allDocTypes')}</option>
                                {documentTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                            </select>
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700">
                                <option value="all">{t('referencing.allStatuses')}</option>
                                <option value="valid">{t('referencing.status.valid')}</option>
                                <option value="expiringSoon">{t('referencing.status.expiringSoon')}</option>
                                <option value="expired">{t('referencing.status.expired')}</option>
                            </select>
                        </div>
                    )}
                </div>
                
                {viewMode === 'list' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-blue-night-800 text-xs uppercase text-gray-700 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-3">{t('referencing.table.document')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.employee')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.type')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.number')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.expiration')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.validity')}</th>
                                    <th className="px-6 py-3">{t('referencing.table.status')}</th>
                                    <th className="px-6 py-3 text-right">{t('employees.tableHeaderActions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDocuments.map(doc => {
                                    const emp = employeeMap.get(doc.employeeId);
                                    const status = getDocumentStatus(doc);
                                    const isCurrentlyValid = doc.isValid && status !== 'expired';
                                    return (
                                        <tr key={doc.id} className="border-b dark:border-blue-night-700 hover:bg-gray-50 dark:hover:bg-blue-night-800/50">
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{doc.name}</td>
                                            <td className="px-6 py-4">{emp?.name || 'N/A'}</td>
                                            <td className="px-6 py-4">{docTypeMap.get(doc.typeId) || 'N/A'}</td>
                                            <td className="px-6 py-4">{doc.number || '-'}</td>
                                            <td className="px-6 py-4">{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : '-'}</td>
                                            <td className="px-6 py-4"><ValidityBadge isValid={isCurrentlyValid} /></td>
                                            <td className="px-6 py-4"><StatusBadge status={status} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex justify-end space-x-2">
                                                    <button onClick={() => setEditorModal({ isOpen: true, doc })} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-700" title={t('referencing.editDocument')}><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(doc.id, doc.name)} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50" title={t('modals.confirmDelete', { name: doc.name })}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                         {filteredDocuments.length === 0 && <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('referencing.noDocuments')}</p>}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {Object.keys(documentsByEmployee).map(empId => {
                            const emp = employeeMap.get(empId);
                            if (!emp) return null;
                            const isExpanded = expandedEmployees.has(empId);
                            return (
                                <div key={empId} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                    <button onClick={() => toggleEmployeeExpansion(empId)} className="w-full flex items-center justify-between p-3 text-left">
                                        <div className="flex items-center">
                                            <Avatar name={emp.name} src={emp.avatarUrl} className="w-8 h-8 rounded-full mr-3" />
                                            <span className="font-semibold text-slate-800 dark:text-slate-100">{emp.name}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <span className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full mr-3">{documentsByEmployee[empId].length} documents</span>
                                            <ChevronDown size={20} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="p-2 sm:p-4">
                                            <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-md">
                                                {/* nested table */}
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 dark:bg-blue-night-800 text-xs uppercase text-gray-700 dark:text-gray-400">
                                                        <tr>
                                                            <th className="px-4 py-2">{t('referencing.table.document')}</th>
                                                            <th className="px-4 py-2">{t('referencing.table.expiration')}</th>
                                                            <th className="px-4 py-2">{t('referencing.table.validity')}</th>
                                                            <th className="px-4 py-2">{t('referencing.table.status')}</th>
                                                            <th className="px-4 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {documentsByEmployee[empId].map(doc => {
                                                             const status = getDocumentStatus(doc);
                                                             const isCurrentlyValid = doc.isValid && status !== 'expired';
                                                            return (
                                                                <tr key={doc.id} className="border-t dark:border-blue-night-700">
                                                                    <td className="px-4 py-2 font-medium">{doc.name}</td>
                                                                    <td className="px-4 py-2">{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : '-'}</td>
                                                                    <td className="px-4 py-2"><ValidityBadge isValid={isCurrentlyValid} /></td>
                                                                    <td className="px-4 py-2"><StatusBadge status={status} /></td>
                                                                    <td className="px-4 py-2">
                                                                        <div className="flex justify-end space-x-1">
                                                                            <button onClick={() => setEditorModal({ isOpen: true, doc })} className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-700"><Edit size={14} /></button>
                                                                            <button onClick={() => handleDelete(doc.id, doc.name)} className="p-1.5 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 size={14} /></button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                         {Object.keys(documentsByEmployee).length === 0 && <p className="text-center py-10 text-gray-500 dark:text-gray-400">{t('referencing.noDocuments')}</p>}
                    </div>
                )}
            </div>

            {editorModal.isOpen && (
                <DocumentEditor
                    isOpen={true}
                    onClose={() => setEditorModal({ isOpen: false, doc: null })}
                    document={editorModal.doc}
                    employees={employees}
                    documentTypes={documentTypes}
                    documents={documents}
                    onSave={onSaveDocument}
                />
            )}
            
            {importModal.isOpen && importModal.employee && (
                <DocumentImportModal
                    onClose={() => setImportModal({isOpen: false, employee: null})}
                    employee={importModal.employee}
                    documentTypes={documentTypes}
                    onImport={onBulkCreateDocuments}
                />
            )}

            {actionModal.isOpen && actionModal.doc && actionModal.emp && (
                <ActionOnExpirationModal
                    isOpen={true}
                    onClose={() => setActionModal({isOpen: false, doc: null, emp: null})}
                    onActionSelect={handleActionSelect}
                    employee={actionModal.emp}
                    document={actionModal.doc}
                />
            )}

            {confirmationModal.isOpen && confirmationModal.emp && confirmationModal.newStatus && (
                <Modal
                    isOpen={true}
                    onClose={() => setConfirmationModal({ isOpen: false, doc: null, emp: null, newStatus: null })}
                    title={t('referencing.confirmActionTitle')}
                    footer={
                        <>
                            <button onClick={() => setConfirmationModal({ isOpen: false, doc: null, emp: null, newStatus: null })} className="btn-secondary">{t('modals.cancel')}</button>
                            <button onClick={handleFinalConfirm} className="btn-primary">{t('modals.confirm')}</button>
                        </>
                    }
                    size="md"
                >
                    <p dangerouslySetInnerHTML={{ __html: t('referencing.confirmActionBody', { empName: `<strong>${confirmationModal.emp.name}</strong>`, status: `<strong>${t(`status.${confirmationModal.newStatus}`)}</strong>` }) }} />
                </Modal>
            )}

            {successModal.isOpen && (
                <Modal
                    isOpen={true}
                    onClose={() => setSuccessModal({ isOpen: false, message: '' })}
                    title={t('referencing.actionSuccessTitle')}
                    footer={<button onClick={() => setSuccessModal({ isOpen: false, message: '' })} className="btn-primary">OK</button>}
                    size="md"
                >
                    <div className="flex items-start">
                        <CheckCircle className="w-6 h-6 mr-3 text-green-500 flex-shrink-0" />
                        <p dangerouslySetInnerHTML={{ __html: successModal.message }} />
                    </div>
                </Modal>
            )}

             <style>{`.label-style { display: block; margin-bottom: 0.25rem; font-size: 0.75rem; font-weight: 500; color: #64748b; } .dark .label-style { color: #94a3b8; }`}</style>
        </div>
    );
};

export default Referencing;
