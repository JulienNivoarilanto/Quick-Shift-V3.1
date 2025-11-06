import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/functions';
import { User, Shift, Subscription, Payment, Plan, Employee, AbsenceType, InboxMessage, Location, Department, Role, EmployeeDocument, Meeting, Company, BusinessType, ActivitySector } from '../types';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyDOCAb--VSErBg345Y_jFe12345EXAMPLE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:a1b2c3d4e5f6a1b2c3d4e5",
  measurementId: "G-XXXXXXXXXX"
};


// --- INITIALIZATION ---
const app: firebase.app.App = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
const auth: firebase.auth.Auth = app.auth();
const db: firebase.firestore.Firestore = app.firestore();
const functions: firebase.functions.Functions = app.functions();


// --- DATA CONVERSION HELPERS ---
const firestoreTimestampToDate = (data: any): any => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(firestoreTimestampToDate);
    }
    if (typeof data === 'object') {
        for (const key in data) {
            if (data[key] instanceof firebase.firestore.Timestamp) {
                data[key] = data[key].toDate();
            } else if (typeof data[key] === 'object') {
                firestoreTimestampToDate(data[key]);
            }
        }
    }
    return data;
};

const docWithId = (doc: any) => {
    const data = doc.data();
    return firestoreTimestampToDate({ ...data, id: doc.id });
};


// --- AUTHENTICATION API ---
export type LoginResult = {
    success: boolean;
    reason?: 'invalid' | 'unverified';
}

export const apiReauthenticate = async (password: string): Promise<{ success: boolean }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false };

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, password);
        await user.reauthenticateWithCredential(credential);
        return { success: true };
    } catch (error) {
        console.error("Reauthentication error:", error);
        return { success: false };
    }
};

export const apiLogin = async (email: string, pass: string): Promise<LoginResult> => {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, pass);
        if (userCredential.user && !userCredential.user.emailVerified) {
            await auth.signOut(); 
            return { success: false, reason: 'unverified' };
        }
        return { success: true };
    } catch (error: any) {
        console.error("Firebase login error:", error);
        return { success: false, reason: 'invalid' };
    }
};

export const apiLoginWithGoogle = async (): Promise<{ success: boolean }> => {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        const firebaseUser = result.user;
        const isNewUser = result.additionalUserInfo?.isNewUser;

        if (isNewUser && firebaseUser) {
            await db.runTransaction(async (transaction) => {
                const companyRef = db.collection('companies').doc();
                const companyName = `${firebaseUser.displayName}'s Company`;
                transaction.set(companyRef, {
                    name: companyName,
                    ownerId: firebaseUser.uid
                });

                const userRef = db.collection('users').doc(firebaseUser.uid);
                const newUser: Omit<User, 'id'> = {
                    name: firebaseUser.displayName || 'New User',
                    email: firebaseUser.email!,
                    plan: 'Gratuit',
                    avatarUrl: firebaseUser.photoURL,
                    businessType: 'Company',
                    companyName: companyName,
                    isVerified: true, 
                    companyId: companyRef.id,
                    userRole: 'Admin',
                };
                transaction.set(userRef, newUser);

                const subscriptionRef = db.collection('subscriptions').doc();
                const now = new Date();
                const nextPaymentDate = new Date();
                nextPaymentDate.setDate(now.getDate() + 14); 
                const newSubscription: Omit<Subscription, 'id'> = {
                    userId: firebaseUser.uid,
                    companyId: companyRef.id,
                    plan: 'Gratuit',
                    status: 'active',
                    startDate: now,
                    nextPaymentDate: nextPaymentDate,
                    renewalDate: nextPaymentDate
                };
                transaction.set(subscriptionRef, newSubscription);
            });
        }
        return { success: true };
    } catch (error) {
        console.error("Google Sign-In error:", error);
        return { success: false };
    }
};

export interface CheckoutSessionData {
  name: string;
  email: string;
  password: string;
  businessType: BusinessType;
  companyName: string;
  plan: Plan;
  activitySector?: ActivitySector;
  address?: string;
}

export const apiCreateStripeCheckoutSession = async (data: CheckoutSessionData | { userId: string; plan: Plan; email: string }) => {
    const createSession = functions.httpsCallable('createStripeCheckoutSession');
    try {
        const result = await createSession(data);
        console.log("Full response from createStripeCheckoutSession function:", result);
        const { url } = result.data as any;
        if (url) {
            window.location.href = url;
        } else {
            console.error("Cloud function response data did not contain a URL.", result.data);
            throw new Error("Cloud function did not return a URL.");
        }
    } catch (error) {
        console.error("Error creating Stripe checkout session:", error);
        throw error;
    }
};

export const apiCreateStripePortalSession = async (userId: string, email: string) => {
    const createPortal = functions.httpsCallable('createStripePortalSession');
    try {
        const result = await createPortal({ userId, email });
        console.log("Full response from createStripePortalSession function:", result);
        const { url } = result.data as any;
        if (url) {
            window.location.href = url;
        } else {
            console.error("Cloud function response data did not contain a URL.", result.data);
            throw new Error("Cloud function did not return a URL.");
        }
    } catch (error) {
        console.error("Error creating Stripe portal session:", error);
        throw error;
    }
};

export const apiRegister = async (userData: Omit<User, 'id' | 'avatarUrl' | 'isVerified' | 'companyId' | 'password' | 'userRole' | 'customPermissions'>, pass: string): Promise<{ success: boolean, reason?: 'email-exists' | 'unknown' }> => {
    if (userData.plan !== 'Gratuit') {
        console.error("apiRegister called for a paid plan. This should be handled by Stripe checkout flow.");
        return { success: false, reason: 'unknown' };
    }
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(userData.email, pass);
        const firebaseUser = userCredential.user!;

        await db.runTransaction(async (transaction) => {
            const companyRef = db.collection('companies').doc();
            transaction.set(companyRef, {
                name: userData.companyName,
                ownerId: firebaseUser.uid
            });

            const userRef = db.collection('users').doc(firebaseUser.uid);
            const newUser: Omit<User, 'id'> = {
                ...userData,
                avatarUrl: null,
                isVerified: firebaseUser.emailVerified,
                companyId: companyRef.id,
                userRole: 'Admin',
            };
            transaction.set(userRef, newUser);
            
            const subscriptionRef = db.collection('subscriptions').doc();
            const now = new Date();
            const nextPaymentDate = new Date();
            nextPaymentDate.setDate(now.getDate() + 14); // Free trial period
            const newSubscription: Omit<Subscription, 'id'> = {
                userId: firebaseUser.uid,
                companyId: companyRef.id,
                plan: userData.plan,
                status: 'active',
                startDate: now,
                nextPaymentDate: nextPaymentDate,
                renewalDate: nextPaymentDate
            };
            transaction.set(subscriptionRef, newSubscription);
        });

        await firebaseUser.updateProfile({ displayName: userData.name });
        
        await firebaseUser.sendEmailVerification();
        
        return { success: true };
    } catch (error: any) {
        console.error("Firebase registration error:", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, reason: 'email-exists' };
        }
        return { success: false, reason: 'unknown' };
    }
};

export const apiCreateAdditionalUser = async (userData: any, password: string): Promise<{ success: boolean, newUser?: User, error?: string }> => {
    try {
        const tempApp = firebase.initializeApp(firebaseConfig, `temp-app-${Date.now()}`);
        const tempAuth = tempApp.auth();
        const userCredential = await tempAuth.createUserWithEmailAndPassword(userData.email, password);
        const firebaseUser = userCredential.user!;

        const userRef = db.collection('users').doc(firebaseUser.uid);
        const newUser: Omit<User, 'id'> = {
            ...userData,
            isVerified: false,
            avatarUrl: null
        };
        await userRef.set(newUser);
        
        await firebaseUser.updateProfile({ displayName: userData.name });
        await firebaseUser.sendEmailVerification();
        
        await tempAuth.signOut();
        await tempApp.delete();

        return { success: true, newUser: { ...newUser, id: firebaseUser.uid } };
    } catch (error: any) {
        console.error("Firebase create additional user error:", error);
        if (error.code === 'auth/email-already-in-use') {
            return { success: false, error: 'An account with this email already exists.' };
        }
        return { success: false, error: 'Failed to create user.' };
    }
};

export const apiDeleteUser = (userId: string) => {
    // This only deletes the Firestore record. The Auth user remains.
    // Deleting Auth user requires a backend function.
    return db.collection('users').doc(userId).delete();
};


export const apiLogout = () => {
    auth.signOut();
};

export const apiForgotPassword = async (email: string): Promise<{ success: boolean; messageKey: string }> => {
    try {
        await auth.sendPasswordResetEmail(email);
        return { success: true, messageKey: 'auth.resetLinkSentTitle' };
    } catch (error) {
        console.error("Password reset error:", error);
        return { success: false, messageKey: 'auth.invalidCredentials' };
    }
};


export const onAuthStateChangedListener = (callback: (user: any) => void) => {
    return auth.onAuthStateChanged(callback);
};

export const getUserData = async (userId: string): Promise<{ user: User, subscription: Subscription | null, paymentHistory: Payment[] } | null> => {
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
        return null;
    }

    const user = docWithId(userDoc);
    
    return {
        user,
        subscription: null, 
        paymentHistory: []    
    };
};

export const apiGetCompany = async (companyId: string): Promise<Company | null> => {
    const companyDoc = await db.collection('companies').doc(companyId).get();
    if (!companyDoc.exists) return null;
    return docWithId(companyDoc);
}


export const apiUpdateUser = async (userId: string, updatedData: Partial<User>): Promise<User> => {
    const userRef = db.collection('users').doc(userId);

    // Handle auth changes ONLY for the currently logged in user updating their own profile
    if (auth.currentUser && auth.currentUser.uid === userId) {
        if (updatedData.name && updatedData.name !== auth.currentUser.displayName) {
            await auth.currentUser.updateProfile({ displayName: updatedData.name });
        }
        if (updatedData.email && updatedData.email !== auth.currentUser.email) {
            try {
                // This is a sensitive operation and requires recent login.
                // It might fail and should be handled with re-authentication.
                await auth.currentUser.updateEmail(updatedData.email);
            } catch (error: any) {
                console.error("Failed to update auth email. Re-authentication might be required.", error);
                // Let's re-throw a more user-friendly error to be caught in the UI
                if (error.code === 'auth/requires-recent-login') {
                    throw new Error("To change your email, please log out and log back in again for security reasons.");
                }
                throw new Error("Failed to update your email address.");
            }
        }
    }
    
    await userRef.update(updatedData);
    const updatedDoc = await userRef.get();
    return docWithId(updatedDoc);
};

export const apiChangePassword = async (currentPassword: string, newPassword: string): Promise<{ success: boolean; messageKey: string }> => {
    const user = auth.currentUser;
    if (!user || !user.email) return { success: false, messageKey: 'auth.notLoggedIn' };

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);
        await user.updatePassword(newPassword);
        return { success: true, messageKey: 'profile.passwordChangedSuccess' };
    } catch (error) {
        console.error("Password change error:", error);
        return { success: false, messageKey: 'profile.incorrectPasswordError' };
    }
};

// --- MOBILE APP API ---
export const apiLoginEmployee = async (email: string, accessCode: string): Promise<Employee | null> => {
    try {
        const query = db.collection('employees')
            .where('email', '==', email)
            .where('accessCode', '==', accessCode)
            .limit(1);

        const snapshot = await query.get();
        if (snapshot.empty) {
            console.log('No matching employee found.');
            return null;
        }
        return docWithId(snapshot.docs[0]);
    } catch (error) {
        console.error("Employee login error:", error);
        return null;
    }
};

export const apiGetMobileData = async (employeeId: string, companyId: string): Promise<{ shifts: Shift[], absenceTypes: AbsenceType[], locations: Location[], departments: Department[], inboxMessages: InboxMessage[], meetings: Meeting[], allEmployees: Employee[] }> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const twoWeeksFromNow = new Date(today);
        twoWeeksFromNow.setDate(today.getDate() + 14);

        const shiftsQuery = db.collection('shifts').where('companyId', '==', companyId).where('employeeId', '==', employeeId).where('startTime', '>=', today).where('startTime', '<=', twoWeeksFromNow);
        
        const meetingsAsParticipantQuery = db.collection('meetings').where('companyId', '==', companyId).where('participantIds', 'array-contains', employeeId);
        const meetingsAsOrganizerQuery = db.collection('meetings').where('companyId', '==', companyId).where('organizerId', '==', employeeId);

        const absenceTypesQuery = db.collection('absenceTypes').where('companyId', '==', companyId);
        const locationsQuery = db.collection('locations').where('companyId', '==', companyId);
        const departmentsQuery = db.collection('departments').where('companyId', '==', companyId);
        const inboxMessagesQuery = db.collection('inboxMessages').where('companyId', '==', companyId).where('employeeId', '==', employeeId).orderBy('date', 'desc').limit(10);
        const allEmployeesQuery = db.collection('employees').where('companyId', '==', companyId);

        const [
            shiftsSnapshot, 
            absenceTypesSnapshot, 
            locationsSnapshot, 
            departmentsSnapshot, 
            inboxMessagesSnapshot, 
            meetingsAsParticipantSnapshot,
            meetingsAsOrganizerSnapshot,
            allEmployeesSnapshot
        ] = await Promise.all([
            shiftsQuery.get(),
            // FIX: Block-scoped variable 'absenceTypesSnapshot' used before its declaration. Changed to use 'absenceTypesQuery'.
            absenceTypesQuery.get(),
            locationsQuery.get(),
            departmentsQuery.get(),
            inboxMessagesQuery.get(),
            meetingsAsParticipantQuery.get(),
            meetingsAsOrganizerQuery.get(),
            allEmployeesQuery.get(),
        ]);
        
        const shifts = shiftsSnapshot.docs.map(docWithId);
        const absenceTypes = absenceTypesSnapshot.docs.map(docWithId);
        const locations = locationsSnapshot.docs.map(docWithId);
        const departments = departmentsSnapshot.docs.map(docWithId);
        const inboxMessages = inboxMessagesSnapshot.docs.map(docWithId);
        
        const meetingsMap = new Map<string, Meeting>();
        meetingsAsParticipantSnapshot.docs.map(docWithId).forEach(m => meetingsMap.set(m.id, m));
        meetingsAsOrganizerSnapshot.docs.map(docWithId).forEach(m => meetingsMap.set(m.id, m));
        const meetings = Array.from(meetingsMap.values());
        
        const allEmployees = allEmployeesSnapshot.docs.map(docWithId);

        return { shifts, absenceTypes, locations, departments, inboxMessages, meetings, allEmployees };
    } catch (error) {
        console.error("Error fetching mobile data:", error);
        return { shifts: [], absenceTypes: [], locations: [], departments: [], inboxMessages: [], meetings: [], allEmployees: [] };
    }
};

export const apiSubmitRequest = async (requestData: Omit<InboxMessage, 'id' | 'status' | 'date'>): Promise<InboxMessage> => {
    const fullRequestData = {
        ...requestData,
        date: new Date(),
        status: 'pending' as const
    };
    return apiCreateItem<InboxMessage>('inboxMessages', fullRequestData);
};


// --- DATA API ---
export const getCollectionsData = async (collectionNames: string[], companyId: string): Promise<any> => {
    const emptyData: any = {};
    collectionNames.forEach(name => { emptyData[name] = []; });
    
    const dataPromises = collectionNames.map(async (collName) => {
        const collRef = db.collection(collName);
        const q = collRef.where("companyId", "==", companyId);
        const snapshot = await q.get();
        return { [collName]: snapshot.docs.map(docWithId) };
    });
    
    const allDataArrays = await Promise.all(dataPromises);
    return Object.assign({}, ...allDataArrays);
};

export const onCollectionSnapshot = (
    collectionName: string, 
    companyId: string, 
    callback: (data: any[]) => void,
    onError: (error: Error) => void
): (() => void) => {
    const query = db.collection(collectionName).where("companyId", "==", companyId);
    return query.onSnapshot(snapshot => {
        const collectionData = snapshot.docs.map(docWithId);
        callback(collectionData);
    }, error => {
        console.error(`Error listening to ${collectionName}:`, error);
        onError(error);
    });
};

export const apiGetInboxMessages = async (companyId: string): Promise<InboxMessage[]> => {
    try {
        const collRef = db.collection('inboxMessages');
        const q = collRef.where("companyId", "==", companyId);
        const snapshot = await q.get();
        return snapshot.docs.map(docWithId);
    } catch (error) {
        console.error("Error fetching inbox messages:", error);
        return [];
    }
};

export const apiCreateItem = async <T extends {id: string}>(collectionName: string, data: Omit<T, 'id'>): Promise<T> => {
    const collRef = db.collection(collectionName);
    const docRef = await collRef.add(data);
    const newDoc = await docRef.get();
    return docWithId(newDoc);
};

export const apiUpdateItem = <T extends { id: string }>(collectionName: string, id: string, data: Partial<T>) => {
    const docRef = db.collection(collectionName).doc(id);
    const { id: docId, ...dataToUpdate } = data as any;
    return docRef.update(dataToUpdate);
};

export const apiDeleteItem = (collectionName: string, itemId: string) => {
    const docRef = db.collection(collectionName).doc(itemId);
    return docRef.delete();
};

// --- BULK OPERATIONS ---
export const apiBulkDeleteItems = (collectionName: string, itemIds: string[]) => {
    const batch = db.batch();
    itemIds.forEach(id => {
        const docRef = db.collection(collectionName).doc(id);
        batch.delete(docRef);
    });
    return batch.commit();
};

export const apiBulkDeleteMixedItems = (items: {collection: string, id: string}[]) => {
    const batch = db.batch();
    items.forEach(item => {
        const docRef = db.collection(item.collection).doc(item.id);
        batch.delete(docRef);
    });
    return batch.commit();
};


export const apiBulkUpdateItems = (collectionName: string, itemIds: string[], updateData: object) => {
    const batch = db.batch();
    itemIds.forEach(id => {
        const docRef = db.collection(collectionName).doc(id);
        batch.update(docRef, updateData);
    });
    return batch.commit();
};


export const apiUpdateAllShifts = (shifts: Shift[], companyId: string) => {
    const batch = db.batch();
    shifts.forEach(shift => {
        const shiftWithCompanyId = { ...shift, companyId };
        const docRef = db.collection('shifts').doc(shift.id);
        batch.set(docRef, shiftWithCompanyId);
    });
    return batch.commit();
};

export const apiBulkDeleteShifts = (shiftIds: string[]) => {
    const batch = db.batch();
    shiftIds.forEach(id => {
        const docRef = db.collection('shifts').doc(id);
        batch.delete(docRef);
    });
    return batch.commit();
};

export const apiBulkCreateEmployees = async (employees: Array<Omit<Employee, 'id' | 'avatarUrl' | 'companyId'>>, companyId: string): Promise<Employee[]> => {
    const batch = db.batch();
    const newEmployeeDocs: any[] = [];
    const employeesCollection = db.collection('employees');
    employees.forEach(empData => {
        const docRef = employeesCollection.doc();
        const newEmployee = { ...empData, companyId, id: docRef.id };
        batch.set(docRef, { ...empData, companyId });
        newEmployeeDocs.push(newEmployee);
    });
    await batch.commit();
    return newEmployeeDocs;
};

export const apiBulkCreateEmployeeDocuments = async (documents: Array<Omit<EmployeeDocument, 'id' | 'companyId'>>, companyId: string): Promise<EmployeeDocument[]> => {
    const batch = db.batch();
    const newDocs: any[] = [];
    const collection = db.collection('employeeDocuments');
    documents.forEach(docData => {
        const docRef = collection.doc();
        const newDoc = { ...docData, companyId, id: docRef.id };
        batch.set(docRef, { ...docData, companyId });
        newDocs.push(newDoc);
    });
    await batch.commit();
    return newDocs;
};


export const apiBulkCreateShifts = async (shifts: Array<Omit<Shift, 'id' | 'companyId'>>, companyId: string): Promise<Shift[]> => {
    const batch = db.batch();
    const shiftsCollection = db.collection('shifts');
    const newDocRefs = shifts.map(() => shiftsCollection.doc());

    shifts.forEach((shiftData, index) => {
        const dataToSave = { ...shiftData, companyId };
        batch.set(newDocRefs[index], dataToSave);
    });

    await batch.commit();

    const newDocsSnapshots = await Promise.all(newDocRefs.map(ref => ref.get()));
    
    return newDocsSnapshots.map(doc => docWithId(doc));
};