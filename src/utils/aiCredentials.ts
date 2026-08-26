import { auth, db } from './firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';

export interface SaveAiCredentialsParams {
  provider?: string;
  apiKey?: string;
  model?: string;
  url?: string;
  customPrompt?: string;
}

export interface AiCredentialsConfig {
  provider: 'gemini' | 'openai' | 'openrouter' | 'custom';
  model: string;
  url: string;
  hasApiKey: boolean;
  customPrompt: string;
}

/**
 * Save user AI credentials to server-side /userSecrets/{uid} collection
 * Only the server has read/write privileges. Client never retains the plaintext key.
 */
export async function saveAiCredentialsToServer(params: SaveAiCredentialsParams): Promise<{ success: boolean; hasApiKey?: boolean; error?: string }> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'User is not authenticated' };
    }
    const token = await user.getIdToken();
    const res = await fetch('/api/user/ai-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data.error || `HTTP ${res.status}` };
    }

    const data = await res.json();
    return { success: true, hasApiKey: data.hasApiKey };
  } catch (err: any) {
    console.warn('[AICredentials] Error saving AI credentials to server:', err);
    return { success: false, error: err.message || 'Network error' };
  }
}

/**
 * Fetch safe non-secret configuration of AI provider from server
 */
export async function getAiCredentialsConfigFromServer(): Promise<AiCredentialsConfig | null> {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    const token = await user.getIdToken();
    const res = await fetch('/api/user/ai-credentials', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;
    const data = await res.json();
    return {
      provider: data.provider || 'gemini',
      model: data.model || '',
      url: data.url || '',
      hasApiKey: !!data.hasApiKey,
      customPrompt: data.customPrompt || '',
    };
  } catch (err) {
    console.warn('[AICredentials] Error loading AI credentials config:', err);
    return null;
  }
}

/**
 * Delete stored AI credentials from server
 */
export async function deleteAiCredentialsFromServer(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    const token = await user.getIdToken();
    const res = await fetch('/api/user/ai-credentials', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    return res.ok;
  } catch (err) {
    console.warn('[AICredentials] Error deleting AI credentials from server:', err);
    return false;
  }
}

/**
 * One-time background migration of legacy client-stored plaintext keys.
 * If a legacy key exists in localStorage or Firestore user profile:
 * 1. Sends to server /api/user/ai-credentials
 * 2. ONLY upon successful confirmation (200 OK), cleans up client-side plaintext key.
 * 3. Never deletes local key if migration encounters an error.
 */
export async function migrateLegacyAiKeysIfPresent(userId: string, profileApiKey?: string): Promise<{ migrated: boolean }> {
  if (!userId) return { migrated: false };

  const legacyKeyKey = `belkin_user_ai_key_${userId}`;
  const globalKeyKey = 'belkin_user_ai_key';
  const legacyLocalKey = typeof window !== 'undefined' ? (localStorage.getItem(legacyKeyKey) || localStorage.getItem(globalKeyKey)) : null;
  const keyToMigrate = (legacyLocalKey || profileApiKey || '').trim();

  // If no legacy plaintext key exists, migration is not needed
  if (!keyToMigrate) {
    return { migrated: false };
  }

  const provider = (typeof window !== 'undefined' ? (localStorage.getItem(`belkin_user_ai_provider_${userId}`) || localStorage.getItem('belkin_user_ai_provider')) : null) || 'gemini';
  const model = (typeof window !== 'undefined' ? (localStorage.getItem(`belkin_user_ai_model_${userId}`) || localStorage.getItem('belkin_user_ai_model')) : null) || '';
  const url = (typeof window !== 'undefined' ? (localStorage.getItem(`belkin_user_ai_url_${userId}`) || localStorage.getItem('belkin_user_ai_url')) : null) || '';

  console.info(`[AICredentials] Initiating safe one-time migration of AI key for user ${userId}...`);

  const result = await saveAiCredentialsToServer({
    provider,
    apiKey: keyToMigrate,
    model,
    url,
  });

  if (result.success) {
    console.info(`[AICredentials] AI key successfully migrated to server-side storage for user ${userId}. Cleaning up plaintext instances.`);
    
    // Clean up localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(legacyKeyKey);
      localStorage.removeItem(globalKeyKey);
    }

    // Clean up Firestore /users/{uid} document
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        aiApiKey: deleteField(),
      });
    } catch (firestoreErr) {
      console.warn('[AICredentials] Note on cleaning up aiApiKey from user doc:', firestoreErr);
    }

    return { migrated: true };
  } else {
    console.warn('[AICredentials] Migration to server failed. Preserving local key for data safety:', result.error);
    return { migrated: false };
  }
}
