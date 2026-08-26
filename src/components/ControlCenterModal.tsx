import React, { useState, useEffect, useRef } from 'react';
import {  
  X, 
  Layers, 
  Filter, 
  Clock, 
  Sparkles, 
  Eye, 
  Heart, 
  Plus, 
  Trash2, 
  Check, 
  ExternalLink,
  Search,
  Bot,
  RotateCcw,
  AlertCircle,
  Image as ImageIcon,
  Palette,
  ArrowUp,
  ArrowDown,
  Info,
  Sliders,
  CheckCircle2,
  RefreshCw,
  QrCode,
  MapPin,
  Globe,
  Compass,
  Volume2,
  VolumeX,
  Database,
  Cpu,
  Wrench,
  TrendingUp,
  Car,
  Code,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Copy,
  FlaskConical,
  Link as LinkIcon,
  Lightbulb,
  MoreVertical,
  Activity
} from 'lucide-react';
import { FeedConfig, MedicalTimerItem, AccessibilityConfig, AppArchetypeStyle, UserProfile, SourceType, NewsSource } from '../types';
import { MEDICAL_FEEDS, ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS, CURATED_FEED_PRESETS } from '../data/curatedFeeds';
import { INITIAL_MEDICAL_TIMERS, saveAISettings } from '../utils/storage';
import { 
  getStoredCity, 
  getStoredTimeZone, 
  setStoredCityAndTimeZone, 
  POPULAR_CITY_PRESETS, 
  getTimeZoneForCity, 
  getCityTimeInfo,
  useCityClock,
  calculateTimerState,
  parseTargetTimeToSeconds
} from '../utils/timeZone';

interface ControlCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  feeds: FeedConfig[];
  onUpdateFeeds: (feeds: FeedConfig[]) => void;
  timers: MedicalTimerItem[];
  onUpdateTimers: (timers: MedicalTimerItem[]) => void;
  accessibility: AccessibilityConfig;
  onUpdateAccessibility: (cfg: AccessibilityConfig) => void;
  
  // Customization props
  appStyle: AppArchetypeStyle;
  onChangeAppStyle: (style: AppArchetypeStyle) => void;
  customWallpaper: string;
  onChangeCustomWallpaper: (wallpaperUrl: string) => void;
  customAiPrompt: string;
  onChangeCustomAiPrompt: (prompt: string) => void;
  enableAutoAiProcessing?: boolean;
  onChangeEnableAutoAiProcessing?: (enabled: boolean) => void;
  scheduledHours: number[];
  onChangeScheduledHours: (hours: number[]) => void;
  
  onTriggerRefresh?: (overrideFeeds?: FeedConfig[]) => void;
  isRefreshing?: boolean;
  onPlaySound?: (type: 'click' | 'success' | 'star' | 'chime' | 'bell' | 'alert' | string) => void;
  currentUser?: UserProfile;
  onUpdateUserDetails?: (profile: UserProfile) => void;
  onSaveAllWorkspaceSettings?: (updates: Partial<UserProfile>) => void;
}

export const ControlCenterModal: React.FC<ControlCenterModalProps> = ({
  isOpen,
  onClose,
  initialTab = '✦ ИСТОЧНИКИ',
  feeds = [],
  onUpdateFeeds,
  timers = [],
  onUpdateTimers,
  accessibility,
  onUpdateAccessibility,
  appStyle = 'engineer',
  onChangeAppStyle,
  customWallpaper = '',
  onChangeCustomWallpaper,
  customAiPrompt = '',
  onChangeCustomAiPrompt,
  enableAutoAiProcessing = false,
  onChangeEnableAutoAiProcessing,
  scheduledHours = [6, 12, 19],
  onChangeScheduledHours,
  onTriggerRefresh,
  isRefreshing = false,
  onPlaySound,
  currentUser,
  onUpdateUserDetails,
  onSaveAllWorkspaceSettings,
}) => {
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [localScale, setLocalScale] = useState<number>(() => {
    const s = accessibility?.scalePercent;
    return typeof s === 'number' && [100, 125, 150, 175, 200].includes(s) ? s : 100;
  });
  const [localAcuity, setLocalAcuity] = useState<string>(accessibility?.visualAcuity || 'Не указывать');

  // Feeds state
  const [localFeeds, setLocalFeeds] = useState<FeedConfig[]>(() => Array.isArray(feeds) ? JSON.parse(JSON.stringify(feeds)) : []);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState<number>(0);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const prevIsOpenRef = useRef<boolean>(false);
  
  // Extra Accordion state
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);
  const [testStatusMessage, setTestStatusMessage] = useState<string | null>(null);
  const [urlCheckStatus, setUrlCheckStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // AI Prompt local state
  const getAiVal = (field: 'provider' | 'key' | 'model' | 'url') => {
    if (currentUser) {
      if (field === 'provider') return currentUser.aiProvider || localStorage.getItem(`belkin_user_ai_provider_${currentUser.id}`) || 'gemini';
      if (field === 'key') return currentUser.aiApiKey !== undefined ? currentUser.aiApiKey : (localStorage.getItem(`belkin_user_ai_key_${currentUser.id}`) || '');
      if (field === 'model') return currentUser.aiModel !== undefined ? currentUser.aiModel : (localStorage.getItem(`belkin_user_ai_model_${currentUser.id}`) || '');
      if (field === 'url') return currentUser.aiUrl !== undefined ? currentUser.aiUrl : (localStorage.getItem(`belkin_user_ai_url_${currentUser.id}`) || '');
    }
    if (field === 'provider') return localStorage.getItem('belkin_user_ai_provider') || 'gemini';
    if (field === 'key') return localStorage.getItem('belkin_user_ai_key') || '';
    if (field === 'model') return localStorage.getItem('belkin_user_ai_model') || '';
    if (field === 'url') return localStorage.getItem('belkin_user_ai_url') || '';
    return '';
  };

  const [localPrompt, setLocalPrompt] = useState<string>(customAiPrompt || DEFAULT_AI_PROMPTS.engineer);
  const [localProvider, setLocalProvider] = useState(() => getAiVal('provider') || 'gemini');
  const [localKey, setLocalKey] = useState(() => getAiVal('key'));
  const [localModel, setLocalModel] = useState(() => getAiVal('model'));
  const [localUrl, setLocalUrl] = useState(() => getAiVal('url'));

  // Style and Wallpaper local state
  const [localStyle, setLocalStyle] = useState<AppArchetypeStyle>(appStyle);
  const [localWallpaper, setLocalWallpaper] = useState<string>(customWallpaper);
  const [localHours, setLocalHours] = useState<number[]>(scheduledHours);

  // Timers state
  const [localTimers, setLocalTimers] = useState<MedicalTimerItem[]>(() => Array.isArray(timers) ? [...timers] : []);
  
  // City and Timezone state (System time sync)
  const [localCity, setLocalCity] = useState<string>(() => getStoredCity());
  const [localTimeZone, setLocalTimeZone] = useState<string>(() => getStoredTimeZone());
  const cityClock = useCityClock();

  const [savedSuccess, setSavedSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state ONLY when modal opens (one-time copy of persisted data to local draft)
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setActiveTab(initialTab || '✦ ИСТОЧНИКИ');
      setLocalFeeds(Array.isArray(feeds) && feeds.length > 0 ? JSON.parse(JSON.stringify(feeds)) : JSON.parse(JSON.stringify(ENGINEER_DEFAULT_FEEDS)));
      setLocalTimers(Array.isArray(timers) ? JSON.parse(JSON.stringify(timers)) : [...INITIAL_MEDICAL_TIMERS]);
      const s = accessibility?.scalePercent;
      setLocalScale(typeof s === 'number' && [100, 125, 150, 175, 200].includes(s) ? s : 100);
      setLocalAcuity(accessibility?.visualAcuity || 'Не указывать');
      setLocalPrompt(customAiPrompt || DEFAULT_AI_PROMPTS.engineer);
      setLocalStyle(appStyle || 'engineer');
      setLocalWallpaper(customWallpaper || '');
      setLocalHours(scheduledHours || [6, 12, 19]);
      setLocalCity(getStoredCity());
      setLocalTimeZone(getStoredTimeZone());
      setSelectedFeedIndex(0);
      setTestStatusMessage(null);
      setUrlCheckStatus('idle');
      setIsDirty(false);

      setLocalProvider(getAiVal('provider') || 'gemini');
      setLocalKey(getAiVal('key'));
      setLocalModel(getAiVal('model'));
      setLocalUrl(getAiVal('url'));
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  // Request close with unsaved changes confirmation
  const handleRequestClose = () => {
    if (isDirty) {
      const confirmClose = window.confirm('Есть несохранённые изменения. Вы уверены, что хотите закрыть окно без сохранения?');
      if (!confirmClose) return;
    }
    setIsDirty(false);
    onClose();
    onPlaySound?.('click');
  };

  // Robust ESC key listener with dirty confirmation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        handleRequestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, isDirty, onClose, onPlaySound]);

  if (!isOpen) return null;

  const tabs = [
    '✦ ИСТОЧНИКИ',
    '# ФИЛЬТРЫ',
    '🕒 РАСПИСАНИЕ',
    '✦ AI-РЕДАКТОР',
    'A+ ДОСТУПНОСТЬ',
    '🎨 ОФОРМЛЕНИЕ',
    '♥ О ПРОЕКТЕ',
  ];

  // Helper getters for current selected feed
  const currentFeed: FeedConfig | null = localFeeds[selectedFeedIndex] || null;
  const currentPrimarySource: NewsSource | null = currentFeed?.sources?.[0] || null;

  const updateCurrentFeed = (updates: Partial<FeedConfig>) => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length) return;
    const copy = [...localFeeds];
    const prev = copy[selectedFeedIndex];
    copy[selectedFeedIndex] = { ...prev, ...updates };
    setLocalFeeds(copy);
    setIsDirty(true);
  };

  const updateCurrentPrimarySource = (sourceUpdates: Partial<NewsSource>) => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length) return;
    const copy = [...localFeeds];
    const prev = copy[selectedFeedIndex];
    const sources = [...(prev.sources || [])];
    if (sources.length === 0) {
      sources.push({
        id: `src-${Date.now()}`,
        name: prev.name || 'Новый источник',
        type: 'rss',
        url: '',
        enabled: true,
        ...sourceUpdates
      });
    } else {
      sources[0] = { ...sources[0], ...sourceUpdates };
    }
    copy[selectedFeedIndex] = { ...prev, sources };
    setLocalFeeds(copy);
    setIsDirty(true);
  };

  const handleSaveAll = () => {
    try {
      const feedsToSave = localFeeds;
      
      // 1. Save local weather to localStorage
      localStorage.setItem('belkin_weather_city', localCity);
      localStorage.setItem('belkin_weather_tz', localTimeZone);

      // Save AI settings through the secure server-side mechanism
      saveAISettings(
        localProvider as any,
        localKey.trim() || undefined,
        localModel.trim(),
        localUrl.trim(),
        currentUser,
        () => {}
      );

      // 2. Prepare the consolidated updates object
      const updates: Partial<UserProfile> = {
        feeds: feedsToSave,
        timers: localTimers,
        accessibility: accessibility ? {
          ...accessibility,
          scalePercent: localScale,
          visualAcuity: localAcuity
        } : {
          scalePercent: localScale,
          visualAcuity: localAcuity
        },
        customAiPrompt: localPrompt,
        appStyle: localStyle,
        customWallpaper: localWallpaper,
        scheduledHours: localHours,
        aiProvider: localProvider as any,
        aiModel: localModel.trim(),
        aiUrl: localUrl.trim(),
        hasAiApiKey: !!(localKey.trim() || currentUser?.hasAiApiKey)
      };

      // Clear the local plain text key input once saved
      if (localKey.trim()) {
        setLocalKey('');
      }

      // 3. Save everything with a single atomic callback to avoid race conditions
      if (onSaveAllWorkspaceSettings) {
        onSaveAllWorkspaceSettings(updates);
      } else {
        onUpdateFeeds(feedsToSave);
        onUpdateTimers(localTimers);
        if (accessibility && onUpdateAccessibility) {
          onUpdateAccessibility({
            ...accessibility,
            scalePercent: localScale,
            visualAcuity: localAcuity
          });
        }
        onChangeCustomAiPrompt?.(localPrompt);
        onChangeAppStyle?.(localStyle);
        onChangeCustomWallpaper?.(localWallpaper);
        onChangeScheduledHours?.(localHours);
        if (currentUser && onUpdateUserDetails) {
          onUpdateUserDetails({
            ...currentUser,
            aiProvider: localProvider as any,
            aiModel: localModel.trim(),
            aiUrl: localUrl.trim(),
            hasAiApiKey: updates.hasAiApiKey
          });
        }
      }
      
      setIsDirty(false);
      setSavedSuccess(true);
      onPlaySound?.('ping');
      setTimeout(() => setSavedSuccess(false), 2000);
      
      // Trigger a refresh if feeds changed
      onTriggerRefresh?.(feedsToSave);
      
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNewFeed = () => {
    const newF: FeedConfig = {
      id: `feed-${Date.now()}`,
      name: 'Новый источник',
      category: 'Пользовательский',
      enabled: true,
      keywords: [],
      excludeKeywords: [],
      keywordMode: 'ANY',
      language: 'ru, en',
      maxArticles: 10,
      refreshInterval: 60,
      sources: [
        {
          id: `src-${Date.now()}`,
          name: 'Новый источник',
          type: 'rss',
          url: 'https://',
          query: '',
          enabled: true
        }
      ]
    };
    setLocalFeeds([...localFeeds, newF]);
    setSelectedFeedIndex(localFeeds.length);
    setIsDirty(true);
    onPlaySound?.('click');
  };

  const handleDuplicateFeed = () => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length) return;
    const current = localFeeds[selectedFeedIndex];
    const duplicated: FeedConfig = {
      ...JSON.parse(JSON.stringify(current)),
      id: `feed-${Date.now()}`,
      name: `${current.name} (Копия)`,
      sources: (current.sources || []).map((s, i) => ({
        ...s,
        id: `src-${Date.now()}-${i}`
      }))
    };
    const nextFeeds = [...localFeeds];
    nextFeeds.splice(selectedFeedIndex + 1, 0, duplicated);
    setLocalFeeds(nextFeeds);
    setSelectedFeedIndex(selectedFeedIndex + 1);
    setIsDirty(true);
    onPlaySound?.('success');
  };

  const handleDeleteFeed = () => {
    if (localFeeds.length === 0) return;
    const updated = localFeeds.filter((_, idx) => idx !== selectedFeedIndex);
    setLocalFeeds(updated);
    if (selectedFeedIndex >= updated.length) {
      setSelectedFeedIndex(Math.max(0, updated.length - 1));
    }
    setIsDirty(true);
    onPlaySound?.('click');
  };

  const handleMoveFeed = (direction: 'up' | 'down') => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length) return;
    const targetIndex = direction === 'up' ? selectedFeedIndex - 1 : selectedFeedIndex + 1;
    if (targetIndex < 0 || targetIndex >= localFeeds.length) return;

    const copy = [...localFeeds];
    const temp = copy[selectedFeedIndex];
    copy[selectedFeedIndex] = copy[targetIndex];
    copy[targetIndex] = temp;
    setLocalFeeds(copy);
    setSelectedFeedIndex(targetIndex);
    setIsDirty(true);
    onPlaySound?.('click');
  };

  const handleToggleFeedEnabled = (index: number) => {
    const copy = [...localFeeds];
    copy[index] = {
      ...copy[index],
      enabled: copy[index].enabled !== false ? false : true,
    };
    setLocalFeeds(copy);
    setIsDirty(true);
    onPlaySound?.('click');
  };

  const handleLoadPreset = (preset: typeof CURATED_FEED_PRESETS[0]) => {
    const newFeeds: FeedConfig[] = preset.feeds.map((f: any, i) => {
      let srcType: SourceType = 'rss';
      if (f.url && f.url.includes('youtube.com')) srcType = 'youtube';
      else if (f.url && f.url.includes('pikabu.ru')) srcType = 'pikabu';
      else if (f.url && f.url.includes('4pda')) srcType = '4pda';
      else if (f.url && f.url.includes('reddit.com')) srcType = 'reddit';

      return {
        id: `preset-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 4)}`,
        name: f.name || f.title,
        category: preset.category,
        description: f.description || '',
        enabled: true,
        keywords: f.tags || f.hashtags || [],
        excludeKeywords: [],
        keywordMode: 'ANY',
        language: 'ru',
        maxArticles: 10,
        refreshInterval: 60,
        sources: [
          {
            id: `src-${Date.now()}-${i}`,
            name: f.name || f.title,
            type: srcType,
            url: f.url,
            query: f.query || '',
            keywords: f.tags || f.hashtags || [],
            enabled: true
          }
        ]
      };
    });

    setLocalFeeds(newFeeds);
    setSelectedFeedIndex(0);
    setIsDirty(true);
    onPlaySound?.('success');
  };

  const handleCheckUrl = () => {
    const rawUrl = currentPrimarySource?.url?.trim() || '';
    if (!rawUrl) {
      setUrlCheckStatus('invalid');
      return;
    }
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        setUrlCheckStatus('valid');
        onPlaySound?.('success');
        setTimeout(() => setUrlCheckStatus('idle'), 3000);
      } else {
        setUrlCheckStatus('invalid');
        onPlaySound?.('alert');
        setTimeout(() => setUrlCheckStatus('idle'), 3000);
      }
    } catch {
      setUrlCheckStatus('invalid');
      onPlaySound?.('alert');
      setTimeout(() => setUrlCheckStatus('idle'), 3000);
    }
  };

  const handleTestFeed = () => {
    const feed = currentFeed;
    if (!feed) return;
    const url = currentPrimarySource?.url?.trim() || '';
    const query = currentPrimarySource?.query?.trim() || '';
    if (!url && !query) {
      setTestStatusMessage('Укажите URL ленты или поисковый запрос');
      onPlaySound?.('alert');
      setTimeout(() => setTestStatusMessage(null), 3000);
      return;
    }
    setTestStatusMessage('Тест источника: параметры конфигурации корректны ✓');
    onPlaySound?.('success');
    setTimeout(() => setTestStatusMessage(null), 3500);
  };

  // Image Upload handler for wallpaper
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла превышает 5 МБ. Пожалуйста, выберите изображение меньшего размера.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        setLocalWallpaper(base64);
        onChangeCustomWallpaper(base64);
        onPlaySound?.('success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Preset sample backgrounds
  const presetWallpapers = [
    { name: 'Тёмный Киберпанк (Инженерный)', url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&auto=format&fit=crop&q=80' },
    { name: 'Инженерная лаборатория / Платы', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1920&auto=format&fit=crop&q=80' },
    { name: 'Клинический неон / Медицина', url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=1920&auto=format&fit=crop&q=80' },
    { name: 'Природа / Поля фермера', url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1920&auto=format&fit=crop&q=80' },
    { name: 'Глубокий Космос / Deep Slate', url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1920&auto=format&fit=crop&q=80' },
  ];

  // Helper icons for preset categories
  const getCategoryIcon = (categoryName: string) => {
    if (categoryName.includes('Инженер') || categoryName.includes('Ремонт')) {
      return <Cpu className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    }
    if (categoryName.includes('Кардиолог') || categoryName.includes('Медицин')) {
      return <Heart className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    }
    if (categoryName.includes('Экономик') || categoryName.includes('Финанс')) {
      return <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
    if (categoryName.includes('Автомоб') || categoryName.includes('Автосервис')) {
      return <Car className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />;
    }
    if (categoryName.includes('IT') || categoryName.includes('Разработ')) {
      return <Code className="w-3.5 h-3.5 text-cyan-400 shrink-0" />;
    }
    return <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
  };

  return (
    <div 
      id="belkin-control-center-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleRequestClose();
        }
      }}
    >
      <div 
        className="bg-[#090d14] border border-[#1b2b40] rounded-2xl shadow-2xl w-[96vw] max-w-[1650px] h-[92vh] max-h-[94vh] flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-[#070a0f] border-b border-[#152233] flex items-center justify-between px-4 py-3 select-none shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] animate-pulse"></div>
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#ffcc00]">
              ЦЕНТР УПРАВЛЕНИЯ ИСТОЧНИКАМИ И НАСТРОЙКАМИ
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {isDirty && (
              <div 
                id="belkin-unsaved-changes-indicator"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-[#ffcc00] font-mono text-[11px] font-bold animate-in fade-in"
              >
                <AlertCircle className="w-3.5 h-3.5 text-[#ffcc00] shrink-0" />
                <span>Есть несохранённые изменения</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleRequestClose}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition"
              title="Закрыть (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body: 3-Column Desktop Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#06090e]">
          
          {/* COLUMN 1: Left Navigation Sidebar */}
          <div className="w-full md:w-56 lg:w-60 bg-[#070b10] border-b md:border-b-0 md:border-r border-[#152233] p-3 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab);
                      onPlaySound?.('click');
                    }}
                    className={`w-full text-left px-3 py-2 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-lg cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-[#151c27] text-[#ffcc00] border-l-2 border-[#ffcc00] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0d141e]'
                    }`}
                  >
                    <span className="truncate">{tab}</span>
                    {isActive && <span className="text-[10px] text-[#ffcc00]">●</span>}
                  </button>
                );
              })}
            </div>

            {/* Bottom Tip Card matching screenshot */}
            <div className="mt-4 p-3 rounded-lg bg-[#0c121a] border border-[#ffcc00]/30 text-slate-300">
              <div className="flex items-center gap-1.5 text-[#ffcc00] font-bold text-[10px] uppercase mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-[#ffcc00]" />
                <span>ПОДСКАЗКА</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Перетаскивайте источники для изменения порядка отображения в ленте.
              </p>
            </div>
          </div>

          {/* TAB 1: ✦ ИСТОЧНИКИ (Split into Column 2 + Column 3) */}
          {activeTab === '✦ ИСТОЧНИКИ' && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              
              {/* COLUMN 2: Presets & Sources in Preset (~420px) */}
              <div className="w-full md:w-[420px] lg:w-[450px] shrink-0 bg-[#080d14] border-b md:border-b-0 md:border-r border-[#152233] p-3.5 flex flex-col gap-3 overflow-hidden">
                
                {/* Top Section: ПРЕСЕТЫ (6) */}
                <div className="space-y-2 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[#ffcc00] font-mono font-bold text-xs uppercase tracking-wide">
                      ПРЕСЕТЫ ({CURATED_FEED_PRESETS.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewFeed}
                      className="text-[11px] font-mono text-sky-400 hover:text-sky-300 cursor-pointer flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Новый пресет</span>
                    </button>
                  </div>

                  {/* 2-Column Compact Grid of 6 Presets */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {CURATED_FEED_PRESETS.map((preset) => {
                      const isPresetActive = localFeeds.length > 0 && localFeeds[0]?.category === preset.category;
                      return (
                        <div
                          key={preset.category}
                          onClick={() => handleLoadPreset(preset)}
                          className={`p-2 rounded-lg cursor-pointer transition-all border flex flex-col justify-between ${
                            isPresetActive 
                              ? 'bg-[#1a170d] border-[#ffcc00]/70 text-[#ffcc00]' 
                              : 'bg-[#0d141e] border-[#152233] text-slate-300 hover:border-[#ffcc00]/40 hover:bg-[#121b28]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {getCategoryIcon(preset.category)}
                            <span className="text-[11px] font-bold truncate leading-snug">
                              {preset.category}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                            <span>{preset.feeds.length} сайтов</span>
                            <span className="text-amber-400 font-mono text-[9px]">Загрузить →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="h-[1px] bg-[#152233] shrink-0" />

                {/* Bottom Section: ИСТОЧНИКИ В ПРЕСЕТЕ (N) */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <span className="text-[#ffcc00] font-mono font-bold text-xs uppercase tracking-wide">
                      ИСТОЧНИКИ В ПРЕСЕТЕ ({localFeeds.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddNewFeed}
                      className="px-2 py-1 bg-[#0c1827] hover:bg-[#13243a] text-slate-200 border border-[#1e3a5f] rounded text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[#38bdf8]" />
                      <span>Добавить источник</span>
                    </button>
                  </div>

                  {/* Vertical Scrollable List of Sources */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 select-none font-mono text-xs">
                    {localFeeds.map((feed, idx) => {
                      const isSelected = selectedFeedIndex === idx;
                      const isEnabled = feed.enabled !== false;
                      const isError = feed.status === 'error';
                      const primarySrc = feed.sources?.[0];
                      const typeLabel = (primarySrc?.type || feed.type || 'rss').toUpperCase();

                      return (
                        <div
                          key={feed.id || idx}
                          onClick={() => {
                            setSelectedFeedIndex(idx);
                            onPlaySound?.('click');
                          }}
                          className={`p-2 rounded-lg cursor-pointer transition flex items-center justify-between gap-2 border ${
                            isSelected
                              ? 'bg-[#1c170d] text-[#ffcc00] font-bold border-[#ffcc00] shadow-sm'
                              : isError
                                ? 'bg-[#1a0f12] text-rose-200 border-rose-500/40'
                                : isEnabled
                                  ? 'bg-[#0d141e] text-slate-200 hover:bg-[#121b28] border-[#152233]'
                                  : 'bg-[#080b10] text-slate-500 line-through border-slate-800/40 opacity-70'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isError ? 'bg-rose-500' : isEnabled ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-amber-300 font-bold uppercase tracking-wider shrink-0 border border-slate-700">
                              {typeLabel}
                            </span>
                            <span className="truncate text-xs text-slate-100">
                              {feed.name || 'Без названия'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFeedEnabled(idx);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                                isEnabled
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {isEnabled ? 'Включен' : 'Отключен'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = localFeeds.filter((_, i) => i !== idx);
                                setLocalFeeds(updated);
                                if (selectedFeedIndex >= updated.length) {
                                  setSelectedFeedIndex(Math.max(0, updated.length - 1));
                                }
                                onPlaySound?.('click');
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                              title="Удалить"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {localFeeds.length === 0 && (
                      <div className="p-6 text-center text-slate-500 text-xs">
                        Список источников пуст. Нажмите «+ Добавить источник».
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* COLUMN 3: Selected Source Settings Workspace */}
              <div className="flex-1 bg-[#06090e] p-4 lg:p-5 flex flex-col justify-between overflow-y-auto font-mono text-xs">
                {currentFeed ? (
                  <div className="space-y-4">
                    {/* Header of Column 3 */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#152233]">
                      <span className="text-[#ffcc00] font-bold text-xs uppercase tracking-wider">
                        НАСТРОЙКИ ИСТОЧНИКА
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Status Toggle Pill */}
                        <button
                          type="button"
                          onClick={() => handleToggleFeedEnabled(selectedFeedIndex)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            currentFeed.enabled !== false
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${currentFeed.enabled !== false ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          <span>{currentFeed.enabled !== false ? 'Активен' : 'Отключен'}</span>
                        </button>

                        {/* Move Up/Down Order */}
                        <button
                          type="button"
                          disabled={selectedFeedIndex === 0}
                          onClick={() => handleMoveFeed('up')}
                          className="p-1.5 bg-[#0d141e] border border-[#1e3a5f] rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Переместить вверх"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={selectedFeedIndex === localFeeds.length - 1}
                          onClick={() => handleMoveFeed('down')}
                          className="p-1.5 bg-[#0d141e] border border-[#1e3a5f] rounded text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                          title="Переместить вниз"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Trash Delete */}
                        <button
                          type="button"
                          onClick={handleDeleteFeed}
                          className="p-1.5 bg-[#1f1012] border border-rose-900/60 rounded text-rose-300 hover:bg-[#2e1518] cursor-pointer"
                          title="Удалить источник"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Settings Form Grid */}
                    <div className="space-y-3.5">
                      
                      {/* Row 1: Название источника + Include + Exclude */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Название источника
                          </label>
                          <input
                            type="text"
                            value={currentFeed.name || ''}
                            onChange={(e) => updateCurrentFeed({ name: e.target.value })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                            placeholder="ChipDip – Новости и обзоры"
                          />
                        </div>

                        <div>
                          <label className="block text-emerald-400 font-bold text-[11px] mb-1">
                            Include (обязательно)
                          </label>
                          <textarea
                            value={(currentFeed.keywords || []).join('\n')}
                            onChange={(e) => updateCurrentFeed({ 
                              keywords: e.target.value.split('\n').map(t => t.trim()).filter(Boolean) 
                            })}
                            rows={2}
                            className="w-full bg-[#05080c] border border-emerald-900/60 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
                            placeholder="мультиметр&#10;осциллограф"
                          />
                        </div>

                        <div>
                          <label className="block text-rose-400 font-bold text-[11px] mb-1">
                            Exclude (Исключить)
                          </label>
                          <textarea
                            value={(currentFeed.excludeKeywords || []).join('\n')}
                            onChange={(e) => updateCurrentFeed({ 
                              excludeKeywords: e.target.value.split('\n').map(t => t.trim()).filter(Boolean) 
                            })}
                            rows={2}
                            className="w-full bg-[#05080c] border border-rose-900/60 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                            placeholder="case&#10;cover"
                          />
                        </div>
                      </div>

                      {/* Row 2: Описание + Keyword Mode */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Описание (опционально)
                          </label>
                          <textarea
                            value={currentFeed.description || ''}
                            onChange={(e) => updateCurrentFeed({ description: e.target.value })}
                            rows={2}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                            placeholder="Инженерные статьи, обзоры оборудования..."
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Keyword Mode
                          </label>
                          <select
                            value={currentFeed.keywordMode || 'ANY'}
                            onChange={(e) => updateCurrentFeed({ keywordMode: e.target.value as 'ANY' | 'ALL' })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-2 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                          >
                            <option value="ANY">Любое слово (ANY) – статья пройдёт, если есть хотя бы одно ключевое слово</option>
                            <option value="ALL">Все слова (ALL) – статья пройдёт, только если есть все ключевые слова</option>
                          </select>
                        </div>
                      </div>

                      {/* Row 3: Тип источника + URL ленты + Проверить button */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Тип источника
                          </label>
                          <select
                            value={currentPrimarySource?.type || 'rss'}
                            onChange={(e) => updateCurrentPrimarySource({ type: e.target.value as SourceType })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                          >
                            <option value="rss">RSS</option>
                            <option value="atom">Atom</option>
                            <option value="website">Website</option>
                            <option value="youtube">YouTube</option>
                            <option value="search">Search</option>
                            <option value="reddit">Reddit</option>
                            <option value="telegram">Telegram</option>
                            <option value="pikabu">Pikabu</option>
                            <option value="4pda">4PDA</option>
                            <option value="ifixit">IFixit</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            URL ленты
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center bg-[#05080c] border border-[#1e3a5f] rounded focus-within:border-[#38bdf8] px-2 py-1">
                              <LinkIcon className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                              <input
                                type="text"
                                value={currentPrimarySource?.url || ''}
                                onChange={(e) => updateCurrentPrimarySource({ url: e.target.value })}
                                className="w-full bg-transparent text-slate-100 text-xs focus:outline-hidden"
                                placeholder="https://www.chipdip.ru/rss"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleCheckUrl}
                              className={`px-3 py-1.5 rounded font-mono font-bold text-xs transition cursor-pointer shrink-0 border ${
                                urlCheckStatus === 'valid'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : urlCheckStatus === 'invalid'
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-[#0d1622] hover:bg-[#152336] text-slate-200 border-[#1e3a5f]'
                              }`}
                            >
                              {urlCheckStatus === 'valid' ? '✓ Валиден' : urlCheckStatus === 'invalid' ? '✗ Ошибка URL' : 'Проверить'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Row 4: Поисковый запрос / Query */}
                      <div>
                        <label className="block text-slate-300 font-bold text-[11px] mb-1">
                          Поисковый запрос / Query (если поддерживается типом)
                        </label>
                        <div className="flex items-center bg-[#05080c] border border-[#1e3a5f] rounded focus-within:border-[#38bdf8] px-2 py-1">
                          <Search className="w-3.5 h-3.5 text-slate-500 mr-2 shrink-0" />
                          <input
                            type="text"
                            value={currentPrimarySource?.query || ''}
                            onChange={(e) => updateCurrentPrimarySource({ query: e.target.value })}
                            className="w-full bg-transparent text-slate-100 text-xs focus:outline-hidden"
                            placeholder="пайка bga ремонт материнских плат"
                          />
                        </div>
                      </div>

                      {/* Row 5: Язык + Лимит + Обновление */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Язык (опционально)
                          </label>
                          <input
                            type="text"
                            value={currentFeed.language || ''}
                            onChange={(e) => updateCurrentFeed({ language: e.target.value })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                            placeholder="ru, en"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Лимит (шт)
                          </label>
                          <input
                            type="number"
                            value={currentFeed.maxArticles || 10}
                            onChange={(e) => updateCurrentFeed({ maxArticles: parseInt(e.target.value) || 10 })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-300 font-bold text-[11px] mb-1">
                            Обновление (минуты)
                          </label>
                          <input
                            type="number"
                            value={currentFeed.refreshInterval || 60}
                            onChange={(e) => updateCurrentFeed({ refreshInterval: parseInt(e.target.value) || 60 })}
                            className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                          />
                        </div>
                      </div>

                      {/* Accordion: ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ */}
                      <div className="border border-[#152233] rounded-lg overflow-hidden bg-[#0a0f16]">
                        <button
                          type="button"
                          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                          className="w-full px-3 py-2 text-left font-mono font-bold text-[11px] text-slate-300 flex items-center justify-between hover:bg-[#0f1722] cursor-pointer"
                        >
                          <span className="text-sky-400">ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ</span>
                          {isAdvancedOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </button>

                        {isAdvancedOpen && (
                          <div className="p-3 border-t border-[#152233] space-y-2 text-slate-300">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded bg-[#05080c] border-[#1e3a5f] text-sky-500" />
                              <span>Искать полное содержание статей (если источник поддерживает)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" defaultChecked className="rounded bg-[#05080c] border-[#1e3a5f] text-sky-500" />
                              <span>Удалять дубликаты по заголовку и ссылке</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" className="rounded bg-[#05080c] border-[#1e3a5f] text-sky-500" />
                              <span>Автоматически переводить на русский язык (если возможно)</span>
                            </label>
                          </div>
                        )}
                      </div>

                      {testStatusMessage && (
                        <div className="p-2 rounded bg-sky-950/50 border border-sky-500/40 text-sky-300 text-xs flex items-center gap-2 animate-in fade-in">
                          <Info className="w-4 h-4 text-sky-400 shrink-0" />
                          <span>{testStatusMessage}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action Bar inside Column 3 */}
                    <div className="pt-3 border-t border-[#152233] flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleTestFeed}
                          className="px-3 py-1.5 bg-[#0d1622] hover:bg-[#152336] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                          <span>Тестировать</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDuplicateFeed}
                          className="px-3 py-1.5 bg-[#0d1622] hover:bg-[#152336] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-sky-400" />
                          <span>Дублировать</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDeleteFeed}
                          className="px-3 py-1.5 bg-[#1f1012] hover:bg-[#2e1518] text-rose-300 border border-rose-900/60 rounded font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Удалить</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          onPlaySound?.('success');
                          setTestStatusMessage('Изменения источника применены локально ✓');
                          setTimeout(() => setTestStatusMessage(null), 2500);
                        }}
                        className="px-4 py-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-sky-900/30"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Сохранить изменения</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center p-8">
                    <Database className="w-12 h-12 text-slate-700 mb-3" />
                    <p className="text-sm font-bold text-slate-400">Источник не выбран</p>
                    <p className="text-xs text-slate-500 mt-1">Выберите источник из списка слева или добавьте новый.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: # ФИЛЬТРЫ */}
          {activeTab === '# ФИЛЬТРЫ' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider">
                ГЛОБАЛЬНЫЕ ФИЛЬТРЫ И КЛЮЧЕВЫЕ СЛОВА
              </div>
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 space-y-3">
                <p>Фильтры позволяют централизованно отсекать нежелательные темы или выделять важные ключевые маркеры по всем источникам.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold text-emerald-400 mb-1">Глобальный белый список (Include)</label>
                    <textarea 
                      rows={4}
                      className="w-full bg-[#05080c] border border-emerald-900/60 rounded p-2 text-slate-100 text-xs focus:outline-hidden"
                      placeholder="ремонт&#10;схема&#10;диагностика"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-rose-400 mb-1">Глобальный черный список (Exclude)</label>
                    <textarea 
                      rows={4}
                      className="w-full bg-[#05080c] border border-rose-900/60 rounded p-2 text-slate-100 text-xs focus:outline-hidden"
                      placeholder="реклама&#10;розыгрыш&#10;скидка"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 🕒 РАСПИСАНИЕ */}
          {activeTab === '🕒 РАСПИСАНИЕ' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider">
                РАСПИСАНИЕ АВТООБНОВЛЕНИЯ И ТАЙМЕРЫ
              </div>
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 space-y-4">
                <div>
                  <label className="block text-slate-200 font-bold mb-1">Часы автообновления новостей (в формате 24ч):</label>
                  <div className="flex gap-2">
                    {[6, 9, 12, 15, 18, 21].map((hour) => {
                      const isSelected = localHours.includes(hour);
                      return (
                        <button
                          key={hour}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setLocalHours(localHours.filter(h => h !== hour));
                            } else {
                              setLocalHours([...localHours, hour].sort((a, b) => a - b));
                            }
                            setIsDirty(true);
                          }}
                          className={`px-3 py-1.5 rounded font-bold border transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 text-[#ffcc00] border-[#ffcc00]'
                              : 'bg-[#05080c] text-slate-400 border-[#1e3a5f] hover:text-white'
                          }`}
                        >
                          {hour}:00
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1e3a5f]/60">
                  <label className="block text-slate-200 font-bold mb-1">Город и часовой пояс:</label>
                  <div className="flex gap-3">
                    <select
                      value={localCity}
                      onChange={(e) => {
                        const c = e.target.value;
                        setLocalCity(c);
                        const tz = getTimeZoneForCity(c);
                        setLocalTimeZone(tz);
                        setIsDirty(true);
                      }}
                      className="bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden"
                    >
                      {POPULAR_CITY_PRESETS.map(p => (
                        <option key={p.name} value={p.name}>{p.name} ({p.tz})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ✦ AI-РЕДАКТОР */}
          {activeTab === '✦ AI-РЕДАКТОР' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider">
                НАСТРОЙКИ AI-ПРОВАЙДЕРА И СИСТЕМНЫЙ ПРОМПТ
              </div>
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-200 font-bold mb-1">AI Провайдер</label>
                    <select
                      value={localProvider}
                      onChange={(e) => {
                        setLocalProvider(e.target.value);
                        setIsDirty(true);
                      }}
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden"
                    >
                      <option value="gemini">Google Gemini (По умолчанию)</option>
                      <option value="openai">OpenAI (GPT-4o / GPT-3.5)</option>
                      <option value="openrouter">OpenRouter (DeepSeek, Claude, Llama)</option>
                      <option value="custom">Пользовательский OpenAI-совместимый API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-200 font-bold mb-1">API Ключ (Сохраняется на сервере)</label>
                    <input
                      type="password"
                      value={localKey}
                      onChange={(e) => {
                        setLocalKey(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder={currentUser?.hasAiApiKey ? '•••••••• (Ключ уже сохранен)' : 'Введите ваш API Key'}
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-200 font-bold mb-1">Пользовательский системный AI-промпт:</label>
                  <textarea
                    value={localPrompt}
                    onChange={(e) => {
                      setLocalPrompt(e.target.value);
                      setIsDirty(true);
                    }}
                    rows={4}
                    className="w-full bg-[#05080c] border border-[#1e3a5f] rounded p-2.5 text-slate-100 text-xs focus:outline-hidden"
                    placeholder="Инструкция для ИИ по суммаризации статей..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: A+ ДОСТУПНОСТЬ */}
          {activeTab === 'A+ ДОСТУПНОСТЬ' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider">
                МАСШТАБ И ЗРИТЕЛЬНЫЙ КОМФОРТ
              </div>
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 space-y-4">
                <div>
                  <label className="block text-slate-200 font-bold mb-2">Масштаб интерфейса:</label>
                  <div className="flex gap-2">
                    {[100, 125, 150, 175, 200].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setLocalScale(s);
                          setIsDirty(true);
                        }}
                        className={`px-4 py-2 rounded font-bold border transition cursor-pointer ${
                          localScale === s
                            ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                            : 'bg-[#05080c] text-slate-400 border-[#1e3a5f] hover:text-white'
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: 🎨 ОФОРМЛЕНИЕ */}
          {activeTab === '🎨 ОФОРМЛЕНИЕ' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-slate-400 font-bold uppercase tracking-wider">
                ОФОРМЛЕНИЕ И ФОНОВЫЕ ОБОИ
              </div>
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 space-y-4">
                <div>
                  <label className="block text-slate-200 font-bold mb-2">Инженерная стилистика приложения:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'engineer', name: 'Инженерный (Киберпанк)' },
                      { id: 'minimal', name: 'Минимализм (Slate)' },
                      { id: 'medical', name: 'Клинический (Deep Blue)' }
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setLocalStyle(st.id as AppArchetypeStyle);
                          setIsDirty(true);
                        }}
                        className={`p-2.5 rounded text-left font-bold border transition cursor-pointer ${
                          localStyle === st.id
                            ? 'bg-[#ffcc00]/10 text-[#ffcc00] border-[#ffcc00]'
                            : 'bg-[#05080c] text-slate-400 border-[#1e3a5f] hover:text-white'
                        }`}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1e3a5f]/60">
                  <label className="block text-slate-200 font-bold mb-2">Фоновое изображение (URL или загрузка):</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localWallpaper}
                      onChange={(e) => {
                        setLocalWallpaper(e.target.value);
                        setIsDirty(true);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#0d1622] hover:bg-[#152336] text-slate-200 border border-[#1e3a5f] rounded font-bold cursor-pointer"
                    >
                      Загрузить файл
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleImageUpload(e);
                        setIsDirty(true);
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ♥ О ПРОЕКТЕ */}
          {activeTab === '♥ О ПРОЕКТЕ' && (
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4 font-mono text-xs">
              <div className="text-sky-400 font-bold text-sm tracking-wider uppercase">
                BELKIN DESK ENGINEER 2.0
              </div>

              {/* Main project author description block */}
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-200 leading-relaxed space-y-2">
                <p>
                  <strong className="text-slate-100">BelkinDESK ENGINEER 2.0</strong> создан <strong className="text-sky-300">BelkinTony</strong> для некоммерческого использования — как удобный помощник для работы и образования.
                </p>
                <p>
                  По всем пожеланиям, предложениям, а также при обнаружении ошибок и сбоев пишите:
                </p>
                <div className="pt-1 space-y-1">
                  <div>
                    <span className="text-slate-400">Telegram: </span>
                    <a
                      href="https://t.me/BelkinTony"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ffcc00] hover:underline font-bold"
                    >
                      t.me/BelkinTony
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400">Почта: </span>
                    <a
                      href="mailto:belikovich@gmail.com"
                      className="text-[#ffcc00] hover:underline font-bold"
                    >
                      belikovich@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Recent Updates & Plans Section */}
              <div className="space-y-3">
                <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg text-slate-300 text-xs leading-relaxed space-y-2">
                  <div className="text-sky-400 font-bold uppercase tracking-wider text-xs mb-1">
                    🚀 Недавние крупные обновления (Web Version 2.0)
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-200">
                    <li><strong className="text-white">Облачная синхронизация Firestore:</strong> Безопасное хранение профилей, подписок, смен и заметок в реальном времени.</li>
                    <li><strong className="text-white">Мультиформатный мониторинг:</strong> Парсинг YouTube, Reddit и 4PDA с автопереводом на русский язык и защитой от квот.</li>
                    <li><strong className="text-white">Поддержка BYOK (OpenRouter & Gemini):</strong> Возможность подключения собственных бесплатных ключей для DeepSeek, Llama 3 и Gemini.</li>
                    <li><strong className="text-white">Инженерные утилиты:</strong> Графики смен, персональные таймеры и гибкая кастомизация тем.</li>
                  </ul>

                  <div className="text-[#ffcc00] font-bold uppercase tracking-wider text-xs mt-3 mb-1">
                    🎯 Будущие цели и планы развития
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-slate-200">
                    <li><strong className="text-white">Общение между пользователями:</strong> Защищенный встроенный чат и обмен сообщениями между коллегами в реальном времени.</li>
                    <li><strong className="text-white">Каталог пресетов:</strong> Расширение готовых подборок инженерных источников и баз знаний.</li>
                    <li><strong className="text-white">PWA и оффлайн режим:</strong> Полноценная поддержка установки на мобильные устройства и планшеты.</li>
                  </ul>
                  <p className="pt-2 text-slate-400 text-[11px]">
                    Пишите свои идеи — разработаем вместе лучшего помощника для работы и образования.
                  </p>
                </div>
              </div>

              {/* Donation box with yellow QR code matching screenshot 1 */}
              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-lg flex flex-col sm:flex-row items-center gap-5">
                <div className="bg-[#ffcc00] p-3 rounded-lg flex flex-col items-center justify-center shrink-0 shadow-lg">
                  <QrCode className="w-24 h-24 text-black" />
                </div>

                <div className="space-y-2 text-center sm:text-left">
                  <div className="text-[#ffcc00] font-bold uppercase tracking-wider text-xs sm:text-sm">
                    ПОДДЕРЖАТЬ ПРОЕКТ
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    Отсканируйте QR-код камерой телефона или откройте DonationAlerts по прямой ссылке.
                  </p>
                  <div>
                    <a
                      href="https://donationalerts.com/r/tonybelic"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ffcc00] hover:underline font-bold font-mono text-xs"
                    >
                      donationalerts.com/r/tonybelic
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions matching screenshots */}
        <div className="bg-[#05080c] border-t border-[#152233] px-4 py-3 flex items-center justify-between shrink-0 select-none">
          <button
            type="button"
            onClick={handleRequestClose}
            className="px-4 py-2 rounded bg-[#0d1622] hover:bg-[#152336] text-slate-300 font-mono text-xs transition cursor-pointer border border-[#1e3a5f]"
          >
            Закрыть (Esc)
          </button>

          <button
            type="button"
            onClick={() => {
              onPlaySound?.('click');
              onTriggerRefresh?.(localFeeds);
            }}
            disabled={isRefreshing}
            className="px-4 py-2 rounded bg-[#0d1622] hover:bg-[#152336] text-[#ffcc00] font-mono text-xs transition cursor-pointer border border-[#ffcc00]/40 flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Перераспределить и обработать новости во всех источниках</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2 rounded bg-[#0284c7] hover:bg-[#0369a1] text-white font-mono font-bold text-xs transition cursor-pointer shadow-md shadow-sky-900/40 flex items-center gap-1.5"
          >
            {savedSuccess ? <Check className="w-3.5 h-3.5 text-green-300" /> : null}
            <span>{savedSuccess ? 'Сохранено!' : 'Сохранить всё'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
