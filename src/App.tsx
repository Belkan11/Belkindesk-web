import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './utils/firebase';
import { HeartPulse } from 'lucide-react';
import { 
  UserProfile, 
  MedicalNote, 
  MedicalTimerItem, 
  AccessibilityConfig, 
  Article, 
  NewsCard,
  FeedConfig, 
  WorkDaySchedule,
  AppArchetypeStyle,
  DesktopBookmark
} from './types';
import { 
  getStoredProfiles, 
  sanitizeProfiles, 
  saveStoredProfiles, 
  getActiveSessionUserId, 
  saveActiveSessionUserId, 
  clearActiveSessionUserId,
  getStoredMedicalNotes,
  saveStoredMedicalNotes,
  getStoredMedicalTimers,
  saveStoredMedicalTimers,
  getStoredAccessibility,
  saveStoredAccessibility,
  getStoredBookmarks,
  saveStoredBookmarks,
  getStoredWorkSchedules,
  saveStoredWorkSchedules,
  INITIAL_BOOKMARKS,
  INITIAL_MEDICAL_TIMERS,
  DEFAULT_WORKSPACE_CONFIG,
  saveAISettings,
  syncUserProfileToServer,
  syncUserProfileFieldsToServer,
  getStoredArticles,
  saveStoredArticles,
  getTimestampMs
} from './utils/storage';
import { 
  saveUserProfileToFirestore, 
  deleteUserProfileFromFirestore, 
  subscribeToAllProfiles,
  subscribeToUserProfile,
  loadUserDataFromFirestore
} from './utils/firebase';

import { MEDICAL_FEEDS, INITIAL_MEDICAL_ARTICLES, ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS } from './data/curatedFeeds';
import { fetchFeedArticles, aiProcessArticles } from './utils/feedApi';
import { getCityTimeInfo } from './utils/timeZone';
import { 
  migrateLocalArticlesToFirestoreNewsCards, 
  saveNewsCardToFirestore, 
  saveNewsCardsBatchToFirestore,
  deleteNewsCardFromFirestore,
  loadNewsCardsFromFirestore, 
  subscribeToNewsCardsFromFirestore,
  mergeCloudAndRssArticles,
  getStableCardId 
} from './utils/newsCardsCloud';
import { flushPendingQueue, reconcileRealtimeWithPendingQueue, getPendingQueue } from './utils/pendingSync';

import { AuthGateScreen } from './components/AuthGateScreen';
import { BelkinHeader } from './components/BelkinHeader';
import { MedicalLeftPanel } from './components/MedicalLeftPanel';
import { NotesPane } from './components/NotesPane';
import { MedicalNewsPane } from './components/MedicalNewsPane';
import { MedicalDigestModal } from './components/MedicalDigestModal';
import { ControlCenterModal } from './components/ControlCenterModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { UserCabinetModal } from './components/UserCabinetModal';

export default function App() {
  // Profiles and user state
  const [profiles, setProfiles] = useState<UserProfile[]>(() => getStoredProfiles());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => getActiveSessionUserId());
  const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
  const [profileLoadStatus, setProfileLoadStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle');
  
  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const isDevMode = useMemo(() => {
    return typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('ais-dev')
    );
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        // Firebase Auth is the absolute Single Source of Truth
        setActiveSessionId(user.uid);
        saveActiveSessionUserId(user.uid);
      } else {
        // In production, we strictly forbid any local/legacy sessions.
        // We only allow local/legacy demo sessions (like 'user-admin-belkin' or 'agent-*') in Dev/Demo mode.
        const currentActive = getActiveSessionUserId();
        const isLegacyOrLocal = currentActive && (
          currentActive.startsWith('usr_') ||
          currentActive.startsWith('agent-') ||
          currentActive === 'user-admin-belkin'
        );
        
        if (isLegacyOrLocal && isDevMode) {
          setActiveSessionId(currentActive);
        } else {
          setActiveSessionId(null);
          saveActiveSessionUserId(null);
        }
      }
      setAuthLoading(false);
    });
  }, [isDevMode]);

  // Synchronize pending offline queue upon auth, online event, or network reconnection
  useEffect(() => {
    if (!firebaseUser?.uid) return;

    const handleOnline = () => {
      flushPendingQueue(firebaseUser.uid).catch((err) => {
        console.warn('[PendingSync] Flush queue error:', err);
      });
    };

    window.addEventListener('online', handleOnline);
    handleOnline();

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [firebaseUser?.uid]);

  // Active current user profile
  const currentUser = useMemo<UserProfile | null>(() => {
    const effectiveActiveId = firebaseUser ? firebaseUser.uid : activeSessionId;
    return profiles.find((p) => p.id === effectiveActiveId) || null;
  }, [profiles, activeSessionId, firebaseUser]);

  const [activeTab, setActiveTab] = useState<'notes' | 'news'>('news');
  const [notes, setNotes] = useState<MedicalNote[]>(() => currentUser?.notes ?? getStoredMedicalNotes(getActiveSessionUserId() || undefined));
  const [timers, setTimers] = useState<MedicalTimerItem[]>(() => currentUser?.timers ?? getStoredMedicalTimers(getActiveSessionUserId() || undefined));
  const [bookmarks, setBookmarks] = useState<DesktopBookmark[]>(() => currentUser?.bookmarks ?? getStoredBookmarks(getActiveSessionUserId() || undefined));
  const [accessibility, setAccessibility] = useState<AccessibilityConfig>(() => currentUser?.accessibility ?? getStoredAccessibility(getActiveSessionUserId() || undefined));

  // Workspace Customization State (Style, Wallpaper, Custom Prompt, 3x/Day Schedule)
  const [appStyle, setAppStyle] = useState<AppArchetypeStyle>(() => currentUser?.appStyle ?? 'engineer');
  const [customWallpaper, setCustomWallpaper] = useState<string>(() => currentUser?.customWallpaper ?? '');
  const [customAiPrompt, setCustomAiPrompt] = useState<string>(() => currentUser?.customAiPrompt ?? DEFAULT_AI_PROMPTS.engineer);
  const [enableAutoAiProcessing, setEnableAutoAiProcessing] = useState<boolean>(() => currentUser?.enableAutoAiProcessing ?? false);
  const [scheduledHours, setScheduledHours] = useState<number[]>(() => currentUser?.scheduledHours ?? [6, 12, 19]);
  const [lastScheduledRunDate, setLastScheduledRunDate] = useState<string>(() => currentUser?.lastScheduledRunDate ?? '');
  const [lastScheduledSlot, setLastScheduledSlot] = useState<number | undefined>(() => currentUser?.lastScheduledSlot);

  // Feeds and Articles (User-isolated)
  const [feeds, setFeeds] = useState<FeedConfig[]>(() => currentUser?.feeds ?? ENGINEER_DEFAULT_FEEDS);
  const [articles, setArticles] = useState<Article[]>(() => getStoredArticles(getActiveSessionUserId() || undefined));
  const [activeFeedId, setActiveFeedId] = useState<string | null>(null);
  const [isStarredFilter, setIsStarredFilter] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatusMessage, setRefreshStatusMessage] = useState<string>('');

  // Calendar & Shifts (User-isolated)
  const [workSchedules, setWorkSchedules] = useState<Record<string, WorkDaySchedule>>(
    () => currentUser?.workSchedules || {}
  );

  // Modals
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isControlCenterOpen, setIsControlCenterOpen] = useState(false);
  const [controlCenterTab, setControlCenterTab] = useState('✦ ИСТОЧНИКИ');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isUserCabinetOpen, setIsUserCabinetOpen] = useState(false);

  // Sound Synthesizer
  const playUiSound = useCallback((type: 'click' | 'success' | 'star' | 'chime' | 'bell' | 'alert' | string) => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      } else if (type === 'star') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.19);
      } else if (type === 'bell') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(783.99, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.42);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.26);
      } else {
        // 'success', 'chime' and fallback
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.23);
      }
    } catch {
      // Audio fallback
    }
  }, []);

  // Single Unified Workspace Load & Realtime Subscription for Active Profile
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const effectiveId = firebaseUser ? firebaseUser.uid : (isDevMode ? activeSessionId : null);
    if (!effectiveId) {
      setIsProfileLoading(false);
      setProfileLoadStatus('idle');
      return;
    }

    let isMounted = true;
    let unsubscribe: (() => void) | undefined;

    const loadProfileAndListen = async () => {
      setIsProfileLoading(true);
      setProfileLoadStatus('loading');
      try {
        const { data: cloudUser, exists, error } = await loadUserDataFromFirestore(effectiveId);
        if (!isMounted) return;

        if (exists && cloudUser) {
          setProfileLoadStatus('found');
          // Single Source of Truth: Update state with Cloud Firestore profile
          setProfiles((prev) => {
            const existsIndex = prev.findIndex(p => p.id === effectiveId);
            let updatedProfiles: UserProfile[];
            if (existsIndex >= 0) {
              const existing = prev[existsIndex];
              updatedProfiles = [...prev];
              updatedProfiles[existsIndex] = { ...existing, ...cloudUser };
            } else {
              updatedProfiles = [...prev, cloudUser];
            }
            const sanitized = sanitizeProfiles(updatedProfiles);
            saveStoredProfiles(sanitized);
            return sanitized;
          });

          // Subscribe strictly to this user's document /users/{effectiveId}
          unsubscribe = subscribeToUserProfile(effectiveId, (updatedCloudUser) => {
            if (!isMounted || !updatedCloudUser) return;
            const pendingQueue = getPendingQueue(effectiveId);
            const reconciledUser = reconcileRealtimeWithPendingQueue(updatedCloudUser, pendingQueue);
            setProfiles((prev) => {
              const idx = prev.findIndex(p => p.id === effectiveId);
              let updated: UserProfile[];
              if (idx >= 0) {
                updated = [...prev];
                updated[idx] = { ...prev[idx], ...reconciledUser };
              } else {
                updated = [...prev, reconciledUser];
              }
              const sanitized = sanitizeProfiles(updated);
              saveStoredProfiles(sanitized);
              return sanitized;
            });
          });
        } else if (!exists && !error) {
          // Confirmed document does NOT exist on Firestore
          setProfileLoadStatus('not_found');
        } else {
          // OFFLINE / LOAD_ERROR: Firestore unavailable
          setProfileLoadStatus('error');
          console.warn('Firestore load error, relying on local offline cache fallback without pushing to server.');
        }
      } catch (err) {
        if (isMounted) {
          setProfileLoadStatus('error');
        }
        console.warn('Firestore load profile failed, using local offline fallback:', err);
      } finally {
        if (isMounted) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfileAndListen();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [authLoading, firebaseUser, activeSessionId, isDevMode]);

  // One-time safe background migration & Realtime sync of newsCards from Firestore
  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) {
      setArticles([]);
      return;
    }

    // 1. Safe background migration check
    migrateLocalArticlesToFirestoreNewsCards(uid).catch((err) => {
      console.warn('[NewsCards Migration] Migration note:', err);
    });

    // 2. Realtime subscription to current user's newsCards collection
    const unsubscribe = subscribeToNewsCardsFromFirestore((cloudCards) => {
      if (!cloudCards) return;
      setArticles((prev) => {
        const { mergedArticles } = mergeCloudAndRssArticles(cloudCards, prev);
        saveStoredArticles(mergedArticles, uid);
        return mergedArticles;
      });
    }, uid);

    // 3. Guaranteed cleanup when user logs out or switches
    return () => {
      unsubscribe();
      setArticles([]);
    };
  }, [firebaseUser?.uid]);

  // Dev/Admin mode only: Realtime subscribe to all profiles when Admin Panel is open
  useEffect(() => {
    if (!isAdminPanelOpen || !isDevMode) return;
    const unsubscribe = subscribeToAllProfiles((cloudProfiles) => {
      if (cloudProfiles && cloudProfiles.length > 0) {
        setProfiles((prev) => {
          const map = new Map<string, UserProfile>();
          prev.forEach(p => map.set(p.id, p));
          cloudProfiles.forEach(cp => map.set(cp.id, cp));
          const sanitized = sanitizeProfiles(Array.from(map.values()));
          saveStoredProfiles(sanitized);
          return sanitized;
        });
      }
    });
    return () => unsubscribe();
  }, [isAdminPanelOpen, isDevMode]);

  // Proactively auto-create a user profile locally & in Firestore if Firebase user exists but profile isn't found
  useEffect(() => {
    const effectiveId = firebaseUser?.uid;
    if (effectiveId && !isProfileLoading && profileLoadStatus === 'not_found') {
      const exists = profiles.some(p => p.id === effectiveId);
      if (!exists) {
        const email = firebaseUser.email || `${effectiveId}@local.desk`;
        const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Пользователь';
        const isBelkin = displayName.toLowerCase() === 'belkin' || effectiveId === 'user-admin-belkin';

        const newProfile: UserProfile = {
          id: effectiveId,
          username: displayName,
          login: displayName,
          email: email,
          displayName: displayName,
          role: isBelkin ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: [],
          timers: [],
          feeds: [...ENGINEER_DEFAULT_FEEDS],
          bookmarks: [...INITIAL_BOOKMARKS],
          workSchedules: {},
          accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
          appStyle: 'engineer',
          customWallpaper: '',
          customAiPrompt: DEFAULT_AI_PROMPTS.engineer,
          scheduledHours: [6, 12, 19],
        };

        setProfiles(prev => {
          if (prev.some(p => p.id === effectiveId)) return prev;
          const next = [...prev, newProfile];
          saveStoredProfiles(next);
          return next;
        });

        syncUserProfileToServer(newProfile).catch(() => {});
      }
    }
  }, [firebaseUser, profiles, isProfileLoading, profileLoadStatus]);

  // Sync state when active user changes
  useEffect(() => {
    if (currentUser && !isProfileLoading) {
      const uid = currentUser.id;
      setNotes(currentUser.notes ?? getStoredMedicalNotes(uid));
      setTimers(currentUser.timers ?? getStoredMedicalTimers(uid));
      setBookmarks(currentUser.bookmarks ?? getStoredBookmarks(uid));
      setFeeds(currentUser.feeds ?? ENGINEER_DEFAULT_FEEDS);
      setWorkSchedules(currentUser.workSchedules ?? getStoredWorkSchedules(uid));
      setAccessibility(currentUser.accessibility ?? getStoredAccessibility(uid));
      setAppStyle(currentUser.appStyle ?? 'engineer');
      setCustomWallpaper(currentUser.customWallpaper ?? '');
      setCustomAiPrompt(currentUser.customAiPrompt ?? DEFAULT_AI_PROMPTS[currentUser.appStyle ?? 'engineer'] ?? DEFAULT_AI_PROMPTS.engineer);
      setEnableAutoAiProcessing(currentUser.enableAutoAiProcessing ?? false);
      setScheduledHours(currentUser.scheduledHours ?? [6, 12, 19]);
      setLastScheduledRunDate(currentUser.lastScheduledRunDate ?? '');
      setLastScheduledSlot(currentUser.lastScheduledSlot);
      setArticles(getStoredArticles(uid));

      // Synchronize UID-specific local cache
      if (currentUser.bookmarks) saveStoredBookmarks(currentUser.bookmarks, uid);
      if (currentUser.notes) saveStoredMedicalNotes(currentUser.notes, uid);
      if (currentUser.accessibility) saveStoredAccessibility(currentUser.accessibility, uid);
      if (currentUser.workSchedules) saveStoredWorkSchedules(currentUser.workSchedules, uid);
    } else if (!currentUser) {
      // Clear/Reset all user-isolated workspace states immediately to prevent ANY leakage or transient data display
      setNotes([]);
      setTimers([]);
      setBookmarks([]);
      setFeeds(ENGINEER_DEFAULT_FEEDS);
      setWorkSchedules({});
      setAccessibility({ scalePercent: 100, visualAcuity: 'Не указывать' });
      setAppStyle('engineer');
      setCustomWallpaper('');
      setCustomAiPrompt(DEFAULT_AI_PROMPTS.engineer);
      setEnableAutoAiProcessing(false);
      setScheduledHours([6, 12, 19]);
      setLastScheduledRunDate('');
      setLastScheduledSlot(undefined);
      setArticles([]);
    }
  }, [currentUser?.id, currentUser?.updatedAt, isProfileLoading]);

  // Save articles when state changes
  useEffect(() => {
    if (currentUser?.id) {
      saveStoredArticles(articles, currentUser.id);
    }
  }, [articles, currentUser?.id]);


  // Live RSS Feeds Refresh (sequential scraping of all sources one by one)
  const handleRefresh = useCallback(async (overrideFeeds?: FeedConfig[]) => {
    setIsRefreshing(true);
    setRefreshStatusMessage('Подключение к источникам и последовательный скрейпинг...');
    try {
      const feedsToUse = overrideFeeds || feeds;
      const activeFeeds = feedsToUse.filter(f => f.enabled !== false);
      if (activeFeeds.length === 0) {
        setRefreshStatusMessage('Нет активных источников для обновления.');
        setTimeout(() => {
          setIsRefreshing(false);
          setRefreshStatusMessage('');
        }, 1000);
        return;
      }

      const rawArticles: Article[] = [];
      for (let i = 0; i < activeFeeds.length; i++) {
        const feed = activeFeeds[i];
        setRefreshStatusMessage(`Обработка ленты ${i + 1} из ${activeFeeds.length}: ${feed.name}...`);
        
        const activeSources = feed.sources?.filter(s => s.enabled !== false) || [];
        for (let j = 0; j < activeSources.length; j++) {
          const source = activeSources[j];
          setRefreshStatusMessage(`Скрейпинг источника ${j + 1} из ${activeSources.length} (${source.name || source.type}) в ленте ${feed.name}...`);
          try {
            // Include feed-level keywords in the source request if needed
            const fetchConfig = {
              ...source,
              keywords: [...(source.keywords || []), ...(feed.keywords || [])],
              excludeKeywords: [...(source.excludeKeywords || []), ...(feed.excludeKeywords || [])],
              keywordMode: source.keywordMode || feed.keywordMode || 'ANY',
              feedId: feed.id,
              feedTitle: feed.name,
              feedCategory: feed.category
            };
            const feedResult = await fetchFeedArticles(fetchConfig as any, feed.maxArticles || 50);
            if (feedResult.error) {
              console.warn(`Не удалось получить данные из источника ${source.name || source.url}: ${feedResult.error}`);
            } else if (feedResult.articles && feedResult.articles.length > 0) {
              rawArticles.push(...feedResult.articles);
            }
          } catch (feedErr: any) {
            console.warn(`Не удалось получить данные из источника ${source.name || source.url}: ${feedErr.message}`);
          }
        }
      }

      setRefreshStatusMessage('Скрейпинг завершен. Синхронизация с облачной историей Firestore...');
      
      const cloudCards = firebaseUser?.uid ? await loadNewsCardsFromFirestore() : [];
      const { mergedArticles, cardsToSaveToCloud } = mergeCloudAndRssArticles(cloudCards, rawArticles);

      // Save new RSS cards to Firestore for current user
      if (firebaseUser?.uid && cardsToSaveToCloud.length > 0) {
        saveNewsCardsBatchToFirestore(cardsToSaveToCloud).catch((err) => {
          console.warn('[Firestore NewsCards] Batch save note:', err);
        });
      }

      // Fallback local layout filling without AI
      const filledArticles = mergedArticles.map(c => {
        const needsLocalFill = !c.titleRu || !c.summaryOneLine || !c.summaryThreeLines;
        if (needsLocalFill) {
          const cleanSnippet = (c.contentSnippet || c.content || '').replace(/<[^>]*>/g, '').trim();
          return {
            ...c,
            titleRu: c.titleRu || c.title,
            summaryOneLine: c.summaryOneLine || (cleanSnippet ? (cleanSnippet.slice(0, 105) + '...') : c.title),
            summaryThreeLines: c.summaryThreeLines || (cleanSnippet ? (cleanSnippet.slice(0, 280) + '...') : c.content || ''),
            keyTerms: c.keyTerms || ['Инфо', c.feedCategory || 'Общие'],
          };
        }
        return c;
      });

      setArticles(filledArticles);
      saveStoredArticles(filledArticles, currentUser?.id || undefined);
      playUiSound('success');
      setRefreshStatusMessage('Ленты и облачная история успешно синхронизированы!');

      // Trigger AI formatting & Russian translation for unformatted articles ONLY if auto-processing is enabled
      const unformatted = filledArticles.filter(a => a.feedId !== 'search-results' && (!(a.ai?.summaryOneLine || a.summaryOneLine) || !(a.ai?.summaryThreeLines || a.summaryThreeLines))).slice(0, 15);
      if (enableAutoAiProcessing && unformatted.length > 0) {
        setRefreshStatusMessage(`ИИ-транслятор: Адаптация и перевод ${unformatted.length} новых карточек...`);
        const processed = await aiProcessArticles(unformatted, customAiPrompt);
        if (processed && processed.length > 0) {
          setArticles((current) => {
            const pMap = new Map<string, Article>();
            processed.forEach(p => pMap.set(p.id, p));
            return current.map(c => {
              const p = pMap.get(c.id);
              if (p) {
                return {
                  ...c,
                  titleRu: p.ai?.titleRu || c.ai?.titleRu || c.titleRu || c.title,
                  summaryOneLine: p.ai?.summaryOneLine || c.ai?.summaryOneLine || c.summaryOneLine,
                  summaryThreeLines: p.ai?.summaryThreeLines || c.ai?.summaryThreeLines || c.summaryThreeLines,
                  detailedContent: p.ai?.detailedContent || c.ai?.detailedContent || c.detailedContent,
                  keyTerms: p.ai?.keyTerms || c.ai?.keyTerms || c.keyTerms,
                };
              }
              return c;
            });
          });
          setRefreshStatusMessage('Формирование карточек успешно завершено!');
          playUiSound('success');
        }
      }

      // Keep message briefly so the user can read the result
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (err) {
      console.error('Error refreshing feeds:', err);
      setRefreshStatusMessage('Произошла ошибка при обновлении источников.');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      setIsRefreshing(false);
      setRefreshStatusMessage('');
    }
  }, [feeds, customAiPrompt, playUiSound, articles, enableAutoAiProcessing]);

  // AI Reprocessing of current articles manually
  const handleReprocessAllArticles = useCallback(async () => {
    if (articles.length === 0) return;
    setIsRefreshing(true);
    setRefreshStatusMessage('Запуск верификации шаблонов BelkinDESK...');
    
    const logToServer = async (type: string, message: string, details?: any) => {
      try {
        await fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, message, details }),
        });
      } catch (err) {
        console.warn('Failed to send audit log:', err);
      }
    };

    await logToServer('info', 'Запущена сверка карточек новостей с техническим шаблоном системы.');

    try {
      // 1. Validate all articles against the template
      const articlesToVerify = [...articles];
      const mismatchedArticles: Article[] = [];
      const matchedArticlesCount: string[] = [];

      articlesToVerify.forEach((art) => {
        const hasTitleRu = !!(art.ai?.titleRu || art.titleRu) && (art.ai?.titleRu || art.titleRu) !== art.title;
        const hasOneLine = !!art.summaryOneLine && art.summaryOneLine.length >= 15;
        const hasThreeLines = !!art.summaryThreeLines && art.summaryThreeLines.length >= 40;
        const detailedText = art.detailedContent || art.content || '';
        const hasDetailedHtml = detailedText.length >= 150 && /<[a-z][\s\S]*>/i.test(detailedText);

        const isMatch = hasTitleRu && hasOneLine && hasThreeLines && hasDetailedHtml;

        if (isMatch) {
          matchedArticlesCount.push(art.title);
        } else {
          mismatchedArticles.push(art);
        }
      });

      await logToServer('info', `Сверка завершена. Соответствуют шаблону: ${matchedArticlesCount.length} шт. Требуют переработки: ${mismatchedArticles.length} шт.`, {
        matched: matchedArticlesCount,
        mismatched: mismatchedArticles.map(a => a.title)
      });

      let finalArticles = [...articles];

      // 2. Reprocess mismatched articles if any exist
      if (mismatchedArticles.length > 0) {
        setRefreshStatusMessage(`Переработка ${mismatchedArticles.length} карточек в ИИ-шаблон через Gemini 3.1...`);
        await logToServer('google', `Отправка ${mismatchedArticles.length} неформатных карточек на адаптацию в Gemini API.`);
        
        const processed = await aiProcessArticles(mismatchedArticles, customAiPrompt);
        
        if (processed && processed.length > 0) {
          await logToServer('gemini', `Успешно переработано ИИ карточек: ${processed.length} шт.`);
          
          const pMap = new Map<string, Article>();
          processed.forEach(p => pMap.set(p.id, p));

          finalArticles = finalArticles.map(c => {
            const p = pMap.get(c.id);
            if (p) {
              return {
                ...c,
                titleRu: p.ai?.titleRu || c.ai?.titleRu || c.titleRu || c.title,
                summaryOneLine: p.ai?.summaryOneLine || c.ai?.summaryOneLine || c.summaryOneLine,
                summaryThreeLines: p.ai?.summaryThreeLines || c.ai?.summaryThreeLines || c.summaryThreeLines,
                detailedContent: p.ai?.detailedContent || c.ai?.detailedContent || c.detailedContent,
                keyTerms: p.ai?.keyTerms || c.ai?.keyTerms || c.keyTerms,
                aiSentiment: p.aiSentiment || 'analytical',
              };
            }
            return c;
          });
        } else {
          await logToServer('warn', 'ИИ вернул пустой результат при переработке карточек. Оставляем текущие значения.');
        }
      } else {
        setRefreshStatusMessage('Все карточки соответствуют шаблону! Переходим к распределению...');
      }

      // 3. Smart routing / moving to the correct feed source section
      setRefreshStatusMessage('Распределение карточек по соответствующим источникам...');
      await logToServer('info', 'Начало фазы интеллектуального перемещения карточек в разделы источников...');

      let movedCount = 0;
      finalArticles = finalArticles.map((art) => {
        const textToSearch = `${art.title} ${(art.ai?.titleRu || art.titleRu) || ''} ${art.contentSnippet || ''} ${art.link || ''} ${art.categories?.join(' ') || ''}`.toLowerCase();
        
        // Find best matching configured feed source
        let matchedFeed = feeds.find(f => f.id === art.feedId);
        
        if (!matchedFeed || art.feedId === 'search-results') {
          // Attempt keywords matchmaking
          for (const f of feeds) {
            const fTitle = (f.title || '').toLowerCase();
            const fQuery = (f.searchQuery || '').toLowerCase();
            
            const isMatch = 
              (fTitle.includes('4pda') && textToSearch.includes('4pda')) ||
              (fTitle.includes('youtube') && (textToSearch.includes('youtube') || textToSearch.includes('youtu.be') || textToSearch.includes('видео'))) ||
              (fTitle.includes('reddit') && textToSearch.includes('reddit')) ||
              (fTitle.includes('pikabu') && textToSearch.includes('pikabu')) ||
              (fQuery && textToSearch.includes(fQuery)) ||
              (f.hashtags && f.hashtags.some(tag => textToSearch.includes(tag.toLowerCase().replace('#', ''))));

            if (isMatch) {
              matchedFeed = f;
              break;
            }
          }
        }

        if (matchedFeed && matchedFeed.id !== art.feedId) {
          movedCount++;
          logToServer('info', `Статья "${(art.ai?.titleRu || art.titleRu) || art.title}" перемещена в источник [${matchedFeed.title}] (категория: ${matchedFeed.category})`);
          return {
            ...art,
            feedId: matchedFeed.id,
            feedTitle: matchedFeed.title,
            feedCategory: matchedFeed.category || 'Общие',
          };
        }

        return art;
      });

      await logToServer('info', `Фаза перемещения завершена. Всего распределено: ${movedCount} карточек.`);

      // Update state and storage
      setArticles(finalArticles);
      saveStoredArticles(finalArticles, currentUser?.id || undefined);

      setRefreshStatusMessage('Процесс успешно завершен!');
      playUiSound('success');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      console.error('Reprocessing articles failed:', err);
      await logToServer('error', `Критический сбой при верификации и распределении карточек: ${err.message || err}`);
      setRefreshStatusMessage('Не удалось выполнить ИИ-обработку карточек.');
      await new Promise(resolve => setTimeout(resolve, 1500));
    } finally {
      setIsRefreshing(false);
      setRefreshStatusMessage('');
    }
  }, [articles, feeds, customAiPrompt, playUiSound, currentUser]);

  // ----------------------------------------------------
  // AUTOMATED 3x/DAY SCHEDULING ALGORITHM:
  // Runs at 06:00, 12:00, 19:00 or on first launch after these times
  // ----------------------------------------------------
  const checkAndRunSchedule = useCallback(() => {
    if (!currentUser?.id) return;
    const cityInfo = getCityTimeInfo();
    const todayStr = cityInfo.dateStr; // YYYY-MM-DD in selected city
    const currentHour = cityInfo.hours; // 0-23 in selected city

    const targetSlots = scheduledHours.length > 0 ? scheduledHours : [6, 12, 19];
    const sortedSlots = [...targetSlots].sort((a, b) => a - b);

    // Determine the highest slot that has passed today
    let eligibleSlot: number | null = null;
    for (const slot of sortedSlots) {
      if (currentHour >= slot) {
        eligibleSlot = slot;
      }
    }

    if (eligibleSlot !== null) {
      // Check if we already ran for this slot today
      const alreadyRanThisSlot =
        lastScheduledRunDate === todayStr && lastScheduledSlot === eligibleSlot;

      if (!alreadyRanThisSlot) {
        console.log(`[Belkin Scheduler] Triggering automatic update for slot: ${eligibleSlot}:00 on ${todayStr}`);
        handleRefresh();

        setLastScheduledRunDate(todayStr);
        setLastScheduledSlot(eligibleSlot);

        if (currentUser?.id) {
          const lastKnownTime = currentUser.updatedAt;
          const updatedUser: UserProfile = {
            ...currentUser,
            lastScheduledRunDate: todayStr,
            lastScheduledSlot: eligibleSlot,
            updatedAt: new Date().toISOString(),
          };
          const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
          setProfiles(nextProfiles);
          saveStoredProfiles(nextProfiles);
          syncUserProfileFieldsToServer(currentUser.id, { lastScheduledRunDate: todayStr, lastScheduledSlot: eligibleSlot }, lastKnownTime);
        }
      }
    }
  }, [currentUser, scheduledHours, lastScheduledRunDate, lastScheduledSlot, handleRefresh, profiles]);

  // Run on startup when user logs in, and check every 60 seconds
  useEffect(() => {
    if (!currentUser || isProfileLoading) return;
    checkAndRunSchedule();
    const interval = setInterval(checkAndRunSchedule, 60000);
    return () => clearInterval(interval);
  }, [currentUser, checkAndRunSchedule, isProfileLoading]);

  // LOGOUT HANDLER
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut failed:', err);
    }
    // Explicitly reset Firebase state and local session identifiers
    setFirebaseUser(null);
    setActiveSessionId(null);
    clearActiveSessionUserId();

    // Immediately clear all user-isolated states to prevent ANY flash or leaking of User A's data
    setNotes([]);
    setTimers([]);
    setBookmarks([]);
    setFeeds(ENGINEER_DEFAULT_FEEDS);
    setWorkSchedules({});
    setAccessibility({ scalePercent: 100, visualAcuity: 'Не указывать' });
    setAppStyle('engineer');
    setCustomWallpaper('');
    setCustomAiPrompt(DEFAULT_AI_PROMPTS.engineer);
    setEnableAutoAiProcessing(false);
    setScheduledHours([6, 12, 19]);
    setLastScheduledRunDate('');
    setLastScheduledSlot(undefined);
    setArticles([]);

    playUiSound('click');
  };

  // User Settings Modifiers
  const handleUpdateAppStyle = (style: AppArchetypeStyle) => {
    setAppStyle(style);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser: UserProfile = { ...currentUser, appStyle: style, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { appStyle: style }, lastKnownTime);
    }
  };

  const handleUpdateCustomWallpaper = (wallpaper: string) => {
    setCustomWallpaper(wallpaper);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser: UserProfile = { ...currentUser, customWallpaper: wallpaper, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { customWallpaper: wallpaper }, lastKnownTime);
    }
  };

  const handleUpdateCustomAiPrompt = (prompt: string) => {
    setCustomAiPrompt(prompt);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser: UserProfile = { ...currentUser, customAiPrompt: prompt, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { customAiPrompt: prompt }, lastKnownTime);
    }
  };

  const handleUpdateEnableAutoAiProcessing = (enabled: boolean) => {
    setEnableAutoAiProcessing(enabled);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser: UserProfile = { ...currentUser, enableAutoAiProcessing: enabled, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { enableAutoAiProcessing: enabled }, lastKnownTime);
    }
  };

  const handleUpdateScheduledHours = (hours: number[]) => {
    setScheduledHours(hours);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser: UserProfile = { ...currentUser, scheduledHours: hours, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { scheduledHours: hours }, lastKnownTime);
    }
  };

  // Update Notes
  const handleUpdateNotes = (inputNotes: MedicalNote[]) => {
    const nowIso = new Date().toISOString();
    const inputIds = new Set(inputNotes.map((n) => n.id).filter(Boolean));
    const tombstones: MedicalNote[] = notes
      .filter((n) => n.id && !inputIds.has(n.id))
      .map((n) => ({
        ...n,
        deleted: true,
        deletedAt: n.deletedAt || nowIso,
        updatedAt: nowIso,
        version: (n.version || 0) + 1,
      }));

    const completeNotes = [...inputNotes, ...tombstones];
    setNotes(completeNotes);
    saveStoredMedicalNotes(completeNotes, currentUser?.id || undefined);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, notes: completeNotes, updatedAt: nowIso };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { notes: completeNotes }, lastKnownTime);
    }
  };

  const handleAddNote = (text: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const timestampStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(2)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const newNote: MedicalNote = {
      id: `note-${Date.now()}`,
      text,
      createdAt: now.toISOString(),
      timestampStr,
      updatedAt: now.toISOString(),
      deleted: false,
      version: 1,
    };
    handleUpdateNotes([newNote, ...notes.filter((n) => !n.deleted)]);
  };

  const handleDeleteNote = (id: string) => {
    const nowIso = new Date().toISOString();
    const target = notes.find((n) => n.id === id);
    if (target) {
      const tombstone: MedicalNote = {
        ...target,
        deleted: true,
        deletedAt: nowIso,
        updatedAt: nowIso,
        version: (target.version || 0) + 1,
      };
      handleUpdateNotes(notes.map((n) => (n.id === id ? tombstone : n)));
    } else {
      handleUpdateNotes(notes.filter((n) => n.id !== id));
    }
  };

  const handleEditNote = (id: string, newText: string) => {
    const nowIso = new Date().toISOString();
    handleUpdateNotes(
      notes.map((n) => (n.id === id ? { ...n, text: newText, updatedAt: nowIso, version: (n.version || 0) + 1 } : n))
    );
  };

  // Work Schedules (Calendar)
  const handleUpdateWorkSchedules = (inputSchedules: Record<string, WorkDaySchedule>) => {
    const nowIso = new Date().toISOString();
    const completeSchedules = { ...inputSchedules };

    for (const dateKey of Object.keys(workSchedules)) {
      if (!completeSchedules[dateKey]) {
        const existing = workSchedules[dateKey];
        completeSchedules[dateKey] = {
          ...(existing || { date: dateKey, shiftType: 'day-off' }),
          date: dateKey,
          deleted: true,
          deletedAt: existing?.deletedAt || nowIso,
          updatedAt: nowIso,
          version: (existing?.version || 0) + 1,
        };
      }
    }

    setWorkSchedules(completeSchedules);
    saveStoredWorkSchedules(completeSchedules, currentUser?.id || undefined);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, workSchedules: completeSchedules, updatedAt: nowIso };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { workSchedules: completeSchedules }, lastKnownTime);
    }
  };

  // Personal Timers
  const handleUpdateTimers = (inputTimers: MedicalTimerItem[]) => {
    const nowIso = new Date().toISOString();
    const inputIds = new Set(inputTimers.map((t) => t.id).filter(Boolean));
    const tombstones: MedicalTimerItem[] = timers
      .filter((t) => t.id && !inputIds.has(t.id))
      .map((t) => ({
        ...t,
        deleted: true,
        deletedAt: t.deletedAt || nowIso,
        updatedAt: nowIso,
        version: (t.version || 0) + 1,
      }));

    const completeTimers = [...inputTimers, ...tombstones];
    setTimers(completeTimers);
    saveStoredMedicalTimers(completeTimers, currentUser?.id || undefined);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, timers: completeTimers, updatedAt: nowIso };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { timers: completeTimers }, lastKnownTime);
    }
  };

  // Personal Accessibility
  const handleUpdateAccessibility = (newCfg: AccessibilityConfig) => {
    setAccessibility(newCfg);
    saveStoredAccessibility(newCfg, currentUser?.id || undefined);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, accessibility: newCfg, updatedAt: new Date().toISOString() };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { accessibility: newCfg }, lastKnownTime);
    }
  };

  const handleToggleScale = () => {
    const nextScale = accessibility.scalePercent === 100 ? 150 : 100;
    handleUpdateAccessibility({
      ...accessibility,
      scalePercent: nextScale as 100 | 150,
    });
  };

  const handleToggleStar = (articleId: string) => {
    setArticles((prev) => {
      let updatedArticle: Article | null = null;
      const next = prev.map((a) => {
        if (a.id === articleId) {
          updatedArticle = {
            ...a,
            isStarred: !a.isStarred,
            updatedAt: new Date().toISOString()
          };
          return updatedArticle;
        }
        return a;
      });

      if (updatedArticle) {
        saveNewsCardToFirestore(updatedArticle).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save starred state:', err);
        });
      }

      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleToggleRead = (articleId: string) => {
    setArticles((prev) => {
      let updatedArticle: Article | null = null;
      const next = prev.map((a) => {
        if (a.id === articleId) {
          const nextIsRead = a.isRead === undefined ? true : !a.isRead;
          updatedArticle = {
            ...a,
            isRead: nextIsRead,
            updatedAt: new Date().toISOString()
          };
          return updatedArticle;
        }
        return a;
      });

      if (updatedArticle) {
        saveNewsCardToFirestore(updatedArticle).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save read state:', err);
        });
      }

      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleToggleSavedLater = (articleId: string) => {
    setArticles((prev) => {
      let updatedArticle: Article | null = null;
      const next = prev.map((a) => {
        if (a.id === articleId) {
          const nextSaved = !(a.savedLater || a.isSavedLater);
          updatedArticle = {
            ...a,
            savedLater: nextSaved,
            isSavedLater: nextSaved,
            updatedAt: new Date().toISOString()
          };
          return updatedArticle;
        }
        return a;
      });

      if (updatedArticle) {
        saveNewsCardToFirestore(updatedArticle).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save savedLater state:', err);
        });
      }

      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleHideArticle = (articleId: string) => {
    setArticles((prev) => {
      let updatedArticle: Article | null = null;
      const next = prev.map((a) => {
        if (a.id === articleId) {
          updatedArticle = {
            ...a,
            isHidden: !a.isHidden,
            updatedAt: new Date().toISOString()
          };
          return updatedArticle;
        }
        return a;
      });

      if (updatedArticle) {
        saveNewsCardToFirestore(updatedArticle).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save hidden state:', err);
        });
      }

      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleSaveUserNote = (articleId: string, noteText: string) => {
    setArticles((prev) => {
      let updatedArticle: Article | null = null;
      const next = prev.map((a) => {
        if (a.id === articleId) {
          updatedArticle = {
            ...a,
            userNote: noteText,
            updatedAt: new Date().toISOString()
          };
          return updatedArticle;
        }
        return a;
      });

      if (updatedArticle) {
        saveNewsCardToFirestore(updatedArticle).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save user note state:', err);
        });
      }

      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleDeleteArticle = (articleId: string) => {
    const nowIso = new Date().toISOString();
    setArticles((prev) => {
      const target = prev.find((a) => a.id === articleId);
      if (target) {
        const tombstoneArt: Article = {
          ...target,
          deleted: true,
          deletedAt: nowIso,
          updatedAt: nowIso,
          version: (target.version || 0) + 1,
        };
        deleteNewsCardFromFirestore(articleId, tombstoneArt).catch((err) => {
          console.warn('[Firestore NewsCards] Failed to save tombstone on delete:', err);
        });
        const next = prev.map((a) => (a.id === articleId ? tombstoneArt : a));
        saveStoredArticles(next, currentUser?.id || undefined);
        return next;
      }
      return prev;
    });
    playUiSound('click');
  };

  // Bookmarks Quick Launcher Handlers
  const handleUpdateBookmarks = (inputBookmarks: DesktopBookmark[]) => {
    const nowIso = new Date().toISOString();
    const inputIds = new Set(inputBookmarks.map((b) => b.id).filter(Boolean));
    const tombstones: DesktopBookmark[] = bookmarks
      .filter((b) => b.id && !inputIds.has(b.id))
      .map((b) => ({
        ...b,
        deleted: true,
        deletedAt: b.deletedAt || nowIso,
        updatedAt: nowIso,
        version: (b.version || 0) + 1,
      }));

    const completeBookmarks = [...inputBookmarks, ...tombstones];
    setBookmarks(completeBookmarks);
    saveStoredBookmarks(completeBookmarks, currentUser?.id || undefined);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, bookmarks: completeBookmarks, updatedAt: nowIso };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { bookmarks: completeBookmarks }, lastKnownTime);
    }
  };

  const handleUpdateFeeds = (inputFeeds: FeedConfig[]) => {
    const nowIso = new Date().toISOString();
    const inputIds = new Set(inputFeeds.map((f) => f.id).filter(Boolean));
    const tombstones: FeedConfig[] = feeds
      .filter((f) => f.id && !inputIds.has(f.id))
      .map((f) => ({
        ...f,
        deleted: true,
        deletedAt: f.deletedAt || nowIso,
        updatedAt: nowIso,
        version: (f.version || 0) + 1,
      }));

    const completeFeeds = [...inputFeeds, ...tombstones];
    setFeeds(completeFeeds);
    if (currentUser?.id) {
      const lastKnownTime = currentUser.updatedAt;
      const updatedUser = { ...currentUser, feeds: completeFeeds, updatedAt: nowIso };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileFieldsToServer(currentUser.id, { feeds: completeFeeds }, lastKnownTime);
    }
  };

  const handleSaveAllWorkspaceSettings = (updates: Partial<UserProfile>) => {
    if (!currentUser?.id) return;

    const lastKnownTime = currentUser.updatedAt;
    const nowIso = new Date().toISOString();

    const patchPayload: Record<string, any> = { ...updates };

    if (updates.feeds !== undefined) {
      const inputIds = new Set(updates.feeds.map((f) => f.id).filter(Boolean));
      const tombstones = feeds
        .filter((f) => f.id && !inputIds.has(f.id))
        .map((f) => ({
          ...f,
          deleted: true,
          deletedAt: f.deletedAt || nowIso,
          updatedAt: nowIso,
          version: (f.version || 0) + 1,
        }));
      const completeFeeds = [...updates.feeds, ...tombstones];
      setFeeds(completeFeeds);
      patchPayload.feeds = completeFeeds;
    }
    if (updates.bookmarks !== undefined) {
      const inputIds = new Set(updates.bookmarks.map((b) => b.id).filter(Boolean));
      const tombstones = bookmarks
        .filter((b) => b.id && !inputIds.has(b.id))
        .map((b) => ({
          ...b,
          deleted: true,
          deletedAt: b.deletedAt || nowIso,
          updatedAt: nowIso,
          version: (b.version || 0) + 1,
        }));
      const completeBookmarks = [...updates.bookmarks, ...tombstones];
      setBookmarks(completeBookmarks);
      saveStoredBookmarks(completeBookmarks, currentUser.id);
      patchPayload.bookmarks = completeBookmarks;
    }

    // 1. Build the updated profile immediately
    const updatedUser: UserProfile = {
      ...currentUser,
      ...patchPayload,
      updatedAt: nowIso
    };

    // 2. Synchronously update all individual states in React
    if (updates.feeds !== undefined) {
      setFeeds(updates.feeds);
    }
    if (updates.bookmarks !== undefined) {
      setBookmarks(updates.bookmarks);
      saveStoredBookmarks(updates.bookmarks, currentUser.id);
    }
    if (updates.notes !== undefined) {
      setNotes(updates.notes);
      saveStoredMedicalNotes(updates.notes, currentUser.id);
    }
    if (updates.timers !== undefined) {
      setTimers(updates.timers);
      saveStoredMedicalTimers(updates.timers, currentUser.id);
    }
    if (updates.accessibility !== undefined) {
      setAccessibility(updates.accessibility);
      saveStoredAccessibility(updates.accessibility, currentUser.id);
    }
    if (updates.customAiPrompt !== undefined) {
      setCustomAiPrompt(updates.customAiPrompt);
    }
    if (updates.appStyle !== undefined) {
      setAppStyle(updates.appStyle);
    }
    if (updates.customWallpaper !== undefined) {
      setCustomWallpaper(updates.customWallpaper);
    }
    if (updates.scheduledHours !== undefined) {
      setScheduledHours(updates.scheduledHours);
    }
    if (updates.enableAutoAiProcessing !== undefined) {
      setEnableAutoAiProcessing(updates.enableAutoAiProcessing);
    }

    // 3. Update the global list of profiles in state & localStorage
    const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);

    // 4. Send granular fields update request to server with lastKnownTime check
    syncUserProfileFieldsToServer(currentUser.id, updates, lastKnownTime).catch((err) => {
      console.error('Failed to sync updated workspace settings:', err);
    });
  };

  // User Profile & Cabinet Handlers
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    const profileWithTime = { ...updatedProfile, updatedAt: new Date().toISOString() };
    const nextProfiles = profiles.map((p) => (p.id === profileWithTime.id ? profileWithTime : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
    syncUserProfileToServer(profileWithTime);
  };

  const handleCreateUser = async (newUser: UserProfile) => {
    if (!isDevMode) {
      console.warn('Creating local profiles without Firebase Auth is forbidden in production.');
      return;
    }
    const userWithTime = { ...newUser, updatedAt: new Date().toISOString() };
    const nextProfiles = [...profiles, userWithTime];
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);

    if (firebaseUser && firebaseUser.uid !== userWithTime.id) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signOut on user create failed:', err);
      }
    }

    setActiveSessionId(userWithTime.id);
    saveActiveSessionUserId(userWithTime.id);
    syncUserProfileToServer(userWithTime);
  };

  const handleSelectUser = async (userId: string) => {
    if (!isDevMode && firebaseUser && firebaseUser.uid !== userId) {
      console.warn('Profile switching without authentication is forbidden in production.');
      return;
    }
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      if (firebaseUser && firebaseUser.uid !== target.id) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn('Firebase signOut on user select failed:', err);
        }
      }

      setActiveSessionId(target.id);
      saveActiveSessionUserId(target.id);
      setNotes(target.notes ?? []);
      setTimers(target.timers ?? INITIAL_MEDICAL_TIMERS);
      setBookmarks(Array.isArray(target.bookmarks) ? target.bookmarks : INITIAL_BOOKMARKS);
      setFeeds(Array.isArray(target.feeds) ? target.feeds : ENGINEER_DEFAULT_FEEDS);
      setWorkSchedules(target.workSchedules ?? {});
      setAccessibility(target.accessibility ?? { scalePercent: 100, visualAcuity: 'Не указывать' });
      setAppStyle(target.appStyle ?? 'engineer');
      setCustomWallpaper(target.customWallpaper ?? '');
      setCustomAiPrompt(target.customAiPrompt ?? DEFAULT_AI_PROMPTS[target.appStyle ?? 'engineer'] ?? DEFAULT_AI_PROMPTS.engineer);
      setScheduledHours(target.scheduledHours ?? [6, 12, 19]);
      setArticles(getStoredArticles(target.id));
    }
  };

  // Admin Profile Handlers
  const handleUpdateUserRole = (userId: string, newRole: 'admin' | 'user') => {
    const nextProfiles = profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
  };

  const handleUpdateUserDetails = (userId: string, updates: Partial<UserProfile>) => {
    const nextProfiles = profiles.map((p) => (p.id === userId ? { ...p, ...updates } : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
  };


  useEffect(() => {
    const effectiveId = firebaseUser ? firebaseUser.uid : activeSessionId;
    if (!effectiveId || isProfileLoading) return;
    
    // Function to ping
    const ping = () => {
      const nowIso = new Date().toISOString();
      setProfiles(prev => {
        const next = prev.map(p => p.id === effectiveId ? { ...p, lastActiveAt: nowIso } : p);
        saveStoredProfiles(next);
        return next;
      });
      syncUserProfileFieldsToServer(effectiveId, { lastActiveAt: nowIso });
    };

    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [firebaseUser, activeSessionId, isProfileLoading]);


  const handleDeleteUserProfile = (userId: string) => {
    const nextProfiles = profiles.filter((p) => p.id !== userId);
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
  };

  const handleRestoreBackup = (
    importedProfiles: UserProfile[],
    extraNotes?: MedicalNote[],
    extraTimers?: MedicalTimerItem[],
    extraAccessibility?: AccessibilityConfig
  ) => {
    if (!Array.isArray(importedProfiles) || importedProfiles.length === 0) return;

    // Target UID is strictly current authenticated firebaseUser.uid or in dev mode fallback activeSessionId
    const targetId = firebaseUser?.uid || (isDevMode ? activeSessionId : null);
    if (!targetId && !currentUser) return;

    const currentBase = currentUser || profiles.find((p) => p.id === targetId) || {
      id: targetId || 'user-default',
      email: firebaseUser?.email || 'user@local.desk',
      username: firebaseUser?.displayName || 'Пользователь',
      displayName: firebaseUser?.displayName || 'Пользователь',
      role: 'user' as const,
    };

    const actualTargetId = currentBase.id;

    // Match imported profile by targetId if present, else use first imported profile as settings source
    const sourceProfile = importedProfiles.find((p) => p.id === actualTargetId) || importedProfiles[0];

    // Data values restored with ?? to respect valid empty strings, empty arrays, false, 0
    const restoredNotes = extraNotes ?? sourceProfile?.notes ?? currentBase.notes ?? [];
    const restoredTimers = extraTimers ?? sourceProfile?.timers ?? currentBase.timers ?? [];
    const restoredBookmarks = Array.isArray(sourceProfile?.bookmarks) ? sourceProfile.bookmarks : (currentBase.bookmarks ?? INITIAL_BOOKMARKS);
    const restoredFeeds = Array.isArray(sourceProfile?.feeds) ? sourceProfile.feeds : (currentBase.feeds ?? ENGINEER_DEFAULT_FEEDS);
    const restoredSchedules = sourceProfile?.workSchedules ?? currentBase.workSchedules ?? {};
    const restoredAccessibility = extraAccessibility ?? sourceProfile?.accessibility ?? currentBase.accessibility ?? { scalePercent: 100, visualAcuity: 'Не указывать' };
    const restoredStyle = sourceProfile?.appStyle ?? currentBase.appStyle ?? 'engineer';
    const restoredWallpaper = sourceProfile?.customWallpaper ?? currentBase.customWallpaper ?? '';
    const restoredPrompt = sourceProfile?.customAiPrompt ?? currentBase.customAiPrompt ?? (DEFAULT_AI_PROMPTS[restoredStyle] || DEFAULT_AI_PROMPTS.engineer);
    const restoredHours = Array.isArray(sourceProfile?.scheduledHours) ? sourceProfile.scheduledHours : (currentBase.scheduledHours ?? [6, 12, 19]);
    const restoredConfig = sourceProfile?.workspaceConfig ? { ...DEFAULT_WORKSPACE_CONFIG, ...sourceProfile.workspaceConfig } : (currentBase.workspaceConfig ?? { ...DEFAULT_WORKSPACE_CONFIG });
    const restoredProvider = sourceProfile?.aiProvider ?? currentBase.aiProvider ?? 'gemini';
    const restoredApiKey = sourceProfile?.aiApiKey ?? currentBase.aiApiKey ?? '';
    const restoredModel = sourceProfile?.aiModel ?? currentBase.aiModel ?? '';
    const restoredUrl = sourceProfile?.aiUrl ?? currentBase.aiUrl ?? '';
    const restoredEnableAutoAi = sourceProfile?.enableAutoAiProcessing ?? currentBase.enableAutoAiProcessing;

    // Construct restored profile PRESERVING current user Firebase identity
    const restoredUser: UserProfile = {
      ...currentBase,
      id: actualTargetId, // Firebase identity preserved!
      email: currentBase.email,
      username: currentBase.username,
      displayName: currentBase.displayName,
      role: currentBase.role,
      notes: restoredNotes,
      timers: restoredTimers,
      bookmarks: restoredBookmarks,
      feeds: restoredFeeds,
      workSchedules: restoredSchedules,
      accessibility: restoredAccessibility,
      appStyle: restoredStyle,
      customWallpaper: restoredWallpaper,
      customAiPrompt: restoredPrompt,
      scheduledHours: restoredHours,
      workspaceConfig: restoredConfig,
      aiProvider: restoredProvider,
      aiApiKey: restoredApiKey,
      aiModel: restoredModel,
      aiUrl: restoredUrl,
      enableAutoAiProcessing: restoredEnableAutoAi,
      updatedAt: new Date().toISOString(),
    };

    // Update state directly without changing activeSessionId or Firebase identity
    setNotes(restoredNotes);
    setTimers(restoredTimers);
    setBookmarks(restoredBookmarks);
    setFeeds(restoredFeeds);
    setWorkSchedules(restoredSchedules);
    setAccessibility(restoredAccessibility);
    setAppStyle(restoredStyle);
    setCustomWallpaper(restoredWallpaper);
    setCustomAiPrompt(restoredPrompt);
    setScheduledHours(restoredHours);

    // Save locally and sync to Cloud Firestore
    saveStoredMedicalNotes(restoredNotes, actualTargetId);
    saveStoredMedicalTimers(restoredTimers, actualTargetId);
    saveStoredBookmarks(restoredBookmarks, actualTargetId);
    saveStoredWorkSchedules(restoredSchedules, actualTargetId);
    saveStoredAccessibility(restoredAccessibility, actualTargetId);
    saveAISettings(restoredProvider, restoredApiKey, restoredModel, restoredUrl, restoredUser);

    const nextProfiles = profiles.map((p) => (p.id === actualTargetId ? restoredUser : p));
    if (!nextProfiles.some((p) => p.id === actualTargetId)) {
      nextProfiles.push(restoredUser);
    }
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
    syncUserProfileToServer(restoredUser);
  };

  const effectiveActiveId = firebaseUser ? firebaseUser.uid : activeSessionId;

  // Show loading screen while Firebase Auth is resolving OR while profile is being fetched from Firestore or local fallback
  if (authLoading || (effectiveActiveId && isProfileLoading)) {
    return (
      <div className="min-h-screen bg-[#07090c] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Background grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161a2215_1px,transparent_1px),linear-gradient(to_bottom,#161a2215_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40"></div>
        
        <div className="text-center space-y-6 max-w-md w-full relative z-10">
          <div className="flex justify-center">
            <div className="relative">
              {/* Outer spinning ring */}
              <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
              {/* Inner glowing pulse icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-slate-200 tracking-wider font-mono">
              СИНХРОНИЗАЦИЯ ПРОФИЛЯ
            </h3>
            <p className="text-xs text-emerald-400 font-mono tracking-widest uppercase">
              PulseDesk Smart AI
            </p>
          </div>
          
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3 text-center">
            <span className="text-xs font-mono text-slate-400">
              Получение данных из Cloud Firestore...
            </span>
          </div>
        </div>
      </div>
    );
  }

  // If no user is logged in, show the Clean Auth Modal Window immediately
  if (!effectiveActiveId || !currentUser) {
    return (
      <AuthGateScreen
        onPlaySound={playUiSound}
        onAuthSuccess={(userId) => {
          setActiveSessionId(userId);
          saveActiveSessionUserId(userId);
        }}
        profiles={profiles}
        onSetProfiles={(next) => {
          setProfiles(next);
          saveStoredProfiles(next);
        }}
      />
    );
  }

  const unreadCount = articles.filter((a) => !a.isRead && !a.deleted).length;

  return (
    <div 
      className={`h-screen w-screen flex flex-col overflow-hidden text-slate-100 relative transition-all duration-200 ${
        accessibility.scalePercent === 150 ? 'scale-[1.12] origin-top-left overflow-auto' : ''
      }`}
      style={{
        backgroundColor: customWallpaper ? 'transparent' : '#0c0f14',
        backgroundImage: customWallpaper 
          ? `linear-gradient(to bottom, rgba(10, 14, 20, ${appStyle === 'modern' ? '0.05' : '0.72'}), rgba(8, 11, 16, ${appStyle === 'modern' ? '0.1' : '0.82'})), url("${customWallpaper}")` 
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* 1. Header with Archetype Brand & Customization Indicators */}
      <BelkinHeader
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        unreadNewsCount={unreadCount}
        onOpenSettings={() => {
          setControlCenterTab('✦ ИСТОЧНИКИ');
          setIsControlCenterOpen(true);
        }}
        currentUser={currentUser}
        onOpenUserCabinet={() => setIsUserCabinetOpen(true)}
        onOpenAdminModal={() => setIsAdminPanelOpen(true)}
        onLogout={handleLogout}
        appStyle={appStyle}
        onSelectAppStyle={setAppStyle}
        scalePercent={accessibility.scalePercent}
        onToggleScale={handleToggleScale}
        onPlaySound={playUiSound}
      />

      {/* 1.5. Global Card Formation & Sync Status Bar */}
      {isRefreshing && (
        <div className="bg-[#0e121a]/95 backdrop-blur-md border-b border-[#ffcc00]/30 text-[#ffcc00] px-4 py-2 flex items-center justify-between font-mono text-[11px] shrink-0 z-30 shadow-md animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
               <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] animate-ping absolute" />
               <span className="w-2 h-2 rounded-full bg-[#ffcc00]" />
            </div>
            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 shrink-0">
              [ФОРМИРОВАНИЕ КАРТОЧЕК ИИ]
            </span>
            <span className="text-slate-200 truncate font-sans text-xs">
              {refreshStatusMessage || 'Обработка и адаптация контента через Gemini 3.1 Flash Lite...'}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 font-bold ml-2">
            <span className="animate-pulse text-[#ffcc00] flex items-center gap-1.5 shrink-0">
              <span className="inline-block w-2 h-2 bg-[#ffcc00] rounded-full animate-spin border border-[#ffcc00] border-t-transparent" />
              GEMINI ACTIVE
            </span>
          </div>
        </div>
      )}

      {/* 2. Main Desktop Workspace (Split Layout) */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Side: Timers, Weather, Shift Calendar, Quick Launcher */}
        <MedicalLeftPanel
          timers={timers.filter((t) => !t.deleted)}
          onUpdateTimers={handleUpdateTimers}
          workSchedules={workSchedules}
          onUpdateWorkSchedules={handleUpdateWorkSchedules}
          bookmarks={bookmarks.filter((b) => !b.deleted)}
          onUpdateBookmarks={handleUpdateBookmarks}
          onOpenSettingsTab={(tab) => {
            setControlCenterTab(tab);
            setIsControlCenterOpen(true);
          }}
          appStyle={appStyle}
          onPlaySound={playUiSound}
          currentUserId={currentUser?.id}
        />

        {/* Right Side: Tab View (ЗАМЕТКИ or НОВОСТИ) */}
        {activeTab === 'notes' ? (
          <NotesPane
            notes={notes.filter((n) => !n.deleted)}
            onAddNote={handleAddNote}
            onEditNote={handleEditNote}
            onDeleteNote={handleDeleteNote}
            appStyle={appStyle}
            onPlaySound={playUiSound}
          />
        ) : (
          <MedicalNewsPane
            articles={articles.filter((a) => !a.deleted)}
            feeds={feeds.filter((f) => !f.deleted)}
            activeFeedId={activeFeedId}
            onSelectFeed={setActiveFeedId}
            onSelectArticle={(art) => setSelectedArticle(art)}
            onToggleStar={handleToggleStar}
            onToggleRead={handleToggleRead}
            onDeleteArticle={handleDeleteArticle}
            isStarredFilter={isStarredFilter}
            onToggleStarredFilter={setIsStarredFilter}
            onPlaySound={playUiSound}
            appStyle={appStyle}
            onReprocessArticles={handleReprocessAllArticles}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            refreshStatusMessage={refreshStatusMessage}
            onOpenAddFeed={() => {
              setControlCenterTab('✦ ИСТОЧНИКИ');
              setIsControlCenterOpen(true);
            }}
          />
        )}
      </main>

      {/* 3. Article Digest Modal (With User Custom AI Prompt Integration) */}
      {selectedArticle && (
        <MedicalDigestModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onToggleStar={handleToggleStar}
          customPrompt={customAiPrompt}
          enableAutoAiProcessing={enableAutoAiProcessing}
          appStyle={appStyle}
          onPlaySound={playUiSound}
        />
      )}

      {/* 4. Universal Control Center Modal (✦ ИСТОЧНИКИ, # ФИЛЬТРЫ, 🕒 РАСПИСАНИЕ, ✦ AI-РЕДАКТОР, A+ ДОСТУПНОСТЬ, 🎨 ОФОРМЛЕНИЕ, ♥ О ПРОЕКТЕ) */}
      <ControlCenterModal
        isOpen={isControlCenterOpen}
        onClose={() => setIsControlCenterOpen(false)}
        initialTab={controlCenterTab}
        feeds={feeds.filter((f) => !f.deleted)}
        onUpdateFeeds={handleUpdateFeeds}
        timers={timers.filter((t) => !t.deleted)}
        onUpdateTimers={handleUpdateTimers}
        accessibility={accessibility}
        onUpdateAccessibility={handleUpdateAccessibility}
        appStyle={appStyle}
        onChangeAppStyle={handleUpdateAppStyle}
        customWallpaper={customWallpaper}
        onChangeCustomWallpaper={handleUpdateCustomWallpaper}
        customAiPrompt={customAiPrompt}
        onChangeCustomAiPrompt={handleUpdateCustomAiPrompt}
        enableAutoAiProcessing={enableAutoAiProcessing}
        onChangeEnableAutoAiProcessing={handleUpdateEnableAutoAiProcessing}
        scheduledHours={scheduledHours}
        onChangeScheduledHours={handleUpdateScheduledHours}
        onTriggerRefresh={handleRefresh}
        currentUser={currentUser}
        onUpdateUserDetails={handleSaveProfile}
        isRefreshing={isRefreshing}
        onPlaySound={playUiSound}
        onSaveAllWorkspaceSettings={handleSaveAllWorkspaceSettings}
      />

      {/* 5. User Cabinet & Profile Management Modal (Avatar, Profession, Bio, Password/Login, Switch/Create User) */}
      {isUserCabinetOpen && currentUser && (
        <UserCabinetModal
          isOpen={isUserCabinetOpen}
          onClose={() => setIsUserCabinetOpen(false)}
          currentUser={currentUser}
          allProfiles={profiles}
          onSaveProfile={handleSaveProfile}
          onCreateUser={handleCreateUser}
          onSelectUser={handleSelectUser}
          onDeleteUser={handleDeleteUserProfile}
          appStyle={appStyle}
          onPlaySound={playUiSound}
        />
      )}

      {/* 6. Administrator Panel Modal (Google Drive Backup & User Roles Management) */}
      {isAdminPanelOpen && (
        <AdminPanelModal
          isOpen={isAdminPanelOpen}
          onClose={() => setIsAdminPanelOpen(false)}
          currentUser={currentUser}
          allProfiles={profiles}
          notes={notes.filter((n) => !n.deleted)}
          timers={timers.filter((t) => !t.deleted)}
          accessibility={accessibility}
          onUpdateUserRole={handleUpdateUserRole}
          onUpdateUserDetails={handleUpdateUserDetails}
          onDeleteUserProfile={handleDeleteUserProfile}
          onRestoreBackup={handleRestoreBackup}
          appStyle={appStyle}
          onPlaySound={playUiSound}
        />
      )}
    </div>
  );
}
