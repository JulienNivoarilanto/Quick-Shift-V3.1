import React, { useState } from 'react';
import { Role, Employee, Location, Shift, Department, AbsenceType, Absence, SpecialDayType, SpecialDay, DocumentType, EmployeeDocument } from '../types';
import { PlusCircle, Edit, Trash2, Users, MapPin, Briefcase, UserMinus, CalendarDays, Lightbulb, Search, Gem, Loader2, Radar, FileText, Info } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import Modal from './Modal';
import FeatureTour, { TourStep } from './FeatureTour';
import { useAuth } from '../contexts/AuthContext';

// Props Interface
interface SettingsProps {
    roles: Role[];
    employees: Employee[];
    locations: Location[];
    shifts: Shift[];
    departments: Department[];
    absenceTypes: AbsenceType[];
    absences: Absence[];
    specialDayTypes: SpecialDayType[];
    specialDays: SpecialDay[];
    documentTypes: DocumentType[];
    employeeDocuments: EmployeeDocument[];
    onAddRole: (name: string) => void;
    onUpdateRole: (id: string, name: string) => void;
    onDeleteRole: (id: string) => void;
    onAddLocation: (name: string, address?: string, latitude?: number, longitude?: number, radius?: number, isGeofencingEnabled?: boolean) => void;
    onUpdateLocation: (id: string, name: string, address?: string | null, latitude?: number | null, longitude?: number | null, radius?: number | null, isGeofencingEnabled?: boolean) => void;
    onDeleteLocation: (id: string) => void;
    onAddDepartment: (name: string) => void;
    onUpdateDepartment: (id: string, name: string) => void;
    onDeleteDepartment: (id: string) => void;
    onAddAbsenceType: (name: string, color: string) => void;
    onUpdateAbsenceType: (id: string, name: string, color: string) => void;
    onDeleteAbsenceType: (id: string) => void;
    onAddSpecialDayType: (name: string, isHoliday: boolean) => void;
    onUpdateSpecialDayType: (id: string, name: string, isHoliday: boolean) => void;
    onDeleteSpecialDayType: (id: string) => void;
    onAddDocumentType: (name: string, isUnique: boolean) => void;
    onUpdateDocumentType: (id: string, name: string, isUnique: boolean) => void;
    onDeleteDocumentType: (id: string) => void;
}

// #region Helper & Panel Components
const SettingsPanel: React.FC<{ title: string; description: string; buttonText: string; onAdd: () => void; children: React.ReactNode; 'data-tour-id'?: string; }> = ({ title, description, buttonText, onAdd, children, ...props }) => (
    <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl shadow-md animate-slide-in-up">
        <div className="flex justify-between items-start mb-4 pb-4 border-b dark:border-slate-800">
            <div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            </div>
            <button 
                onClick={onAdd} 
                className="flex-shrink-0 p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-900"
                data-tour-id={props['data-tour-id']}
                title={buttonText}
                aria-label={buttonText}
            >
                <PlusCircle size={20} />
            </button>
        </div>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">{children}</div>
    </div>
);

const InfoListItem: React.FC<{
    onEdit: () => void;
    onDelete: () => void;
    mainText: string;
    subText?: string;
    usageCount: number;
    usageLabel: string;
    colorIndicator?: string;
    'data-tour-id'?: string;
    statusIndicator?: React.ReactNode;
    toggle?: {
        on: boolean;
        onToggle: () => void;
        disabled: boolean;
        title: string;
    };
}> = ({ onEdit, onDelete, mainText, subText, usageCount, usageLabel, colorIndicator, statusIndicator, toggle, ...props }) => (
    <div className="flex justify-between items-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg group" data-tour-id={props['data-tour-id']}>
        <div className="flex items-center flex-grow truncate mr-4">
            {colorIndicator && <span className="w-4 h-4 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: colorIndicator }}></span>}
            <div className="truncate">
                <p className="font-medium truncate text-slate-700 dark:text-slate-200">{mainText}</p>
                {subText && <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{subText}</p>}
            </div>
        </div>
        <div className="flex items-center flex-shrink-0">
             <span className="mr-4 text-sm bg-slate-200 dark:bg-slate-950/50 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full whitespace-nowrap">{usageCount} {usageLabel}</span>
            {statusIndicator}
            {toggle && (
                <div className="mx-2" title={toggle.title}>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={toggle.on}
                        onClick={(e) => { e.stopPropagation(); if (!toggle.disabled) toggle.onToggle(); }}
                        disabled={toggle.disabled}
                        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${toggle.on ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span
                            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${toggle.on ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                    </button>
                </div>
            )}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button onClick={onEdit} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"><Edit size={16} /></button>
                <button onClick={onDelete} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 size={16} /></button>
            </div>
        </div>
    </div>
);
// #endregion

// #region Settings Panels
const RoleSettingsPanel: React.FC<Pick<SettingsProps, 'roles' | 'employees' | 'onAddRole' | 'onUpdateRole' | 'onDeleteRole'>> = ({ roles, employees, onAddRole, onUpdateRole, onDeleteRole }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<{ isOpen: boolean; role: Role | null }>({ isOpen: false, role: null });
    const [roleName, setRoleName] = useState('');

    const openModal = (role: Role | null = null) => { setModalState({ isOpen: true, role }); setRoleName(role ? role.name : ''); };
    const closeModal = () => setModalState({ isOpen: false, role: null });

    const handleSave = () => {
        if (!roleName.trim()) return;
        modalState.role ? onUpdateRole(modalState.role.id, roleName.trim()) : onAddRole(roleName.trim());
        closeModal();
    };
    const countEmployeesInRole = (roleName: string) => employees.filter(e => e.role === roleName).length;
    
    const footer = ( <> <button onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel data-tour-id="settings-add-item" title={t('settings.manageRoles')} description={t('settings.rolesDescription')} buttonText={t('settings.addRole')} onAdd={() => openModal()}>
            {roles.map((role, index) => (
                <InfoListItem 
                    key={role.id} 
                    mainText={role.name} 
                    usageCount={countEmployeesInRole(role.name)} 
                    usageLabel={t('settings.usersCount')} 
                    onEdit={() => openModal(role)} 
                    onDelete={() => { if (window.confirm(t('modals.confirmDeleteRole', { name: role.name }))) { onDeleteRole(role.id); }}}
                    data-tour-id={index === 0 ? "settings-hover-item" : undefined}
                />
            ))}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.role ? t('settings.editRole') : t('settings.addRole')} footer={footer} size="md">
                <div className="space-y-2">
                    <label className="label-style">{t('settings.roleName')}</label>
                    <input type="text" value={roleName} onChange={(e) => setRoleName(e.target.value)} placeholder={t('settings.newRolePlaceholder')} className="input-style"/>
                </div>
            </Modal>
        </SettingsPanel>
    );
};

const LocationSettingsPanel: React.FC<Pick<SettingsProps, 'locations' | 'shifts' | 'onAddLocation' | 'onUpdateLocation' | 'onDeleteLocation'>> = ({ locations, shifts, onAddLocation, onUpdateLocation, onDeleteLocation }) => {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [modalState, setModalState] = useState<{ isOpen: boolean; loc: Location | null }>({ isOpen: false, loc: null });
    const [locData, setLocData] = useState({ name: '', address: '', latitude: undefined as number | undefined | null, longitude: undefined as number | undefined | null, radius: undefined as number | undefined | null, isGeofencingEnabled: false });
    const [isSearching, setIsSearching] = useState(false);

    const openModal = (loc: Location | null = null) => { 
        setModalState({ isOpen: true, loc }); 
        setLocData(loc ? { 
            name: loc.name, 
            address: loc.address || '',
            latitude: loc.latitude,
            longitude: loc.longitude,
            radius: loc.radius,
            isGeofencingEnabled: !!loc.isGeofencingEnabled
        } : { name: '', address: '', latitude: undefined, longitude: undefined, radius: undefined, isGeofencingEnabled: false }); 
    };
    const closeModal = () => {
        setModalState({ isOpen: false, loc: null });
        setLocData({ name: '', address: '', latitude: undefined, longitude: undefined, radius: undefined, isGeofencingEnabled: false });
    };

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocData(d => ({
            ...d,
            address: e.target.value,
            latitude: undefined,
            longitude: undefined,
            radius: undefined,
            isGeofencingEnabled: false,
        }));
    };

    const handleSearchAddress = async () => {
        if (!locData.address?.trim()) return;
        setIsSearching(true);
        // This is a placeholder key. In a real application, this should be stored securely as an environment variable.
        const apiKey = (import.meta as any).env.VITE_APP_LOCATIONIQ_API_KEY || 'pk.YOUR_LOCATIONIQ_API_KEY';
        if (apiKey.includes('YOUR_LOCATIONIQ_API_KEY')) {
            alert('Please configure the LocationIQ API key to use the address search feature.');
            setIsSearching(false);
            return;
        }

        try {
            const response = await fetch(`https://us1.locationiq.com/v1/search.php?key=${apiKey}&q=${encodeURIComponent(locData.address)}&format=json&addressdetails=1`);
            if (!response.ok) throw new Error('Network response was not ok.');
            const data = await response.json();

            if (data && data.length > 0) {
                const firstResult = data[0];
                const addressDetails = firstResult.address;
                
                const streetPart = [addressDetails.house_number, addressDetails.road].filter(Boolean).join(' ');

                const newAddress = [
                    streetPart,
                    addressDetails.city,
                    addressDetails.state,
                    addressDetails.country
                ].filter(Boolean).join(', ');
                
                setLocData(d => ({
                    ...d,
                    address: newAddress,
                    latitude: parseFloat(firstResult.lat),
                    longitude: parseFloat(firstResult.lon),
                }));
            } else {
                alert("Address not found.");
            }
        } catch (error) {
            console.error("Address search failed:", error);
            alert("Failed to search for address.");
        } finally {
            setIsSearching(false);
        }
    };
    
    const handleSave = () => {
        if (!locData.name.trim()) return;
        
        if (modalState.loc) { // Updating existing location
            const radiusAsNumber = locData.radius ? Number(locData.radius) : null;
            const isGeofencedSetup = !!(locData.latitude && locData.longitude && radiusAsNumber && radiusAsNumber > 0);
            const finalIsGeofencingEnabled = isGeofencedSetup ? locData.isGeofencingEnabled : false;
            
            onUpdateLocation(
                modalState.loc.id,
                locData.name.trim(),
                locData.address?.trim() || null,
                locData.latitude ?? null,
                locData.longitude ?? null,
                radiusAsNumber,
                finalIsGeofencingEnabled
            );
        } else { // Adding new location
            const radiusAsNumberForAdd = locData.radius ? Number(locData.radius) : undefined;
            onAddLocation(
                locData.name.trim(), 
                locData.address?.trim() || undefined, 
                locData.latitude ?? undefined, 
                locData.longitude ?? undefined, 
                radiusAsNumberForAdd, 
                false
            );
        }
        closeModal();
    };
    const countShiftsAtLocation = (locId: string) => shifts.filter(s => s.locationId === locId).length;
    
    const footer = ( <> <button type="button" onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button type="button" onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel title={t('settings.manageLocations')} description={t('settings.locationsDescription')} buttonText={t('settings.addLocation')} onAdd={() => openModal()}>
            {locations.map(loc => {
                const isProPlus = user?.plan === 'Pro Plus';
                const isGeofencedSetup = !!(loc.latitude && loc.longitude && loc.radius && loc.radius > 0);

                const geofenceIndicator = isProPlus && isGeofencedSetup ? (
                    <div className="flex items-center text-green-600 dark:text-green-400 mx-2" title={t('settings.geofenced')}>
                        <Radar size={18} />
                    </div>
                ) : null;

                const handleToggle = () => {
                    onUpdateLocation(
                        loc.id,
                        loc.name,
                        loc.address,
                        loc.latitude,
                        loc.longitude,
                        loc.radius,
                        !loc.isGeofencingEnabled
                    );
                };

                return (
                    <InfoListItem 
                        key={loc.id} 
                        mainText={loc.name} 
                        subText={loc.address || undefined} 
                        usageCount={countShiftsAtLocation(loc.id)} 
                        usageLabel={t('settings.shiftsCount')} 
                        onEdit={() => openModal(loc)} 
                        onDelete={() => { if (window.confirm(t('modals.confirmDeleteLocation', { name: loc.name }))) { onDeleteLocation(loc.id); }}}
                        statusIndicator={geofenceIndicator}
                        {...(isProPlus && {
                            toggle: {
                                on: !!loc.isGeofencingEnabled,
                                onToggle: handleToggle,
                                disabled: !isGeofencedSetup,
                                title: t('settings.enableGeofencing')
                            }
                        })}
                    />
                );
            })}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.loc ? t('settings.editLocation') : t('settings.addLocation')} footer={footer} size="lg">
                 <div className="space-y-4">
                    <div>
                        <label className="label-style">{t('settings.locationName')}</label>
                        <input type="text" value={locData.name} onChange={(e) => setLocData(d => ({ ...d, name: e.target.value }))} className="input-style"/>
                    </div>
                    
                    {user?.plan === 'Pro Plus' ? (
                        <div className="p-4 bg-blue-50 dark:bg-slate-800/50 rounded-lg border border-blue-200 dark:border-slate-700 space-y-4">
                            <div className="flex items-start">
                                <Gem size={20} className="text-yellow-500 mr-3 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Geofencing for Time Clock</h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                        To enable geofencing, search for an address to get its coordinates, then set a clock-in radius. Staff will only be able to clock in/out within this radius.
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="label-style">{t('settings.locationAddress')}</label>
                                <div className="flex items-center space-x-2">
                                    <input type="text" value={locData.address} onChange={handleAddressChange} className="input-style flex-grow"/>
                                    <button type="button" onClick={handleSearchAddress} disabled={isSearching} className="p-2.5 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors">
                                        {isSearching ? <Loader2 size={16} className="animate-spin"/> : <Search size={16} />}
                                    </button>
                                </div>
                                {(locData.latitude && locData.longitude) && (
                                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Coordinates found: {locData.latitude.toFixed(4)}, {locData.longitude.toFixed(4)}</p>
                                )}
                            </div>
                            {locData.latitude && locData.longitude && (
                                <div className="mt-2">
                                    <img
                                        src={`https://maps.locationiq.com/v3/staticmap?key=${(import.meta as any).env.VITE_APP_LOCATIONIQ_API_KEY}&center=${locData.latitude},${locData.longitude}&zoom=15&size=600x250&format=jpg&markers=icon:large-red-cutout|${locData.latitude},${locData.longitude}`}
                                        alt="Map preview of the selected address"
                                        className="w-full h-auto rounded-lg border dark:border-slate-700"
                                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; console.error('Failed to load map image.'); }}
                                    />
                                </div>
                            )}
                            <div>
                                <label className="label-style">Clock-in Radius (in meters)</label>
                                <input 
                                    type="number" 
                                    value={locData.radius || ''} 
                                    onChange={(e) => {
                                        const newRadius = e.target.value ? parseInt(e.target.value) : undefined;
                                        setLocData(d => ({ 
                                            ...d, 
                                            radius: newRadius,
                                            isGeofencingEnabled: newRadius ? d.isGeofencingEnabled : false
                                        }))
                                    }} 
                                    placeholder="e.g., 100" 
                                    className="input-style"
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="label-style">{t('settings.locationAddress')}</label>
                            <input type="text" value={locData.address || ''} onChange={(e) => setLocData(d => ({ ...d, address: e.target.value }))} className="input-style"/>
                        </div>
                    )}
                </div>
            </Modal>
        </SettingsPanel>
    );
};

const DepartmentSettingsPanel: React.FC<Pick<SettingsProps, 'departments' | 'shifts' | 'onAddDepartment' | 'onUpdateDepartment' | 'onDeleteDepartment'>> = ({ departments, shifts, onAddDepartment, onUpdateDepartment, onDeleteDepartment }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<{ isOpen: boolean; dept: Department | null }>({ isOpen: false, dept: null });
    const [deptName, setDeptName] = useState('');

    const openModal = (dept: Department | null = null) => { setModalState({ isOpen: true, dept }); setDeptName(dept ? dept.name : ''); };
    const closeModal = () => setModalState({ isOpen: false, dept: null });

    const handleSave = () => {
        if (!deptName.trim()) return;
        modalState.dept ? onUpdateDepartment(modalState.dept.id, deptName.trim()) : onAddDepartment(deptName.trim());
        closeModal();
    };
    const countShiftsInDept = (deptId: string) => shifts.filter(s => s.departmentId === deptId).length;
    
    const footer = ( <> <button onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel title={t('settings.manageDepartments')} description={t('settings.departmentsDescription')} buttonText={t('settings.addDepartment')} onAdd={() => openModal()}>
            {departments.map(dept => (
                <InfoListItem key={dept.id} mainText={dept.name} usageCount={countShiftsInDept(dept.id)} usageLabel={t('settings.shiftsCount')} onEdit={() => openModal(dept)} onDelete={() => { if (window.confirm(t('modals.confirmDeleteDepartment', { name: dept.name }))) { onDeleteDepartment(dept.id); }}} />
            ))}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.dept ? t('settings.editDepartment') : t('settings.addDepartment')} footer={footer} size="md">
                <div className="space-y-2">
                    <label className="label-style">{t('settings.departmentName')}</label>
                    <input type="text" value={deptName} onChange={(e) => setDeptName(e.target.value)} className="input-style"/>
                </div>
            </Modal>
        </SettingsPanel>
    );
};

const AbsenceSettingsPanel: React.FC<Pick<SettingsProps, 'absenceTypes' | 'absences' | 'onAddAbsenceType' | 'onUpdateAbsenceType' | 'onDeleteAbsenceType'>> = ({ absenceTypes, absences, onAddAbsenceType, onUpdateAbsenceType, onDeleteAbsenceType }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<{ isOpen: boolean; at: AbsenceType | null }>({ isOpen: false, at: null });
    const [atData, setAtData] = useState({ name: '', color: '#f44336' });

    const openModal = (at: AbsenceType | null = null) => { setModalState({ isOpen: true, at }); setAtData(at ? { name: at.name, color: at.color } : { name: '', color: '#f44336' }); };
    const closeModal = () => setModalState({ isOpen: false, at: null });

    const handleSave = () => {
        if (!atData.name.trim()) return;
        modalState.at ? onUpdateAbsenceType(modalState.at.id, atData.name.trim(), atData.color) : onAddAbsenceType(atData.name.trim(), atData.color);
        closeModal();
    };
    const countAbsencesOfType = (typeId: string) => absences.filter(a => a.absenceTypeId === typeId).length;
    
    const footer = ( <> <button onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel title={t('settings.manageAbsenceTypes')} description={t('settings.absenceTypesDescription')} buttonText={t('settings.addAbsenceType')} onAdd={() => openModal()}>
            {absenceTypes.map(at => (
                <InfoListItem key={at.id} mainText={at.name} usageCount={countAbsencesOfType(at.id)} usageLabel={t('settings.absencesCount')} colorIndicator={at.color} onEdit={() => openModal(at)} onDelete={() => { if (window.confirm(t('modals.confirmDeleteAbsenceType', { name: at.name }))) { onDeleteAbsenceType(at.id); }}} />
            ))}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.at ? t('settings.editAbsenceType') : t('settings.addAbsenceType')} footer={footer} size="md">
                <div className="space-y-4">
                    <div><label className="label-style">{t('settings.absenceTypeName')}</label><input type="text" value={atData.name} onChange={(e) => setAtData(d => ({ ...d, name: e.target.value }))} className="input-style"/></div>
                    <div><label className="label-style">{t('settings.absenceTypeColor')}</label><input type="color" value={atData.color} onChange={(e) => setAtData(d => ({ ...d, color: e.target.value }))} className="h-10 w-full p-1 rounded-md bg-slate-50 dark:bg-slate-700 border dark:border-slate-600"/></div>
                </div>
            </Modal>
        </SettingsPanel>
    );
};

const CalendarSettingsPanel: React.FC<Pick<SettingsProps, 'specialDayTypes' | 'specialDays' | 'onAddSpecialDayType' | 'onUpdateSpecialDayType' | 'onDeleteSpecialDayType'>> = ({ specialDayTypes, specialDays, onAddSpecialDayType, onUpdateSpecialDayType, onDeleteSpecialDayType }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<{ isOpen: boolean; sdt: SpecialDayType | null }>({ isOpen: false, sdt: null });
    const [sdtData, setSdtData] = useState({ name: '', isHoliday: true });

    const openModal = (sdt: SpecialDayType | null = null) => { setModalState({ isOpen: true, sdt }); setSdtData(sdt ? { name: sdt.name, isHoliday: sdt.isHoliday } : { name: '', isHoliday: true }); };
    const closeModal = () => setModalState({ isOpen: false, sdt: null });

    const handleSave = () => {
        if (!sdtData.name.trim()) return;
        modalState.sdt ? onUpdateSpecialDayType(modalState.sdt.id, sdtData.name.trim(), sdtData.isHoliday) : onAddSpecialDayType(sdtData.name.trim(), sdtData.isHoliday);
        closeModal();
    };
    const countSpecialDaysOfType = (typeId: string) => specialDays.filter(sd => sd.typeId === typeId).length;
    
    const footer = ( <> <button onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel title={t('settings.manageSpecialDayTypes')} description={t('settings.specialDayTypesDescription')} buttonText={t('settings.addSpecialDayType')} onAdd={() => openModal()}>
            {specialDayTypes.map(sdt => (
                <InfoListItem key={sdt.id} mainText={sdt.name} subText={sdt.isHoliday ? t('settings.holidayBlocking') : t('settings.eventNonBlocking')} usageCount={countSpecialDaysOfType(sdt.id)} usageLabel={t('settings.daysCount')} onEdit={() => openModal(sdt)} onDelete={() => { if (window.confirm(t('modals.confirmDeleteSpecialDayType', { name: sdt.name }))) { onDeleteSpecialDayType(sdt.id); }}} />
            ))}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.sdt ? t('settings.editSpecialDayType') : t('settings.addSpecialDayType')} footer={footer} size="md">
                <div className="space-y-4">
                    <div><label className="label-style">{t('settings.specialDayTypeName')}</label><input type="text" value={sdtData.name} onChange={(e) => setSdtData(d => ({...d, name: e.target.value}))} className="input-style"/></div>
                    <label className="flex items-center space-x-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg"><input type="checkbox" checked={sdtData.isHoliday} onChange={(e) => setSdtData(d => ({...d, isHoliday: e.target.checked}))} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"/><span className="font-medium text-slate-700 dark:text-slate-200">{t('settings.blocksShifts')}</span></label>
                </div>
            </Modal>
        </SettingsPanel>
    );
};

const DocumentTypeSettingsPanel: React.FC<Pick<SettingsProps, 'documentTypes' | 'employeeDocuments' | 'onAddDocumentType' | 'onUpdateDocumentType' | 'onDeleteDocumentType'>> = ({ documentTypes, employeeDocuments, onAddDocumentType, onUpdateDocumentType, onDeleteDocumentType }) => {
    const { t } = useLanguage();
    const [modalState, setModalState] = useState<{ isOpen: boolean; docType: DocumentType | null }>({ isOpen: false, docType: null });
    const [docTypeData, setDocTypeData] = useState({ name: '', isUnique: false });

    const openModal = (docType: DocumentType | null = null) => { 
        setModalState({ isOpen: true, docType }); 
        setDocTypeData(docType ? { name: docType.name, isUnique: !!docType.isUnique } : { name: '', isUnique: false }); 
    };
    const closeModal = () => {
        setModalState({ isOpen: false, docType: null });
        setDocTypeData({ name: '', isUnique: false });
    };

    const handleSave = () => {
        if (!docTypeData.name.trim()) return;
        modalState.docType 
            ? onUpdateDocumentType(modalState.docType.id, docTypeData.name.trim(), docTypeData.isUnique) 
            : onAddDocumentType(docTypeData.name.trim(), docTypeData.isUnique);
        closeModal();
    };
    const countDocsOfType = (typeId: string) => employeeDocuments.filter(d => d.typeId === typeId).length;

    let isModificationBlocked = false;
    if (modalState.isOpen && modalState.docType && !modalState.docType.isUnique) {
        const docsOfType = employeeDocuments.filter(d => d.typeId === modalState.docType!.id);
        const countsByEmployee: { [key: string]: number } = {};
        for (const doc of docsOfType) {
            countsByEmployee[doc.employeeId] = (countsByEmployee[doc.employeeId] || 0) + 1;
        }
        if (Object.values(countsByEmployee).some(count => count > 1)) {
            isModificationBlocked = true;
        }
    }

    const footer = ( <> <button onClick={closeModal} className="btn-secondary">{t('modals.cancel')}</button><button onClick={handleSave} className="btn-primary">{t('modals.save')}</button> </> );

    return (
        <SettingsPanel title={t('settings.manageDocumentTypes')} description={t('settings.documentTypesDescription')} buttonText={t('settings.addDocumentType')} onAdd={() => openModal()}>
            {documentTypes.map(docType => (
                <InfoListItem 
                    key={docType.id} 
                    mainText={docType.name} 
                    subText={docType.isUnique ? t('settings.uniquePerEmployee') : undefined}
                    usageCount={countDocsOfType(docType.id)} 
                    usageLabel={t('settings.documentsCount')} 
                    onEdit={() => openModal(docType)} 
                    onDelete={() => { if (window.confirm(t('modals.confirmDeleteDocumentType', { name: docType.name }))) { onDeleteDocumentType(docType.id); }}}
                />
            ))}
            <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.docType ? t('settings.editDocumentType') : t('settings.addDocumentType')} footer={footer} size="md">
                <div className="space-y-4">
                    <div>
                        <label className="label-style">{t('settings.documentTypeName')}</label>
                        <input type="text" value={docTypeData.name} onChange={(e) => setDocTypeData(d => ({...d, name: e.target.value}))} className="input-style"/>
                    </div>
                    <div>
                        <label className={`flex items-center space-x-3 text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg ${isModificationBlocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <input type="checkbox" checked={docTypeData.isUnique} onChange={(e) => setDocTypeData(d => ({...d, isUnique: e.target.checked}))} className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500" disabled={isModificationBlocked}/>
                            <div>
                                <span className="font-medium text-slate-700 dark:text-slate-200">{t('settings.uniquePerEmployee')}</span>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.uniquePerEmployeeDesc')}</p>
                            </div>
                        </label>
                        {isModificationBlocked && (
                             <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2 flex items-center">
                                <Info size={14} className="mr-1.5 flex-shrink-0" />
                                {t('settings.uniqueModificationBlocked')}
                            </p>
                        )}
                    </div>
                </div>
            </Modal>
        </SettingsPanel>
    );
};

// #endregion

const settingsTourSteps: TourStep[] = [
    { selector: "[data-tour-id='settings-add-item']", titleKey: 'tour.settings.addItemTitle', contentKey: 'tour.settings.addItemContent', position: 'bottom' },
    { selector: "[data-tour-id='settings-hover-item']", titleKey: 'tour.settings.hoverEditTitle', contentKey: 'tour.settings.hoverEditContent', position: 'bottom' },
];

// Main Settings Component
const Settings: React.FC<SettingsProps> = (props) => {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('roles');
    const [isTourActive, setIsTourActive] = useState(false);

    const navItems = [
        { id: 'roles', label: t('settings.roles'), icon: <Users size={20} /> },
        { id: 'locations', label: t('settings.locations'), icon: <MapPin size={20} /> },
        { id: 'departments', label: t('settings.departments'), icon: <Briefcase size={20} /> },
        { id: 'absences', label: t('settings.absences'), icon: <UserMinus size={20} /> },
        { id: 'calendar', label: t('settings.calendar'), icon: <CalendarDays size={20} /> },
        { id: 'documentTypes', label: t('settings.documentTypes'), icon: <FileText size={20} /> },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'roles': return <RoleSettingsPanel {...props} />;
            case 'locations': return <LocationSettingsPanel {...props} />;
            case 'departments': return <DepartmentSettingsPanel {...props} />;
            case 'absences': return <AbsenceSettingsPanel {...props} />;
            case 'calendar': return <CalendarSettingsPanel {...props} />;
            case 'documentTypes': return <DocumentTypeSettingsPanel {...props} />;
            default: return null;
        }
    };

    return (
        <div>
            {isTourActive && <FeatureTour steps={settingsTourSteps} onClose={() => setIsTourActive(false)} />}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">{t('settings.title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.pageDescription')}</p>
                </div>
                 <button 
                    onClick={() => setIsTourActive(true)}
                    title={t('tour.quickTips')}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
                    aria-label={t('tour.quickTips')}
                >
                    <Lightbulb size={20} className="text-yellow-400" />
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <aside className="w-full md:w-56 flex-shrink-0 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl shadow-md">
                    <nav className="flex flex-row md:flex-col gap-2">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center p-3 rounded-lg text-sm font-semibold transition-colors duration-200 text-left ${activeTab === item.id ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                            >
                                {item.icon}
                                <span className="ml-3 hidden md:inline">{item.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>
                <main className="flex-grow w-full">
                    {renderContent()}
                </main>
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
            `}</style>
        </div>
    );
};

export default Settings;