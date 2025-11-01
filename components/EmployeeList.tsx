import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Employee, Role, ContractType, Team, Location, Department } from '../types';
import { PlusCircle, Edit, Trash2, Phone, LayoutGrid, List, Upload, Gem, Mail, Filter, X, Lightbulb, Users as UsersIcon, Download, CheckSquare, Briefcase, MapPin, Search, Plus } from 'lucide-react';
import Avatar from './Avatar';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import MultiSelectDropdown from './MultiSelectDropdown';
import FeatureTour, { TourStep } from './FeatureTour';
import Modal from './Modal';
import EmployeeExportModal from './EmployeeExportModal';

const ROLE_COLORS: { [key: string]: { border: string; bg: string; text: string } } = {
    'Manager': { border: 'border-red-500', bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300' },
    'Cashier': { border: 'border-green-500', bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
    'Stocker': { border: 'border-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300' },
    'Clerk': { border: 'border-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
    'Default': { border: 'border-gray-400', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200' },
};

const STATUS_COLORS: { [key in Employee['status']]: { bg: string; text: string } } = {
    'active': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
    'inactive': { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300' },
    'suspended': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
};

const getRoleColor = (roleName: string) => {
    return ROLE_COLORS[roleName] || ROLE_COLORS.Default;
};

const StatusBadge: React.FC<{ status: Employee['status'] }> = ({ status }) => {
    const { t } = useLanguage();
    const colors = STATUS_COLORS[status];
    // If status is invalid or missing, colors will be undefined.
    // We'll provide a fallback to prevent the app from crashing.
    if (!colors) {
        const fallbackColors = STATUS_COLORS['inactive'];
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${fallbackColors.bg} ${fallbackColors.text}`}>{t('status.inactive')}</span>;
    }
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{t(`status.${status}`)}</span>;
};

interface EmployeeCardProps {
    employee: Employee;
    onEdit: (employee: Employee) => void;
    onDelete: (employeeId: string) => void;
    isSelected: boolean;
    onToggleSelect: (employeeId: string) => void;
    isSelectionMode: boolean;
    tourId?: string;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onEdit, onDelete, isSelected, onToggleSelect, isSelectionMode, tourId }) => {
    const roleColor = getRoleColor(employee.role);

    const handleClick = () => {
        if (isSelectionMode) {
            onToggleSelect(employee.id);
        } else {
            onEdit(employee);
        }
    };

    return (
        <div 
            data-tour-id={tourId}
            className={`bg-white dark:bg-blue-night-900 rounded-xl shadow-md flex flex-col justify-between transition-all duration-300 group cursor-pointer border-t-4 relative ${roleColor.border} ${isSelectionMode ? 'hover:shadow-lg' : 'hover:shadow-xl hover:-translate-y-1'} ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
            onClick={handleClick}
        >
            {isSelectionMode && (
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(employee.id)}
                    className="absolute top-3 right-3 h-5 w-5 rounded text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()} // Prevent card click when clicking checkbox
                />
            )}
            <div className="p-4 text-center flex-grow">
                <Avatar name={employee.name} src={employee.avatarUrl} className="w-20 h-20 rounded-full mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">{employee.name}</h3>
                <p className={`text-sm font-semibold ${roleColor.text}`}>{employee.role}</p>
                <div className="mt-2"><StatusBadge status={employee.status} /></div>
                
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-blue-night-800 space-y-2 text-left">
                     <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Mail size={12} className="mr-2.5 flex-shrink-0" />
                        <span className="truncate">{employee.email}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <Phone size={12} className="mr-2.5 flex-shrink-0" />
                        <span>{employee.phone || 'N/A'}</span>
                    </div>
                </div>
            </div>
            {!isSelectionMode && (
                <div className="mt-2 flex justify-center space-x-2 h-12 items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(employee); }} className="p-2 rounded-full bg-gray-200 dark:bg-blue-night-800 hover:bg-gray-300 dark:hover:bg-blue-night-700" aria-label="Edit employee">
                        <Edit size={16} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(employee.id); }} className="p-2 rounded-full bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300" aria-label="Delete employee">
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

interface BulkRoleAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    roles: Role[];
    onAssign: (roleName: string) => void;
    employeeCount: number;
}

const BulkRoleAssignModal: React.FC<BulkRoleAssignModalProps> = ({ isOpen, onClose, roles, onAssign, employeeCount }) => {
    const { t } = useLanguage();
    const [selectedRole, setSelectedRole] = useState(roles[0]?.name || '');
    
    const handleAssign = () => {
        if (selectedRole) {
            onAssign(selectedRole);
        }
    };

    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handleAssign} className="btn-primary">{t('employees.assignRole')}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('employees.assignRoleToCount', { count: employeeCount })} footer={footer}>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('employees.bulkAssignDesc')}</p>
            <label htmlFor="bulk-role-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('modals.roleLabel')}</label>
            <select id="bulk-role-select" value={selectedRole} onChange={e => setSelectedRole(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700">
                {roles.map(role => <option key={role.id} value={role.name}>{role.name}</option>)}
            </select>
        </Modal>
    );
};

interface TeamEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
    employees: Employee[];
    locations: Location[];
    departments: Department[];
    onSave: (teamData: Omit<Team, 'id' | 'companyId'> | Team) => void;
    teams: Team[];
}

const TeamEditorModal: React.FC<TeamEditorModalProps> = ({ isOpen, onClose, team, employees, locations, departments, onSave, teams }) => {
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [locationId, setLocationId] = useState<string | null>(null);
    const [departmentId, setDepartmentId] = useState<string | null>(null);
    const [memberIds, setMemberIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const employeeTeamMap = useMemo(() => {
        const map = new Map<string, { teamId: string, teamName: string }>();
        teams.forEach(t => {
            t.memberIds.forEach(memberId => {
                map.set(memberId, { teamId: t.id, teamName: t.name });
            });
        });
        return map;
    }, [teams]);

    const filteredEmployees = useMemo(() => {
        return employees.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [employees, searchTerm]);


    useEffect(() => {
        if (isOpen) {
            setName(team?.name || '');
            setLocationId(team?.locationId || null);
            setDepartmentId(team?.departmentId || null);
            setMemberIds(team?.memberIds || []);
            setSearchTerm('');
        }
    }, [isOpen, team]);

    const handleSave = () => {
        if (!name.trim()) return;
        const teamData = {
            name: name.trim(),
            locationId: locationId || null,
            departmentId: departmentId || null,
            memberIds,
        };
        if (team) {
            onSave({ ...team, ...teamData });
        } else {
            onSave(teamData);
        }
    };

    const footer = (
        <>
            <button onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
            <button onClick={handleSave} className="btn-primary">{t('modals.save')}</button>
        </>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={team ? t('teams.editTeam') : t('teams.addTeam')} footer={footer} size="3xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div>
                        <label className="label-style">{t('teams.teamName')}</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} className="input-style"/>
                    </div>
                    <div>
                        <label className="label-style">{t('modals.locationLabel')}</label>
                        <select value={locationId || ''} onChange={e => setLocationId(e.target.value || null)} className="input-style">
                            <option value="">{t('modals.none')}</option>
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label-style">{t('modals.departmentLabel')}</label>
                        <select value={departmentId || ''} onChange={e => setDepartmentId(e.target.value || null)} className="input-style">
                            <option value="">{t('modals.none')}</option>
                            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="label-style">{t('teams.members')}</label>
                    <div className="relative mb-2">
                        <input 
                            type="text" 
                            placeholder={t('employees.searchPlaceholder')}
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="input-style"
                        />
                    </div>
                    <div className="max-h-60 overflow-y-auto border rounded-md dark:border-gray-700">
                        {filteredEmployees.length > 0 ? filteredEmployees.map(employee => {
                            const existingTeamMembership = employeeTeamMap.get(employee.id);
                            const isInAnotherTeam = existingTeamMembership && existingTeamMembership.teamId !== team?.id;
                            const isSelected = memberIds.includes(employee.id);

                            const handleSelect = () => {
                                if (isInAnotherTeam) return;
                                setMemberIds(prev => 
                                    isSelected ? prev.filter(id => id !== employee.id) : [...prev, employee.id]
                                );
                            };

                            return (
                                <div 
                                    key={employee.id}
                                    onClick={handleSelect}
                                    className={`flex items-center justify-between p-2 border-b dark:border-gray-700 last:border-b-0
                                        ${isInAnotherTeam 
                                            ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                                            : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                        }
                                    `}
                                >
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={isInAnotherTeam}
                                            readOnly
                                            className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 mr-3 pointer-events-none"
                                        />
                                        <Avatar name={employee.name} src={employee.avatarUrl} className="w-8 h-8 rounded-full mr-3" />
                                        <div>
                                            <p className="font-medium text-sm">{employee.name}</p>
                                            <StatusBadge status={employee.status} />
                                        </div>
                                    </div>
                                    {isInAnotherTeam && (
                                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                                            {existingTeamMembership.teamName}
                                        </span>
                                    )}
                                </div>
                            );
                        }) : <p className="p-4 text-center text-sm text-gray-500">{t('employees.noEmployeesFound')}</p>}
                    </div>
                </div>
            </div>
             <style>{`.label-style { display: block; margin-bottom: 0.5rem; } .input-style { width: 100%; padding: 0.5rem; border-radius: 0.375rem; border: 1px solid #d1d5db; } .dark .input-style { background-color: #1e293b; border-color: #4b5563; }`}</style>
        </Modal>
    );
};

const TeamManagement: React.FC<Pick<EmployeeListProps, 'teams' | 'employees' | 'locations' | 'departments' | 'onAddTeam' | 'onUpdateTeam' | 'onDeleteTeam'>> = 
({ teams, employees, locations, departments, onAddTeam, onUpdateTeam, onDeleteTeam }) => {
    const { t } = useLanguage();
    const [editorState, setEditorState] = useState<{isOpen: boolean, team: Team | null}>({isOpen: false, team: null});
    const [teamSearchTerm, setTeamSearchTerm] = useState('');
    
    const employeeMap = useMemo(() => new Map(employees.map(e => [e.id, e])), [employees]);

    const filteredTeams = useMemo(() => {
        if (!teamSearchTerm.trim()) {
            return teams;
        }
    
        const lowercasedSearch = teamSearchTerm.toLowerCase();
    
        return teams.filter(team => {
            const teamNameMatch = team.name.toLowerCase().includes(lowercasedSearch);
            
            const location = locations.find(l => l.id === team.locationId);
            const locationNameMatch = location && location.name.toLowerCase().includes(lowercasedSearch);
    
            const department = departments.find(d => d.id === team.departmentId);
            const departmentNameMatch = department && department.name.toLowerCase().includes(lowercasedSearch);
    
            return teamNameMatch || locationNameMatch || departmentNameMatch;
        });
    }, [teams, teamSearchTerm, locations, departments]);

    const handleSave = (teamData: Omit<Team, 'id' | 'companyId'> | Team) => {
        if ('id' in teamData) {
            onUpdateTeam(teamData);
        } else {
            onAddTeam(teamData);
        }
        setEditorState({isOpen: false, team: null});
    };

    const handleDelete = (team: Team) => {
        if(window.confirm(t('teams.confirmDelete', {name: team.name}))) {
            onDeleteTeam(team.id);
        }
    }

    return (
        <div>
            {editorState.isOpen && (
                <TeamEditorModal 
                    isOpen={true}
                    onClose={() => setEditorState({isOpen: false, team: null})}
                    team={editorState.team}
                    employees={employees}
                    locations={locations}
                    departments={departments}
                    onSave={handleSave}
                    teams={teams}
                />
            )}
            <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('teams.title')}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('teams.description')}</p>
                 </div>
                <button
                    onClick={() => setEditorState({isOpen: true, team: null})}
                    className="bg-blue-600 text-white hover:bg-blue-700 w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0"
                    title={t('teams.addTeam')}
                >
                    <Plus size={20} />
                </button>
            </div>

            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder={t('teams.searchPlaceholder')}
                        value={teamSearchTerm}
                        onChange={e => setTeamSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
            </div>

            {filteredTeams.length === 0 ? (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400">{teamSearchTerm ? t('employees.noEmployeesFound') : t('teams.noTeams')}</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {filteredTeams.map(team => {
                        const members = team.memberIds.map(id => employeeMap.get(id)).filter(Boolean) as Employee[];
                        const location = locations.find(l => l.id === team.locationId);
                        const department = departments.find(d => d.id === team.departmentId);
                        
                        return (
                            <div key={team.id} className="bg-white dark:bg-blue-night-900 rounded-xl shadow-md p-4 flex flex-col group transition-all hover:shadow-lg">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-night-950/50 rounded-lg">
                                            <UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <h4 className="text-base font-bold text-gray-800 dark:text-white">{team.name}</h4>
                                    </div>
                                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditorState({isOpen: true, team})} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-700"><Edit size={16} /></button>
                                        <button onClick={() => handleDelete(team)} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="flex-grow my-3">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('teams.memberCount', {count: members.length})}</p>
                                    <div className="flex -space-x-2">
                                        {members.slice(0, 5).map(member => (
                                            <Avatar key={member.id} name={member.name} src={member.avatarUrl} className="w-8 h-8 rounded-full border-2 border-white dark:border-blue-night-900"/>
                                        ))}
                                        {members.length > 5 && (
                                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-blue-night-700 flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-blue-night-900">
                                                +{members.length - 5}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-auto pt-3 border-t border-gray-100 dark:border-blue-night-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <MapPin size={14} className="flex-shrink-0" />
                                        <span className="truncate">{location ? location.name : t('teams.noLocation')}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Briefcase size={14} className="flex-shrink-0" />
                                        <span className="truncate">{department ? department.name : t('teams.noDepartment')}</span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
};


interface EmployeeListProps {
    employees: Employee[];
    roles: Role[];
    onAdd: () => void;
    onEdit: (employee: Employee) => void;
    onDelete: (employeeId: string) => void;
    onImport: () => void;
    onBulkDelete: (employeeIds: string[]) => void;
    onBulkAssignRole: (employeeIds: string[], roleName: string) => void;
    teams: Team[];
    locations: Location[];
    departments: Department[];
    onAddTeam: (teamData: Omit<Team, 'id' | 'companyId'>) => void;
    onUpdateTeam: (team: Team) => void;
    onDeleteTeam: (teamId: string) => void;
}

type SortOption = 'name-asc' | 'name-desc' | 'role';
const ALL_STATUSES: Employee['status'][] = ['active', 'inactive', 'suspended'];
const ALL_CONTRACT_TYPES: ContractType[] = ['permanent', 'temporary', 'internship', 'volunteer', 'interim', 'apprenticeship', 'professionalization', 'part-time', 'seasonal'];


const employeeTourSteps: TourStep[] = [
    { selector: "[data-tour-id='employee-view-toggle']", titleKey: 'tour.employees.viewToggleTitle', contentKey: 'tour.employees.viewToggleContent', position: 'bottom' },
    { selector: "[data-tour-id='employee-quick-edit']", titleKey: 'tour.employees.quickEditTitle', contentKey: 'tour.employees.quickEditContent', position: 'bottom' },
    { selector: "[data-tour-id='employee-filters']", titleKey: 'tour.employees.filterTitle', contentKey: 'tour.employees.filterContent', position: 'bottom' },
    { selector: "[data-tour-id='employee-import']", titleKey: 'tour.employees.importTitle', contentKey: 'tour.employees.importContent', position: 'left' },
];

const EmployeeList: React.FC<EmployeeListProps> = ({ employees, roles, onAdd, onEdit, onDelete, onImport, onBulkDelete, onBulkAssignRole, teams, locations, departments, onAddTeam, onUpdateTeam, onDeleteTeam }) => {
    const { user, permissions } = useAuth();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'roster' | 'teams'>('roster');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
    const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
    const [sortOption, setSortOption] = useState<SortOption>('name-asc');
    const [showFilters, setShowFilters] = useState(false);
    const [isTourActive, setIsTourActive] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isBulkRoleModalOpen, setIsBulkRoleModalOpen] = useState(false);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

    const isSelectionMode = selectedEmployeeIds.length > 0;
    const atEmployeeLimit = employees.length >= permissions.employeeLimit;

    const handleDeleteWithConfirm = (employeeId: string) => {
        const employee = employees.find(e => e.id === employeeId);
        if(employee && window.confirm(t('modals.confirmDelete', { name: employee.name }))){
            onDelete(employeeId);
        }
    };

    const handleBulkDelete = () => {
        if (window.confirm(t('employees.confirmBulkDelete', { count: selectedEmployeeIds.length }))) {
            onBulkDelete(selectedEmployeeIds);
            setSelectedEmployeeIds([]);
        }
    };

    const handleBulkRoleAssign = (roleName: string) => {
        onBulkAssignRole(selectedEmployeeIds, roleName);
        setIsBulkRoleModalOpen(false);
        setSelectedEmployeeIds([]);
    };

    const roleStats = useMemo(() => {
        return roles.map(role => ({
            name: role.name,
            count: employees.filter(e => e.role === role.name).length,
        })).filter(r => r.count > 0);
    }, [employees, roles]);

    const filteredAndSortedEmployees = useMemo(() => {
        let filtered = employees.filter(employee => {
            const searchLower = searchTerm.toLowerCase();
            const searchMatch = searchLower === '' || 
                                employee.name.toLowerCase().includes(searchLower) || 
                                employee.email.toLowerCase().includes(searchLower) ||
                                (employee.phone && employee.phone.includes(searchTerm));
            const roleMatch = roleFilter.length === 0 || roleFilter.includes(employee.role);
            const statusMatch = statusFilter === 'all' || employee.status === statusFilter;
            const contractMatch = contractTypeFilter === 'all' || employee.contractType === contractTypeFilter;
            return searchMatch && roleMatch && statusMatch && contractMatch;
        });

        switch (sortOption) {
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
            case 'role':
                filtered.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));
                break;
        }

        return filtered;
    }, [employees, searchTerm, roleFilter, statusFilter, contractTypeFilter, sortOption]);

    const roleOptions = useMemo(() => roles.map(r => ({id: r.name, name: r.name})), [roles]);
    
    const toggleSelect = (employeeId: string) => {
        setSelectedEmployeeIds(prev => prev.includes(employeeId) ? prev.filter(id => id !== employeeId) : [...prev, employeeId]);
    };

    const toggleSelectAll = () => {
        if (selectedEmployeeIds.length === filteredAndSortedEmployees.length) {
            setSelectedEmployeeIds([]);
        } else {
            setSelectedEmployeeIds(filteredAndSortedEmployees.map(e => e.id));
        }
    };
    
    const handleClearFilters = () => {
        setRoleFilter([]);
        setStatusFilter('all');
        setContractTypeFilter('all');
    };

    return (
        <div>
            {isTourActive && <FeatureTour steps={employeeTourSteps} onClose={() => setIsTourActive(false)} />}
            {isExportModalOpen && <EmployeeExportModal allEmployees={employees} allRoles={roles} onClose={() => setIsExportModalOpen(false)} />}
            {isBulkRoleModalOpen && (
                <BulkRoleAssignModal
                    isOpen={true}
                    onClose={() => setIsBulkRoleModalOpen(false)}
                    roles={roles}
                    onAssign={handleBulkRoleAssign}
                    employeeCount={selectedEmployeeIds.length}
                />
            )}

            <div className="flex justify-between items-start mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('employees.rosterTitle')}</h2>
                    <div className="mt-3 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div><strong>{t('employees.total')}:</strong> {employees.length}</div>
                        <div className="h-4 border-l border-gray-300 dark:border-gray-600"></div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            <strong>{t('employees.byRole')}:</strong>
                            {roleStats.map(role => {
                                const colors = getRoleColor(role.name);
                                return <span key={role.name} className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>{role.name}: {role.count}</span>
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'roster' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}
                    >
                        {t('employees.rosterTab')}
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'teams' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-600'}`}
                    >
                        {t('employees.teamsTab')}
                    </button>
                </nav>
            </div>
            
            {activeTab === 'roster' && (
                <>
                    {/* Controls Bar */}
                    <div data-tour-id="employee-filters" className="mb-6 p-4 bg-white dark:bg-blue-night-900 rounded-xl shadow-md">
                        {isSelectionMode ? (
                            <div className="flex justify-between items-center animate-fade-in-backdrop bg-blue-50 dark:bg-blue-950 p-3 rounded-lg -m-1 mb-3">
                                <span className="font-semibold text-blue-800 dark:text-blue-200">{t('employees.selectedCount', { count: selectedEmployeeIds.length })}</span>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setIsBulkRoleModalOpen(true)} className="btn-secondary flex items-center text-sm"><UsersIcon size={16} className="mr-2"/> {t('employees.assignRole')}</button>
                                    <button onClick={handleBulkDelete} className="btn-danger flex items-center text-sm"><Trash2 size={16} className="mr-2"/> {t('employees.deleteSelected')}</button>
                                    <button onClick={() => setSelectedEmployeeIds([])} className="p-2 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"><X size={20}/></button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                                <div className="lg:col-span-2">
                                    <input type="text" placeholder={t('employees.searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setShowFilters(s => !s)} className="w-full flex items-center justify-center p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700"><Filter size={16} className="mr-2"/>{t('employees.filters')}</button>
                                    <select value={sortOption} onChange={e => setSortOption(e.target.value as SortOption)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700">
                                        <option value="name-asc">{t('employees.sortNameAsc')}</option>
                                        <option value="name-desc">{t('employees.sortNameDesc')}</option>
                                        <option value="role">{t('employees.sortRole')}</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-end space-x-2">
                                    <div data-tour-id="employee-view-toggle" className="flex items-center bg-gray-200 dark:bg-blue-night-800 rounded-lg p-1">
                                        <button onClick={() => setDisplayMode('grid')} className={`p-1.5 rounded-md transition-colors ${displayMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label={t('employees.gridView')}><LayoutGrid size={20} /></button>
                                        <button onClick={() => setDisplayMode('list')} className={`p-1.5 rounded-md transition-colors ${displayMode === 'list' ? 'bg-blue-600 text-white shadow' : 'text-gray-500 dark:text-gray-400'}`} aria-label={t('employees.listView')}><List size={20} /></button>
                                    </div>
                                    <button onClick={() => setIsExportModalOpen(true)} title={t('schedule.export')} className="p-2 rounded-lg transition-colors bg-gray-600 hover:bg-gray-700 text-white"><Download size={20} /></button>
                                    <button data-tour-id="employee-import" onClick={() => permissions.canImportEmployees && onImport()} disabled={!permissions.canImportEmployees} title={!permissions.canImportEmployees ? t('tooltips.proFeature') : ''} className={`p-2 rounded-lg transition-colors duration-300 relative ${!permissions.canImportEmployees ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                                        {!permissions.canImportEmployees && <Gem size={14} className="absolute -top-1 -right-1 text-yellow-400" />}
                                        <Upload size={20} />
                                    </button>
                                    <button onClick={onAdd} disabled={atEmployeeLimit} title={atEmployeeLimit ? t('tooltips.employeeLimit', { limit: permissions.employeeLimit }) : ''} className={`p-2 rounded-lg transition-colors duration-300 text-white ${atEmployeeLimit ? 'bg-gray-400 dark:bg-gray-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                        <PlusCircle size={20} />
                                    </button>
                                    <button onClick={() => setIsTourActive(true)} title={t('tour.quickTips')} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors" aria-label={t('tour.quickTips')}>
                                        <Lightbulb size={20} className="text-yellow-400" />
                                    </button>
                                </div>
                            </div>
                        )}
                        {showFilters && (
                            <div className="mt-4 pt-4 border-t dark:border-blue-night-800 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                <div className="lg:col-span-2">
                                    <MultiSelectDropdown label={t('employees.allRoles')} options={roleOptions} selectedIds={roleFilter} onSelectionChange={setRoleFilter} placeholder={t('employees.allRoles')} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.statusLabel')}</label>
                                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 min-h-[42px]">
                                        <option value="all">{t('employees.allStatuses')}</option>
                                        {ALL_STATUSES.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('modals.contractTypeLabel')}</label>
                                    <select value={contractTypeFilter} onChange={e => setContractTypeFilter(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 min-h-[42px]">
                                        <option value="all">{t('employees.allContracts')}</option>
                                        {ALL_CONTRACT_TYPES.map(c => <option key={c} value={c}>{t(`contract.${c}`)}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <button onClick={handleClearFilters} className="w-full flex items-center justify-center p-2 border rounded-md bg-gray-50 dark:bg-blue-night-800 dark:border-blue-night-700 text-sm min-h-[42px]"><X size={16} className="mr-2"/>{t('calendarFilter.clearAll')}</button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {filteredAndSortedEmployees.length === 0 ? (
                        <div className="text-center py-10"><p className="text-gray-500 dark:text-gray-400">{t('employees.noEmployeesFound')}</p></div>
                    ) : displayMode === 'grid' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {filteredAndSortedEmployees.map((employee, index) => (
                                <EmployeeCard key={employee.id} employee={employee} onEdit={onEdit} onDelete={handleDeleteWithConfirm} tourId={index === 0 ? "employee-quick-edit" : undefined} isSelected={selectedEmployeeIds.includes(employee.id)} onToggleSelect={toggleSelect} isSelectionMode={isSelectionMode} />
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-blue-night-900 rounded-xl shadow-md overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-gray-50 dark:bg-blue-night-800 text-xs uppercase text-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 w-12"><input type="checkbox" className="h-4 w-4 rounded text-blue-600" onChange={toggleSelectAll} checked={filteredAndSortedEmployees.length > 0 && selectedEmployeeIds.length === filteredAndSortedEmployees.length} /></th>
                                        <th scope="col" className="px-6 py-3">{t('employees.tableHeaderEmployee')}</th>
                                        <th scope="col" className="px-6 py-3">{t('employees.tableHeaderContact')}</th>
                                        <th scope="col" className="px-6 py-3">{t('employees.tableHeaderRole')}</th>
                                        <th scope="col" className="px-6 py-3">{t('modals.statusLabel')}</th>
                                        <th scope="col" className="px-6 py-3 text-right">{t('employees.tableHeaderActions')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedEmployees.map((employee, index) => {
                                        const roleColor = getRoleColor(employee.role);
                                        const isSelected = selectedEmployeeIds.includes(employee.id);
                                        return (
                                        <tr key={employee.id} data-tour-id={index === 0 ? "employee-quick-edit" : undefined} className={`border-b dark:border-blue-night-700 hover:bg-gray-50 dark:hover:bg-blue-night-800/50 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/50' : ''}`} onClick={() => isSelectionMode ? toggleSelect(employee.id) : onEdit(employee)}>
                                            <td className="px-6 py-4"><input type="checkbox" className="h-4 w-4 rounded text-blue-600" checked={isSelected} onChange={() => toggleSelect(employee.id)} onClick={e => e.stopPropagation()} /></td>
                                            <td className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"><div className="flex items-center"><Avatar name={employee.name} src={employee.avatarUrl} className="w-10 h-10 rounded-full mr-3 flex-shrink-0" />{employee.name}</div></td>
                                            <td className="px-6 py-4"><div className="truncate">{employee.email}</div><div className="text-gray-500 dark:text-gray-400">{employee.phone}</div></td>
                                            <td className="px-6 py-4"><span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${roleColor.bg} ${roleColor.text}`}>{employee.role}</span></td>
                                            <td className="px-6 py-4"><StatusBadge status={employee.status} /></td>
                                            <td className="px-6 py-4"><div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}><button onClick={() => onEdit(employee)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-blue-night-700"><Edit size={16} /></button><button onClick={() => handleDeleteWithConfirm(employee.id)} className="p-2 rounded-full text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50"><Trash2 size={16} /></button></div></td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
            
            {activeTab === 'teams' && (
                <TeamManagement
                    teams={teams}
                    employees={employees}
                    locations={locations}
                    departments={departments}
                    onAddTeam={onAddTeam}
                    onUpdateTeam={onUpdateTeam}
                    onDeleteTeam={onDeleteTeam}
                />
            )}

            <style>{`
                .btn-primary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; transition: background-color 0.2s; }
                .btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
                .btn-secondary { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: #334155; background-color: #e2e8f0; border: 1px solid #e2e8f0; }
                .dark .btn-secondary { color: #e2e8f0; background-color: #334155; border-color: #475569; }
                .btn-secondary:hover { background-color: #cbd5e1; }
                .dark .btn-secondary:hover { background-color: #475569; }
                .btn-danger { padding: 0.5rem 1rem; border-radius: 0.5rem; font-weight: 600; color: #dc2626; background-color: #fee2e2; border: 1px solid #fee2e2; }
                .dark .btn-danger { color: #f87171; background-color: rgba(153, 27, 27, 0.4); border-color: transparent; }
                .btn-danger:hover { background-color: #fecaca; }
                .dark .btn-danger:hover { background-color: rgba(153, 27, 27, 0.6); }
            `}</style>
        </div>
    );
};

export default EmployeeList;