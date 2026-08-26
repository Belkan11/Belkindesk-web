import { doc, getDoc, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import { db } from './firebase';
import { PendingOperation, PendingEntityType, UserProfile, NewsCard } from '../types';

const activeFlushes = new Set<string>();

const TAB_ID = typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

/**
 * Checks whether a flush operation is currently active for the given userId in memory.
 */
export function isFlushingUser(userId: string): boolean {
  return activeFlushes.has(userId);
}

function getItemTimestamp(item: any): number {
  if (!item) return 0;
  const upd = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  const del = item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
  const val = Math.max(isNaN(upd) ? 0 : upd, isNaN(del) ? 0 : del);
  return val;
}

/**
 * Merges two arrays of objects by their `id` property using Last-Write-Wins (LWW).
 * Respects tombstone deletions:
 * - Compares `updatedAt` / `deletedAt` timestamps.
 * - If timestamps are equal, compares `version` property.
 * - If versions are equal, tombstone (deleted: true) takes priority over deleted: false.
 * - A newer active version (deleted: false) with a higher timestamp/version can restore/recreate a tombstone.
 */
export function mergeArrayById<T extends { id?: string; updatedAt?: string; deletedAt?: string; version?: number; deleted?: boolean }>(
  cloudArr: T[] = [],
  localArr: T[] = []
): T[] {
  if (!Array.isArray(cloudArr)) cloudArr = [];
  if (!Array.isArray(localArr)) return cloudArr;

  const resultMap = new Map<string, T>();

  for (const item of cloudArr) {
    if (!item) continue;
    if (item.id) {
      resultMap.set(item.id, item);
    }
  }

  const unnamedLocal: T[] = [];
  for (const item of localArr) {
    if (!item) continue;
    if (!item.id) {
      unnamedLocal.push(item);
      continue;
    }

    const cloudItem = resultMap.get(item.id);
    if (!cloudItem) {
      resultMap.set(item.id, item);
    } else {
      const cloudTime = getItemTimestamp(cloudItem);
      const localTime = getItemTimestamp(item);

      if (localTime > cloudTime) {
        resultMap.set(item.id, item);
      } else if (cloudTime > localTime) {
        resultMap.set(item.id, cloudItem);
      } else {
        const cloudVer = cloudItem.version || 0;
        const localVer = item.version || 0;
        if (localVer > cloudVer) {
          resultMap.set(item.id, item);
        } else if (cloudVer > localVer) {
          resultMap.set(item.id, cloudItem);
        } else {
          if (item.deleted && !cloudItem.deleted) {
            resultMap.set(item.id, item);
          } else if (cloudItem.deleted && !item.deleted) {
            resultMap.set(item.id, cloudItem);
          } else {
            resultMap.set(item.id, { ...cloudItem, ...item });
          }
        }
      }
    }
  }

  return [...Array.from(resultMap.values()), ...unnamedLocal];
}

/**
 * Merges work schedule records by date key using Last-Write-Wins with tombstone support.
 */
export function mergeWorkSchedulesLWW(
  cloudSchedules: Record<string, any> = {},
  localSchedules: Record<string, any> = {}
): Record<string, any> {
  const result = { ...(cloudSchedules || {}) };
  if (!localSchedules || typeof localSchedules !== 'object') return result;

  for (const dateKey of Object.keys(localSchedules)) {
    const localItem = localSchedules[dateKey];
    const cloudItem = result[dateKey];

    if (!cloudItem) {
      result[dateKey] = localItem;
    } else if (localItem && typeof localItem === 'object') {
      const cloudTime = getItemTimestamp(cloudItem);
      const localTime = getItemTimestamp(localItem);

      if (localTime > cloudTime) {
        result[dateKey] = localItem;
      } else if (cloudTime > localTime) {
        result[dateKey] = cloudItem;
      } else {
        const cloudVer = cloudItem.version || 0;
        const localVer = localItem.version || 0;
        if (localVer > cloudVer) {
          result[dateKey] = localItem;
        } else if (cloudVer > localVer) {
          result[dateKey] = cloudItem;
        } else {
          if (localItem.deleted && !cloudItem.deleted) {
            result[dateKey] = localItem;
          } else if (cloudItem.deleted && !localItem.deleted) {
            result[dateKey] = cloudItem;
          } else {
            result[dateKey] = { ...cloudItem, ...localItem };
          }
        }
      }
    }
  }
  return result;
}

/**
 * Reconciles a realtime UserProfile snapshot from Firestore with unsynced local pending operations.
 * Ensures Device A's unsynced pending modifications are preserved in state until flush occurs,
 * while applying Device B's realtime changes for unrelated entities immediately.
 */
export function reconcileRealtimeWithPendingQueue(
  cloudProfile: UserProfile,
  pendingQueue: PendingOperation[]
): UserProfile {
  if (!cloudProfile || !Array.isArray(pendingQueue) || pendingQueue.length === 0) {
    return cloudProfile;
  }

  const result = { ...cloudProfile };

  for (const op of pendingQueue) {
    if (!op || op.userId !== cloudProfile.id) continue;

    if (op.entityType === 'notes' && Array.isArray(op.payload)) {
      result.notes = mergeArrayById(result.notes || [], op.payload);
    } else if (op.entityType === 'bookmarks' && Array.isArray(op.payload)) {
      result.bookmarks = mergeArrayById(result.bookmarks || [], op.payload);
    } else if (op.entityType === 'timers' && Array.isArray(op.payload)) {
      result.timers = mergeArrayById(result.timers || [], op.payload);
    } else if (op.entityType === 'feeds' && Array.isArray(op.payload)) {
      result.feeds = mergeArrayById(result.feeds || [], op.payload);
    } else if (op.entityType === 'workSchedules' && typeof op.payload === 'object') {
      result.workSchedules = mergeWorkSchedulesLWW(result.workSchedules || {}, op.payload);
    } else if (op.entityType === 'workspaceConfig' && typeof op.payload === 'object') {
      result.workspaceConfig = { ...(result.workspaceConfig || {}), ...op.payload };
    } else if ((op.entityType === 'aiSettings' || op.entityType === 'userProfile') && typeof op.payload === 'object') {
      Object.assign(result, op.payload);
    }
  }

  return result;
}

/**
 * Returns the UID-isolated storage key for a user's pending sync queue.
 * Strict format: `belkindesk_pending_sync_v1_${userId}`
 */
export function getPendingQueueKey(userId: string): string {
  if (!userId) return '';
  return `belkindesk_pending_sync_v1_${userId}`;
}

export const MAX_RETRY_COUNT = 10;

const activeRetryTimers = new Map<string, any>();

/**
 * Clears any pending retry timer for a specific user.
 */
export function clearRetryTimer(userId: string): void {
  if (activeRetryTimers.has(userId)) {
    clearTimeout(activeRetryTimers.get(userId));
    activeRetryTimers.delete(userId);
  }
}

/**
 * Calculates exponential backoff delay with random jitter.
 * Sequence: 1s -> 2s -> 4s -> 8s -> 15s (max) + 0..500ms jitter.
 */
export function calculateBackoffDelay(retryCount: number): number {
  const baseDelay = 1000 * Math.pow(2, Math.max(0, retryCount - 1));
  const cappedDelay = Math.min(baseDelay, 15000);
  const jitter = Math.floor(Math.random() * 500);
  return cappedDelay + jitter;
}

/**
 * Resets retry count and status for all operations in a user's pending queue.
 * Enables execution after network recovery, new login, or manual sync trigger.
 */
export function resetRetryState(userId: string): void {
  if (!userId) return;
  clearRetryTimer(userId);
  const queue = getPendingQueue(userId);
  if (queue.length === 0) return;

  let changed = false;
  const updatedQueue = queue.map((op) => {
    if ((op.retryCount && op.retryCount > 0) || op.status === 'failed_retryable') {
      changed = true;
      return { ...op, retryCount: 0, status: 'pending' as const };
    }
    return op;
  });

  if (changed) {
    savePendingQueue(userId, updatedQueue);
  }
}

/**
 * Checks if a Firestore or Network error is retryable.
 * NON-RETRYABLE: permission-denied, unauthenticated, invalid-argument, failed-precondition, not-found, already-exists, unauthorized, blocked.
 * RETRYABLE: offline state, network/fetch failures, unavailable, deadline-exceeded, resource-exhausted, quota-exceeded, internal, unknown.
 */
export function isRetryableError(err: any): boolean {
  if (!err) return false;

  const errStr = (err.code || err.message || err.toString() || '').toLowerCase();

  // Non-retryable security / permissions / schema / data validation / logical conflict errors
  if (
    errStr.includes('permission-denied') ||
    errStr.includes('unauthenticated') ||
    errStr.includes('invalid-argument') ||
    errStr.includes('failed-precondition') ||
    errStr.includes('not-found') ||
    errStr.includes('already-exists') ||
    errStr.includes('unauthorized') ||
    errStr.includes('blocked')
  ) {
    return false;
  }

  // Explicit retryable offline / network / server / rate-limit issues
  if (
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    errStr.includes('unavailable') ||
    errStr.includes('deadline-exceeded') ||
    errStr.includes('network') ||
    errStr.includes('failed to fetch') ||
    errStr.includes('offline') ||
    errStr.includes('internal') ||
    errStr.includes('resource-exhausted') ||
    errStr.includes('quota-exceeded') ||
    errStr.includes('unknown')
  ) {
    return true;
  }

  // Fallback for default network transport errors during setDoc / updateDoc
  return true;
}

/**
 * Read current pending sync queue for a specific userId from local storage.
 * Enforces strict UID isolation.
 */
export function getPendingQueue(userId: string): PendingOperation[] {
  if (!userId) return [];
  const key = getPendingQueueKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Ensure all items belong to this exact userId
    return parsed.filter((item: any) => item && item.userId === userId);
  } catch (err) {
    console.warn(`[PendingSync] Failed to read pending queue for ${userId}:`, err);
    return [];
  }
}

/**
 * Persist pending sync queue array for a specific userId.
 */
export function savePendingQueue(userId: string, queue: PendingOperation[]): void {
  if (!userId) return;
  const key = getPendingQueueKey(userId);
  try {
    const validQueue = queue.filter((item) => item && item.userId === userId);
    localStorage.setItem(key, JSON.stringify(validQueue));
  } catch (err) {
    console.warn(`[PendingSync] Failed to save pending queue for ${userId}:`, err);
  }
}

/**
 * Add or merge a pending operation in the user's queue with deduplication.
 * Collapses duplicate operations on same entityType + entityId.
 */
export function addPendingOperation(
  opInput: Omit<PendingOperation, 'id' | 'createdAt' | 'retryCount'>
): PendingOperation | null {
  const { userId, entityType, entityId, operation, payload, baseUpdatedAt, localUpdatedAt } = opInput;
  if (!userId) return null;

  // Prevent duplicate enqueue during sync flush worker execution
  if (isFlushingUser(userId)) {
    return null;
  }

  const now = new Date().toISOString();
  const queue = getPendingQueue(userId);

  // Search for an existing operation with same entityType + entityId (or same entityType if no entityId)
  const existingIdx = queue.findIndex((item) => {
    if (item.userId !== userId || item.entityType !== entityType) return false;
    if (entityId) {
      return item.entityId === entityId;
    }
    return !item.entityId;
  });

  let resultOp: PendingOperation;

  if (existingIdx !== -1) {
    const existing = queue[existingIdx];

    let mergedPayload = payload;
    // Shallow merge object payloads for fields/settings
    if (
      typeof existing.payload === 'object' && existing.payload !== null &&
      typeof payload === 'object' && payload !== null &&
      !Array.isArray(existing.payload) && !Array.isArray(payload)
    ) {
      mergedPayload = { ...existing.payload, ...payload };
    }

    resultOp = {
      ...existing,
      operation: operation || existing.operation,
      payload: mergedPayload,
      baseUpdatedAt: baseUpdatedAt || existing.baseUpdatedAt,
      localUpdatedAt: localUpdatedAt || now,
      retryCount: 0, // Reset retry count on new offline edit
      status: 'pending',
    };

    queue[existingIdx] = resultOp;
  } else {
    resultOp = {
      id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      userId,
      entityType,
      entityId,
      operation: operation || 'update',
      payload,
      baseUpdatedAt,
      localUpdatedAt: localUpdatedAt || now,
      createdAt: now,
      retryCount: 0,
      status: 'pending',
    };
    queue.push(resultOp);
  }

  savePendingQueue(userId, queue);
  return resultOp;
}

/**
 * Remove a single operation from the user's pending queue.
 */
export function removePendingOperation(userId: string, opId: string): void {
  if (!userId || !opId) return;
  const queue = getPendingQueue(userId);
  const nextQueue = queue.filter((item) => item.id !== opId);
  savePendingQueue(userId, nextQueue);
}

/**
 * Update an operation in the user's pending queue (e.g., increment retryCount).
 */
export function updatePendingOperation(
  userId: string,
  opId: string,
  updates: Partial<PendingOperation>
): void {
  if (!userId || !opId) return;
  const queue = getPendingQueue(userId);
  const idx = queue.findIndex((item) => item.id === opId);
  if (idx !== -1) {
    queue[idx] = { ...queue[idx], ...updates };
    savePendingQueue(userId, queue);
  }
}

/**
 * Clear all pending operations for a specific user.
 */
export function clearPendingQueue(userId: string): void {
  if (!userId) return;
  const key = getPendingQueueKey(userId);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[PendingSync] Failed to clear queue for ${userId}:`, err);
  }
}

/**
 * Split partial UserProfile updates into entity-specific pending operations upon offline/retryable failure.
 */
export function categorizeAndQueuePartialFields(
  userId: string,
  partialFields: Partial<UserProfile>,
  lastKnownUpdatedAt?: string
): void {
  if (!userId || !partialFields || Object.keys(partialFields).length === 0) return;

  const now = new Date().toISOString();
  const fields = { ...partialFields };
  delete (fields as any).password;

  if (fields.notes !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'notes',
      operation: 'update',
      payload: fields.notes,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.notes;
  }

  if (fields.bookmarks !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'bookmarks',
      operation: 'update',
      payload: fields.bookmarks,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.bookmarks;
  }

  if (fields.timers !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'timers',
      operation: 'update',
      payload: fields.timers,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.timers;
  }

  if (fields.feeds !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'feeds',
      operation: 'update',
      payload: fields.feeds,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.feeds;
  }

  if (fields.workSchedules !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'workSchedules',
      operation: 'update',
      payload: fields.workSchedules,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.workSchedules;
  }

  if (fields.workspaceConfig !== undefined) {
    addPendingOperation({
      userId,
      entityType: 'workspaceConfig',
      operation: 'update',
      payload: fields.workspaceConfig,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
    delete fields.workspaceConfig;
  }

  const aiKeys: (keyof UserProfile)[] = ['aiProvider', 'aiApiKey', 'aiModel', 'aiUrl', 'customAiPrompt', 'enableAutoAiProcessing'];
  const aiPayload: Record<string, any> = {};
  let hasAi = false;
  aiKeys.forEach((k) => {
    if (fields[k] !== undefined) {
      aiPayload[k] = fields[k];
      hasAi = true;
      delete fields[k];
    }
  });

  if (hasAi) {
    addPendingOperation({
      userId,
      entityType: 'aiSettings',
      operation: 'update',
      payload: aiPayload,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
  }

  if (Object.keys(fields).length > 0) {
    addPendingOperation({
      userId,
      entityType: 'userProfile',
      operation: 'update',
      payload: fields,
      baseUpdatedAt: lastKnownUpdatedAt,
      localUpdatedAt: now,
    });
  }
}

/**
 * Ensures only one browser tab executes flushPendingQueue for a given userId at a time.
 */
async function withFlushLock<T>(userId: string, fn: () => Promise<T>): Promise<T | undefined> {
  const lockName = `belkindesk_flush_lock_${userId}`;

  // 1. Web Locks API (supported in all modern browsers)
  if (typeof navigator !== 'undefined' && navigator.locks && typeof navigator.locks.request === 'function') {
    return navigator.locks.request(lockName, { ifAvailable: true }, async (lock) => {
      if (!lock) return undefined;
      return await fn();
    });
  }

  // 2. localStorage fallback with owner token & 15-second TTL
  const lockKey = `belkindesk_tab_lock_${userId}`;
  const now = Date.now();
  const rawLock = localStorage.getItem(lockKey);

  if (rawLock) {
    try {
      const { ownerToken, expiresAt } = JSON.parse(rawLock);
      if (expiresAt > now && ownerToken !== TAB_ID) {
        return undefined;
      }
    } catch {}
  }

  const expiresAt = now + 15000;
  localStorage.setItem(lockKey, JSON.stringify({ ownerToken: TAB_ID, expiresAt }));

  try {
    return await fn();
  } finally {
    const currentRaw = localStorage.getItem(lockKey);
    if (currentRaw) {
      try {
        const parsed = JSON.parse(currentRaw);
        if (parsed.ownerToken === TAB_ID) {
          localStorage.removeItem(lockKey);
        }
      } catch {}
    }
  }
}

/**
 * Flush all pending offline operations for a specific user to Cloud Firestore.
 * Performs safe optimistic merges and conflict resolution before writing to Firestore.
 */
export async function flushPendingQueue(userId: string): Promise<void> {
  if (!userId) return;
  // Offline Guard: Do not attempt network calls if browser is offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  if (activeFlushes.has(userId)) return; // Concurrency guard: prevent multi-flush for same UID

  clearRetryTimer(userId);

  await withFlushLock(userId, async () => {
    const queue = getPendingQueue(userId);
    if (queue.length === 0) return;

    activeFlushes.add(userId);

    try {
      for (const op of queue) {
        // Re-check network before processing each operation
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          break;
        }

        if (op.userId !== userId) continue;

        // Skip paused ops that exceeded max retries, unless online reconnect or reset state occurs
        if (op.status === 'failed_retryable' && (op.retryCount || 0) >= MAX_RETRY_COUNT) {
          continue;
        }

        try {
          if (op.entityType === 'newsCards') {
            if (!op.entityId) {
              removePendingOperation(userId, op.id);
              continue;
            }
            const cardRef = doc(db, 'users', userId, 'newsCards', op.entityId);

            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(cardRef);
              const baseTime = op.baseUpdatedAt ? new Date(op.baseUpdatedAt).getTime() : 0;
              const localTime = op.localUpdatedAt ? new Date(op.localUpdatedAt).getTime() : Date.now();

              const localCard = op.payload as NewsCard;
              const isDelete = op.operation === 'delete' || localCard?.deleted === true;

              if (isDelete) {
                const cloudCard = snap.exists() ? (snap.data() as NewsCard) : null;
                const cloudTime = cloudCard ? getItemTimestamp(cloudCard) : 0;
                const localTime = Math.max(
                  op.localUpdatedAt ? new Date(op.localUpdatedAt).getTime() : 0,
                  getItemTimestamp(localCard) || Date.now()
                );

                if (cloudCard && cloudTime > localTime && !cloudCard.deleted && (cloudCard.version || 0) > (localCard?.version || 0)) {
                  console.warn(`[PendingSync] Cloud card ${op.entityId} was updated after delete. Retaining cloud card.`);
                } else {
                  const nowIso = new Date().toISOString();
                  const tombstoneCard: NewsCard = {
                    ...(cloudCard || {}),
                    ...(localCard || {}),
                    id: op.entityId,
                    title: localCard?.title || cloudCard?.title || '',
                    url: localCard?.url || cloudCard?.url || '',
                    sourceId: localCard?.sourceId || cloudCard?.sourceId || '',
                    sourceName: localCard?.sourceName || cloudCard?.sourceName || '',
                    publishedAt: localCard?.publishedAt || cloudCard?.publishedAt || nowIso,
                    fetchedAt: localCard?.fetchedAt || cloudCard?.fetchedAt || nowIso,
                    updatedAt: localCard?.updatedAt || nowIso,
                    deleted: true,
                    deletedAt: localCard?.deletedAt || localCard?.updatedAt || nowIso,
                    version: Math.max((cloudCard?.version || 0) + 1, (localCard?.version || 0) + 1),
                  };
                  transaction.set(cardRef, tombstoneCard, { merge: true });
                }
                return;
              }

              // create / update operation
              if (snap.exists()) {
                const cloudCard = snap.data() as NewsCard;
                const cloudTime = getItemTimestamp(cloudCard);
                const localTime = getItemTimestamp(localCard) || (op.localUpdatedAt ? new Date(op.localUpdatedAt).getTime() : Date.now());

                if (cloudCard.deleted && cloudTime >= localTime) {
                  // Cloud tombstone wins
                  console.warn(`[PendingSync] newsCard ${op.entityId} has newer tombstone in Cloud. Ignoring local update.`);
                } else {
                  const mergedCard: NewsCard = {
                    ...cloudCard,
                    ...localCard,
                    deleted: Boolean(localCard.deleted),
                    isRead: localTime >= cloudTime ? Boolean(localCard.isRead) : Boolean(cloudCard.isRead),
                    isStarred: localTime >= cloudTime ? Boolean(localCard.isStarred) : Boolean(cloudCard.isStarred),
                    isHidden: localTime >= cloudTime ? Boolean(localCard.isHidden) : Boolean(cloudCard.isHidden),
                    savedLater: localTime >= cloudTime ? Boolean(localCard.savedLater) : Boolean(cloudCard.savedLater),
                    userNote: localTime >= cloudTime ? (localCard.userNote || '') : (cloudCard.userNote || ''),
                    updatedAt: localTime >= cloudTime ? (localCard.updatedAt || new Date().toISOString()) : cloudCard.updatedAt,
                    version: Math.max((cloudCard.version || 0) + 1, (localCard.version || 0) + 1),
                  };
                  transaction.set(cardRef, mergedCard, { merge: true });
                }
              } else {
                transaction.set(cardRef, localCard, { merge: true });
              }
            });

            removePendingOperation(userId, op.id);
          } else {
            // Document /users/${userId}
            const userDocRef = doc(db, 'users', userId);

            await runTransaction(db, async (transaction) => {
              const snap = await transaction.get(userDocRef);
              const baseTime = op.baseUpdatedAt ? new Date(op.baseUpdatedAt).getTime() : 0;
              const localTime = op.localUpdatedAt ? new Date(op.localUpdatedAt).getTime() : Date.now();
              const patchPayload: Record<string, any> = {};

              if (snap.exists()) {
                const cloudData = snap.data() as UserProfile;
                const cloudTime = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;

                if (cloudTime <= baseTime) {
                  // Direct apply
                  if (op.entityType === 'notes') patchPayload.notes = op.payload;
                  else if (op.entityType === 'bookmarks') patchPayload.bookmarks = op.payload;
                  else if (op.entityType === 'timers') patchPayload.timers = op.payload;
                  else if (op.entityType === 'feeds') patchPayload.feeds = op.payload;
                  else if (op.entityType === 'workSchedules') patchPayload.workSchedules = op.payload;
                  else if (op.entityType === 'workspaceConfig') patchPayload.workspaceConfig = op.payload;
                  else if (op.entityType === 'aiSettings' || op.entityType === 'userProfile') {
                    Object.assign(patchPayload, op.payload);
                  }
                } else {
                  // Cloud changed after base - Safe entity-level merge
                  if (op.entityType === 'notes') {
                    patchPayload.notes = mergeArrayById(cloudData.notes || [], op.payload || []);
                  } else if (op.entityType === 'bookmarks') {
                    patchPayload.bookmarks = mergeArrayById(cloudData.bookmarks || [], op.payload || []);
                  } else if (op.entityType === 'timers') {
                    patchPayload.timers = mergeArrayById(cloudData.timers || [], op.payload || []);
                  } else if (op.entityType === 'feeds') {
                    patchPayload.feeds = mergeArrayById(cloudData.feeds || [], op.payload || []);
                  } else if (op.entityType === 'workSchedules') {
                    patchPayload.workSchedules = mergeWorkSchedulesLWW(cloudData.workSchedules || {}, op.payload || {});
                  } else if (op.entityType === 'workspaceConfig') {
                    patchPayload.workspaceConfig = localTime >= cloudTime
                      ? { ...(cloudData.workspaceConfig || {}), ...(op.payload || {}) }
                      : { ...(op.payload || {}), ...(cloudData.workspaceConfig || {}) };
                  } else if (op.entityType === 'aiSettings' || op.entityType === 'userProfile') {
                    if (localTime >= cloudTime) {
                      Object.assign(patchPayload, op.payload);
                    } else {
                      const patch: Record<string, any> = {};
                      for (const k of Object.keys(op.payload || {})) {
                        if ((cloudData as any)[k] === undefined) {
                          patch[k] = op.payload[k];
                        }
                      }
                      Object.assign(patchPayload, patch);
                    }
                  }
                }

                patchPayload.updatedAt = new Date().toISOString();
                patchPayload.version = (cloudData.version || 0) + 1;
                transaction.set(userDocRef, patchPayload, { merge: true });
              } else {
                // Document doesn't exist
                if (op.entityType === 'notes') patchPayload.notes = op.payload;
                else if (op.entityType === 'bookmarks') patchPayload.bookmarks = op.payload;
                else if (op.entityType === 'timers') patchPayload.timers = op.payload;
                else if (op.entityType === 'feeds') patchPayload.feeds = op.payload;
                else if (op.entityType === 'workSchedules') patchPayload.workSchedules = op.payload;
                else if (op.entityType === 'workspaceConfig') patchPayload.workspaceConfig = op.payload;
                else if (op.entityType === 'aiSettings' || op.entityType === 'userProfile') {
                  Object.assign(patchPayload, op.payload);
                }
                patchPayload.updatedAt = new Date().toISOString();
                patchPayload.version = 1;
                transaction.set(userDocRef, patchPayload, { merge: true });
              }
            });

            removePendingOperation(userId, op.id);
          }
        } catch (err) {
          console.warn(`[PendingSync] Failed to process op ${op.id} (${op.entityType}):`, err);
          if (isRetryableError(err)) {
            const nextRetry = (op.retryCount || 0) + 1;
            const isExceeded = nextRetry >= MAX_RETRY_COUNT;

            updatePendingOperation(userId, op.id, {
              retryCount: nextRetry,
              status: isExceeded ? 'failed_retryable' : 'pending',
            });

            if (isExceeded) {
              console.warn(`[PendingSync] Op ${op.id} reached max retry limit (${MAX_RETRY_COUNT}). Operation preserved in queue with status 'failed_retryable'.`);
            } else if (typeof navigator !== 'undefined' && navigator.onLine) {
              const delayMs = calculateBackoffDelay(nextRetry);
              console.info(`[PendingSync] Scheduling retry #${nextRetry} for op ${op.id} in ${delayMs}ms.`);

              if (!activeRetryTimers.has(userId)) {
                const timer = setTimeout(() => {
                  activeRetryTimers.delete(userId);
                  flushPendingQueue(userId).catch(() => {});
                }, delayMs);
                activeRetryTimers.set(userId, timer);
              }
            }
          } else {
            // Non-retryable error (e.g. permission-denied, unauthenticated, invalid-argument): remove to avoid infinite loops
            console.warn(`[PendingSync] Non-retryable error for op ${op.id}. Removing from queue.`);
            removePendingOperation(userId, op.id);
          }
        }
      }
    } finally {
      activeFlushes.delete(userId);
    }
  });
}

// Global Reconnect Listener
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('belkindesk_pending_sync_v1_')) {
          const uid = key.replace('belkindesk_pending_sync_v1_', '');
          if (uid) {
            resetRetryState(uid);
            flushPendingQueue(uid).catch(() => {});
          }
        }
      }
    } catch {}
  });
}

