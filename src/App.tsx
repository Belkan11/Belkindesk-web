import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './utils/firebase';
import { 
  UserProfile, 
  MedicalNote, 
  MedicalTimerItem, 
  AccessibilityConfig, 
  Article, 
  FeedConfig, 
  WorkDaySchedule,
  AppArchetypeStyle,
  DesktopBookmark
} from './types';
import { 
  getStoredProfiles, 
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
  INITIAL_BOOKMARKS,
  INITIAL_MEDICAL_TIMERS,
  syncUserProfileToServer,
  syncAllProfilesWithFirestore,
  getStoredArticles,
  saveStoredArticles,
  getSeenArticlesList,
  markArticlesAsSeen
} from './utils/storage';
import { 
  saveUserProfileToFirestore, 
  deleteUserProfileFromFirestore, 
  saveBackupSnapshotToFirestore, 
  subscribeToAllProfiles 
} from './utils/firebase';

import { MEDICAL_FEEDS, INITIAL_MEDICAL_ARTICLES, ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS } from './data/curatedFeeds';
import { fetchFeedArticles, aiProcessArticles } from './utils/feedApi';
import { getCityTimeInfo } from './utils/timeZone';

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
  
  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
  }, []);

  // Active current user profile
  const currentUser = useMemo<UserProfile | null>(() => {
    return profiles.find((p) => p.id === activeSessionId) || null;
  }, [profiles, activeSessionId]);

  const [activeTab, setActiveTab] = useState<'notes' | 'news'>('news');
  const [notes, setNotes] = useState<MedicalNote[]>(() => currentUser?.notes || getStoredMedicalNotes());
  const [timers, setTimers] = useState<MedicalTimerItem[]>(() => currentUser?.timers || getStoredMedicalTimers());
  const [bookmarks, setBookmarks] = useState<DesktopBookmark[]>(() => currentUser?.bookmarks || getStoredBookmarks());
  const [accessibility, setAccessibility] = useState<AccessibilityConfig>(() => currentUser?.accessibility || getStoredAccessibility());

  // Workspace Customization State (Style, Wallpaper, Custom Prompt, 3x/Day Schedule)
  const [appStyle, setAppStyle] = useState<AppArchetypeStyle>(() => currentUser?.appStyle || 'engineer');
  const [customWallpaper, setCustomWallpaper] = useState<string>(() => currentUser?.customWallpaper || '');
  const [customAiPrompt, setCustomAiPrompt] = useState<string>(() => currentUser?.customAiPrompt || DEFAULT_AI_PROMPTS.engineer);
  const [enableAutoAiProcessing, setEnableAutoAiProcessing] = useState<boolean>(() => currentUser?.enableAutoAiProcessing ?? false);
  const [scheduledHours, setScheduledHours] = useState<number[]>(() => currentUser?.scheduledHours || [6, 12, 19]);
  const [lastScheduledRunDate, setLastScheduledRunDate] = useState<string>(() => currentUser?.lastScheduledRunDate || '');
  const [lastScheduledSlot, setLastScheduledSlot] = useState<number | undefined>(() => currentUser?.lastScheduledSlot);

  // Feeds and Articles (User-isolated)
  const [feeds, setFeeds] = useState<FeedConfig[]>(() => currentUser?.feeds || ENGINEER_DEFAULT_FEEDS);
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
  const playUiSound = useCallback((type: 'click' | 'success' | 'star') => {
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
      } else if (type === 'success') {
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

  // Initial Firestore Cloud Database Synchronization & Live Realtime Subscription
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initDb = async () => {
      try {
        const synced = await syncAllProfilesWithFirestore();
        if (synced && synced.length > 0) {
          setProfiles(synced);
        }
      } catch (err) {
        console.warn('Initial Firestore database sync notice:', err);
      }

      // Setup realtime listener so multiple devices or tabs stay perfectly synchronized
      try {
        unsubscribe = subscribeToAllProfiles((cloudProfiles) => {
          if (cloudProfiles && cloudProfiles.length > 0) {
            setProfiles((prev) => {
              const map = new Map<string, UserProfile>();
              prev.forEach(p => map.set(p.id, p));
              cloudProfiles.forEach(cp => {
                const existing = map.get(cp.id);
                map.set(cp.id, existing ? { ...existing, ...cp } : cp);
              });
              const next = Array.from(map.values());
              saveStoredProfiles(next);
              return next;
            });
          }
        });
      } catch (err) {
        console.warn('Firestore subscription notice:', err);
      }
    };

    initDb();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync state when active user changes
  useEffect(() => {
    if (currentUser) {
      setNotes(currentUser.notes || getStoredMedicalNotes());
      setTimers(currentUser.timers || getStoredMedicalTimers());
      setBookmarks(currentUser.bookmarks || getStoredBookmarks());
      setFeeds(currentUser.feeds || ENGINEER_DEFAULT_FEEDS);
      setWorkSchedules(currentUser.workSchedules || {});
      setAccessibility(currentUser.accessibility || getStoredAccessibility());
      setAppStyle(currentUser.appStyle || 'engineer');
      setCustomWallpaper(currentUser.customWallpaper || '');
      setCustomAiPrompt(currentUser.customAiPrompt || DEFAULT_AI_PROMPTS[currentUser.appStyle || 'engineer'] || DEFAULT_AI_PROMPTS.engineer);
      setEnableAutoAiProcessing(currentUser.enableAutoAiProcessing ?? false);
      setScheduledHours(currentUser.scheduledHours || [6, 12, 19]);
      setLastScheduledRunDate(currentUser.lastScheduledRunDate || '');
      setLastScheduledSlot(currentUser.lastScheduledSlot);
      setArticles(getStoredArticles(currentUser.id));
    }
  }, [currentUser?.id]);

  // Save articles when state changes
  useEffect(() => {
    if (currentUser?.id) {
      saveStoredArticles(articles, currentUser.id);
    } else {
      saveStoredArticles(articles);
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
              feedId: feed.id,
              feedTitle: feed.name,
              feedCategory: feed.category
            };
            const feedResult = await fetchFeedArticles(fetchConfig as any, feed.maxArticles || 50);
            if (!feedResult.error && feedResult.articles.length > 0) {
              rawArticles.push(...feedResult.articles);
            }
          } catch (feedErr: any) {
            console.warn(`Source ${source.name} in feed ${feed.name} scraping failed:`, feedErr);
          }
        }
      }

      setRefreshStatusMessage('Скрейпинг всех источников завершен. Фильтрация дубликатов...');
      // Deduplication across all fetched articles based on canonical URL or title
      const uniqueNewArticles: Article[] = [];
      const seenLinks = new Set<string>();
      const seenTitles = new Set<string>();

      // Read state
      const currentKeys = new Set<string>();
      articles.forEach((a) => {
        if (a.title) currentKeys.add(a.title.trim().toLowerCase());
        if (a.link) currentKeys.add(a.link.trim().toLowerCase());
      });

      rawArticles.forEach((art, idx) => {
        const l = art.link || '';
        const t = (art.title || '').toLowerCase().trim();
        if (currentKeys.has(t) || currentKeys.has(l) || seenLinks.has(l) || seenTitles.has(t)) {
          return;
        }
        if (l) seenLinks.add(l);
        if (t) seenTitles.add(t);
        
        uniqueNewArticles.push({
          ...art,
          id: `art_ref_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`
        });
      });

      if (uniqueNewArticles.length > 0) {
        setRefreshStatusMessage(`Найдено ${uniqueNewArticles.length} материалов. Обновление ленты...`);
        let updatedArticlesList: Article[] = [];
        setArticles((prev) => {
          updatedArticlesList = [...uniqueNewArticles, ...prev].slice(0, 150);
          return updatedArticlesList;
        });
        playUiSound('success');

        // Fallback local layout filling without AI
        setArticles((current) => {
          return current.map(c => {
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
        });
        setRefreshStatusMessage('Ленты успешно синхронизированы!');

        // Trigger AI formatting & Russian translation for new articles ONLY if auto-processing is enabled
        const unformatted = uniqueNewArticles.filter(a => a.feedId !== 'search-results' && (!a.summaryOneLine || !a.summaryThreeLines)).slice(0, 15);
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
                    titleRu: p.titleRu || c.titleRu || c.title,
                    summaryOneLine: p.summaryOneLine || c.summaryOneLine,
                    summaryThreeLines: p.summaryThreeLines || c.summaryThreeLines,
                    detailedContent: p.detailedContent || c.detailedContent,
                    keyTerms: p.keyTerms || c.keyTerms,
                  };
                }
                return c;
              });
            });
            setRefreshStatusMessage('Формирование карточек успешно завершено!');
            playUiSound('success');
          }
        }
      } else {
        setRefreshStatusMessage('Обновление завершено.');
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
  }, [feeds, customAiPrompt, playUiSound, articles]);

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
        const hasTitleRu = !!art.titleRu && art.titleRu !== art.title;
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
                titleRu: p.titleRu || c.titleRu || c.title,
                summaryOneLine: p.summaryOneLine || c.summaryOneLine,
                summaryThreeLines: p.summaryThreeLines || c.summaryThreeLines,
                detailedContent: p.detailedContent || c.detailedContent,
                keyTerms: p.keyTerms || c.keyTerms,
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
        const textToSearch = `${art.title} ${art.titleRu || ''} ${art.contentSnippet || ''} ${art.link || ''} ${art.categories?.join(' ') || ''}`.toLowerCase();
        
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
          logToServer('info', `Статья "${art.titleRu || art.title}" перемещена в источник [${matchedFeed.title}] (категория: ${matchedFeed.category})`);
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
          const updatedUser: UserProfile = {
            ...currentUser,
            lastScheduledRunDate: todayStr,
            lastScheduledSlot: eligibleSlot,
          };
          const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
          setProfiles(nextProfiles);
          saveStoredProfiles(nextProfiles);
          syncUserProfileToServer(updatedUser);
        }
      }
    }
  }, [currentUser, scheduledHours, lastScheduledRunDate, lastScheduledSlot, handleRefresh, profiles]);

  // Run on startup when user logs in, and check every 60 seconds
  useEffect(() => {
    if (!currentUser) return;
    checkAndRunSchedule();
    const interval = setInterval(checkAndRunSchedule, 60000);
    return () => clearInterval(interval);
  }, [currentUser, checkAndRunSchedule]);

  // LOGIN HANDLER
  const handleLogin = (identifier: string, pass: string): { success: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = pass.trim();

    const found = profiles.find((p) => {
      const pLogin = (p.login || p.username || '').trim().toLowerCase();
      const pEmail = (p.email || '').trim().toLowerCase();
      return (pLogin === cleanId || pEmail === cleanId) && p.password === cleanPass;
    });

    if (!found) {
      return { success: false, error: 'Неверный логин/email или пароль' };
    }

    const updatedUser = { ...found, lastLoginAt: new Date().toISOString() };
    const nextProfiles = profiles.map((p) => (p.id === found.id ? updatedUser : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);

    setActiveSessionId(found.id);
    saveActiveSessionUserId(found.id);

    setNotes(found.notes || []);
    setTimers(found.timers || []);
    setFeeds(found.feeds || ENGINEER_DEFAULT_FEEDS);
    setWorkSchedules(found.workSchedules || {});
    setAccessibility(found.accessibility || { scalePercent: 100, visualAcuity: 'Не указывать' });
    setAppStyle(found.appStyle || 'engineer');
    setCustomWallpaper(found.customWallpaper || '');
    setCustomAiPrompt(found.customAiPrompt || DEFAULT_AI_PROMPTS[found.appStyle || 'engineer'] || DEFAULT_AI_PROMPTS.engineer);
    setScheduledHours(found.scheduledHours || [6, 12, 19]);

    syncUserProfileToServer(updatedUser);
    playUiSound('success');
    return { success: true };
  };

  // REGISTER HANDLER
  const handleRegister = (
    login: string,
    email: string,
    pass: string,
    name?: string,
    specialty?: string
  ): { success: boolean; error?: string } => {
    const cleanLogin = login.trim();
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();

    if (profiles.some((p) => (p.login || p.username || '').toLowerCase() === cleanLogin.toLowerCase())) {
      return { success: false, error: 'Пользователь с таким логином уже существует' };
    }
    if (profiles.some((p) => (p.email || '').toLowerCase() === cleanEmail.toLowerCase())) {
      return { success: false, error: 'Пользователь с таким email уже зарегистрирован' };
    }

    const isFirstAdmin = profiles.length === 0 || cleanLogin.toLowerCase() === 'belkin';
    const newProfile: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      username: cleanLogin,
      login: cleanLogin,
      email: cleanEmail,
      password: cleanPass,
      displayName: name?.trim() || cleanLogin,
      role: isFirstAdmin ? 'admin' : 'user',
      specialty: specialty?.trim() || 'Инженер-электроник',
      specialization: specialty?.trim() || 'Инженер-электроник',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      notes: getStoredMedicalNotes(),
      timers: getStoredMedicalTimers(),
      feeds: ENGINEER_DEFAULT_FEEDS,
      workSchedules: {},
      accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
      appStyle: 'engineer',
      customWallpaper: '',
      customAiPrompt: DEFAULT_AI_PROMPTS.engineer,
      scheduledHours: [6, 12, 19],
    };

    const nextProfiles = [...profiles, newProfile];
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);

    setActiveSessionId(newProfile.id);
    saveActiveSessionUserId(newProfile.id);

    setNotes(newProfile.notes || []);
    setTimers(newProfile.timers || []);
    setFeeds(newProfile.feeds);
    setWorkSchedules({});
    setAccessibility(newProfile.accessibility || { scalePercent: 100, visualAcuity: 'Не указывать' });
    setAppStyle('engineer');
    setCustomWallpaper('');
    setCustomAiPrompt(DEFAULT_AI_PROMPTS.engineer);
    setScheduledHours([6, 12, 19]);

    syncUserProfileToServer(newProfile);
    playUiSound('success');
    return { success: true };
  };

  // LOGOUT HANDLER
  const handleLogout = () => {
    setActiveSessionId(null);
    clearActiveSessionUserId();
    playUiSound('click');
  };

  // User Settings Modifiers
  const handleUpdateAppStyle = (style: AppArchetypeStyle) => {
    setAppStyle(style);
    if (currentUser?.id) {
      const updatedUser: UserProfile = { ...currentUser, appStyle: style };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  const handleUpdateCustomWallpaper = (wallpaper: string) => {
    setCustomWallpaper(wallpaper);
    if (currentUser?.id) {
      const updatedUser: UserProfile = { ...currentUser, customWallpaper: wallpaper };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  const handleUpdateCustomAiPrompt = (prompt: string) => {
    setCustomAiPrompt(prompt);
    if (currentUser?.id) {
      const updatedUser: UserProfile = { ...currentUser, customAiPrompt: prompt };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  const handleUpdateEnableAutoAiProcessing = (enabled: boolean) => {
    setEnableAutoAiProcessing(enabled);
    if (currentUser?.id) {
      const updatedUser: UserProfile = { ...currentUser, enableAutoAiProcessing: enabled };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  const handleUpdateScheduledHours = (hours: number[]) => {
    setScheduledHours(hours);
    if (currentUser?.id) {
      const updatedUser: UserProfile = { ...currentUser, scheduledHours: hours };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  // Update Notes
  const handleUpdateNotes = (newNotes: MedicalNote[]) => {
    setNotes(newNotes);
    saveStoredMedicalNotes(newNotes);
    if (currentUser?.id) {
      const updatedUser = { ...currentUser, notes: newNotes };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
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
    };
    handleUpdateNotes([newNote, ...notes]);
  };

  const handleDeleteNote = (id: string) => {
    handleUpdateNotes(notes.filter((n) => n.id !== id));
  };

  const handleEditNote = (id: string, newText: string) => {
    handleUpdateNotes(notes.map((n) => (n.id === id ? { ...n, text: newText } : n)));
  };

  // Personal Timers
  const handleUpdateTimers = (newTimers: MedicalTimerItem[]) => {
    setTimers(newTimers);
    saveStoredMedicalTimers(newTimers);
    if (currentUser?.id) {
      const updatedUser = { ...currentUser, timers: newTimers };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  // Personal Accessibility
  const handleUpdateAccessibility = (newCfg: AccessibilityConfig) => {
    setAccessibility(newCfg);
    saveStoredAccessibility(newCfg);
    if (currentUser?.id) {
      const updatedUser = { ...currentUser, accessibility: newCfg };
      const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
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
      const next = prev.map((a) => (a.id === articleId ? { ...a, isStarred: !a.isStarred } : a));
      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleToggleRead = (articleId: string) => {
    setArticles((prev) => {
      const next = prev.map((a) => (a.id === articleId ? { ...a, isRead: true } : a));
      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
  };

  const handleDeleteArticle = (articleId: string) => {
    setArticles((prev) => {
      const next = prev.filter((a) => a.id !== articleId);
      saveStoredArticles(next, currentUser?.id || undefined);
      return next;
    });
    playUiSound('click');
  };

  // Bookmarks Quick Launcher Handlers
  const handleUpdateBookmarks = (newBookmarks: DesktopBookmark[]) => {
    setBookmarks(newBookmarks);
    saveStoredBookmarks(newBookmarks);
    if (currentUser?.id) {
      const updatedUser = { ...currentUser, bookmarks: newBookmarks };
      const nextProfiles = profiles.map((p) => (p.id === currentUser.id ? updatedUser : p));
      setProfiles(nextProfiles);
      saveStoredProfiles(nextProfiles);
      syncUserProfileToServer(updatedUser);
    }
  };

  // User Profile & Cabinet Handlers
  const handleSaveProfile = (updatedProfile: UserProfile) => {
    const nextProfiles = profiles.map((p) => (p.id === updatedProfile.id ? updatedProfile : p));
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
    syncUserProfileToServer(updatedProfile);
  };

  const handleCreateUser = (newUser: UserProfile) => {
    const nextProfiles = [...profiles, newUser];
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
    setActiveSessionId(newUser.id);
    saveActiveSessionUserId(newUser.id);
    syncUserProfileToServer(newUser);
  };

  const handleSelectUser = (userId: string) => {
    const target = profiles.find((p) => p.id === userId);
    if (target) {
      setActiveSessionId(target.id);
      saveActiveSessionUserId(target.id);
      setNotes(target.notes || []);
      setTimers(target.timers || INITIAL_MEDICAL_TIMERS);
      setFeeds(target.feeds || ENGINEER_DEFAULT_FEEDS);
      setWorkSchedules(target.workSchedules || {});
      setAccessibility(target.accessibility || { scalePercent: 100, visualAcuity: 'Не указывать' });
      setAppStyle(target.appStyle || 'engineer');
      setCustomWallpaper(target.customWallpaper || '');
      setCustomAiPrompt(target.customAiPrompt || DEFAULT_AI_PROMPTS[target.appStyle || 'engineer'] || DEFAULT_AI_PROMPTS.engineer);
      setScheduledHours(target.scheduledHours || [6, 12, 19]);
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

  const handleDeleteUserProfile = (userId: string) => {
    const nextProfiles = profiles.filter((p) => p.id !== userId);
    setProfiles(nextProfiles);
    saveStoredProfiles(nextProfiles);
  };

  const handleRestoreBackup = (importedProfiles: UserProfile[]) => {
    if (Array.isArray(importedProfiles) && importedProfiles.length > 0) {
      setProfiles(importedProfiles);
      saveStoredProfiles(importedProfiles);
      const active = importedProfiles.find((p) => p.id === activeSessionId) || importedProfiles[0];
      if (active) {
        setActiveSessionId(active.id);
        saveActiveSessionUserId(active.id);
        setNotes(active.notes || []);
        setTimers(active.timers || []);
        setFeeds(active.feeds || ENGINEER_DEFAULT_FEEDS);
        setWorkSchedules(active.workSchedules || {});
        setAccessibility(active.accessibility || { scalePercent: 100, visualAcuity: 'Не указывать' });
        setAppStyle(active.appStyle || 'engineer');
        setCustomWallpaper(active.customWallpaper || '');
        setCustomAiPrompt(active.customAiPrompt || DEFAULT_AI_PROMPTS[active.appStyle || 'engineer'] || DEFAULT_AI_PROMPTS.engineer);
      }
    }
  };

  // If no user is logged in, show the Clean Auth Modal Window immediately
  if (!activeSessionId || !currentUser) {
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

  const unreadCount = articles.filter((a) => !a.isRead).length;

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
          timers={timers}
          onUpdateTimers={handleUpdateTimers}
          workSchedules={workSchedules}
          onUpdateWorkSchedules={(updated) => {
            setWorkSchedules(updated);
            const updatedUser = { ...currentUser, workSchedules: updated };
            const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
            setProfiles(nextProfiles);
            saveStoredProfiles(nextProfiles);
            syncUserProfileToServer(updatedUser);
          }}
          bookmarks={bookmarks}
          onUpdateBookmarks={handleUpdateBookmarks}
          onOpenSettingsTab={(tab) => {
            setControlCenterTab(tab);
            setIsControlCenterOpen(true);
          }}
          appStyle={appStyle}
          onPlaySound={playUiSound}
        />

        {/* Right Side: Tab View (ЗАМЕТКИ or НОВОСТИ) */}
        {activeTab === 'notes' ? (
          <NotesPane
            notes={notes}
            onAddNote={handleAddNote}
            onEditNote={handleEditNote}
            onDeleteNote={handleDeleteNote}
            appStyle={appStyle}
            onPlaySound={playUiSound}
          />
        ) : (
          <MedicalNewsPane
            articles={articles}
            feeds={feeds}
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
        feeds={feeds}
        onUpdateFeeds={(f) => {
          setFeeds(f);
          const updatedUser = { ...currentUser, feeds: f };
          const nextProfiles = profiles.map(p => p.id === currentUser.id ? updatedUser : p);
          setProfiles(nextProfiles);
          saveStoredProfiles(nextProfiles);
          syncUserProfileToServer(updatedUser);
          saveUserProfileToFirestore(updatedUser).catch(() => {});
        }}
        timers={timers}
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
        isRefreshing={isRefreshing}
        onPlaySound={playUiSound}
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
          notes={notes}
          timers={timers}
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
