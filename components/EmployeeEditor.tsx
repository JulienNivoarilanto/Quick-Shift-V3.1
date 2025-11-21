import React, { useState, useEffect, useRef } from 'react';
import { Employee, Role, EmployeeAvailability, WeeklyAvailability, ContractType } from '../types';
import { Trash2, Upload, KeyRound, RefreshCw, AlertTriangle, Eye, Lock } from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import { useLanguage } from '../contexts/LanguageContext';
import AvailabilityEditor from './AvailabilityEditor';
import { useAuth } from '../contexts/AuthContext';
import PasswordConfirmationModal from './PasswordConfirmationModal';

interface EmployeeEditorProps {
    employee: Employee | null;
    roles: Role[];
    onSave: (employee: Employee, isNew: boolean) => void;
    onClose: () => void;
    onDelete?: (employeeId: string) => void;
    employeeAvailability?: EmployeeAvailability;
    onSaveAvailability: (employeeId: string, availability: WeeklyAvailability) => void;
}

const GENDERS: Employee['gender'][] = ['Male', 'Female', 'Other', 'Prefer not to say'];
const STATUSES: Employee['status'][] = ['active', 'inactive', 'suspended'];
const CONTRACT_TYPES: ContractType[] = ['permanent', 'temporary', 'internship', 'volunteer', 'interim', 'apprenticeship', 'professionalization', 'part-time', 'seasonal'];

const generateAccessCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const toInputDateString = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getInitialFormData = (employee: Employee | null, roles: Role[]) => ({
    name: employee?.name || '',
    email: employee?.email || '',
    role: employee?.role || (roles[0]?.name || ''),
    avatarUrl: employee?.avatarUrl || null,
    phone: employee?.phone || '',
    gender: employee?.gender || 'Prefer not to say',
    accessCode: employee?.accessCode || '',
    customId: employee?.customId || '',
    birthDate: employee ? toInputDateString(employee.birthDate) : '',
    address: employee?.address || '',
    status: employee?.status || 'active',
    hiringDate: employee?.hiringDate ? toInputDateString(employee.hiringDate) : '',
    contractType: employee?.contractType || '',
});

const resizeImage = (file: File, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                // Get the data URL from the canvas as a JPEG with quality 0.8
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const EmployeeEditor: React.FC<EmployeeEditorProps> = ({ employee, roles, onSave, onClose, onDelete, employeeAvailability, onSaveAvailability }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [formData, setFormData] = useState(getInitialFormData(employee, roles));
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'availability'>('details');
    
    // Security states
    const [isAccessCodeVisible, setIsAccessCodeVisible] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [pendingAction, setPendingAction] = useState<'reveal' | 'regenerate' | 'delete' | null>(null);


    useEffect(() => {
        const initialData = getInitialFormData(employee, roles);
        // If it's a new employee for a Pro Plus user, generate an access code
        if (!employee && user?.plan === 'Pro Plus') {
            initialData.accessCode = generateAccessCode();
            // Automatically visible for new employees
            setIsAccessCodeVisible(true);
        }
        setFormData(initialData);
    }, [employee, roles, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const resizedDataUrl = await resizeImage(file, 200);
                setFormData({ ...formData, avatarUrl: resizedDataUrl });
            } catch (error) {
                console.error("Image processing failed:", error);
                setError("Failed to process image.");
            }
        }
    };

    const handleSave = () => {
        setError('');
        if (!formData.name || !formData.email || !formData.birthDate) {
            setError(t('modals.errorNameEmailRequired'));
            return;
        }

        const finalEmployee: Employee = {
            id: employee?.id || `new-emp-${Date.now()}`,
            companyId: user!.companyId,
            name: formData.name!,
            email: formData.email!,
            role: formData.role!,
            avatarUrl: formData.avatarUrl || null,
            phone: formData.phone!,
            gender: formData.gender as Employee['gender'],
            birthDate: new Date(formData.birthDate),
            status: formData.status as Employee['status'],
        };

        if (formData.accessCode) finalEmployee.accessCode = formData.accessCode;
        if (formData.customId) finalEmployee.customId = formData.customId;
        if (formData.address) finalEmployee.address = formData.address;
        if (formData.hiringDate) finalEmployee.hiringDate = new Date(formData.hiringDate);
        if (formData.contractType) finalEmployee.contractType = formData.contractType as ContractType;

        onSave(finalEmployee, !employee);
    };

    // Security Handlers
    const initiateDelete = () => {
        setPendingAction('delete');
        setShowPasswordModal(true);
    };

    const initiateReveal = () => {
        if (isAccessCodeVisible) {
            setIsAccessCodeVisible(false);
        } else {
            setPendingAction('reveal');
            setShowPasswordModal(true);
        }
    };

    const initiateRegenerate = () => {
        setPendingAction('regenerate');
        setShowPasswordModal(true);
    };

    const handlePasswordConfirm = () => {
        if (pendingAction === 'delete') {
            if (employee && onDelete) {
                onDelete(employee.id);
            }
        } else if (pendingAction === 'reveal') {
            setIsAccessCodeVisible(true);
        } else if (pendingAction === 'regenerate') {
            const newCode = generateAccessCode();
            setFormData(prev => ({ ...prev, accessCode: newCode }));
            setIsAccessCodeVisible(true); // Ensure it's visible after regeneration
        }
        setPendingAction(null);
        setShowPasswordModal(false);
    };

    const modalFooter = (
        <div className="flex justify-between w-full items-center">
            <div>
                {employee && onDelete && (
                    <button type="button" onClick={initiateDelete} className="btn-danger p-2">
                        <Trash2 size={20} />
                    </button>
                )}
            </div>
            <div className="flex space-x-2">
                <button type="button" onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
                <button type="button" onClick={handleSave} className="btn-primary">{t('modals.saveEmployee')}</button>
            </div>
        </div>
    );
    
    return (
        <>
            <Modal 
                isOpen={true} 
                onClose={onClose} 
                title={employee ? t('modals.editEmployee') : t('modals.addEmployee')} 
                footer={modalFooter}
                size="4xl"
            >
                <div className="flex flex-col">
                    <div className="flex flex-col items-center mb-6">
                        <Avatar name={formData.name || '?'} src={formData.avatarUrl} className="w-28 h-28 rounded-full mb-2"/>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                        <button onClick={handleAvatarClick} className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline">
                            <Upload size={14} className="mr-1"/> {t('modals.uploadPhoto')}
                        </button>
                    </div>
                    
                    <div className="border-b dark:border-slate-700 mb-4">
                        <nav className="flex space-x-4">
                            <button onClick={() => setActiveTab('details')} className={`py-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{t('modals.details')}</button>
                            <button onClick={() => setActiveTab('availability')} className={`py-2 px-1 text-sm font-medium border-b-2 ${activeTab === 'availability' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>{t('modals.availability')}</button>
                        </nav>
                    </div>

                    {error && <p className="mb-4 text-red-600 dark:text-red-400 text-sm bg-red-100 dark:bg-red-900/30 p-3 rounded-lg flex items-center"><AlertTriangle size={16} className="mr-2"/>{error}</p>}

                    {activeTab === 'details' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 max-h-[55vh] overflow-y-auto pr-2">
                            {/* LEFT COLUMN: Detail Information */}
                            <div className="space-y-4">
                                <div><label className="label-style">{t('modals.customIdLabel')}</label><input name="customId" value={formData.customId} onChange={handleChange} className="input-style"/></div>
                                <div><label className="label-style">{t('modals.statusLabel')}</label><select name="status" value={formData.status} onChange={handleChange} className="input-style">{STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</select></div>
                                <div><label className="label-style">{t('modals.hiringDateLabel')}</label><input name="hiringDate" type="date" value={formData.hiringDate} onChange={handleChange} className="input-style"/></div>
                                <div>
                                    <label className="label-style">{t('modals.contractTypeLabel')}</label>
                                    <select name="contractType" value={formData.contractType} onChange={handleChange} className="input-style">
                                        <option value="">-- {t('modals.none')} --</option>
                                        {CONTRACT_TYPES.map(c => <option key={c} value={c}>{t(`contract.${c}`)}</option>)}
                                    </select>
                                </div>
                                <div><label className="label-style">{t('modals.addressLabel')}</label><input type="text" name="address" value={formData.address} onChange={handleChange} className="input-style"/></div>
                                {user?.plan === 'Pro Plus' && (
                                    <div className="pt-2">
                                        <label className="label-style">{t('modals.accessCodeLabel')}</label>
                                        <div className="flex items-center space-x-2">
                                            <div className="relative flex-grow">
                                                <input 
                                                    readOnly 
                                                    type={isAccessCodeVisible ? "text" : "password"}
                                                    value={formData.accessCode || '000000'} 
                                                    className="input-style font-mono tracking-widest bg-slate-100 dark:bg-slate-800 text-center"
                                                />
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={initiateReveal} 
                                                title={isAccessCodeVisible ? "Hide Code" : "Show Code"} 
                                                className="p-2.5 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                                            >
                                                {isAccessCodeVisible ? <Eye size={16}/> : <Lock size={16}/>}
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={initiateRegenerate} 
                                                title={t('modals.regenerateCode')} 
                                                className="p-2.5 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                                                disabled={!isAccessCodeVisible} // Optional: disable regenerate until unlocked
                                            >
                                                <RefreshCw size={16}/>
                                            </button>
                                        </div>
                                        {!isAccessCodeVisible && (
                                            <p className="text-xs text-slate-500 mt-1 flex items-center">
                                                <Lock size={12} className="mr-1"/>
                                                Password required to view or edit.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: Basic Information */}
                            <div className="space-y-4">
                                <div><label className="label-style">{t('modals.nameLabel')}<span className="text-red-500 ml-1">*</span></label><input name="name" value={formData.name} onChange={handleChange} className="input-style"/></div>
                                <div><label className="label-style">{t('modals.emailLabel')}<span className="text-red-500 ml-1">*</span></label><input name="email" type="email" value={formData.email} onChange={handleChange} className="input-style"/></div>
                                <div><label className="label-style">{t('modals.birthDateLabel')}<span className="text-red-500 ml-1">*</span></label><input name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} className="input-style"/></div>
                                <div><label className="label-style">{t('modals.roleLabel')}<span className="text-red-500 ml-1">*</span></label><select name="role" value={formData.role} onChange={handleChange} className="input-style">{roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}</select></div>
                                <div><label className="label-style">{t('modals.phoneLabel')}</label><input name="phone" value={formData.phone} onChange={handleChange} className="input-style"/></div>
                                <div><label className="label-style">{t('modals.genderLabel')}</label><select name="gender" value={formData.gender} onChange={handleChange} className="input-style">{GENDERS.map(g => <option key={g} value={g}>{t(`gender.${g.toLowerCase().replace(/ /g, '').replace(/[^a-zA-Z]/g, '')}`)}</option>)}</select></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'availability' && (
                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                            {employee ? (
                                <AvailabilityEditor employeeId={employee.id} initialAvailability={employeeAvailability?.availability} onSave={onSaveAvailability}/>
                            ) : (
                                <p className="text-sm text-slate-500">{t('availability.saveFirst')}</p>
                            )}
                        </div>
                    )}
                </div>
                <style>{`
                    .label-style { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 500; color: #475569; }
                    .dark .label-style { color: #cbd5e1; }
                    .input-style { display: block; width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; color: #1e293b; }
                    .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                    .input-style:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.4); }
                    .btn-primary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: white; background-color: #2563eb; transition: background-color 0.2s; }
                    .btn-primary:hover { background-color: #1d4ed8; }
                    .btn-secondary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; background-color: #e2e8f0; }
                    .dark .btn-secondary { color: #e2e8f0; background-color: #334155; }
                    .btn-secondary:hover { background-color: #cbd5e1; }
                    .dark .btn-secondary:hover { background-color: #475569; }
                    .btn-danger { padding: 0.625rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #dc2626; background-color: #fee2e2; }
                    .dark .btn-danger { color: #f87171; background-color: rgba(153, 27, 27, 0.4); }
                    .btn-danger:hover { background-color: #fecaca; }
                    .dark .btn-danger:hover { background-color: rgba(153, 27, 27, 0.6); }
                `}</style>
            </Modal>

            {showPasswordModal && (
                <PasswordConfirmationModal
                    isOpen={true}
                    onClose={() => { setShowPasswordModal(false); setPendingAction(null); }}
                    onConfirm={handlePasswordConfirm}
                    title={pendingAction === 'delete' ? t('modals.confirmDelete') : "Security Verification"}
                    description={pendingAction === 'delete' 
                        ? "Please enter your password to confirm deletion of this employee." 
                        : "Please enter your password to view or regenerate the access code."}
                />
            )}
        </>
    );
};

export default EmployeeEditor;