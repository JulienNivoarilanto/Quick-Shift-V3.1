import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { User, Plan, Subscription, Payment, UserPermissions } from '../types';
import * as api from '../services/api';

export interface Permissions {
  // Plan-based limits
  employeeLimit: number;
  userLimit: number;

  // Feature access (combination of plan and role)
  canAccessDashboard: boolean;
  canAccessSchedule: boolean;
  canAccessSettings: boolean;
  canAccessEmployees: boolean;
  canAccessReferencing: boolean;
  canAccessHistory: boolean;
  canAccessTimeClock: boolean;
  canAccessMessaging: boolean;
  canManageSubscription: boolean;
  canManageUsers: boolean;

  // Other specific permissions
  canExport: boolean;
  canAddAbsence: boolean;
  canImportEmployees: boolean;
}

type LoginResult = {
    success: boolean;
    reason?: 'invalid' | 'unverified';
}

interface AuthContextType {
  user: User | null;
  isCompanyOwner: boolean;
  subscription: Subscription | null;
  paymentHistory: Payment[];
  permissions: Permissions;
  isAuthLoading: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<{ success: boolean }>;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'avatarUrl' | 'isVerified' | 'companyId' | 'password' | 'userRole' | 'customPermissions'>, pass: string) => Promise<{success: boolean; reason?: 'email-exists' | 'unknown'}>;
  updateUser: (updatedData: Partial<User>) => void;
  verifyUser: (email: string) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; messageKey: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; messageKey: string }>;
  reauthenticate: (password: string) => Promise<{ success: boolean }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isCompanyOwner, setIsCompanyOwner] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = api.onAuthStateChangedListener(async (firebaseUser) => {
        if (firebaseUser) {
            try {
                const userData = await api.getUserData(firebaseUser.uid);
                if (userData) {
                    // Sync Firestore `isVerified` with Firebase Auth `emailVerified`
                    if (userData.user.isVerified !== firebaseUser.emailVerified) {
                        const updatedUser = await api.apiUpdateUser(firebaseUser.uid, { isVerified: firebaseUser.emailVerified });
                        setUser(updatedUser);
                    } else {
                        setUser(userData.user);
                    }
                    setSubscription(userData.subscription || null);
                    setPaymentHistory(userData.paymentHistory || []);

                    const companyData = await api.apiGetCompany(userData.user.companyId);
                    setIsCompanyOwner(companyData?.ownerId === userData.user.id);

                } else {
                    setUser(null);
                    setSubscription(null);
                    setPaymentHistory([]);
                    setIsCompanyOwner(false);
                }
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                setUser(null);
                setIsCompanyOwner(false);
            }
        } else {
            setUser(null);
            setSubscription(null);
            setPaymentHistory([]);
            setIsCompanyOwner(false);
        }
        setIsAuthLoading(false);
    });

    return unsubscribe;
  }, []);


  const permissions: Permissions = useMemo(() => {
    const plan = user?.plan || 'Gratuit';
    const userRole = user?.userRole || 'Admin'; // default for backwards compatibility
    const customPermissions = user?.customPermissions;

    const planLimits = {
      'Gratuit': { employeeLimit: 10, userLimit: 1, allowsDashboard: false, allowsTimeClock: false, allowsMultiUser: false, canAccessMessaging: false },
      'Pro': { employeeLimit: 100, userLimit: 10, allowsDashboard: true, allowsTimeClock: false, allowsMultiUser: true, canAccessMessaging: false },
      'Pro Plus': { employeeLimit: 300, userLimit: 30, allowsDashboard: true, allowsTimeClock: true, allowsMultiUser: true, canAccessMessaging: true },
    }[plan];

    const basePermissions = {
        employeeLimit: planLimits.employeeLimit,
        userLimit: planLimits.userLimit,
        canExport: plan !== 'Gratuit',
        canAddAbsence: plan !== 'Gratuit',
        canImportEmployees: plan !== 'Gratuit',
    };

    if (userRole === 'Admin') {
        return {
            ...basePermissions,
            canAccessDashboard: planLimits.allowsDashboard,
            canAccessSchedule: true,
            canAccessSettings: true,
            canAccessEmployees: true,
            canAccessReferencing: true,
            canAccessHistory: true,
            canAccessTimeClock: planLimits.allowsTimeClock,
            canAccessMessaging: planLimits.canAccessMessaging,
            canManageSubscription: planLimits.allowsMultiUser,
            canManageUsers: planLimits.allowsMultiUser,
        };
    }

    if (userRole === 'Custom' && customPermissions) {
        return {
            ...basePermissions,
            canAccessDashboard: planLimits.allowsDashboard && customPermissions.canAccessDashboard,
            canAccessSchedule: customPermissions.canAccessSchedule,
            canAccessSettings: customPermissions.canAccessSettings,
            canAccessEmployees: customPermissions.canAccessEmployees,
            canAccessReferencing: customPermissions.canAccessReferencing,
            canAccessHistory: customPermissions.canAccessHistory,
            canAccessTimeClock: planLimits.allowsTimeClock && customPermissions.canAccessTimeClock,
            canAccessMessaging: planLimits.canAccessMessaging && customPermissions.canAccessMessaging,
            canManageSubscription: false,
            canManageUsers: false,
        };
    }
    
    // Fallback for Gratuit plan user or user with no role defined.
    return {
        ...basePermissions,
        canAccessDashboard: planLimits.allowsDashboard,
        canAccessSchedule: true,
        canAccessSettings: true,
        canAccessEmployees: true,
        canAccessReferencing: true,
        canAccessHistory: true,
        canAccessTimeClock: planLimits.allowsTimeClock,
        canAccessMessaging: planLimits.canAccessMessaging,
        canManageSubscription: false,
        canManageUsers: false,
    };
}, [user]);

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    const result = await api.apiLogin(email, pass);
    // Auth state change will be handled by the onAuthStateChanged listener
    return result;
  };
  
  const loginWithGoogle = async (): Promise<{ success: boolean }> => {
    const result = await api.apiLoginWithGoogle();
    // Auth state will be handled by the listener
    return result;
  };

  const logout = () => {
    api.apiLogout();
    // State will be cleared by the onAuthStateChanged listener
  };

  const register = async (userData: Omit<User, 'id' | 'avatarUrl' | 'isVerified' | 'companyId' | 'password' | 'userRole' | 'customPermissions'>, pass: string): Promise<{success: boolean; reason?: 'email-exists' | 'unknown'}> => {
    const result = await api.apiRegister(userData, pass);
    return result;
  };
  
  const verifyUser = (email: string) => {
      // In a real app, this would trigger an API call to resend verification.
      console.log(`Verification requested for ${email}`);
      // Consider implementing api.resendVerificationEmail(email);
  };

  const updateUser = async (updatedData: Partial<User>) => {
      if (!user) return;
      try {
        const updatedUser = await api.apiUpdateUser(user.id, updatedData);
        setUser(updatedUser);
      } catch (error) {
        console.error("Failed to update user:", error);
        throw error;
      }
  };
  
  const changePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; messageKey: string }> => {
    if (!user) {
        return { success: false, messageKey: 'auth.notLoggedIn' };
    }
    return await api.apiChangePassword(currentPassword, newPassword);
  };
  
  const forgotPassword = async (email: string): Promise<{ success: boolean; messageKey: string }> => {
    return await api.apiForgotPassword(email);
  };

  const reauthenticate = async (password: string): Promise<{ success: boolean }> => {
    return await api.apiReauthenticate(password);
  };

  const value = { 
    user, permissions, login, logout, register, updateUser, verifyUser, changePassword, reauthenticate,
    subscription, paymentHistory, isAuthLoading, forgotPassword, loginWithGoogle, isCompanyOwner
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};