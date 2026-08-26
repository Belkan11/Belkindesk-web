import { UserProfile } from '../types';
import { saveAiCredentialsToServer } from './aiCredentials';

/**
 * Sanitizes an array of user profiles before JSON serialization for backup export.
 * Strictly removes:
 * - aiApiKey (plaintext API keys)
 * - password
 * - tokens / userSecrets / sensitive credential fields
 * Sets hasAiApiKey: true if the user had an active key.
 */
export function sanitizeProfilesForBackup(profiles: UserProfile[]): Partial<UserProfile>[] {
  if (!Array.isArray(profiles)) return [];

  return profiles.map((p) => {
    const hasKey = !!(p.hasAiApiKey || (p.aiApiKey && p.aiApiKey.trim().length > 0));
    
    // Deep clone/spread profile
    const sanitized: Record<string, any> = { ...p };

    // Explicitly delete all sensitive credential fields
    delete sanitized.aiApiKey;
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.tokens;
    delete sanitized.userSecrets;
    delete sanitized.secret;
    delete sanitized.secrets;

    // Ensure safe boolean indicator is set
    sanitized.hasAiApiKey = hasKey;

    return sanitized as Partial<UserProfile>;
  });
}

/**
 * Handles legacy credentials during backup import:
 * - If legacy aiApiKey is present in the imported backup, safely migrates it to server-side /userSecrets/{uid}
 * - Never returns aiApiKey in the sanitized profile object
 * - Restored profile only contains safe non-secret AI settings
 */
export async function sanitizeAndMigrateImportedProfile(
  rawProfile: any,
  targetUserId?: string
): Promise<{ sanitizedProfile: UserProfile; migrationAttempted: boolean; migrationSuccess: boolean }> {
  if (!rawProfile || typeof rawProfile !== 'object') {
    throw new Error('Некорректный формат профиля');
  }

  const legacyKey = typeof rawProfile.aiApiKey === 'string' ? rawProfile.aiApiKey.trim() : '';
  const hasKey = !!(rawProfile.hasAiApiKey || legacyKey.length > 0);

  let migrationAttempted = false;
  let migrationSuccess = false;

  // If legacy plaintext key is found during import, safely send it to server-side userSecrets
  if (legacyKey.length > 0) {
    migrationAttempted = true;
    try {
      const res = await saveAiCredentialsToServer({
        provider: rawProfile.aiProvider || 'gemini',
        apiKey: legacyKey,
        model: rawProfile.aiModel || '',
        url: rawProfile.aiUrl || '',
        customPrompt: rawProfile.customAiPrompt || '',
      });
      migrationSuccess = res.success;
    } catch (e) {
      console.warn('[Backup] Legacy AI key migration during import encountered an issue:', e);
    }
  }

  const sanitized: UserProfile = {
    ...rawProfile,
    id: targetUserId || rawProfile.id,
    hasAiApiKey: migrationSuccess ? true : hasKey,
    aiProvider: rawProfile.aiProvider || 'gemini',
    aiModel: rawProfile.aiModel || '',
    aiUrl: rawProfile.aiUrl || '',
  };

  // Strip all secret fields from final profile state
  delete sanitized.aiApiKey;
  delete (sanitized as any).password;
  delete (sanitized as any).token;
  delete (sanitized as any).tokens;
  delete (sanitized as any).userSecrets;
  delete (sanitized as any).secret;
  delete (sanitized as any).secrets;

  return {
    sanitizedProfile: sanitized,
    migrationAttempted,
    migrationSuccess,
  };
}
