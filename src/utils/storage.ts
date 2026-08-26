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
  saveUserProfileFieldsToFirestore,
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
const STORAGE_WORKSCHEDULES_KEY = 'belkindesk_calendar_workschedules_v2';

const isDevMode = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('ais-dev')
);

export function getStoredBookmarks(userId?: string): DesktopBookmark[] {
  try {
    const key = userId ? `${STORAGE_BOOKMARKS_KEY}_${userId}` : STORAGE_BOOKMARKS_KEY;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
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

export function saveStoredBookmarks(bookmarks: DesktopBookmark[], userId?: string) {
  try {
    if (!Array.isArray(bookmarks)) return;
    const key = userId ? `${STORAGE_BOOKMARKS_KEY}_${userId}` : STORAGE_BOOKMARKS_KEY;
    localStorage.setItem(key, JSON.stringify(bookmarks));
  } catch {}
}

export function getStoredAccessibility(userId?: string): AccessibilityConfig {
  try {
    const key = userId ? `${STORAGE_ACCESSIBILITY_KEY}_${userId}` : STORAGE_ACCESSIBILITY_KEY;
    const raw = localStorage.getItem(key);
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

export function saveStoredAccessibility(cfg: AccessibilityConfig, userId?: string) {
  try {
    if (!cfg || typeof cfg !== 'object') return;
    const key = userId ? `${STORAGE_ACCESSIBILITY_KEY}_${userId}` : STORAGE_ACCESSIBILITY_KEY;
    localStorage.setItem(key, JSON.stringify(cfg));
    if (userId) {
      localStorage.removeItem(STORAGE_ACCESSIBILITY_KEY);
    }
  } catch {}
}

export function getStoredMedicalNotes(userId?: string): MedicalNote[] {
  try {
    const key = userId ? `${STORAGE_NOTES_KEY}_${userId}` : STORAGE_NOTES_KEY;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((n) => n && typeof n === 'object' && typeof n.text === 'string')
          .map((n, i) => ({
            ...n,
            id: String(n.id || `note-${Date.now()}-${i}`),
            text: String(n.text || ''),
            createdAt: String(n.createdAt || new Date().toISOString()),
            timestampStr: String(n.timestampStr || ''),
          }));
      }
    }
  } catch {}
  return userId ? [] : INITIAL_MEDICAL_NOTES;
}

export function saveStoredMedicalNotes(notes: MedicalNote[], userId?: string) {
  try {
    if (!Array.isArray(notes)) return;
    const key = userId ? `${STORAGE_NOTES_KEY}_${userId}` : STORAGE_NOTES_KEY;
    localStorage.setItem(key, JSON.stringify(notes));
  } catch {}
}

export function getStoredMedicalTimers(userId?: string): MedicalTimerItem[] {
  try {
    const key = userId ? `${STORAGE_TIMERS_KEY}_${userId}` : STORAGE_TIMERS_KEY;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((t) => t && typeof t === 'object')
          .map((t, i) => ({
            ...t,
            id: String(t.id || `timer-${i}`),
            name: String(t.name || 'Таймер'),
            targetTime: String(t.targetTime || '12:00'),
            status: t.status === 'done' ? 'done' : (t.status === 'pending' ? 'pending' : 'active'),
            isEndShift: Boolean(t.isEndShift),
          }));
      }
    }
  } catch {}
  return INITIAL_MEDICAL_TIMERS;
}

export function saveStoredMedicalTimers(timers: MedicalTimerItem[], userId?: string) {
  try {
    if (!Array.isArray(timers)) return;
    const key = userId ? `${STORAGE_TIMERS_KEY}_${userId}` : STORAGE_TIMERS_KEY;
    localStorage.setItem(key, JSON.stringify(timers));
  } catch {}
}

export function getStoredWorkSchedules(userId?: string): Record<string, WorkDaySchedule> {
  try {
    const key = userId ? `${STORAGE_WORKSCHEDULES_KEY}_${userId}` : STORAGE_WORKSCHEDULES_KEY;
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {}
  return userId ? {} : getInitialWorkSchedules();
}

export function saveStoredWorkSchedules(schedules: Record<string, WorkDaySchedule>, userId?: string) {
  try {
    if (!schedules || typeof schedules !== 'object') return;
    const key = userId ? `${STORAGE_WORKSCHEDULES_KEY}_${userId}` : STORAGE_WORKSCHEDULES_KEY;
    localStorage.setItem(key, JSON.stringify(schedules));
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

export function sanitizeProfiles(parsed: UserProfile[]): UserProfile[] {
  if (!Array.isArray(parsed)) return [];
  const sanitized: UserProfile[] = parsed
    .filter((p) => p && typeof p === 'object' && p.id)
    .map((p) => {
      const uName = String(p.username || p.login || 'Пользователь');
      const uLogin = String(p.login || p.username || uName);
      const uEmail = String(p.email || `${uLogin.toLowerCase()}@local.desk`);
      const uDisplay = String(p.displayName || uName);
      const isAdmin = uLogin.toLowerCase() === 'belkin' || p.id === 'user-admin-belkin';
      
      // Preserve user feeds and settings carefully!
      const userFeeds = Array.isArray(p.feeds) ? p.feeds : ENGINEER_DEFAULT_FEEDS;
      const style = p.appStyle || 'engineer';
      const aiPrompt = p.customAiPrompt !== undefined ? p.customAiPrompt : (DEFAULT_AI_PROMPTS[style] || DEFAULT_AI_PROMPTS.engineer);

      // CRITICAL SECURITY RULE: Only explicitly designated dev/demo profiles in Dev Mode retain a password!
      const isExplicitDemoProfile = p.id === 'user-admin-belkin' || p.id.startsWith('agent-');
      const allowPassword = isExplicitDemoProfile && isDevMode;

      const cleanProfile: UserProfile = {
        ...p,
        username: uName,
        login: uLogin,
        email: uEmail,
        displayName: uDisplay,
        role: (isAdmin ? 'admin' : (p.role || 'user')) as 'admin' | 'doctor' | 'user',
        feeds: userFeeds,
        appStyle: style,
        customAiPrompt: aiPrompt,
        customWallpaper: p.customWallpaper ?? '',
        scheduledHours: Array.isArray(p.scheduledHours) ? p.scheduledHours : [6, 12, 19],
        workspaceConfig: p.workspaceConfig ? { ...DEFAULT_WORKSPACE_CONFIG, ...p.workspaceConfig } : { ...DEFAULT_WORKSPACE_CONFIG },
        aiProvider: p.aiProvider || 'gemini',
        aiApiKey: p.aiApiKey ?? '',
        aiModel: p.aiModel ?? '',
        aiUrl: p.aiUrl ?? '',
        notes: Array.isArray(p.notes) ? p.notes : (p.id && p.id !== 'user-admin-belkin' && !p.id.startsWith('agent-') ? [] : INITIAL_MEDICAL_NOTES),
        timers: Array.isArray(p.timers) ? p.timers : INITIAL_MEDICAL_TIMERS,
        bookmarks: Array.isArray(p.bookmarks) ? p.bookmarks : INITIAL_BOOKMARKS,
        workSchedules: p.workSchedules || {},
        accessibility: p.accessibility || INITIAL_ACCESSIBILITY,
        starredArticleIds: Array.isArray(p.starredArticleIds) ? p.starredArticleIds : [],
        readArticleIds: Array.isArray(p.readArticleIds) ? p.readArticleIds : [],
        savedLaterArticleIds: Array.isArray(p.savedLaterArticleIds) ? p.savedLaterArticleIds : [],
        customCategories: Array.isArray(p.customCategories) ? p.customCategories : [],
        calendarEvents: Array.isArray(p.calendarEvents) ? p.calendarEvents : [],
        timerSessions: Array.isArray(p.timerSessions) ? p.timerSessions : [],
      };

      if (allowPassword) {
        cleanProfile.password = p.password || (isAdmin ? '1511' : '1234');
      } else {
        delete cleanProfile.password;
      }

      return cleanProfile;
    });

  // In Dev Mode, ensure Belkin admin demo account is present
  if (isDevMode) {
    const adminIdx = sanitized.findIndex(p => (p.username && p.username.toLowerCase() === 'belkin') || (p.login && p.login.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin');
    if (adminIdx === -1) {
      sanitized.unshift(DEFAULT_ADMIN_PROFILE);
    } else {
      sanitized[adminIdx].role = 'admin';
      sanitized[adminIdx].login = 'Belkin';
      sanitized[adminIdx].username = 'Belkin';
      if (!sanitized[adminIdx].password) sanitized[adminIdx].password = '1511';
      if (!Array.isArray(sanitized[adminIdx].feeds)) {
        sanitized[adminIdx].feeds = [...ENGINEER_DEFAULT_FEEDS];
      }
    }

    // Add missing test agent profiles in Dev mode automatically so they can be selected and tested
    const requiredAgentIds = ['agent-mobile-repair', 'agent-culinary', 'agent-car-repair'];
    requiredAgentIds.forEach(id => {
      if (!sanitized.some(p => p.id === id)) {
        const agentProfile = TEST_AGENTS_PROFILES.find(ap => ap.id === id);
        if (agentProfile) {
          sanitized.push(agentProfile);
        }
      }
    });
  }

  return sanitized;
}

export function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const sanitized = sanitizeProfiles(parsed);
        saveStoredProfiles(sanitized);
        return sanitized;
      }
    }
  } catch (err) {
    console.warn('Failed to load profiles from local storage:', err);
  }

  const defaultList = isDevMode ? [DEFAULT_ADMIN_PROFILE, ...TEST_AGENTS_PROFILES] : [];
  const initialList = sanitizeProfiles(defaultList);
  saveStoredProfiles(initialList);
  return initialList;
}

export function saveStoredProfiles(profiles: UserProfile[]) {
  try {
    if (!Array.isArray(profiles)) return;
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

export function getTimestampMs(isoString: string | undefined | null): number {
  if (!isoString) return 0;
  try {
    return new Date(isoString).getTime();
  } catch {
    return 0;
  }
}

export async function syncUserProfileFieldsToServer(
  userId: string,
  fields: Partial<UserProfile>,
  lastKnownUpdatedAt?: string
) {
  if (!userId || !fields || Object.keys(fields).length === 0) return;

  const now = new Date().toISOString();

  // Save back to local storage profiles cache
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const idx = parsed.findIndex((p: any) => p && p.id === userId);
        if (idx !== -1) {
          const current = parsed[idx];
          parsed[idx] = { ...current, ...fields, updatedAt: now, version: (current.version || 0) + 1 };
          localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (err) {
    console.warn('Failed to update local profile cache:', err);
  }

  // Direct Cloud Firestore granular save
  try {
    await saveUserProfileFieldsToFirestore(userId, fields, lastKnownUpdatedAt);
  } catch (err) {
    console.warn('Direct Firestore granular save note (cached locally):', err);
  }
}

export async function syncUserProfileToServer(user: UserProfile) {
  if (!user || !user.id) return;
  
  if (!user.updatedAt) {
    user.updatedAt = new Date().toISOString();
  }
  const now = user.updatedAt;

  // Save back to local storage profiles cache
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const idx = parsed.findIndex((p: any) => p && p.id === user.id);
        if (idx !== -1) {
          parsed[idx] = { ...parsed[idx], ...user, updatedAt: now };
          localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(parsed));
        }
      }
    }
  } catch (err) {
    console.warn('Failed to update local profile with updatedAt:', err);
  }
  
  // Direct Cloud Firestore save (Single Source of Truth)
  try {
    await saveUserProfileToFirestore(user);
  } catch (err) {
    console.warn('Direct Firestore save note (cached locally):', err);
  }
}

/**
 * @deprecated Legacy function. Unused in production flow.
 * In production, current authenticated Firebase UID is loaded individually.
 */
export async function syncAllProfilesWithFirestore(): Promise<UserProfile[]> {
  const localProfiles = getStoredProfiles();
  try {
    const cloudProfiles = await loadAllProfilesFromFirestore();
    
    if (cloudProfiles && cloudProfiles.length > 0) {
      const mergedMap = new Map<string, UserProfile>();
      
      // Seed local profiles (e.g., dev agents in dev mode)
      localProfiles.forEach(p => {
        if (p.id) mergedMap.set(p.id, p);
      });

      // Firestore cloud profiles take strict precedence as single source of truth
      cloudProfiles.forEach(cp => {
        if (cp.id) {
          const existing = mergedMap.get(cp.id);
          if (existing) {
            mergedMap.set(cp.id, { ...existing, ...cp });
          } else {
            mergedMap.set(cp.id, cp);
          }
        }
      });

      const mergedList = sanitizeProfiles(Array.from(mergedMap.values()));
      saveStoredProfiles(mergedList);
      return mergedList;
    } else {
      // Cloud Firestore returned 0 profiles or is uninitialized
      return localProfiles;
    }
  } catch (err) {
    console.warn('Cloud Firestore sync note (using local cache):', err);
    return localProfiles;
  }
}

const STORAGE_ARTICLES_KEY = 'belkindesk_med_articles_v3';

export function getStoredArticles(userId?: string): Article[] {
  try {
    if (userId) {
      const key = `${STORAGE_ARTICLES_KEY}_${userId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
      // Logged-in user cache missing: return empty array, NEVER fall back to global guest cache or defaults
      return [];
    }

    // Unauthenticated / Guest / Dev mode
    const raw = localStorage.getItem(STORAGE_ARTICLES_KEY);
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
    if (!Array.isArray(articles)) return;
    if (userId) {
      const key = `${STORAGE_ARTICLES_KEY}_${userId}`;
      localStorage.setItem(key, JSON.stringify(articles));
    } else {
      // Only save to global key in guest / unauthenticated mode
      localStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(articles));
    }
  } catch (err) {
    console.warn('Failed to save articles to local storage:', err);
  }
}

const STORAGE_SEEN_ARTICLES_KEY = 'belkindesk_seen_articles';

/**
 * Legacy read-only accessor for one-time migration.
 * Deprecated: Source of truth for read state is Firestore /users/{uid}/newsCards/{cardId}.isRead
 */
export function getSeenArticlesList(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_SEEN_ARTICLES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Deprecated: Active writes to belkindesk_seen_articles are disabled.
 * Read state is managed exclusively in Firestore /users/{uid}/newsCards.
 */
export function markArticlesAsSeen(_idsOrTitles: string[]) {
  // No-op to prevent cross-user pollution of legacy global seen key
}




export function saveAISettings(
  provider: string,
  key: string,
  model: string,
  url: string,
  currentUser: UserProfile | null,
  updateProfileCallback?: (profile: UserProfile) => void
) {
  const uid = currentUser?.id;
  const providerKey = uid ? `belkin_user_ai_provider_${uid}` : 'belkin_user_ai_provider';
  const apiKey = uid ? `belkin_user_ai_key_${uid}` : 'belkin_user_ai_key';
  const modelKey = uid ? `belkin_user_ai_model_${uid}` : 'belkin_user_ai_model';
  const urlKey = uid ? `belkin_user_ai_url_${uid}` : 'belkin_user_ai_url';

  // 1. Save to UID-isolated localStorage
  localStorage.setItem(providerKey, provider);
  if (key.trim()) {
    localStorage.setItem(apiKey, key.trim());
  } else {
    localStorage.removeItem(apiKey);
  }
  localStorage.setItem(modelKey, model.trim());
  localStorage.setItem(urlKey, url.trim());

  // Clean up legacy non-UID global keys when logged in
  if (uid) {
    localStorage.removeItem('belkin_user_ai_provider');
    localStorage.removeItem('belkin_user_ai_key');
    localStorage.removeItem('belkin_user_ai_model');
    localStorage.removeItem('belkin_user_ai_url');
  }

  // 2. Sync to UserProfile if available
  if (currentUser && updateProfileCallback) {
    updateProfileCallback({
      ...currentUser,
      aiProvider: provider as any,
      aiApiKey: key.trim(),
      aiModel: model.trim(),
      aiUrl: url.trim(),
    });
  }
}
