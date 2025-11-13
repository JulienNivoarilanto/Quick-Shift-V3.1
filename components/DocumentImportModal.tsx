
import React, { useState } from 'react';
import { Employee, DocumentType, EmployeeDocument } from '../types';
import Modal from './Modal';
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

type ImportableDocument = Omit<EmployeeDocument, 'id' | 'companyId'>;


interface DocumentImportModalProps {
    onClose: () => void;
    onImport: (docs: ImportableDocument[]) => void;
    employee: Employee;
    documentTypes: DocumentType[];
}

const DocumentImportModal: React.FC<DocumentImportModalProps> = ({ onClose, onImport, employee, documentTypes }) => {
    const { t } = useLanguage();
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [parsedData, setParsedData] = useState<ImportableDocument[]>([]);
    const [fileName, setFileName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const REQUIRED_HEADERS = ['name', 'type'];
    const ALL_HEADERS = ['name', 'type', 'number', 'description', 'expirationdate', 'isvalid'];
    const docTypeMap = new Map(documentTypes.map(dt => [dt.name.toLowerCase(), dt.id]));

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setFileName(file.name);
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.trim().split(/\r\n|\n/);
                if (lines.length < 2) {
                    throw new Error("CSV file must contain a header row and at least one data row.");
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s/g, ''));
                
                const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
                if (missingHeaders.length > 0) {
                    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
                }

                const data: ImportableDocument[] = [];
                for (let i = 1; i < lines.length; i++) {
                    if (!lines[i].trim()) continue; // Skip empty lines
                    const values = lines[i].split(',');
                    const entry: any = {};
                    headers.forEach((header, index) => {
                        const simplifiedHeader = header.trim().toLowerCase().replace(/\s/g, '');
                        if (ALL_HEADERS.includes(simplifiedHeader)) {
                             entry[simplifiedHeader] = values[index]?.trim() || '';
                        }
                    });
                    
                    const typeName = entry.type?.toLowerCase();
                    const typeId = docTypeMap.get(typeName);

                    if (entry.name && typeId) {
                        let expirationDate: Date | undefined = undefined;
                        if (entry.expirationdate) {
                            const parsedDate = new Date(entry.expirationdate);
                            if (!isNaN(parsedDate.getTime())) {
                                expirationDate = parsedDate;
                            }
                        }

                        const isValid = entry.isvalid ? (entry.isvalid.toLowerCase() === 'true' || entry.isvalid === '1') : true;

                        data.push({
                            employeeId: employee.id,
                            typeId: typeId,
                            name: entry.name,
                            number: entry.number,
                            description: entry.description,
                            expirationDate: expirationDate,
                            isValid: isValid,
                        });
                    }
                }
                
                if (data.length === 0) {
                    throw new Error("No valid document data found in the file. Make sure 'name' and 'type' columns are filled correctly and types exist in settings.");
                }

                setParsedData(data);
                setStep('preview');
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    // FIX: The 'err' variable in a catch block is of type 'unknown'. Explicitly convert it to a string before passing to setError.
                    setError(String(err));
                }
                setStep('upload');
                setFileName('');
            }
        };

        reader.onerror = () => {
            setError("Failed to read the file.");
        };

        reader.readAsText(file);
    };

    const handleConfirmImport = () => {
        onImport(parsedData);
        onClose();
    };

    const handleReset = () => {
        setStep('upload');
        setParsedData([]);
        setFileName('');
        setError(null);
    };
    
    const previewFooter = (
        <>
            <button type="button" onClick={handleReset} className="btn-secondary">
                {t('modals.back')}
            </button>
            <button type="button" onClick={handleConfirmImport} className="btn-primary">
                {t('modals.confirmImport')}
            </button>
        </>
    );

    return (
        <Modal isOpen={true} onClose={onClose} title={t('referencing.importFor', {name: employee.name})} footer={step === 'preview' ? previewFooter : undefined}>
            {step === 'upload' && (
                <div className="space-y-4">
                    <div className="p-4 bg-blue-50 dark:bg-slate-800/50 rounded-lg border border-blue-200 dark:border-slate-700">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200">{t('modals.instructions')}</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {t('referencing.importDesc')}
                        </p>
                        <code className="mt-2 block text-xs bg-slate-200 dark:bg-slate-900 p-2 rounded-md font-mono break-all">
                            name,type,number,description,expirationdate,isvalid
                        </code>
                    </div>
                    {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center"><AlertTriangle size={16} className="mr-2"/>{error}</div>}
                    <label
                        htmlFor="csv-upload"
                        className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <Upload className="w-10 h-10 text-slate-400" />
                        <span className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                            {fileName ? t('modals.selectedFile', { fileName }) : t('modals.selectFile')}
                        </span>
                        <input id="csv-upload" type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
                    </label>
                </div>
            )}
            {step === 'preview' && (
                <div className="space-y-4">
                    <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2 flex-shrink-0" />
                        <p className="text-sm text-green-800 dark:text-green-300"
                           dangerouslySetInnerHTML={{ __html: t('referencing.foundDocuments', { count: parsedData.length }) }}
                        >
                        </p>
                    </div>
                    <div className="max-h-64 overflow-y-auto border dark:border-slate-700 rounded-md">
                        <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800">
                                <tr>
                                    <th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300">{t('modals.docName')}</th>
                                    <th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300">{t('modals.docType')}</th>
                                    <th className="p-2 text-left font-semibold text-slate-600 dark:text-slate-300">{t('modals.docExpDate')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {parsedData.map((doc, index) => (
                                    <tr key={index} className="text-slate-700 dark:text-slate-300">
                                        <td className="p-2 truncate">{doc.name}</td>
                                        <td className="p-2 truncate">{documentTypes.find(dt => dt.id === doc.typeId)?.name}</td>
                                        <td className="p-2 truncate">{doc.expirationDate ? new Date(doc.expirationDate).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            <style>{`
                .btn-primary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: white; background-color: #2563eb; transition: background-color 0.2s; }
                .btn-primary:hover { background-color: #1d4ed8; }
                .btn-secondary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; background-color: #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #334155; }
                .btn-secondary:hover { background-color: #cbd5e1; }
                .dark .btn-secondary:hover { background-color: #475569; }
            `}</style>
        </Modal>
    );
};

export default DocumentImportModal;