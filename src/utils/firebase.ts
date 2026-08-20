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
  try {
    const userDocRef = doc(db, 'users', user.id);
    const payload = {
      ...user,
      updatedAt: new Date().toISOString(),
    };
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
 * Realtime listener for all user profiles in Firestore
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

/**
 * Legacy/Helper: Load a single user data doc
 */
export async function loadUserDataFromFirestore(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch (err) {
    logFirestoreError('GET_USER', `users/${userId}`, err);
  }
  return null;
}

// Legacy stub exports for unused AuthModal.tsx compilation
export async function loginFirebaseUser(...args: any[]): Promise<any> { return null; }
export async function registerFirebaseUser(...args: any[]): Promise<any> { return null; }
export async function logoutFirebaseUser(...args: any[]): Promise<any> { return null; }
export async function saveUserDataToFirestore(...args: any[]): Promise<any> { return null; }
