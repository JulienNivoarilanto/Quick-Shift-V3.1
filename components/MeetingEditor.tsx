

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Meeting, Employee, Location, Shift, Absence } from '../types';
import { Trash2, AlertTriangle, Users, Video, MapPin, Lock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import Modal from './Modal';
import MultiSelectDropdown from './MultiSelectDropdown';

interface MeetingEditorProps {
    isOpen: boolean;
    onClose: () => void;
    meeting: Meeting | null;
    selectedDate?: Date | null;
    employees: Employee[];
    locations: Location[];
    allShifts: Shift[];
    allAbsences: Absence[];
    allMeetings: Meeting[];
    onSave: (meeting: Meeting) => void;
    onDelete: (meetingId: string) => void;
}

const toInputDateString = (date: Date): string => date.toISOString().split('T')[0];
const toInputTimeString = (date: Date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const MeetingEditor: React.FC<MeetingEditorProps> = (props) => {
    const { isOpen, onClose, meeting, selectedDate, employees, locations, allShifts, allAbsences, allMeetings, onSave, onDelete } = props;
    const { t } = useLanguage();
    const { user } = useAuth();
    
    const getInitialState = () => {
        const date = meeting?.startTime || selectedDate || new Date();
        const defaultStartTime = new Date(date);
        defaultStartTime.setHours(10, 0, 0, 0);

        return {
            subject: meeting?.subject || '',
            description: meeting?.description || '',
            organizerId: meeting?.organizerId || '',
            participantIds: meeting?.participantIds || [],
            type: meeting?.type || 'in-person',
            locationId: meeting?.locationId || '',
            link: meeting?.link || '',
            date: toInputDateString(defaultStartTime),
            startTime: toInputTimeString(defaultStartTime),
            duration: meeting ? (new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000 : 45,
        };
    };

    const [formData, setFormData] = useState(getInitialState);
    const [organizerSearch, setOrganizerSearch] = useState('');
    const [error, setError] = useState('');
    const [conflicts, setConflicts] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    const isPast = meeting ? new Date(meeting.endTime) < new Date() : false;
    const selectedOrganizer = useMemo(() => employees.find(e => e.id === formData.organizerId), [formData.organizerId, employees]);

    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialState());
            setOrganizerSearch('');
            setError('');
            setConflicts([]);
        }
    }, [isOpen, meeting, selectedDate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(isPast) return;

        setError('');
        setConflicts([]);

        if (!formData.subject.trim() || !formData.organizerId) {
            setError("Subject and organizer are required.");
            return;
        }

        if (formData.type === 'remote' && !formData.link.trim()) {
            setError(t('modals.errorRemoteLinkRequired'));
            return;
        }

        const newStartTime = new Date(`${formData.date}T${formData.startTime}`);
        const newEndTime = new Date(newStartTime.getTime() + formData.duration * 60000);

        if (newEndTime <= newStartTime) {
            setError("Duration must be positive.");
            return;
        }

        const allInvolvedIds = Array.from(new Set([formData.organizerId, ...formData.participantIds]));
        const foundConflicts: string[] = [];

        for (const empId of allInvolvedIds) {
            const employee = employees.find(e => e.id === empId);
            if (!employee) continue;

            const hasAbsence = allAbsences.some(a => a.employeeId === empId && newStartTime < new Date(a.endDate) && newEndTime > new Date(a.startDate));
            if (hasAbsence) {
                foundConflicts.push(`${employee.name}: Has an absence`);
                continue;
            }
            
            const hasMeeting = allMeetings.some(m => {
                if(m.id === meeting?.id) return false;
                const isOrganizer = m.organizerId === empId;
                const isParticipant = m.participantIds.includes(empId);
                if(!isOrganizer && !isParticipant) return false;
                
                return newStartTime < new Date(m.endTime) && newEndTime > new Date(m.startTime);
            });
            if(hasMeeting) {
                foundConflicts.push(`${employee.name}: Has another meeting`);
            }
        }

        if (foundConflicts.length > 0) {
            setError(t('modals.errorConflictTitle'));
            setConflicts(foundConflicts);
            return;
        }

        const finalMeetingBase: Omit<Meeting, 'description' | 'locationId' | 'link'> = {
            id: meeting?.id || `meeting-${Date.now()}`,
            companyId: user!.companyId,
            subject: formData.subject.trim(),
            organizerId: formData.organizerId,
            participantIds: formData.participantIds,
            type: formData.type as 'in-person' | 'remote',
            startTime: newStartTime,
            endTime: newEndTime,
        };

        const optionalFields: Partial<Meeting> = {};
        if (formData.description.trim()) {
            optionalFields.description = formData.description.trim();
        }
        if (formData.type === 'in-person' && formData.locationId) {
            optionalFields.locationId = formData.locationId;
        }
        if (formData.type === 'remote' && formData.link.trim()) {
            optionalFields.link = formData.link.trim();
        }
        
        const finalMeeting: Meeting = {
            ...finalMeetingBase,
            ...optionalFields,
        };

        onSave(finalMeeting);
        onClose();
    };

    const handleDelete = () => {
        if (meeting && onDelete) {
            onDelete(meeting.id);
            onClose();
        }
    };
    
    const title = meeting ? t('modals.editMeetingTitle') : t('modals.addMeetingTitle');

    const modalFooter = (
        <div className="flex justify-between items-center w-full">
            <div>{meeting && onDelete && (<button type="button" onClick={() => setShowDeleteConfirm(true)} disabled={isPast} className="btn-danger p-2"><Trash2 size={20} /></button>)}</div>
            <div className="flex space-x-2">
                <button type="button" onClick={onClose} className="btn-secondary">{t('modals.cancel')}</button>
                <button type="submit" form="meeting-editor-form" className="btn-primary" disabled={isPast}>{t('modals.saveMeeting')}</button>
            </div>
        </div>
    );
    
    const employeeOptions = employees.map(e => ({id: e.id, name: e.name}));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} footer={modalFooter} size="2xl">
            {showDeleteConfirm && (
                <Modal
                    isOpen={true}
                    onClose={() => setShowDeleteConfirm(false)}
                    title={t('modals.confirmDeleteMeeting')}
                    size="sm"
                    footer={
                        <>
                            <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary">{t('modals.cancel')}</button>
                            <button onClick={handleDelete} className="btn-danger">{t('modals.confirm')}</button>
                        </>
                    }
                >
                    <p>This action cannot be undone.</p>
                </Modal>
            )}
            <form id="meeting-editor-form" onSubmit={handleSubmit} className="space-y-4">
                {isPast && (
                    <p className="text-yellow-700 dark:text-yellow-300 text-sm bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg flex items-center">
                        <Lock size={16} className="mr-2"/>
                        {t('tooltips.shiftLocked')}
                    </p>
                )}
                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300 font-semibold flex items-center"><AlertTriangle size={16} className="mr-2"/>{error}</p>
                        {conflicts.length > 0 && (
                            <ul className="mt-2 list-disc list-inside text-xs text-red-600 dark:text-red-400 space-y-1 max-h-24 overflow-y-auto">
                                {conflicts.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        )}
                    </div>
                )}
                <div><label className="label-style">{t('modals.meetingSubject')}*</label><input type="text" name="subject" value={formData.subject} onChange={handleChange} required className="input-style" disabled={isPast}/></div>
                <div><label className="label-style">{t('modals.meetingDescription')}</label><textarea name="description" value={formData.description} onChange={handleChange} rows={2} className="input-style" disabled={isPast}></textarea></div>
                
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="label-style">{t('modals.meetingOrganizer')}*</label>
                        {selectedOrganizer ? (
                            <div className="flex items-center justify-between p-2.5 border rounded-md bg-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                <span>{selectedOrganizer.name}</span>
                                <button type="button" onClick={() => setFormData(f => ({...f, organizerId: ''}))} disabled={isPast} className="text-sm text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline">Change</button>
                            </div>
                        ) : (
                            <div className="relative">
                                <input 
                                    type="text"
                                    value={organizerSearch}
                                    onChange={e => setOrganizerSearch(e.target.value)}
                                    placeholder="Search for an organizer..."
                                    className="input-style"
                                    autoFocus
                                    disabled={isPast}
                                />
                                {organizerSearch && (
                                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-blue-night-800 border rounded shadow-lg max-h-40 overflow-y-auto">
                                        {employees.filter(e => e.name.toLowerCase().includes(organizerSearch.toLowerCase())).map(emp => (
                                            <div key={emp.id} onClick={() => {
                                                setFormData(f => ({...f, organizerId: emp.id}));
                                                setOrganizerSearch('');
                                            }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                                {emp.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <MultiSelectDropdown label={t('modals.meetingParticipants')} options={employeeOptions.filter(e => e.id !== formData.organizerId)} selectedIds={formData.participantIds} onSelectionChange={(ids) => setFormData(f => ({...f, participantIds: ids}))} placeholder="Select participants..." />
                </div>

                <div className="grid grid-cols-2 gap-4 items-end">
                    <div>
                        <label className="label-style">{t('modals.meetingType')}</label>
                        <div className="flex rounded-lg bg-slate-200 dark:bg-slate-800 p-1">
                            <button type="button" onClick={() => setFormData({...formData, type: 'in-person'})} disabled={isPast} className={`w-full flex justify-center items-center p-1.5 text-sm font-semibold rounded-md ${formData.type === 'in-person' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}><MapPin size={16} className="mr-2"/>{t('modals.meetingTypeInPerson')}</button>
                            <button type="button" onClick={() => setFormData({...formData, type: 'remote'})} disabled={isPast} className={`w-full flex justify-center items-center p-1.5 text-sm font-semibold rounded-md ${formData.type === 'remote' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`}><Video size={16} className="mr-2"/>{t('modals.meetingTypeRemote')}</button>
                        </div>
                    </div>
                    {formData.type === 'in-person' ? (
                        <div><label className="label-style">{t('modals.locationLabel')}</label><select name="locationId" value={formData.locationId} onChange={handleChange} className="input-style" disabled={isPast}><option value="">{t('modals.none')}</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                    ) : (
                        <div><label className="label-style">{t('modals.meetingLink')}</label><input type="url" name="link" value={formData.link} onChange={handleChange} placeholder="https://" className="input-style" required={formData.type === 'remote'} disabled={isPast} /></div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                     <div><label className="label-style">{t('modals.dateLabel')}</label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="input-style" disabled={isPast}/></div>
                     <div><label className="label-style">{t('modals.startTimeLabel')}</label><input type="time" name="startTime" value={formData.startTime} onChange={handleChange} required className="input-style" disabled={isPast}/></div>
                     <div><label className="label-style">{t('modals.meetingDuration')}</label><input type="number" name="duration" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})} min="1" required className="input-style" disabled={isPast}/></div>
                </div>

                <style>{`
                    .label-style { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 500; color: #475569; }
                    .dark .label-style { color: #cbd5e1; }
                    .input-style { display: block; width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem; border: 1px solid #cbd5e1; background-color: #ffffff; }
                    .dark .input-style { border-color: #475569; background-color: #1e293b; color: #f8fafc; }
                    .input-style:disabled { background-color: #f1f5f9; cursor: not-allowed; }
                    .dark .input-style:disabled { background-color: #334155; }
                    .btn-primary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #2563eb; }
                    .btn-primary:disabled { background-color: #93c5fd; cursor: not-allowed; }
                    .btn-secondary { padding: 0.625rem 1rem; border-radius: 0.5rem; font-weight: 600; background-color: #e2e8f0; }
                    .dark .btn-secondary { background-color: #334155; color: #e2e8f0; }
                    .btn-danger { padding: 0.625rem 1rem; border-radius: 0.5rem; font-weight: 600; color: white; background-color: #dc2626; }
                    .dark .btn-danger { color: #f87171; background-color: rgba(153, 27, 27, 0.4); }
                    .btn-danger:disabled { background-color: #fca5a5; cursor: not-allowed; opacity: 0.7; }
                    .dark .btn-danger:disabled { background-color: rgba(153, 27, 27, 0.2); }
                `}</style>
            </form>
        </Modal>
    );
};

export default MeetingEditor;