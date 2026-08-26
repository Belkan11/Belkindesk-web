import { UserProfile, MedicalNote, MedicalTimerItem, AccessibilityConfig } from '../types';
import { sanitizeProfilesForBackup } from './sanitizeBackup';

export interface BelkinDeskBackupPackage {
  version: '2.0-cloud';
  exportedAt: string;
  appName: string;
  profiles: Partial<UserProfile>[];
  currentUserId: string;
  notes?: MedicalNote[];
  timers?: MedicalTimerItem[];
  accessibility?: AccessibilityConfig;
  customData?: Record<string, any>;
}

/**
 * Export full user database to a downloadable JSON file
 * which user can save directly to Google Drive, Dropbox or local disk
 */
export function exportDatabaseToJson(
  profiles: UserProfile[],
  currentUserId: string,
  notes: MedicalNote[],
  timers: MedicalTimerItem[],
  accessibility: AccessibilityConfig
): void {
  const sanitizedProfiles = sanitizeProfilesForBackup(profiles);
  const pkg: BelkinDeskBackupPackage = {
    version: '2.0-cloud',
    exportedAt: new Date().toISOString(),
    appName: 'BelkinDESK MED ♥',
    profiles: sanitizedProfiles,
    currentUserId,
    notes,
    timers,
    accessibility,
  };

  const jsonStr = JSON.stringify(pkg, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `BelkinDESK_Database_Backup_${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate and parse a backup file
 */
export function parseBackupFile(fileContent: string): BelkinDeskBackupPackage {
  try {
    const data = JSON.parse(fileContent);
    if (!data || typeof data !== 'object') {
      throw new Error('Некорректный формат файла резервной копии');
    }
    if (!Array.isArray(data.profiles) && !Array.isArray(data.notes)) {
      throw new Error('В файле отсутствуют необходимые данные профилей или заметок');
    }
    return data as BelkinDeskBackupPackage;
  } catch (err: any) {
    throw new Error(err?.message || 'Ошибка разбора JSON файла');
  }
}
