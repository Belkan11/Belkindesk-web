import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  deleteDoc,
  collection,
  onSnapshot,
  Firestore,
  getDocFromServer
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, MedicalNote, MedicalTimerItem, AccessibilityConfig } from '../types';

// Initialize Firebase safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

// Use named database if specified in config, or default
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Error logging helper conforming to standard Firestore error specifications
export function logFirestoreError(operation: string, path: string, error: unknown) {
  console.warn(`[Firestore ${operation}] Path: ${path}`, error);
}

/**
 * Validate Firestore connection
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Attempt reading or pinging the database
    await getDoc(doc(db, 'system', 'ping'));
    return true;
  } catch (err) {
    console.warn('Firestore initial test connection note (offline fallback active):', err);
    return false;
  }
}

/**
 * Load all user profiles from Cloud Firestore
 */
export async function loadAllProfilesFromFirestore(): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);
    
    if (snapshot.empty) {
      return [];
    }

    const profiles: UserProfile[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data && typeof data === 'object' && data.id) {
        profiles.push(data as UserProfile);
      }
    });

    return profiles;
  } catch (err) {
    logFirestoreError('LOAD_ALL', 'users', err);
    return [];
  }
}

/**
 * Save / sync a single user profile directly to Cloud Firestore
 */
export async function saveUserProfileToFirestore(user: UserProfile): Promise<void> {
  if (!user || !user.id) return;

  const currentUser = auth.currentUser;
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev')
  );

  const isDemoProfile = user.id === 'user-admin-belkin' || user.id.startsWith('agent-');

  if (!isDevMode) {
    // Production: Strictly enforce firebaseUser != null and userId === firebaseUser.uid
    if (!currentUser || currentUser.uid !== user.id) {
      console.warn(`[Firestore Guard] Blocked unauthorized save to /users/${user.id} in production. Auth UID: ${currentUser?.uid}`);
      return;
    }
  } else {
    // Dev Mode: Allow saving authenticated user or demo profiles
    if (!isDemoProfile && currentUser && currentUser.uid !== user.id) {
      console.warn(`[Firestore Guard Dev] Blocked save to /users/${user.id}. Auth UID: ${currentUser?.uid}`);
      return;
    }
  }

  try {
    const userDocRef = doc(db, 'users', user.id);
    const payload = { ...user };
    delete payload.password; // CRITICAL: Strip plain text password before persisting to Firestore
    payload.updatedAt = new Date().toISOString();
    await setDoc(userDocRef, payload, { merge: true });
  } catch (err) {
    logFirestoreError('SAVE_USER', `users/${user.id}`, err);
    throw err;
  }
}

/**
 * Delete a user profile from Cloud Firestore
 */
export async function deleteUserProfileFromFirestore(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
  } catch (err) {
    logFirestoreError('DELETE_USER', `users/${userId}`, err);
    throw err;
  }
}

/**
 * Save full database backup snapshot to Firestore
 */
export async function saveBackupSnapshotToFirestore(backupData: Record<string, unknown>): Promise<void> {
  try {
    const backupRef = doc(db, 'backups', 'latest');
    await setDoc(backupRef, {
      ...backupData,
      savedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    logFirestoreError('SAVE_BACKUP', 'backups/latest', err);
  }
}

/**
 * Realtime listener for a SINGLE user profile in Firestore
 */
export function subscribeToUserProfile(userId: string, onUpdate: (profile: UserProfile) => void): () => void {
  if (!userId) return () => {};
  try {
    const userDocRef = doc(db, 'users', userId);
    return onSnapshot(
      userDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && typeof data === 'object' && data.id) {
            onUpdate(data as UserProfile);
          }
        }
      },
      (err) => {
        logFirestoreError('SNAPSHOT_USER', `users/${userId}`, err);
      }
    );
  } catch (err) {
    logFirestoreError('SUBSCRIBE_USER', `users/${userId}`, err);
    return () => {};
  }
}

/**
 * Realtime listener for all user profiles in Firestore (Dev/Admin Mode only)
 */
export function subscribeToAllProfiles(onUpdate: (profiles: UserProfile[]) => void): () => void {
  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const profiles: UserProfile[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            if (data && typeof data === 'object' && data.id) {
              profiles.push(data as UserProfile);
            }
          });
          if (profiles.length > 0) {
            onUpdate(profiles);
          }
        }
      },
      (err) => {
        logFirestoreError('SNAPSHOT_PROFILES', 'users', err);
      }
    );
  } catch (err) {
    logFirestoreError('SUBSCRIBE', 'users', err);
    return () => {};
  }
}

export interface FirestoreUserLoadResult {
  data: UserProfile | null;
  exists: boolean;
  error?: any;
}

/**
 * Helper: Load a single user data doc with existence & error distinction
 */
export async function loadUserDataFromFirestore(userId: string): Promise<FirestoreUserLoadResult> {
  if (!userId) return { data: null, exists: false };
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return { data: snap.data() as UserProfile, exists: true };
    }
    return { data: null, exists: false };
  } catch (err) {
    logFirestoreError('GET_USER', `users/${userId}`, err);
    return { data: null, exists: false, error: err };
  }
}

// Legacy stubs removed as authentication is fully integrated into AuthGateScreen using native Firebase SDK
