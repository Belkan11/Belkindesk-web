import { 
  UserProfile, 
  UserWorkspaceConfig, 
  FeedConfig, 
  Article, 
  DesktopBookmark, 
  CalendarEvent, 
  WorkDaySchedule,
  MedicalTimerItem,
  MedicalNote,
  AccessibilityConfig
} from '../types';
import { MEDICAL_FEEDS, INITIAL_MEDICAL_ARTICLES, ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS } from '../data/curatedFeeds';
import { 
  saveUserProfileToFirestore, 
  deleteUserProfileFromFirestore, 
  loadAllProfilesFromFirestore,
  saveBackupSnapshotToFirestore
} from './firebase';

export const DEFAULT_WORKSPACE_CONFIG: UserWorkspaceConfig = {
  layoutMode: 'split-reader',
  activeDesktopView: 'news-reader',
  theme: 'dark-luxury',
  fontSize: 'medium',
  fontFamily: 'sans',
  autoRefreshMinutes: 15,
  markAsReadOnScroll: false,
  enableSoundEffects: true,
  enableKeyboardShortcuts: true,
  showBookmarksBar: false,
  dailyWorkGoalHours: 8,
  pomodoroWorkMinutes: 25,
  pomodoroBreakMinutes: 5,
  collapsedCategories: [],
  filterUnreadOnly: false,
  filterStarredOnly: false,
  filterSavedOnly: false,
  activeCategory: 'all',
  activeFeedId: null,
  searchQuery: "",
  selectedArticleId: 'art-acc-edu',
  keywordMutes: [],
  keywordHighlights: ['ACC', 'ESC', 'РКО', 'Инфаркт', 'ХСН', 'ЭхоКГ'],
};

export const INITIAL_MEDICAL_TIMERS: MedicalTimerItem[] = [
  {
    id: 't-round',
    name: 'Утренний обход',
    targetTime: '08:30',
    status: 'active',
  },
  {
    id: 't-patients',
    name: 'Приём пациентов',
    targetTime: '11:00',
    status: 'active',
  },
  {
    id: 't-lunch',
    name: 'Обед / перерыв',
    targetTime: '13:30',
    status: 'active',
  },
  {
    id: 't-lecture',
    name: 'Консилиум / обучение',
    targetTime: '16:00',
    status: 'active',
  },
  {
    id: 't-shift-end',
    name: 'Конец смены',
    targetTime: '19:00',
    status: 'active',
    isEndShift: true,
  },
];

export const INITIAL_MEDICAL_NOTES: MedicalNote[] = [
  {
    id: 'note-4',
    text: 'заметка 3',
    createdAt: '2026-06-25T19:32:00Z',
    timestampStr: '2026-06-25 19:32',
  },
  {
    id: 'note-3',
    text: 'заметка 2',
    createdAt: '2026-06-25T19:32:00Z',
    timestampStr: '2026-06-25 19:32',
  },
  {
    id: 'note-2',
    text: 'заметка 1',
    createdAt: '2026-06-25T19:32:00Z',
    timestampStr: '2026-06-25 19:32',
  },
  {
    id: 'note-1',
    text: 'Добро пожаловать в BelkinDESK! 👋 Здесь собрано всё, что помогает держать рабочий день под контролем: заметки, новости, погода, расписание и история буфера обмена. Настройте BelkinDESK под себя — укажите важное время, выберите нужные новости и горячие клавиши. Удачной смены!',
    createdAt: '2026-06-25T19:32:00Z',
    timestampStr: '2026-06-25 19:32',
  },
];

export const INITIAL_ACCESSIBILITY: AccessibilityConfig = {
  scalePercent: 100,
  visualAcuity: 'Не указывать',
};

export const INITIAL_BOOKMARKS: DesktopBookmark[] = [
  {
    id: 'bm-run',
    title: 'run.exe',
    url: "run",
    category: 'Система',
    isPinned: true,
    description: 'Исполняемый файл или консоль Windows',
  },
  {
    id: 'bm-d',
    title: 'D:\\',
    url: "D:\\",
    category: 'Система',
    isPinned: true,
    description: 'Папка в проводнике Windows',
  },
  {
    id: 'bm-http',
    title: 'http:\\\\',
    url: "http:\\\\",
    category: 'Система',
    isPinned: true,
    description: 'Веб-портал и клинические рекомендации',
  },
];

export function getInitialCalendarEvents(): CalendarEvent[] {
  return [
    {
      id: 'ev-1',
      title: 'Утренний клинический обход',
      type: 'task',
      date: '2026-06-06',
      time: '08:30',
      priority: 'high',
      isCompleted: true,
    },
    {
      id: 'ev-2',
      title: 'Консилиум по сложному пациенту (ОРИТ)',
      type: 'task',
      date: '2026-06-06',
      time: '11:00',
      priority: 'critical',
      isCompleted: false,
    },
    {
      id: 'ev-3',
      title: 'Вебинар РКО: новые клинические рекомендации',
      type: 'task',
      date: '2026-06-06',
      time: '15:00',
      priority: 'medium',
      isCompleted: false,
    }
  ];
}

export function getInitialWorkSchedules(): Record<string, WorkDaySchedule> {
  const schedules: Record<string, WorkDaySchedule> = {};
  // Green duty days matching calendar screenshot: 2, 4, 5, 7, 8, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26
  const greenDays = [2, 4, 5, 7, 8, 11, 12, 19, 20, 21, 22, 23, 24, 25, 26];
  greenDays.forEach((day) => {
    const dStr = `2026-06-${String(day).padStart(2, '0')}`;
    schedules[dStr] = {
      date: dStr,
      shiftType: 'duty',
      startTime: '08:00',
      endTime: '20:00',
      notes: 'Дежурство по отделению неотложной кардиологии',
    };
  });

  // Red day 3
  schedules['2026-06-03'] = {
    date: '2026-06-03',
    shiftType: 'sick-leave',
    notes: 'Больничный / Санитарный день',
  };

  // Day 6 (Today, active yellow)
  schedules['2026-06-06'] = {
    date: '2026-06-06',
    shiftType: 'work-office',
    startTime: '08:00',
    endTime: '19:11',
    notes: 'Дневная смена + прием кардиологических пациентов',
  };

  return schedules;
}

const STORAGE_PROFILES_KEY = 'belkindesk_med_profiles_v3';
const STORAGE_CURRENT_USER_KEY = 'belkindesk_med_current_user_v3';
const STORAGE_ACTIVE_SESSION_KEY = 'belkindesk_active_auth_session_v3';
const STORAGE_NOTES_KEY = 'belkindesk_med_notes_v2';
const STORAGE_TIMERS_KEY = 'belkindesk_med_timers_v2';
const STORAGE_ACCESSIBILITY_KEY = 'belkindesk_med_accessibility_v2';
const STORAGE_BOOKMARKS_KEY = 'belkindesk_bottom_bookmarks_v2';

export function getStoredBookmarks(): DesktopBookmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_BOOKMARKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((b, i) => ({
          id: String(b.id || `bm-${i + 1}`),
          title: String(b.name || b.title || 'Ссылка'),
          url: String(b.url || ''),
          category: String(b.category || 'Система'),
          icon: b.icon,
          color: b.color,
          isPinned: b.isPinned !== false,
          description: b.description || '',
        }));
      }
    }
  } catch {}
  return INITIAL_BOOKMARKS;
}

export function saveStoredBookmarks(bookmarks: DesktopBookmark[]) {
  try {
    if (!Array.isArray(bookmarks)) return;
    localStorage.setItem(STORAGE_BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {}
}

export function getStoredAccessibility(): AccessibilityConfig {
  try {
    const raw = localStorage.getItem(STORAGE_ACCESSIBILITY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const scale = parsed.scalePercent;
        const validScale = [100, 125, 150, 175, 200].includes(Number(scale)) ? Number(scale) : 100;
        return {
          scalePercent: validScale as 100 | 125 | 150 | 175 | 200,
          visualAcuity: typeof parsed.visualAcuity === 'string' ? parsed.visualAcuity : 'Не указывать',
        };
      }
    }
  } catch {}
  return INITIAL_ACCESSIBILITY;
}

export function saveStoredAccessibility(cfg: AccessibilityConfig) {
  try {
    if (!cfg || typeof cfg !== 'object') return;
    localStorage.setItem(STORAGE_ACCESSIBILITY_KEY, JSON.stringify(cfg));
  } catch {}
}

export function getStoredMedicalNotes(): MedicalNote[] {
  try {
    const raw = localStorage.getItem(STORAGE_NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((n) => n && typeof n === 'object' && typeof n.text === 'string')
          .map((n, i) => ({
            id: String(n.id || `note-${Date.now()}-${i}`),
            text: String(n.text || ''),
            createdAt: String(n.createdAt || new Date().toISOString()),
            timestampStr: String(n.timestampStr || '2026-06-25 19:32'),
          }));
      }
    }
  } catch {}
  return INITIAL_MEDICAL_NOTES;
}

export function saveStoredMedicalNotes(notes: MedicalNote[]) {
  try {
    if (!Array.isArray(notes)) return;
    localStorage.setItem(STORAGE_NOTES_KEY, JSON.stringify(notes));
  } catch {}
}

export function getStoredMedicalTimers(): MedicalTimerItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_TIMERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((t) => t && typeof t === 'object')
          .map((t, i) => ({
            id: String(t.id || `timer-${i}`),
            name: String(t.name || 'Таймер'),
            targetTime: String(t.targetTime || '12:00'),
            status: t.status === 'done' ? 'done' : 'active',
            countdownSeconds: typeof t.countdownSeconds === 'number' ? Math.max(0, t.countdownSeconds) : 3600,
            isEndShift: Boolean(t.isEndShift),
          }));
      }
    }
  } catch {}
  return INITIAL_MEDICAL_TIMERS;
}

export function saveStoredMedicalTimers(timers: MedicalTimerItem[]) {
  try {
    if (!Array.isArray(timers)) return;
    localStorage.setItem(STORAGE_TIMERS_KEY, JSON.stringify(timers));
  } catch {}
}

export const DEFAULT_ADMIN_PROFILE: UserProfile = {
  id: 'user-admin-belkin',
  username: 'Belkin',
  login: 'Belkin',
  displayName: 'Belkin',
  email: 'belkin@med.ru',
  role: 'admin',
  password: '1511',
  specialization: 'Главный Администратор / Инженерия',
  avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
  createdAt: new Date().toISOString(),
  workspaceConfig: { ...DEFAULT_WORKSPACE_CONFIG },
  feeds: [...ENGINEER_DEFAULT_FEEDS],
  appStyle: 'engineer',
  customAiPrompt: DEFAULT_AI_PROMPTS.engineer,
  scheduledHours: [6, 12, 19],
  starredArticleIds: [],
  readArticleIds: [],
  savedLaterArticleIds: [],
  customCategories: ['Разблокировка & ПО', 'Пайка & Железо', 'Apple Инженерия', 'Кейсы ремонтов', 'Новости 4PDA'],
  articleNotes: {},
  bookmarks: [...INITIAL_BOOKMARKS],
  calendarEvents: getInitialCalendarEvents(),
  workSchedules: getInitialWorkSchedules(),
  timerSessions: [],
  notes: INITIAL_MEDICAL_NOTES,
  timers: INITIAL_MEDICAL_TIMERS,
  accessibility: INITIAL_ACCESSIBILITY,
};

export const TEST_AGENTS_PROFILES: UserProfile[] = [
  {
    id: 'agent-mobile-repair',
    username: 'MobileTech',
    login: 'MobileTech',
    displayName: 'Инженер по мобильным устройствам',
    email: 'mobile@tech.desk',
    role: 'user',
    password: '1234',
    specialization: 'Ремонт смартфонов, пайка BGA, обход FRP',
    avatar: 'https://images.unsplash.com/photo-1597740985671-2a8a3b80502e?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    workspaceConfig: { ...DEFAULT_WORKSPACE_CONFIG },
    feeds: [
      {
        id: 'feed-mt-1',
        name: 'Ремонт мобильных (YouTube)',
        category: 'Инженерия',
        enabled: true,
        status: 'idle', sources: [],
      },
      {
        id: 'feed-mt-2',
        name: 'Ремонт телефонов (Reddit)',
        category: 'Инженерия',
        enabled: true,
        status: 'idle', sources: [],
      }
    ],
    appStyle: 'engineer',
    customAiPrompt: 'Ты — ИИ-ассистент инженера по ремонту мобильных телефонов. Твоя задача — проанализировать статью/видео и выдать структурированную карточку ремонта:\n1. Краткий заголовок неисправности (например, "Реболлинг модема iPhone 13").\n2. Описание проблемы и способ решения (какое оборудование и расходники использованы).\n3. Полезные технические теги в конце (например, #ремонт #пайка #FRP).',
    starredArticleIds: [],
    readArticleIds: [],
    savedLaterArticleIds: [],
    customCategories: ['Разблокировка', 'Железо', 'Apple', 'Android'],
    articleNotes: {},
    bookmarks: [...INITIAL_BOOKMARKS],
    calendarEvents: getInitialCalendarEvents(),
    workSchedules: getInitialWorkSchedules(),
    timerSessions: [],
    notes: INITIAL_MEDICAL_NOTES,
    timers: INITIAL_MEDICAL_TIMERS,
    accessibility: INITIAL_ACCESSIBILITY,
  },
  {
    id: 'agent-culinary',
    username: 'CulinaryChef',
    login: 'CulinaryChef',
    displayName: 'Кулинарный Шеф-Повар',
    email: 'chef@culinary.desk',
    role: 'user',
    password: '1234',
    specialization: 'Кулинарное искусство, рецепты и гастрономия',
    avatar: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    workspaceConfig: { ...DEFAULT_WORKSPACE_CONFIG },
    feeds: [
      {
        id: 'feed-cul-1',
        name: 'Кулинарные рецепты (Pikabu)',
        category: 'Кулинария',
        enabled: true,
        status: 'idle', sources: [],
      },
      {
        id: 'feed-cul-2',
        name: 'Рецепты блюд (YouTube)',
        category: 'Кулинария',
        enabled: true,
        status: 'idle', sources: [],
      }
    ],
    appStyle: 'modern',
    customAiPrompt: 'Ты — кулинарный ИИ-сомелье и шеф-повар. Проанализируй эту публикацию про еду и выдай:\n1. Понятное название блюда/техники на русском языке.\n2. Основные ингредиенты (списком) и пошаговые ключевые этапы приготовления.\n3. Тэги в формате #Рецепты, #Выпечка, #Шеф.',
    starredArticleIds: [],
    readArticleIds: [],
    savedLaterArticleIds: [],
    customCategories: ['Рецепты', 'Закуски', 'Десерты', 'Напитки'],
    articleNotes: {},
    bookmarks: [...INITIAL_BOOKMARKS],
    calendarEvents: getInitialCalendarEvents(),
    workSchedules: getInitialWorkSchedules(),
    timerSessions: [],
    notes: INITIAL_MEDICAL_NOTES,
    timers: INITIAL_MEDICAL_TIMERS,
    accessibility: INITIAL_ACCESSIBILITY,
  },
  {
    id: 'agent-car-repair',
    username: 'CarMechanic',
    login: 'CarMechanic',
    displayName: 'Мастер Автосервиса',
    email: 'mechanic@car.desk',
    role: 'user',
    password: '1234',
    specialization: 'Диагностика ДВС, автоэлектрика, ремонт трансмиссии',
    avatar: 'https://images.unsplash.com/photo-1530047625168-4b29bfd12f4f?w=150&auto=format&fit=crop&q=80',
    createdAt: new Date().toISOString(),
    workspaceConfig: { ...DEFAULT_WORKSPACE_CONFIG },
    feeds: [
      {
        id: 'feed-car-1',
        name: 'Ремонт автомобилей (Pikabu)',
        category: 'Авто',
        enabled: true,
        status: 'idle', sources: [],
      },
      {
        id: 'feed-car-2',
        name: 'Ремонт двигателей (YouTube)',
        category: 'Авто',
        enabled: true,
        status: 'idle', sources: [],
      }
    ],
    appStyle: 'classic',
    customAiPrompt: 'Ты — ИИ-консультант автомеханика. Проанализируй публикацию по ремонту авто и выдели:\n1. Ошибку или неисправность (например, "Троение двигателя 1.6 MPI").\n2. Способ диагностики и замененные детали (пошагово).\n3. Тематические теги в конце (например, #ДВС, #КПП, #электрика).',
    starredArticleIds: [],
    readArticleIds: [],
    savedLaterArticleIds: [],
    customCategories: ['Двигатель', 'Трансмиссия', 'Подвеска', 'Электрика'],
    articleNotes: {},
    bookmarks: [...INITIAL_BOOKMARKS],
    calendarEvents: getInitialCalendarEvents(),
    workSchedules: getInitialWorkSchedules(),
    timerSessions: [],
    notes: INITIAL_MEDICAL_NOTES,
    timers: INITIAL_MEDICAL_TIMERS,
    accessibility: INITIAL_ACCESSIBILITY,
  }
];

export function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized: UserProfile[] = parsed
          .filter((p) => p && typeof p === 'object' && p.id)
          .map((p) => {
            const uName = String(p.username || p.login || 'Пользователь');
            const uLogin = String(p.login || p.username || uName);
            const uEmail = String(p.email || `${uLogin.toLowerCase()}@local.desk`);
            const uDisplay = String(p.displayName || uName);
            const isAdmin = uLogin.toLowerCase() === 'belkin' || p.id === 'user-admin-belkin';
            
            // Preserve user feeds and settings carefully!
            const userFeeds = Array.isArray(p.feeds) && p.feeds.length > 0 ? p.feeds : ENGINEER_DEFAULT_FEEDS;
            const style = p.appStyle || 'engineer';
            const aiPrompt = p.customAiPrompt || DEFAULT_AI_PROMPTS[style] || DEFAULT_AI_PROMPTS.engineer;

            return {
              ...p,
              username: uName,
              login: uLogin,
              email: uEmail,
              displayName: uDisplay,
              password: String(p.password || (isAdmin ? '1511' : '1234')),
              role: (isAdmin ? 'admin' : (p.role || 'user')) as 'admin' | 'doctor' | 'user',
              feeds: userFeeds,
              appStyle: style,
              customAiPrompt: aiPrompt,
              notes: p.notes || [],
              timers: p.timers || [],
              scheduledHours: p.scheduledHours || [6, 12, 19],
              workSchedules: p.workSchedules || {},
              accessibility: p.accessibility || INITIAL_ACCESSIBILITY,
            };
          });

        // Ensure Belkin admin is present but PRESERVE any custom feeds/prompt that Belkin set
        const adminIdx = sanitized.findIndex(p => (p.username && p.username.toLowerCase() === 'belkin') || (p.login && p.login.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin');
        if (adminIdx === -1) {
          sanitized.unshift(DEFAULT_ADMIN_PROFILE);
        } else {
          sanitized[adminIdx].role = 'admin';
          sanitized[adminIdx].login = 'Belkin';
          sanitized[adminIdx].username = 'Belkin';
          if (!sanitized[adminIdx].password) sanitized[adminIdx].password = '1511';
          // Ensure feeds are preserved
          if (!Array.isArray(sanitized[adminIdx].feeds) || sanitized[adminIdx].feeds.length === 0) {
            sanitized[adminIdx].feeds = [...ENGINEER_DEFAULT_FEEDS];
          }
        }

        // Add missing test agent profiles automatically so they can be selected and tested
        const requiredAgentIds = ['agent-mobile-repair', 'agent-culinary', 'agent-car-repair'];
        let hasMissingAgents = false;
        requiredAgentIds.forEach(id => {
          if (!sanitized.some(p => p.id === id)) {
            hasMissingAgents = true;
            const agentProfile = TEST_AGENTS_PROFILES.find(ap => ap.id === id);
            if (agentProfile) {
              sanitized.push(agentProfile);
            }
          }
        });
        
        // Save back with non-destructive merge
        saveStoredProfiles(sanitized);
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Failed to load profiles from local storage:', err);
  }

  const initialList = [DEFAULT_ADMIN_PROFILE, ...TEST_AGENTS_PROFILES];
  saveStoredProfiles(initialList);
  return initialList;
}

export function saveStoredProfiles(profiles: UserProfile[]) {
  try {
    if (!Array.isArray(profiles) || profiles.length === 0) return;
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Failed to save profiles to local storage:', err);
  }
}

export function getActiveSessionUserId(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE_SESSION_KEY) || sessionStorage.getItem(STORAGE_ACTIVE_SESSION_KEY) || null;
  } catch {
    return null;
  }
}

export function saveActiveSessionUserId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, id);
      sessionStorage.setItem(STORAGE_ACTIVE_SESSION_KEY, id);
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_ACTIVE_SESSION_KEY);
    }
  } catch {}
}

export function clearActiveSessionUserId() {
  saveActiveSessionUserId(null);
}

export function getStoredCurrentUserId(): string {
  try {
    const active = getActiveSessionUserId();
    if (active) return active;
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) return raw;
  } catch {}
  return DEFAULT_ADMIN_PROFILE.id;
}

export function saveStoredCurrentUserId(id: string) {
  try {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, id);
  } catch {}
}

export async function syncUserProfileToServer(user: UserProfile) {
  if (!user || !user.id) return;
  
  // 1. Direct Cloud Firestore save (Permanent cloud storage immune to republishes/rebuilds)
  try {
    await saveUserProfileToFirestore(user);
  } catch (err) {
    console.warn('Direct Firestore save note (cached locally):', err);
  }

  // 2. Server API sync for backward compatibility
  try {
    await fetch('/api/users/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user }),
    });
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Perform a full bidirectional synchronization between Cloud Firestore and LocalStorage
 */
export async function syncAllProfilesWithFirestore(): Promise<UserProfile[]> {
  const localProfiles = getStoredProfiles();
  try {
    const cloudProfiles = await loadAllProfilesFromFirestore();
    
    if (cloudProfiles && cloudProfiles.length > 0) {
      // Map cloud profiles
      const mergedMap = new Map<string, UserProfile>();
      
      // Add local first
      localProfiles.forEach(p => {
        if (p.id) mergedMap.set(p.id, p);
      });

      // Merge cloud profiles (local user changes take precedence over default medical feeds)
      cloudProfiles.forEach(cp => {
        if (cp.id) {
          const existing = mergedMap.get(cp.id);
          if (existing) {
            const cpHasDefaultMedical = Array.isArray(cp.feeds) && (cp.feeds.length > 25 || cp.feeds.some(f => f.sources && f.sources.some(s => s.url && (s.url.includes('who.int') || s.url.includes('scardio.ru')))));
            const existingHasCustom = Array.isArray(existing.feeds) && existing.feeds.length <= 25;
            
            const bestFeeds = (cpHasDefaultMedical && existingHasCustom) ? existing.feeds : ((existing.feeds && existing.feeds.length > 0) ? existing.feeds : (cp.feeds || ENGINEER_DEFAULT_FEEDS));
            const bestTimers = (cp.timers && cp.timers.length > 0) ? cp.timers : (existing.timers || INITIAL_MEDICAL_TIMERS);
            const bestNotes = (cp.notes && cp.notes.length > 0) ? cp.notes : (existing.notes || INITIAL_MEDICAL_NOTES);

            const mergedUser = {
              ...cp,
              ...existing,
              notes: bestNotes,
              timers: bestTimers,
              feeds: bestFeeds,
            };
            mergedMap.set(cp.id, mergedUser);
            // Push updated state back to Firestore so cloud stays in sync with local customizations
            saveUserProfileToFirestore(mergedUser).catch(() => {});
          } else {
            mergedMap.set(cp.id, cp);
          }
        }
      });

      // Ensure Belkin admin is present
      if (!mergedMap.has(DEFAULT_ADMIN_PROFILE.id)) {
        const belkinFound = Array.from(mergedMap.values()).find(p => (p.username && p.username.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin');
        if (!belkinFound) {
          mergedMap.set(DEFAULT_ADMIN_PROFILE.id, DEFAULT_ADMIN_PROFILE);
          saveUserProfileToFirestore(DEFAULT_ADMIN_PROFILE).catch(() => {});
        }
      }

      // Seed missing test agents in Cloud Firestore if they are missing from cloudProfiles
      const cloudIds = new Set(cloudProfiles.map(p => p.id));
      TEST_AGENTS_PROFILES.forEach(agent => {
        if (!cloudIds.has(agent.id)) {
          saveUserProfileToFirestore(agent).catch(() => {});
        }
      });

      const mergedList = Array.from(mergedMap.values());
      saveStoredProfiles(mergedList);
      return mergedList;
    } else {
      // If Cloud Firestore is empty (e.g. initial setup), seed all current local profiles into Cloud Firestore
      for (const p of localProfiles) {
        saveUserProfileToFirestore(p).catch(() => {});
      }
      return localProfiles;
    }
  } catch (err) {
    console.warn('Cloud Firestore sync note:', err);
    return localProfiles;
  }
}

const STORAGE_ARTICLES_KEY = 'belkindesk_med_articles_v3';

export function getStoredArticles(userId?: string): Article[] {
  try {
    const key = userId ? `${STORAGE_ARTICLES_KEY}_${userId}` : STORAGE_ARTICLES_KEY;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load articles from local storage:', err);
  }
  return INITIAL_MEDICAL_ARTICLES;
}

export function saveStoredArticles(articles: Article[], userId?: string) {
  try {
    const key = userId ? `${STORAGE_ARTICLES_KEY}_${userId}` : STORAGE_ARTICLES_KEY;
    if (!Array.isArray(articles)) return;
    localStorage.setItem(key, JSON.stringify(articles));
  } catch (err) {
    console.warn('Failed to save articles to local storage:', err);
  }
}

const STORAGE_SEEN_ARTICLES_KEY = 'belkindesk_seen_articles';

export function getSeenArticlesList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_SEEN_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markArticlesAsSeen(idsOrTitles: string[]) {
  try {
    const current = getSeenArticlesList();
    const updated = Array.from(new Set([...current, ...idsOrTitles])).slice(-500); // keep last 500
    localStorage.setItem(STORAGE_SEEN_ARTICLES_KEY, JSON.stringify(updated));
  } catch {}
}



