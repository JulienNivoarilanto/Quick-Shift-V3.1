import React, { useState, useMemo, FC, useRef, useEffect } from 'react';
import { Employee, EmployeeDocument, DocumentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { FileText, PlusCircle, AlertTriangle, Edit, Trash2, Upload, Search, X, Lightbulb, Users as UsersIcon } from 'lucide-react';
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

const SearchableEmployeeFilter: FC<{ employees: Employee[]; selectedId: string; onSelectionChange: (id: string) => void; }> = ({ employees, selectedId, onSelectionChange }) => {
    const { t } = useLanguage();
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedEmployee = useMemo(() => employees.find(e => e.id === selectedId), [employees, selectedId]);
    const availableEmployees = useMemo(() => employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase())), [employees, searchTerm]);

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
    { selector: "[data-tour-id='ref-add-doc']", titleKey: 'tour.referencing.addTitle', contentKey: 'tour.referencing.addContent', position: 'bottom' },
    { selector: "[data-tour-id='ref-filters']", titleKey: 'tour.referencing.filterTitle', contentKey: 'tour.referencing.filterContent', position: 'bottom' },
    { selector: "[data-tour-id='ref-doc-card']", titleKey: 'tour.referencing.actionTitle', contentKey: 'tour.referencing.actionContent', position: 'right' },
];

const Referencing: FC<ReferencingProps> = ({ employees, documents, documentTypes, onSaveDocument, onDeleteDocument, onBulkCreateDocuments, onSaveEmployee }) => {
    const { t } = useLanguage();
    const [filters, setFilters] = useState({ employeeId: 'all', typeId: 'all', status: 'all' });
    const [editorState, setEditorState] = useState<{ isOpen: boolean; doc: EmployeeDocument | null }>({ isOpen: false, doc: null });
    const [importState, setImportState] = useState<{ isOpen: boolean; employee: Employee | null }>({ isOpen: false, employee: null });
    const [docToDelete, setDocToDelete] = useState<EmployeeDocument | null>(null);
    const [isTourActive, setIsTourActive] = useState(false);

    const documentsWithStatus = useMemo(() => documents.map(doc => ({ ...doc, status: getDocumentStatus(doc) })), [documents]);

    const filteredDocuments = useMemo(() => {
        return documentsWithStatus.filter(doc => {
            const empMatch = filters.employeeId === 'all' || doc.employeeId === filters.employeeId;
            const typeMatch = filters.typeId === 'all' || doc.typeId === filters.typeId;
            const statusMatch = filters.status === 'all' || doc.status === filters.status;
            return empMatch && typeMatch && statusMatch;
        });
    }, [documentsWithStatus, filters]);

    const handleClearFilters = () => {
        setFilters({ employeeId: 'all', typeId: 'all', status: 'all' });
    };
    
    const handleDeleteConfirm = () => {
        if (docToDelete) {
            onDeleteDocument(docToDelete.id);
            setDocToDelete(null);
        }
    };

    return (
        <div className="animate-slide-in-up">
            {isTourActive && <FeatureTour steps={referencingTourSteps} onClose={() => setIsTourActive(false)} />}
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{t('sidebar.referencing')}</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">{t('referencing.description')}</p>
            
            <div className="bg-white dark:bg-blue-night-900 p-4 rounded-xl shadow-md mb-6" data-tour-id="ref-filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SearchableEmployeeFilter employees={employees} selectedId={filters.employeeId} onSelectionChange={(id) => setFilters(f => ({...f, employeeId: id}))} />
                    <div>
                        <label className="label-style">{t('referencing.filterByDocType')}</label>
                        <select value={filters.typeId} onChange={e => setFilters(f => ({...f, typeId: e.target.value}))} className="input-style">
                            <option value="all">{t('referencing.allDocTypes')}</option>
                            {documentTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label-style">{t('referencing.filterByStatus')}</label>
                        <select value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))} className="input-style">
                            <option value="all">{t('referencing.allStatuses')}</option>
                            <option value="valid">{t('referencing.status.valid')}</option>
                            <option value="expiringSoon">{t('referencing.status.expiringSoon')}</option>
                            <option value="expired">{t('referencing.status.expired')}</option>
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                         <button onClick={handleClearFilters} className="btn-secondary w-full"><X size={16} className="mr-2"/>{t('calendarFilter.clearAll')}</button>
                         <button onClick={() => setEditorState({isOpen: true, doc: null})} className="btn-primary w-full" data-tour-id="ref-add-doc"><PlusCircle size={16} className="mr-2"/>{t('referencing.addDocument')}</button>
                         <button onClick={() => setIsTourActive(true)} title={t('tour.quickTips')} className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors" aria-label={t('tour.quickTips')}>
                            <Lightbulb size={20} className="text-yellow-400" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-x-auto">
                 <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-blue-night-800 text-xs uppercase text-gray-700 dark:text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-3">{t('referencing.table.document')}</th>
                            <th scope="col" className="px-6 py-3">{t('referencing.table.employee')}</th>
                            <th scope="col" className="px-6 py-3">{t('referencing.table.type')}</th>
                            <th scope="col" className="px-6 py-3">{t('referencing.table.expiration')}</th>
                            <th scope="col" className="px-6 py-3">{t('referencing.table.status')}</th>
                            <th scope="col" className="px-6 py-3 text-right">{t('employees.tableHeaderActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDocuments.map((doc, index) => {
                            const employee = employees.find(e => e.id === doc.employeeId);
                            const docType = documentTypes.find(dt => dt.id === doc.typeId);
                            return (
                                <tr key={doc.id} className="border-b dark:border-blue-night-700 hover:bg-gray-50 dark:hover:bg-blue-night-800/50" data-tour-id={index === 0 ? "ref-doc-card" : ""}>
                                    <td className="px-6 py-4 font-medium">{doc.name}</td>
                                    <td className="px-6 py-4">{employee?.name}</td>
                                    <td className="px-6 py-4">{docType?.name}</td>
                                    <td className="px-6 py-4">{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4"><StatusBadge status={doc.status} /></td>
                                    <td className="px-6 py-4">
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => setEditorState({isOpen: true, doc})} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-700"><Edit size={16} /></button>
                                            <button onClick={() => setDocToDelete(doc)} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
                  {filteredDocuments.length === 0 && <p className="text-center py-10 text-slate-500">{t('referencing.noDocuments')}</p>}
            </div>
            
            {editorState.isOpen && <DocumentEditor isOpen={true} onClose={() => setEditorState({isOpen: false, doc: null})} document={editorState.doc} employees={employees} documentTypes={documentTypes} documents={documents} onSave={onSaveDocument} />}
            {docToDelete && (
                <Modal
                    isOpen={true}
                    onClose={() => setDocToDelete(null)}
                    title={t('modals.confirmDelete', { name: docToDelete.name })}
                    size="sm"
                    footer={<><button onClick={() => setDocToDelete(null)} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleDeleteConfirm} className="btn-danger">{t('modals.confirm')}</button></>}
                >
                    <p>{t('referencing.confirmDelete', { name: docToDelete.name })}</p>
                </Modal>
            )}
            
            <style>{`
                .label-style { display: block; margin-bottom: 0.25rem; font-size: 0.75rem; font-weight: 500; color: #64748b; } .dark .label-style { color: #94a3b8; }
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #f8fafc; } .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .btn-primary { display: flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; }
                .btn-secondary { display: flex; align-items: center; justify-content: center; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; } .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
                .btn-danger { background-color: #ef4444; color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; }
            `}</style>
        </div>
    );
};

export default Referencing;