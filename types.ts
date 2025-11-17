

export type ContractType = 
  'permanent' | 
  'temporary' | 
  'internship' | 
  'volunteer' | 
  'interim' | 
  'apprenticeship' | 
  'professionalization' | 
  'part-time' | 
  'seasonal';


export interface Company {
  id: string;
  name: string;
  ownerId: string;
  subscriptionId: string | null;
}

export interface Role {
  id: string;
  name: string;
  companyId: string;
}

export interface Location {
  id: string;
  name: string;
  address?: string | null;
  companyId: string;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null; // in meters
  isGeofencingEnabled?: boolean;
}

export interface Department {
  id: string;
  name: string;
  companyId: string;
}

export interface Team {
  id: string;
  name: string;
  companyId: string;
  locationId?: string | null;
  departmentId?: string | null;
  memberIds: string[];
}

export interface AbsenceType {
  id: string;
  name:string;
  color: string;
  companyId: string;
}

export interface SpecialDayType {
  id: string;
  name: string;
  isHoliday: boolean;
  companyId: string;
}

export interface Employee {
  id: string;
  customId?: string;
  name: string;
  email: string;
  birthDate: Date;
  address?: string;
  status: 'active' | 'inactive' | 'suspended';
  role: string;
  avatarUrl: string | null;
  phone: string;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  companyId: string;
  accessCode?: string;
  hiringDate?: Date;
  contractType?: ContractType;
}

export interface Shift {
  id: string;
  employeeId: string | null;
  startTime: Date;
  endTime: Date;
  locationId?: string;
  departmentId?: string;
  companyId: string;
  actualStartTime?: Date;
  actualEndTime?: Date;
}

export interface Absence {
    id: string;
    employeeId: string;
    absenceTypeId: string;
    startDate: Date;
    endDate: Date;
    companyId: string;
}

export interface SpecialDay {
    id: string;
    date: Date;
    typeId: string;
    coverage: 'all-day' | 'morning' | 'afternoon' | 'evening';
    companyId: string;
}

export interface DocumentType {
  id: string;
  name: string;
  companyId: string;
  isUnique?: boolean;
}

export interface EmployeeDocument {
  id: string;
  customId?: string;
  typeId: string;
  name: string;
  number?: string;
  description?: string;
  expirationDate?: Date;
  isValid: boolean;
  employeeId: string;
  companyId: string;
}

export interface Meeting {
  id: string;
  organizerId: string;
  participantIds: string[];
  type: 'in-person' | 'remote';
  startTime: Date;
  endTime: Date;
  subject: string;
  description?: string;
  locationId?: string;
  link?: string;
  companyId: string;
}

export interface MessageGroup {
  id: string;
  name: string;
  companyId: string;
  memberIds: string[]; // employee IDs
  teamIds: string[]; // team IDs
  createdAt: Date;
  createdBy: string; // user ID
}

export interface ChatMessage {
  id: string;
  companyId: string;
  conversationId: string; // MessageGroup ID or direct message channel ID
  senderId: string; // User ID or Employee ID
  senderName: string; // Denormalized for display
  senderAvatarUrl?: string | null;
  content: string;
  timestamp: Date;
  readBy: string[]; // Array of user/employee IDs who have read it
}


export type View = 'dashboard' | 'schedule' | 'employees' | 'settings' | 'profile' | 'referencing' | 'history' | 'timeclock' | 'messaging';

export type Plan = 'Gratuit' | 'Pro' | 'Pro Plus';

export type BusinessType = 'Individual' | 'Company' | 'Other';
export type ActivitySector = 'Individual' | 'Health' | 'Technology' | 'Administration' | 'Finance' | 'Commerce' | 'Social' | 'Other';

export interface UserPermissions {
  canAccessDashboard: boolean;
  canAccessSchedule: boolean;
  canAccessSettings: boolean;
  canAccessEmployees: boolean;
  canAccessReferencing: boolean;
  canAccessHistory: boolean;
  canAccessTimeClock: boolean;
  canAccessMessaging: boolean;
}

export type UserRole = 'Admin' | 'Custom';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Stored in DB, but not held in client-side user state after login.
    plan: Plan;
    avatarUrl: string | null;
    businessType: BusinessType;
    companyName: string;
    activitySector?: ActivitySector;
    address?: string;
    phone?: string;
    functionTitle?: string;
    isVerified: boolean;
    companyId: string;
    userRole: UserRole;
    customPermissions?: UserPermissions;
}

export interface Subscription {
    id: string;
    userId: string;
    companyId: string;
    plan: Plan;
    status: 'active' | 'canceled' | 'past_due';
    startDate: Date;
    nextPaymentDate: Date;
    renewalDate: Date;
}

export interface Payment {
    id: string;
    userId: string;
    subscriptionId: string;
    date: Date;
    amount: number;
    plan: Plan;
    status: 'Paid' | 'Failed';
}

export interface InboxMessage {
  id: string;
  employeeId: string;
  type: 'absence-request' | 'complaint';
  subject: string;
  body: string;
  date: Date;
  status: 'pending' | 'validated' | 'refused' | 'followed-up';
  // For absence requests
  absenceTypeId?: string;
  startDate?: Date;
  endDate?: Date;
  refusalReason?: string;
  companyId: string;
}

export type AvailabilityStatus = 'available' | 'preferred' | 'unavailable';
export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export type DayAvailability = {
  [key in TimeBlock]: AvailabilityStatus;
};

// Index 0 = Monday, ..., 6 = Sunday
export type WeeklyAvailability = [DayAvailability, DayAvailability, DayAvailability, DayAvailability, DayAvailability, DayAvailability, DayAvailability];

export interface EmployeeAvailability {
    id: string;
    employeeId: string;
    availability: WeeklyAvailability;
    companyId: string;
}

export type ClockingStatus = 'present' | 'absent' | 'not-clocked-in' | 'future';