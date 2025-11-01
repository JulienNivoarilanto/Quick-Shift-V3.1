import React, { useState, useEffect } from 'react';
import { EmployeeDocument, Employee, DocumentType } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface DocumentEditorProps {
    isOpen: boolean;
    onClose: () => void;
    document: EmployeeDocument | null;
    employees: Employee[];
    documentTypes: DocumentType[];
    documents: EmployeeDocument[];
    onSave: (doc: EmployeeDocument) => void;
}

const toInputDateString = (date?: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
};

const DocumentEditor: React.FC<DocumentEditorProps> = ({ isOpen, onClose, document, employees, documentTypes, documents, onSave }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    
    const getInitialState = () => ({
        employeeId: document?.employeeId || (employees.length > 0 ? employees[0].id : ''),
        typeId: document?.typeId || (documentTypes.length > 0 ? documentTypes[0].id : ''),
        name: document?.name || '',
        number: document?.number || '',
        description: document?.description || '',
        expirationDate: document?.expirationDate ? toInputDateString(new Date(document.expirationDate)) : '',
        isValid: document?.isValid ?? true,
    });

    const [formData, setFormData] = useState(getInitialState);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
            setError('');
        }
    }, [isOpen, document, employees, documentTypes]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleSave = () => {
        if (!formData.employeeId || !formData.typeId || !formData.name.trim()) {
            setError("Employee, Document Type, and Document Name are required.");
            return;
        }

        let docId = document?.id || `new-doc-${Date.now()}`;
        const docType = documentTypes.find(dt => dt.id === formData.typeId);

        if (docType?.isUnique && !document) {
            const existingDoc = documents.find(d => d.employeeId === formData.employeeId && d.typeId === formData.typeId);
            if (existingDoc) {
                if (window.confirm(t('referencing.confirmReplaceUnique', { docTypeName: docType.name }))) {
                    docId = existingDoc.id;
                } else {
                    return; // Abort save if user cancels replacement
                }
            }
        }


        const finalDoc: EmployeeDocument = {
            id: docId,
            companyId: user!.companyId,
            employeeId: formData.employeeId,
            typeId: formData.typeId,
            name: formData.name.trim(),
            isValid: formData.isValid,
        };

        if (formData.number.trim()) {
            finalDoc.number = formData.number.trim();
        }
        if (formData.description.trim()) {
            finalDoc.description = formData.description.trim();
        }
        if (formData.expirationDate) {
            finalDoc.expirationDate = new Date(formData.expirationDate + 'T00:00:00');
        }

        onSave(finalDoc);
        onClose();
    };
    
    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handleSave} className="btn-primary">{t('modals.save')}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={document ? t('referencing.editDocument') : t('referencing.addDocument')} footer={footer} size="lg">
             <form className="space-y-4">
                {error && <p className="text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/30 p-3 rounded-lg flex items-center"><AlertTriangle size={16} className="mr-2"/>{error}</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label-style">{t('modals.employeeLabel')}*</label>
                        <select name="employeeId" value={formData.employeeId} onChange={handleChange} className="input-style">
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label className="label-style">{t('modals.docType')}*</label>
                        <select name="typeId" value={formData.typeId} onChange={handleChange} className="input-style">
                             {documentTypes.map(dt => <option key={dt.id} value={dt.id}>{dt.name}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="label-style">{t('modals.docName')}*</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="input-style" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label-style">{t('modals.docNumber')}</label>
                        <input type="text" name="number" value={formData.number} onChange={handleChange} className="input-style" />
                    </div>
                     <div>
                        <label className="label-style">{t('modals.docExpDate')}</label>
                        <input type="date" name="expirationDate" value={formData.expirationDate} onChange={handleChange} className="input-style" />
                    </div>
                </div>

                <div>
                    <label className="label-style">{t('modals.docDesc')}</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className="input-style"></textarea>
                </div>

                <div className="pt-2">
                    <label className="flex items-center space-x-3 text-sm">
                        <input 
                            type="checkbox" 
                            name="isValid" 
                            checked={formData.isValid} 
                            onChange={handleChange} 
                            className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-200">{t('referencing.documentIsValid')}</span>
                    </label>
                </div>
             </form>
             <style>{`
                .label-style { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #475569; }
                .dark .label-style { color: #cbd5e1; }
                .input-style { display: block; width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; }
                .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; }
                .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
            `}</style>
        </Modal>
    );
};

export default DocumentEditor;