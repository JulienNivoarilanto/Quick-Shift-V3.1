import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, BusinessType, ActivitySector, Subscription, UserRole, UserPermissions, Plan } from '../types';
import Avatar from './Avatar';
import { Edit, Save, Lock, Gem, Building, MapPin, Briefcase, AlertTriangle, CheckCircle, User as UserIcon, HelpCircle, Users, Plus, Trash2, ChevronDown, Eye, EyeOff, Circle, Search, Loader2, Phone, ExternalLink, Info, Check } from 'lucide-react';
import UserGuide from './UserGuide';
import Modal from './Modal';
import { apiCreateStripeCheckoutSession, apiCreateStripePortalSession } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

// #region Helper Components
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
                
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

const Message: React.FC<{ message: { type: string, text: string } }> = ({ message }) => {
    if (!message.text) return null;
    const isSuccess = message.type === 'success';
    const icon = isSuccess ? <CheckCircle size={16} className="mr-2" /> : <AlertTriangle size={16} className="mr-2" />;
    const classes = isSuccess
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

    return (
        <div className={`p-3 rounded-lg text-sm flex items-center ${classes}`}>
            {icon}
            {message.text}
        </div>
    );
};

const InfoItem: React.FC<{ icon: React.ReactNode, label: string, value: React.ReactNode, isEditing?: boolean, name?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void, options?: {value: string, label: string}[] }> = ({ icon, label, value, isEditing, name, onChange, options }) => (
    <div>
        <label htmlFor={name} className="label-style flex items-center">{icon} <span className="ml-2">{label}</span></label>
        {isEditing && name ? (
            options ? (
                 <select id={name} name={name} value={value as string} onChange={onChange} className="input-style">
                    {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            ) : (
                <input id={name} name={name} type="text" value={value as string} onChange={onChange} className="input-style" />
            )
        ) : (
             <div className="input-style !bg-slate-100 dark:!bg-slate-800/50">{value}</div>
        )}
    </div>
);

const PasswordRequirement: React.FC<{ isValid: boolean; text: string }> = ({ isValid, text }) => (
    <li className={`flex items-center text-xs transition-colors ${isValid ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {isValid ? <CheckCircle size={14} className="mr-2 flex-shrink-0" /> : <Circle size={14} className="mr-2 flex-shrink-0" />}
        {text}
    </li>
);
// #endregion

// #region User Editor Modal
interface UserEditorModalProps {
    userToEdit: User | null;
    onClose: () => void;
    onCreateUser: (userData: Omit<User, 'id' | 'companyId' | 'plan' | 'isVerified' | 'password'>, password: string) => Promise<{ success: boolean; error?: string }>;
    onUpdateUser: (user: User) => void; // Now triggers confirmation
    isCompanyOwner: boolean;
    permissions: any;
    allUsers: User[];
}

const UserEditorModal: React.FC<UserEditorModalProps> = ({ userToEdit, onClose, onCreateUser, onUpdateUser, isCompanyOwner, permissions, allUsers }) => {
    const { t } = useLanguage();
    const isNew = !userToEdit;
    const isEditingOwner = userToEdit ? isCompanyOwner : false;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const initialPermissions: UserPermissions = {
        canAccessDashboard: true, canAccessSchedule: true, canAccessSettings: true,
        canAccessEmployees: true, canAccessReferencing: true, canAccessHistory: true, canAccessTimeClock: true
    };

    const [formData, setFormData] = useState({
        name: userToEdit?.name || '',
        email: userToEdit?.email || '',
        password: '',
        confirmPassword: '',
        userRole: userToEdit?.userRole || 'Custom',
        customPermissions: { ...initialPermissions, ...(userToEdit?.customPermissions || {}) },
        phone: userToEdit?.phone || '',
        address: userToEdit?.address || '',
        avatarUrl: userToEdit?.avatarUrl || null,
        functionTitle: userToEdit?.functionTitle || '',
    });
    
    const [passwordValidity, setPasswordValidity] = useState({ length: false, uppercase: false, number: false, special: false });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    
    const validatePassword = (pass: string) => {
        setPasswordValidity({
            length: pass.length >= 8,
            uppercase: /[A-Z]/.test(pass),
            number: /\d/.test(pass),
            special: /[^A-Za-z0-9]/.test(pass),
        });
    };

    const handlePermissionChange = (perm: keyof UserPermissions) => {
        setFormData(prev => ({
            ...prev,
            customPermissions: { ...prev.customPermissions, [perm]: !prev.customPermissions[perm] }
        }));
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const resizedDataUrl = await resizeImage(file, 200);
                setFormData({ ...formData, avatarUrl: resizedDataUrl });
            } catch (err) {
                setError("Failed to process image.");
            }
        }
    };

    const handleSave = async () => {
        setError('');
        setIsProcessing(true);
        if (isNew) {
            if (allUsers.length >= permissions.userLimit) {
                setError(`User limit of ${permissions.userLimit} reached.`);
                setIsProcessing(false);
                return;
            }
            if(passwordValidity && !Object.values(passwordValidity).every(v => v)) {
                setError(t('auth.passwordDoesNotMeetRequirements'));
                setIsProcessing(false);
                return;
            }
            if (formData.password !== formData.confirmPassword) {
                setError(t('auth.passwordMismatch'));
                setIsProcessing(false);
                return;
            }
            
            const result = await onCreateUser({
                name: formData.name,
                email: formData.email,
                businessType: 'Company', // Default for additional users
                companyName: '', // Not needed, will be linked to company
                userRole: formData.userRole as UserRole,
                customPermissions: formData.userRole === 'Custom' ? formData.customPermissions : undefined,
                phone: formData.phone,
                address: formData.address,
                avatarUrl: formData.avatarUrl,
                functionTitle: formData.functionTitle,
            }, formData.password);

            if (!result.success) {
                setError(result.error || 'Failed to create user.');
            } else {
                onClose();
            }
        } else { // Editing
            const updatedUser: User = {
                ...userToEdit!,
                name: formData.name,
                userRole: formData.userRole as UserRole,
                customPermissions: formData.userRole === 'Custom' ? formData.customPermissions : undefined,
                phone: formData.phone,
                address: formData.address,
                avatarUrl: formData.avatarUrl,
                functionTitle: formData.functionTitle,
            };
            onUpdateUser(updatedUser);
            // The confirmation modal will handle closing
        }
        setIsProcessing(false);
    };

    const footer = <><button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} disabled={isProcessing} className="btn-primary w-24 flex justify-center">{isProcessing ? <Loader2 className="animate-spin" /> : t('modals.save')}</button></>;
    const permissionKeys: Array<keyof UserPermissions> = ['canAccessDashboard', 'canAccessSchedule', 'canAccessEmployees', 'canAccessReferencing', 'canAccessSettings', 'canAccessTimeClock', 'canAccessHistory'];
    const title = isNew ? t('profile.userManagement.addUserTitle') : t('profile.userManagement.editUserTitle');

    return (
        <Modal isOpen={true} onClose={onClose} title={title} footer={footer} size="2xl">
            <div className="space-y-4">
                {error && <Message message={{type: 'error', text: error}} />}
                
                <div className="flex flex-col items-center">
                    <Avatar name={formData.name || '?'} src={formData.avatarUrl} className="w-24 h-24 rounded-full mb-2"/>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                        {t('modals.uploadPhoto')}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div><label className="label-style">{t('profile.fullName')}</label><input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input-style"/></div>
                    <div><label className="label-style">{t('profile.userManagement.functionTitle')}</label><input value={formData.functionTitle} onChange={e => setFormData({...formData, functionTitle: e.target.value})} className="input-style"/></div>
                    <div><label className="label-style">{t('auth.emailLabel')}</label><input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} disabled={!isNew} className="input-style disabled:bg-slate-100 dark:disabled:bg-slate-800"/></div>
                    <div><label className="label-style">{t('mobile.phone')}</label><input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-style"/></div>
                    <div className="col-span-2"><label className="label-style">{t('profile.address')}</label><input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="input-style"/></div>
                </div>
                {isNew && (
                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-style">{t('auth.passwordLabel')}</label>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => { setFormData({...formData, password: e.target.value}); validatePassword(e.target.value); }} className="input-style"/>
                                    <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500"><Eye size={16}/></button>
                                </div>
                            </div>
                            <div><label className="label-style">{t('auth.confirmPasswordLabel')}</label><input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="input-style"/></div>
                        </div>
                         <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <PasswordRequirement isValid={passwordValidity.length} text={t('auth.passwordReqLength')} />
                            <PasswordRequirement isValid={passwordValidity.uppercase} text={t('auth.passwordReqUppercase')} />
                            <PasswordRequirement isValid={passwordValidity.number} text={t('auth.passwordReqNumber')} />
                            <PasswordRequirement isValid={passwordValidity.special} text={t('auth.passwordReqSpecial')} />
                        </ul>
                    </div>
                )}
                <div className="pt-4 border-t dark:border-slate-700">
                    <label className="label-style">{t('modals.roleLabel')}</label>
                    {/* FIX: Cast e.target.value to UserRole to satisfy TypeScript type checking. */}
                    <select value={formData.userRole} onChange={e => setFormData({...formData, userRole: e.target.value as UserRole})} disabled={isEditingOwner} className="input-style">
                        <option value="Admin">{t('profile.userManagement.adminRoleLabel')}</option>
                        <option value="Custom">{t('profile.userManagement.customRoleLabel')}</option>
                    </select>
                </div>
                {formData.userRole === 'Custom' && (
                    <div>
                        <label className="label-style">{t('profile.userManagement.permissions')}</label>
                        <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50 dark:bg-slate-800/50 dark:border-slate-700">
                           {permissionKeys.map(perm => {
                                const isDisabledByPlan = (perm === 'canAccessDashboard' && !permissions.canAccessDashboard) || (perm === 'canAccessTimeClock' && !permissions.canAccessTimeClock);
                                const labelText = t(`permissions.${perm.replace('canAccess', '').toLowerCase()}`);
                                return (
                                    <label key={perm} className={`flex items-center space-x-2 p-1 ${isDisabledByPlan ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <input type="checkbox" checked={formData.customPermissions[perm]} onChange={() => handlePermissionChange(perm)} disabled={isDisabledByPlan} className="rounded" />
                                        <span className="text-sm">{labelText}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
// #endregion

// #region Confirmation Modal
interface PasswordConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => Promise<{ success: boolean }>;
    title: string;
    description: string;
}

const PasswordConfirmationModal: React.FC<PasswordConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, description }) => {
    const { t } = useLanguage();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleConfirm = async () => {
        setError('');
        setIsProcessing(true);
        const result = await onConfirm(password);
        if (!result.success) {
            setError(t('profile.userManagement.incorrectPassword'));
        }
        setIsProcessing(false);
    };

    const footer = <>
        <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
        <button onClick={handleConfirm} disabled={isProcessing} className="btn-primary w-28 flex justify-center">{isProcessing ? <Loader2 className="animate-spin" /> : t('modals.confirm')}</button>
    </>;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={footer}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
                {error && <Message message={{type: 'error', text: error}} />}
                <div>
                    <label className="label-style">{t('profile.userManagement.confirmPassword')}</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus className="input-style" />
                </div>
            </div>
        </Modal>
    );
};

// #endregion

// #region Tab Content Components
const MyProfileTab: React.FC = () => {
    const { user, updateUser, isCompanyOwner } = useAuth();
    const { t } = useLanguage();
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({ name: '', phone: '', address: '', avatarUrl: null, functionTitle: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    useEffect(() => {
        if (user) {
            const baseData = {
                name: user.name,
                phone: user.phone || '',
                address: user.address || '',
                avatarUrl: user.avatarUrl || null,
                functionTitle: user.functionTitle || '',
            };
            if (isCompanyOwner) {
                setFormData({
                    ...baseData,
                    companyName: user.companyName,
                    businessType: user.businessType,
                    activitySector: user.activitySector || '',
                });
            } else {
                setFormData(baseData);
            }
        }
    }, [user, isCompanyOwner]);

    if (!user) return null;

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const resizedDataUrl = await resizeImage(file, 200);
                setFormData({ ...formData, avatarUrl: resizedDataUrl });
            } catch (err) {
                 setMessage({ type: 'error', text: "Failed to process image." });
            }
        }
    };

    const handleSave = async () => {
        try {
            const dataToUpdate: Partial<User> = { 
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                avatarUrl: formData.avatarUrl,
                functionTitle: formData.functionTitle,
            };
            if (isCompanyOwner) {
                dataToUpdate.companyName = formData.companyName;
                dataToUpdate.businessType = formData.businessType;
                dataToUpdate.activitySector = formData.activitySector;
            }
            await updateUser(dataToUpdate);
            setIsEditing(false);
            setMessage({ type: 'success', text: t('profile.updateSuccess') });
        } catch (error) {
            setMessage({ type: 'error', text: t('profile.updateError') });
        }
    };
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const businessTypeOptions = [{value: 'Company', label: t('auth.businessTypeCompany')}, {value: 'Individual', label: t('auth.businessTypeIndividual')}, {value: 'Other', label: t('auth.businessTypeOther')}];
    const activitySectorOptions = [{value: '', label: '--'}, {value: 'Health', label: t('auth.activitySectorHealth')}, {value: 'Technology', label: t('auth.activitySectorTechnology')}, {value: 'Administration', label: t('auth.activitySectorAdministration')}, {value: 'Finance', label: t('auth.activitySectorFinance')}, {value: 'Commerce', label: t('auth.activitySectorCommerce')}, {value: 'Social', label: t('auth.activitySectorSocial')}, {value: 'Other', label: t('auth.activitySectorOther')}];


    return (
        <div className="space-y-6">
            <header className="p-6 bg-slate-50 dark:bg-slate-950/50 rounded-2xl flex flex-col md:flex-row items-center gap-6">
                <div className="relative group">
                    <Avatar name={formData.name || user.name} src={formData.avatarUrl} className="w-24 h-24 rounded-full" />
                     {isEditing && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={t('modals.uploadPhoto')}
                        >
                            <Edit size={24} />
                        </button>
                    )}
                </div>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden"/>

                <div className="text-center md:text-left flex-grow">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user.name}</h2>
                    <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
                    <div className="flex items-center justify-center md:justify-start mt-2">
                        <Gem size={14} className="text-yellow-400 mr-1.5" />
                        <p className="text-sm font-bold text-yellow-500">{user.plan}</p>
                    </div>
                </div>
                 {isEditing ? (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="btn-secondary">{t('modals.cancel')}</button>
                        <button onClick={handleSave} className="btn-primary flex items-center"><Save size={16} className="mr-2"/> {t('profile.saveChanges')}</button>
                    </div>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="btn-secondary flex items-center"><Edit size={16} className="mr-2"/> {t('profile.edit')}</button>
                )}
            </header>
            <Message message={message} />
            <div className="space-y-4">
                <InfoItem icon={<UserIcon size={18} />} label={t('profile.fullName')} name="name" value={formData.name} isEditing={isEditing} onChange={handleChange} />
                <InfoItem icon={<Briefcase size={18} />} label={t('profile.userManagement.functionTitle')} name="functionTitle" value={formData.functionTitle} isEditing={isEditing} onChange={handleChange} />
                
                {isEditing && (
                     <>
                        <InfoItem icon={<Phone size={18} />} label={t('mobile.phone')} name="phone" value={formData.phone} isEditing={isEditing} onChange={handleChange} />
                        <InfoItem icon={<MapPin size={18} />} label={t('profile.address')} name="address" value={formData.address} isEditing={isEditing} onChange={handleChange} />
                    </>
                )}

                {isCompanyOwner && (
                    <>
                        <InfoItem icon={<Building size={18} />} label={t('profile.companyName')} name="companyName" value={formData.companyName} isEditing={isEditing} onChange={handleChange} />
                        <InfoItem icon={<Briefcase size={18} />} label={t('profile.businessType')} name="businessType" value={formData.businessType} isEditing={isEditing} onChange={handleChange} options={businessTypeOptions} />
                        <InfoItem icon={<Briefcase size={18} />} label={t('profile.activitySector')} name="activitySector" value={formData.activitySector} isEditing={isEditing} onChange={handleChange} options={activitySectorOptions} />
                    </>
                )}
            </div>
            <PasswordChangeSection />
        </div>
    );
};

const PasswordChangeSection: React.FC = () => {
    const { changePassword } = useAuth();
    const { t } = useLanguage();
    const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [passwordValidity, setPasswordValidity] = useState({ length: false, uppercase: false, number: false, special: false });

    const validatePassword = (pass: string) => {
        setPasswordValidity({
            length: pass.length >= 8,
            uppercase: /[A-Z]/.test(pass),
            number: /\d/.test(pass),
            special: /[^A-Za-z0-9]/.test(pass),
        });
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswords(prev => ({...prev, [e.target.name]: e.target.value}));
        if(e.target.name === 'newPassword') {
            validatePassword(e.target.value);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmNewPassword) {
            setMessage({ type: 'error', text: t('profile.passwordMismatchError') });
            return;
        }
        if(!Object.values(passwordValidity).every(v => v)) {
            setMessage({ type: 'error', text: t('auth.passwordDoesNotMeetRequirements') });
            return;
        }

        const result = await changePassword(passwords.currentPassword, passwords.newPassword);
        setMessage({ type: result.success ? 'success' : 'error', text: t(result.messageKey) });
        if(result.success) {
            setPasswords({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        }
    };
    
    return (
        <div className="pt-6 mt-6 border-t dark:border-slate-800">
            <h3 className="text-lg font-bold mb-4">{t('profile.changePassword')}</h3>
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
                <Message message={message} />
                <div><label className="label-style">{t('profile.currentPassword')}</label><input type="password" name="currentPassword" value={passwords.currentPassword} onChange={handleChange} className="input-style" /></div>
                <div><label className="label-style">{t('profile.newPassword')}</label><input type="password" name="newPassword" value={passwords.newPassword} onChange={handleChange} className="input-style" /></div>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                    <PasswordRequirement isValid={passwordValidity.length} text={t('auth.passwordReqLength')} />
                    <PasswordRequirement isValid={passwordValidity.uppercase} text={t('auth.passwordReqUppercase')} />
                    <PasswordRequirement isValid={passwordValidity.number} text={t('auth.passwordReqNumber')} />
                    <PasswordRequirement isValid={passwordValidity.special} text={t('auth.passwordReqSpecial')} />
                </ul>
                <div><label className="label-style">{t('profile.confirmNewPassword')}</label><input type="password" name="confirmNewPassword" value={passwords.confirmNewPassword} onChange={handleChange} className="input-style" /></div>
                <button type="submit" className="btn-primary">{t('profile.updatePassword')}</button>
            </form>
        </div>
    );
};

const UserManagementTab: React.FC<{
    allUsers: User[];
    permissions: any;
    isCompanyOwner: boolean;
    setEditorModal: (state: {isOpen: boolean, user: User | null}) => void;
    onDeleteUser: (user: User) => void;
}> = ({ allUsers, permissions, isCompanyOwner, setEditorModal, onDeleteUser }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const userLimitReached = allUsers.length >= permissions.userLimit;
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredUsers = useMemo(() => {
        if (!searchTerm) return allUsers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return allUsers.filter(user =>
            user.name.toLowerCase().includes(lowercasedFilter) ||
            user.email.toLowerCase().includes(lowercasedFilter)
        );
    }, [allUsers, searchTerm]);


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold">{t('profile.userManagement.subtitle')}</h3>
                    <p className="text-sm text-slate-500">
                        {allUsers.length} / {permissions.userLimit} {t('settings.usersCount')}
                    </p>
                </div>
                <button
                    onClick={() => setEditorModal({isOpen: true, user: null})}
                    disabled={userLimitReached}
                    className="bg-blue-600 text-white hover:bg-blue-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0 disabled:bg-slate-400"
                    title={userLimitReached ? `User limit of ${permissions.userLimit} reached` : t('profile.userManagement.addUser')}
                >
                    <Plus size={20} />
                </button>
            </div>
            <div className="relative">
                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder={t('profile.userManagement.searchPlaceholder')} className="input-style w-full pl-10" />
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            <div className="space-y-2">
                {filteredUsers.map(u => {
                    const isOwner = u.id === user?.id && isCompanyOwner;
                    return (
                        <div key={u.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                            <div className="flex items-center">
                                <Avatar name={u.name} src={u.avatarUrl} className="w-10 h-10 rounded-full" />
                                <div className="ml-3">
                                    <p className="font-semibold text-slate-800 dark:text-slate-100">
                                        {u.name}
                                        {u.functionTitle && <span className="text-sm font-normal text-slate-500 dark:text-slate-400"> - {u.functionTitle}</span>}
                                        {isOwner && <span className="text-xs text-yellow-500 ml-2">({t('profile.userManagement.owner')})</span>}
                                    </p>
                                    <p className="text-sm text-slate-500">{u.email}</p>
                                    {u.phone && <p className="text-xs text-slate-400 mt-0.5">{u.phone}</p>}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-full">{u.userRole}</span>
                                <button onClick={() => setEditorModal({isOpen: true, user: u})} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full"><Edit size={16}/></button>
                                <button onClick={() => onDeleteUser(u)} disabled={isOwner} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full disabled:text-slate-400 disabled:hover:bg-transparent"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    )
};

const SubscriptionTab: React.FC = () => {
    const { user, subscription, isCompanyOwner } = useAuth();
    const { t } = useLanguage();
    const { formatCurrency } = useCurrency();
    const [isRedirecting, setIsRedirecting] = useState<string | null>(null);
    const [detailsModalPlan, setDetailsModalPlan] = useState<Plan | null>(null);

    if (!user) return null;
    
    const handleStripeAction = async (type: 'checkout' | 'portal', plan?: 'Pro' | 'Pro Plus') => {
        const message = type === 'checkout' ? t('profile.redirectingToCheckout') : t('profile.redirectingToPortal');
        setIsRedirecting(message);

        try {
            if (type === 'portal' && user) {
                await apiCreateStripePortalSession(user.id, user.email);
            } else if (type === 'checkout' && plan && user) {
                await apiCreateStripeCheckoutSession({ userId: user.id, plan, email: user.email });
            }
        } catch (error) {
            console.error(`Failed to create Stripe ${type} session`, error);
            alert(`Could not redirect to ${type}. Please try again.`);
            setIsRedirecting(null);
        }
    };
    
    const handlePlanSelect = (plan: Plan) => {
        if (plan === 'Gratuit') return;
        if (plan === 'Pro' || plan === 'Pro Plus') {
            handleStripeAction('checkout', plan);
        }
    };

    const planDetails: { [key in Plan]: { key: string; isFeatured: boolean; featureCount: number } } = {
        'Gratuit': { key: 'freePlan', isFeatured: false, featureCount: 7 },
        'Pro': { key: 'proPlan', isFeatured: true, featureCount: 9 },
        'Pro Plus': { key: 'proPlusPlan', isFeatured: false, featureCount: 13 },
    };

    const PlanDetailsModal: React.FC<{ planName: Plan; onClose: () => void }> = ({ planName, onClose }) => {
        const planInfo = planDetails[planName];
        const features = Array.from({ length: planInfo.featureCount }, (_, i) => t(`pricing.${planInfo.key}Feature${i + 1}`));
        const planTitle = t(`pricing.${planInfo.key}Name`);
        const planDescription = t(`pricing.${planInfo.key}Desc`);

        return (
            <Modal isOpen={true} onClose={onClose} title={planTitle}>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{planDescription}</p>
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-start">
                            <Check className="w-5 h-5 mr-3 flex-shrink-0 text-green-500" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </Modal>
        );
    };

    if (isRedirecting) {
        return (
            <div className="flex flex-col items-center justify-center p-8">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="mt-4 text-slate-600 dark:text-slate-400">{isRedirecting}</p>
            </div>
        );
    }
    
    const StatusBadge: React.FC<{ status: Subscription['status'] }> = ({ status }) => {
        const styles = { active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300', canceled: 'bg-gray-100 dark:bg-gray-700', past_due: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status]}`}>{t(`subscription.${status.replace('_','')}`)}</span>;
    };


    if (user.plan === 'Gratuit') {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <h4 className="text-lg font-bold">{t('profile.upgradePlan')}</h4>
                    <p className="text-sm text-slate-500 mt-1 max-w-2xl mx-auto">{t('profile.upgradeToProDesc')}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {(['Pro', 'Pro Plus'] as Plan[]).map(planName => {
                        const plan = planDetails[planName];
                        const price = Number(t(`pricing.${plan.key}Price`));
                        return (
                            <div
                                key={plan.key}
                                className={`rounded-xl p-6 border transition-transform duration-300 flex flex-col ${
                                    plan.isFeatured 
                                    ? 'bg-blue-night-900 text-white border-blue-700 dark:border-blue-night-700 scale-105 shadow-xl' 
                                    : 'bg-white dark:bg-blue-night-900 border-gray-200 dark:border-blue-night-800 hover:scale-105'
                                }`}
                            >
                                <div className="flex-grow">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-xl font-bold">{t(`pricing.${plan.key}Name`)}</h3>
                                        <button onClick={() => setDetailsModalPlan(planName)} className="p-1 rounded-full hover:bg-white/10 dark:hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title={t('modals.details')}>
                                            <Info size={18} />
                                        </button>
                                    </div>
                                    <p className="mt-4 text-4xl font-extrabold">
                                        {formatCurrency(price)}
                                        <span className="text-base font-medium">{t('pricing.perMonth')}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => handlePlanSelect(planName)}
                                    className={`w-full mt-6 py-2 px-4 rounded-lg font-semibold transition-colors duration-300 ${
                                        plan.isFeatured
                                        ? 'bg-white text-blue-600 hover:bg-gray-200 dark:text-blue-night-900 dark:hover:bg-blue-night-200'
                                        : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-night-200 dark:text-blue-night-900 dark:hover:bg-blue-night-300'
                                    }`}
                                >
                                    {t('pricing.choosePlan')}
                                </button>
                            </div>
                        );
                    })}
                </div>
                
                {detailsModalPlan && (
                    <PlanDetailsModal 
                        planName={detailsModalPlan} 
                        onClose={() => setDetailsModalPlan(null)} 
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{t('profile.currentPlanStatus')}</h4>
            {subscription ? (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.currentPlan')}</span><span className="font-semibold">{subscription.plan}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.status')}</span><StatusBadge status={subscription.status} /></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.nextPayment')}</span><span className="font-semibold">{new Date(subscription.nextPaymentDate).toLocaleDateString()}</span></div>
                </div>
            ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg space-y-3">
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.currentPlan')}</span><span className="font-semibold">{user.plan}</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.status')}</span><span>-</span></div>
                    <div className="flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{t('profile.nextPayment')}</span><span>-</span></div>
                </div>
            )}
            <p className="text-sm text-slate-600 dark:text-slate-400">{t('profile.manageSubscriptionDesc')}</p>
            <button 
                onClick={() => handleStripeAction('portal')} 
                disabled={!isCompanyOwner} 
                className="w-full btn-primary flex items-center justify-center disabled:bg-slate-400 disabled:cursor-not-allowed"
                title={!isCompanyOwner ? t('profile.ownerCanManage') : ""}
            >
                <ExternalLink size={16} className="mr-2" />
                {t('profile.manageSubscription')}
            </button>
             {!isCompanyOwner && <p className="text-xs text-center text-slate-500 dark:text-slate-400">{t('profile.ownerCanManage')}</p>}
        </div>
    );
};
// #endregion

// #region Main Profile Component
interface ProfileProps {
    allUsers: User[];
    onCreateUser: (userData: any, password: string) => Promise<{success: boolean, error?: string}>;
    onUpdateUser: (user: User) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
}

const Profile: React.FC<ProfileProps> = ({ allUsers, onCreateUser, onUpdateUser, onDeleteUser }) => {
    const { t } = useLanguage();
    const { user, permissions, isCompanyOwner, reauthenticate } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [editorModal, setEditorModal] = useState<{isOpen: boolean, user: User | null}>({isOpen: false, user: null});
    const [confirmState, setConfirmState] = useState<{isOpen: boolean; action: (() => void) | null}>({isOpen: false, action: null});


    const openConfirmModal = (action: () => void) => {
        setConfirmState({ isOpen: true, action });
    };

    const handleConfirmAction = async (password: string) => {
        const result = await reauthenticate(password);
        if (result.success && confirmState.action) {
            confirmState.action();
            setConfirmState({ isOpen: false, action: null });
        }
        return result;
    };

    const handleUpdateUserWithConfirm = (userToUpdate: User) => {
        openConfirmModal(() => {
            onUpdateUser(userToUpdate);
            setEditorModal({isOpen: false, user: null});
        });
    };
    
    const handleDeleteUserWithConfirm = (userToDelete: User) => {
         openConfirmModal(() => onDeleteUser(userToDelete.id));
    };

    const navItems = [
        { id: 'profile', label: t('profile.myProfile'), icon: <UserIcon size={20} />, visible: true },
        { id: 'users', label: t('profile.userManagement.subtitle'), icon: <Users size={20} />, visible: permissions.canManageUsers },
        { id: 'subscription', label: t('profile.yourPlan'), icon: <Gem size={20} />, visible: true },
        { id: 'resource', label: t('profile.resources'), icon: <HelpCircle size={20} />, visible: true },
    ].filter(item => item.visible);

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return <MyProfileTab />;
            case 'users':
                return <UserManagementTab allUsers={allUsers} permissions={permissions} isCompanyOwner={isCompanyOwner} setEditorModal={setEditorModal} onDeleteUser={handleDeleteUserWithConfirm} />;
            case 'subscription':
                return <SubscriptionTab />;
            case 'resource':
                return <UserGuide />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-6xl mx-auto animate-slide-in-up">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('profile.title')}</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1">{t('profile.description')}</p>
            </header>
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <aside className="w-full md:w-64 flex-shrink-0">
                    <nav className="flex flex-row md:flex-col gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl shadow-md">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-lg text-sm font-semibold transition-colors duration-200 text-left ${activeTab === item.id ? 'bg-blue-600 text-white shadow' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                {item.icon}
                                <span className="ml-3 flex-1 text-center md:text-left">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-grow w-full bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md">
                    {renderContent()}
                </main>
            </div>

            {editorModal.isOpen && (
                <UserEditorModal
                    userToEdit={editorModal.user}
                    onClose={() => setEditorModal({isOpen: false, user: null})}
                    onCreateUser={onCreateUser}
                    onUpdateUser={handleUpdateUserWithConfirm}
                    isCompanyOwner={!!(editorModal.user && editorModal.user.id === user?.id && isCompanyOwner)}
                    permissions={permissions}
                    allUsers={allUsers}
                />
            )}

            {confirmState.isOpen && (
                <PasswordConfirmationModal
                    isOpen={true}
                    onClose={() => setConfirmState({isOpen: false, action: null})}
                    onConfirm={handleConfirmAction}
                    title={t('profile.userManagement.confirmActionTitle')}
                    description={t('profile.userManagement.confirmActionDescription')}
                />
            )}

             <style>{`
                .label-style { display: block; margin-bottom: 0.25rem; font-size: 0.75rem; line-height: 1rem; font-weight: 500; color: #64748b; }
                .dark .label-style { color: #94a3b8; }
                .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; color: #1e293b; }
                .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                .input-style:disabled { background-color: #f1f5f9; cursor: not-allowed; }
                .dark .input-style:disabled { background-color: #334155; }
                .btn-primary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: white; background-color: #2563eb; transition: background-color 0.2s; }
                .btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
                .btn-secondary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: #334155; background-color: #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #334155; }
                .btn-secondary:hover { background-color: #cbd5e1; }
                .dark .btn-secondary:hover { background-color: #475569; }
                .btn-danger { padding: 0.625rem 1rem; border-radius: 0.5rem; font-size: 0.875rem; font-weight: 600; color: white; background-color: #dc2626; }
            `}</style>
        </div>
    );
};
// #endregion

export default Profile;