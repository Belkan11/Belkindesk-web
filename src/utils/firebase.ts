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
import {
  isRetryableError,
  addPendingOperation,
  categorizeAndQueuePartialFields,
  flushPendingQueue,
  resetRetryState,
  mergeArrayById,
  mergeWorkSchedulesLWW
} from './pendingSync';

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
 * Save / sync a single user profile directly to Cloud Firestore.
 * Performs non-destructive array/field merge if cloud version has newer updates.
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
    const snap = await getDoc(userDocRef);

    const payload = { ...user };
    delete payload.password; // CRITICAL: Strip plain text password before persisting to Firestore
    delete (payload as any).aiApiKey; // CRITICAL: AI API key must never be stored in /users/{uid}

    let nextVersion = (user.version || 0) + 1;
    const nowIso = new Date().toISOString();
    const localTime = user.updatedAt ? new Date(user.updatedAt).getTime() : 0;

    if (snap.exists()) {
      const cloudData = snap.data() as UserProfile;
      const cloudTime = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;

      if (cloudTime > localTime) {
        console.warn(`[Firestore Concurrency Guard] Whole-profile save detected newer cloud document (${cloudData.updatedAt}) vs local (${user.updatedAt}). Performing non-destructive merge.`);

        if (Array.isArray(cloudData.notes) && Array.isArray(payload.notes)) {
          payload.notes = mergeArrayById(cloudData.notes, payload.notes);
        }
        if (Array.isArray(cloudData.bookmarks) && Array.isArray(payload.bookmarks)) {
          payload.bookmarks = mergeArrayById(cloudData.bookmarks, payload.bookmarks);
        }
        if (Array.isArray(cloudData.timers) && Array.isArray(payload.timers)) {
          payload.timers = mergeArrayById(cloudData.timers, payload.timers);
        }
        if (Array.isArray(cloudData.feeds) && Array.isArray(payload.feeds)) {
          payload.feeds = mergeArrayById(cloudData.feeds, payload.feeds);
        }
        if (cloudData.workSchedules && payload.workSchedules) {
          payload.workSchedules = { ...cloudData.workSchedules, ...payload.workSchedules };
        }
        if (cloudData.workspaceConfig && payload.workspaceConfig) {
          payload.workspaceConfig = { ...cloudData.workspaceConfig, ...payload.workspaceConfig };
        }
      }
      nextVersion = Math.max((cloudData.version || 0) + 1, nextVersion);
    }

    payload.version = nextVersion;
    payload.updatedAt = nowIso;

    await setDoc(userDocRef, payload, { merge: true });
    if (user.id) {
      resetRetryState(user.id);
      flushPendingQueue(user.id).catch(() => {});
    }
  } catch (err) {
    logFirestoreError('SAVE_USER', `users/${user.id}`, err);
    if (isRetryableError(err)) {
      addPendingOperation({
        userId: user.id,
        entityType: 'userProfile',
        operation: 'update',
        payload: user,
        baseUpdatedAt: user.updatedAt,
        localUpdatedAt: new Date().toISOString(),
      });
    }
    throw err;
  }
}

/**
 * Granularly update specific fields of a UserProfile document in Cloud Firestore.
 * Prevents stale overwrite of unrelated fields or newer cloud updates.
 */
export async function saveUserProfileFieldsToFirestore(
  userId: string,
  partialFields: Partial<UserProfile>,
  lastKnownUpdatedAt?: string
): Promise<boolean> {
  if (!userId || !partialFields || Object.keys(partialFields).length === 0) return false;

  const currentUser = auth.currentUser;
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.includes('ais-dev')
  );
  const isDemoProfile = userId === 'user-admin-belkin' || userId.startsWith('agent-');

  if (!isDevMode) {
    if (!currentUser || currentUser.uid !== userId) {
      console.warn(`[Firestore Guard] Blocked unauthorized save to /users/${userId}. Auth UID: ${currentUser?.uid}`);
      return false;
    }
  } else {
    if (!isDemoProfile && currentUser && currentUser.uid !== userId) {
      console.warn(`[Firestore Guard Dev] Blocked save to /users/${userId}. Auth UID: ${currentUser?.uid}`);
      return false;
    }
  }

  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);

    const patchPayload: Record<string, any> = { ...partialFields };
    delete patchPayload.password;
    delete patchPayload.aiApiKey; // CRITICAL: AI API key must never be stored in /users/{uid}

    let nextVersion = 1;
    const nowIso = new Date().toISOString();
    const localTime = lastKnownUpdatedAt ? new Date(lastKnownUpdatedAt).getTime() : 0;

    if (snap.exists()) {
      const cloudData = snap.data() as UserProfile;
      const cloudTime = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;
      nextVersion = (cloudData.version || 0) + 1;

      // Safe merge if cloud version is newer than the local baseline
      if (cloudTime > localTime) {
        console.warn(`[Firestore Concurrency Guard] Cloud profile /users/${userId} has newer updatedAt (${cloudData.updatedAt}) than local baseline (${lastKnownUpdatedAt}). Performing field-level safe merge.`);

        if (partialFields.notes && Array.isArray(cloudData.notes)) {
          patchPayload.notes = mergeArrayById(cloudData.notes, partialFields.notes);
        }
        if (partialFields.bookmarks && Array.isArray(cloudData.bookmarks)) {
          patchPayload.bookmarks = mergeArrayById(cloudData.bookmarks, partialFields.bookmarks);
        }
        if (partialFields.timers && Array.isArray(cloudData.timers)) {
          patchPayload.timers = mergeArrayById(cloudData.timers, partialFields.timers);
        }
        if (partialFields.feeds && Array.isArray(cloudData.feeds)) {
          patchPayload.feeds = mergeArrayById(cloudData.feeds, partialFields.feeds);
        }
        if (partialFields.workSchedules && cloudData.workSchedules) {
          patchPayload.workSchedules = mergeWorkSchedulesLWW(cloudData.workSchedules, partialFields.workSchedules);
        }
      }
    }

    patchPayload.version = nextVersion;
    patchPayload.updatedAt = nowIso;

    // Granular update: Only write patchPayload to Firestore (no whole-profile wipe of unrelated fields!)
    await setDoc(userDocRef, patchPayload, { merge: true });

    // Connection restored & write succeeded: trigger background flush of remaining queue if any
    if (userId) {
      resetRetryState(userId);
      flushPendingQueue(userId).catch(() => {});
    }
    return true;
  } catch (err) {
    logFirestoreError('UPDATE_USER_FIELDS', `users/${userId}`, err);
    if (isRetryableError(err)) {
      categorizeAndQueuePartialFields(userId, partialFields, lastKnownUpdatedAt);
    }
    return false;
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
