

import React, { useState, useEffect } from 'react';
import { Meeting, Employee } from '../types';
import { Users, Video, MapPin, Trash2 } from 'lucide-react';
import Avatar from './Avatar';

interface MeetingCardProps {
    meeting: Meeting;
    employees: Employee[];
    onClick: () => void;
    onDelete: (meetingId: string) => void;
    onDragStart: (e: React.DragEvent<HTMLDivElement>, meetingId: string) => void;
    isSelectionModeActive: boolean;
    isSelected: boolean;
    onToggleSelect: (meetingId: string) => void;
    zoomLevel: number;
    isLocked: boolean;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, employees, onClick, onDelete, onDragStart, isSelectionModeActive, isSelected, onToggleSelect, zoomLevel, isLocked }) => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const startTime = new Date(meeting.startTime);
    const endTime = new Date(meeting.endTime);
    const isInProgress = now >= startTime && now <= endTime;
    const isFinished = now > endTime;

    const participants = employees.filter(e => meeting.participantIds.includes(e.id));
    const organizer = employees.find(e => e.id === meeting.organizerId);
    const formatTime = (date: Date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const meetingTimeTitle = `${formatTime(startTime)} - ${formatTime(endTime)}`;

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(meeting.id);
    };

    const handleCardClick = (e: React.MouseEvent) => {
        if (isSelectionModeActive) {
            onToggleSelect(meeting.id);
        } else {
            onClick();
        }
    };

    // --- COMPACT VIEW (level 0) ---
    if (zoomLevel === 0) {
        const title = `${meeting.subject} | ${meetingTimeTitle}`;
        return (
            <div 
                draggable={!isLocked && !isSelectionModeActive}
                onDragStart={(e) => onDragStart(e, meeting.id)}
                onClick={handleCardClick} 
                title={title} 
                className={`transition-all duration-300 ease-in-out relative ${isLocked || isSelectionModeActive ? 'cursor-default' : 'cursor-grab'}`}
            >
                <div className={`h-6 rounded flex items-center justify-between px-1.5 text-white bg-purple-500 overflow-hidden`}>
                    <span className="text-[11px] font-bold truncate">{meeting.subject}</span>
                    <span className="text-[10px] font-mono truncate">{meetingTimeTitle}</span>
                </div>
            </div>
        );
    }
    
    // --- DEFAULT & DETAILED VIEWS ---
    return (
        <div
            draggable={!isLocked && !isSelectionModeActive}
            onDragStart={(e) => onDragStart(e, meeting.id)}
            onClick={handleCardClick}
            className={`rounded-lg mb-2 border-l-4 border-purple-500 group relative ${isSelected ? 'bg-blue-200 dark:bg-blue-night-700' : 'bg-purple-50 dark:bg-purple-900/30'} p-3 shadow-sm hover:shadow-md transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${isLocked ? 'cursor-default' : (isSelectionModeActive ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing')}`}
        >
            {isFinished ? (
                 <span title="Meeting Finished" className="absolute top-2 right-2 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-purple-900/30" />
            ) : isInProgress ? (
                 <span title="In Progress" className="absolute top-2 right-2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white dark:border-purple-900/30 animate-pulse" />
            ) : null}

            {isSelectionModeActive && (
                <input 
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(meeting.id)}
                    className="absolute top-2 right-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                />
            )}
            
            <p className="font-semibold text-gray-800 dark:text-gray-100 truncate pr-4">{meeting.subject}</p>
            <p className="text-xs text-purple-800 dark:text-purple-300 font-mono font-semibold mb-2">{meetingTimeTitle}</p>
            
            {zoomLevel > 1 && (
              <>
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {meeting.type === 'remote' ? <Video size={12} className="mr-1.5 flex-shrink-0" /> : <MapPin size={12} className="mr-1.5 flex-shrink-0" />}
                    <span>{meeting.type === 'remote' ? 'Remote' : 'In-person'}</span>
                </div>
                <div className="flex items-center">
                    <Users size={12} className="text-gray-600 dark:text-gray-400 mr-1.5 flex-shrink-0"/>
                    <div className="flex -space-x-2">
                        {organizer && <Avatar name={organizer.name} src={organizer.avatarUrl} className="w-5 h-5 rounded-full border-2 border-white dark:border-purple-900/50" />}
                        {participants.slice(0, 3).map(p => (
                            <Avatar key={p.id} name={p.name} src={p.avatarUrl} className="w-5 h-5 rounded-full border-2 border-white dark:border-purple-900/50" />
                        ))}
                    </div>
                    {participants.length > 3 && <span className="text-xs ml-2 text-gray-500">+{participants.length - 3}</span>}
                </div>
              </>
            )}

            {!isSelectionModeActive && !isLocked && (
                 <button 
                    onClick={handleDeleteClick}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1 rounded-full bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900/80 text-red-600 dark:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete meeting"
                >
                    <Trash2 size={14} />
                </button>
            )}
        </div>
    );
};

export default MeetingCard;