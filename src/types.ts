export interface MedicalTimerItem {
  id: string;
  name: string;
  targetTime: string; // e.g. "05:50", "14:50"
  status: 'done' | 'active' | 'pending';
  countdownSeconds?: number;
  durationSeconds?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  isEndShift?: boolean;
  lastDoneDate?: string; // YYYY-MM-DD
  repeatMode?: 'none' | 'daily' | 'weekdays' | 'custom';
  repeatDays?: number[]; // [0..6] (0=Sun..6=Sat)
  autoStart?: boolean;
  repeatCount?: number;
  soundId?: 'success' | 'chime' | 'bell' | 'alert' | 'star' | 'click' | string;
  volume?: number; // 0..100
  isMuted?: boolean;
  vibration?: boolean;
  notifications?: boolean;

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
  version?: number;
}

export interface MedicalNote {
  id: string;
  text: string;
  createdAt: string;
  timestampStr: string;
  title?: string;
  category?: string;
  color?: string;
  isPinned?: boolean;
  isFavorite?: boolean;
  tags?: string[];

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
  version?: number;
  [key: string]: any;
}

export interface MedicalDigestData {
  title: string;
  main: string;
  clinicalSignificance: string;
  takeaway: string;
  estimatedReadMinutes?: number;
}

export interface AccessibilityConfig {
  scalePercent: 100 | 125 | 150 | 175 | 200;
  visualAcuity: string;
}

export interface Article {
  id: string;
  feedId: string;
  feedTitle: string;
  feedCategory?: string;
  feedIcon?: string;
  title: string;
  titleRu?: string;
  link: string;
  url?: string;
  sourceId?: string;
  sourceName?: string;
  pubDate: string;
  isoDate?: string;
  publishedAt?: string;
  author?: string;
  content: string;
  description?: string;
  contentSnippet: string;
  summary?: string;
  summaryOneLine?: string;
  summaryThreeLines?: string;
  detailedContent?: string;
  keyTerms?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  extractionStatus?: 'full' | 'partial' | 'failed';
  extractionError?: string;
  categories?: string[];
  category?: string;
  matchedKeywords?: string[];
  isRead?: boolean;
  isStarred?: boolean;
  isHidden?: boolean;
  isSavedLater?: boolean;
  savedLater?: boolean;
  userNote?: string;
  ai?: {
    titleRu?: string;
    summaryOneLine?: string;
    summaryThreeLines?: string;
    detailedContent?: string;
    keyTerms?: string[];
    aiSummary?: string;
    aiKeyTakeaways?: string[];
    aiSentiment?: 'positive' | 'neutral' | 'negative' | 'analytical';
  };
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  aiSentiment?: 'positive' | 'neutral' | 'negative' | 'analytical';
  medicalDigest?: MedicalDigestData;
  symptom?: string;
  diagnosis?: string;
  solution?: string;
  contentStatus?: 'full' | 'partial' | 'title_only' | 'error';
  fetchedAt?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  updatedAt?: string;

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  version?: number;
}

export interface NewsCard {
  id: string;
  title: string;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string;
  fetchedAt: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  summary?: string;
  description?: string;
  imageUrl?: string;
  category?: string;
  isRead?: boolean;
  isStarred?: boolean;
  isHidden?: boolean;
  savedLater?: boolean;
  userNote?: string;
  updatedAt: string;

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  version?: number;

  // Optional compatibility fields with Article
  imageUrls?: string[];
  ai?: Article['ai'];
  feedId?: string;
  feedTitle?: string;
  feedCategory?: string;
  feedIcon?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  author?: string;
  summaryOneLine?: string;
  summaryThreeLines?: string;
  detailedContent?: string;
  keyTerms?: string[];
  extractionStatus?: 'full' | 'partial' | 'failed';
  categories?: string[];
  isSavedLater?: boolean;
  aiSummary?: string;
  aiKeyTakeaways?: string[];
  aiSentiment?: 'positive' | 'neutral' | 'negative' | 'analytical';
  medicalDigest?: MedicalDigestData;
  contentStatus?: 'full' | 'partial' | 'title_only' | 'error';
}

export type SourceType = 'rss' | 'atom' | 'website' | 'youtube' | 'reddit' | 'telegram' | 'search' | 'custom' | 'pikabu' | '4pda' | 'ifixit';

export interface NewsSource {
  id: string;
  name: string;
  type: SourceType;
  enabled: boolean;
  url?: string;
  searchUrl?: string;
  query?: string;
  keywords?: string[];
  excludeKeywords?: string[];
  keywordMode?: 'ANY' | 'ALL';
  language?: string;
  maxArticles?: number;
}

export interface CardTemplate {
  showImage: boolean;
  showSource: boolean;
  showDate: boolean;
  showAuthor: boolean;
  showDescription: boolean;
  showContent: boolean;
  showKeywords: boolean;
  showAiButton: boolean;
}

export interface FeedConfig {
  id: string;
  name: string;
  description?: string;
  category?: string; // To group feeds in UI
  icon?: string;
  sources: NewsSource[];
  keywords?: string[];
  excludeKeywords?: string[];
  keywordMode?: 'ANY' | 'ALL';
  language?: string;
  refreshInterval?: number;
  maxArticles?: number;
  cardTemplate?: CardTemplate;
  enabled: boolean;
  isPinned?: boolean;
  status?: 'active' | 'error' | 'loading' | 'idle';
  errorMessage?: string;
  itemCount?: number;
  unreadCount?: number;

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
  version?: number;
}

// Deprecated old FeedSource, keep for backward compatibility or remove if fully refactored
export interface OldFeedSource {
  id: string;
  title: string;
  url: string;
  type?: 'youtube' | 'rss' | '4pda' | 'pikabu' | 'telegram' | 'reddit' | 'website' | 'search';
  searchQuery?: string;
  hashtags?: string[];
  siteUrl?: string;
  category: string;
  description?: string;
  icon?: string;
  updateIntervalMinutes?: number;
  lastFetchedAt?: string;
  status: 'active' | 'error' | 'loading' | 'idle';
  errorMessage?: string;
  itemCount?: number;
  unreadCount?: number;
  tags?: string[];
  isPinned?: boolean;
  enabled?: boolean;
}

export interface DesktopBookmark {
  id: string;
  title: string;
  url: string;
  type?: 'link' | 'file' | 'folder'; // 'link' = HTTP ссылка, 'file' = Ярлык файла Windows, 'folder' = Папка в проводнике Windows
  icon?: string;
  category?: string;
  color?: string;
  isPinned?: boolean;
  clickCount?: number;
  description?: string;

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
  version?: number;
}

export type DayShiftType = 'work-office' | 'work-remote' | 'day-off' | 'vacation' | 'sick-leave' | 'duty' | 'event' | string;

export interface DayEntryItem {
  id: string;
  text: string;
  time?: string;
  isDone?: boolean;
  [key: string]: any;
}

export interface WorkDaySchedule {
  date: string; // YYYY-MM-DD
  shiftType: DayShiftType;
  startTime?: string; // "09:00"
  endTime?: string; // "18:00"
  notes?: string;
  breakMinutes?: number;
  status?: string;
  color?: string;
  category?: string;
  entries?: DayEntryItem[];

  // Tombstone & sync fields
  deleted?: boolean;
  deletedAt?: string;
  updatedAt?: string;
  version?: number;
  [key: string]: any;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // "14:30"
  endTime?: string;
  type: 'meeting' | 'deadline' | 'release' | 'call' | 'review' | 'task' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'critical';
  isCompleted?: boolean;
  description?: string;
  link?: string;
}

export interface WorkdayTimerSession {
  id: string;
  date: string; // YYYY-MM-DD
  startedAt: string;
  endedAt?: string;
  totalWorkedSeconds: number;
  totalBreakSeconds: number;
  notes?: string;
}

export type AppArchetypeStyle = 'classic' | 'modern' | 'medical' | 'engineer' | 'farmer' | 'economist' | 'automobilist' | 'it' | 'business' | 'universal';

export interface UserWorkspaceConfig {
  layoutMode: 'split-reader' | 'cards-grid' | 'magazine-compact' | 'headlines-list';
  activeDesktopView: 'news-reader' | 'work-calendar' | 'timer-desk' | 'desktop-hub';
  theme: 'dark-luxury' | 'nordic-slate' | 'clean-light' | 'sepia-reader' | 'cyber-engineer' | 'agrarian-nature';
  appStyle?: AppArchetypeStyle;
  customWallpaper?: string; // base64 or url
  customAiPrompt?: string; // user customizable AI summarization prompt
  scheduledHours?: number[]; // [6, 12, 19]
  lastScheduledRunDate?: string; // "YYYY-MM-DD"
  lastScheduledSlot?: number; // 6, 12, 19
  city?: string; // e.g. "Пушкино", "Москва"
  timeZone?: string; // e.g. "Europe/Moscow"
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: 'sans' | 'serif' | 'mono';
  autoRefreshMinutes: number;
  enableAutoAiProcessing?: boolean;
  markAsReadOnScroll: boolean;
  enableSoundEffects: boolean;
  enableKeyboardShortcuts: boolean;
  showBookmarksBar: boolean;
  dailyWorkGoalHours: number;
  pomodoroWorkMinutes: number;
  pomodoroBreakMinutes: number;
  collapsedCategories: string[];
  filterUnreadOnly: boolean;
  filterStarredOnly: boolean;
  filterSavedOnly: boolean;
  activeCategory: string; // 'all' | categoryName
  activeFeedId: string | null; // null for all
  searchQuery: string;
  selectedArticleId: string | null;
  keywordMutes: string[];
  keywordHighlights: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  login?: string; // alias/backward-compatibility
  email: string;
  displayName: string;
  avatar?: string;
  role?: 'admin' | 'doctor' | 'user';
  password?: string;
  profession?: string; // Профессия по желанию
  specialization?: string;
  specialty?: string;
  about?: string; // Информация о себе
  bio?: string;
  createdAt: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  appStyle?: AppArchetypeStyle;
  customWallpaper?: string;
  customAiPrompt?: string;
  enableAutoAiProcessing?: boolean;
  scheduledHours?: number[];
  lastScheduledRunDate?: string;
  lastScheduledSlot?: number;
  city?: string;
  timeZone?: string;
  workspaceConfig?: UserWorkspaceConfig;
  feeds: FeedConfig[];
  starredArticleIds?: string[];
  readArticleIds?: string[];
  savedLaterArticleIds?: string[];
  customCategories?: string[];
  articleNotes?: Record<string, string>; // articleId -> note
  bookmarks?: DesktopBookmark[];
  calendarEvents?: CalendarEvent[];
  workSchedules?: Record<string, WorkDaySchedule>; // date "YYYY-MM-DD" -> schedule
  timerSessions?: WorkdayTimerSession[];
  notes?: MedicalNote[];
  timers?: MedicalTimerItem[];
  accessibility?: AccessibilityConfig;
  aiProvider?: 'gemini' | 'openai' | 'openrouter' | 'custom';
  aiApiKey?: string;
  aiModel?: string;
  aiUrl?: string;
  version?: number;
  updatedAt?: string;
}

export interface AIDiscoveredFeed {
  title: string;
  url: string;
  siteUrl?: string;
  category: string;
  description: string;
  tags: string[];
  confidence?: string;
  iconName?: string;
}

export interface AIDigestResult {
  title: string;
  date: string;
  topStories: {
    title: string;
    summary: string;
    feedTitle: string;
    link?: string;
    category: string;
    impact: 'high' | 'medium' | 'low';
  }[];
  overallTrends: string[];
  keyTakeaways: string[];
}

export interface CuratedCategoryPreset {
  category: string;
  icon: string;
  description: string;
  feeds: {
    title: string;
    url: string;
    siteUrl: string;
    description: string;
    tags: string[];
  }[];
}

export type PendingEntityType =
  | 'feeds'
  | 'bookmarks'
  | 'timers'
  | 'notes'
  | 'workSchedules'
  | 'workspaceConfig'
  | 'aiSettings'
  | 'newsCards'
  | 'userProfile';

export interface PendingOperation {
  id: string;
  userId: string;
  entityType: PendingEntityType;
  entityId?: string;
  operation: 'create' | 'update' | 'delete';
  payload: any;
  baseUpdatedAt?: string;
  localUpdatedAt: string;
  createdAt: string;
  retryCount: number;
  status?: 'pending' | 'failed_retryable';
}

