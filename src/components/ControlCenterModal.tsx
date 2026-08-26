import { FeedConfigEditor } from './FeedConfigEditor';
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
  Database } from 'lucide-react';
import { FeedConfig, MedicalTimerItem, AccessibilityConfig, AppArchetypeStyle, UserProfile } from '../types';
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
  const [localFeeds, setLocalFeeds] = useState<FeedConfig[]>(() => Array.isArray(feeds) ? [...feeds] : []);
  const [selectedFeedIndex, setSelectedFeedIndex] = useState<number>(0);
  
  // Feed Form Inputs matching the screenshot
  const [feedType, setFeedType] = useState<'youtube' | 'rss' | '4pda' | 'pikabu' | 'telegram' | 'reddit'>('youtube');
  const [feedName, setFeedName] = useState<string>('');
  const [feedSearchQuery, setFeedSearchQuery] = useState<string>('');
  const [feedHashtagsText, setFeedHashtagsText] = useState<string>('');

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

  useEffect(() => {
    if (isOpen) {
      setLocalProvider(getAiVal('provider') || 'gemini');
      setLocalKey(getAiVal('key'));
      setLocalModel(getAiVal('model'));
      setLocalUrl(getAiVal('url'));
    }
  }, [isOpen, currentUser]);

  
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

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || '✦ ИСТОЧНИКИ');
      setLocalFeeds(Array.isArray(feeds) ? [...feeds] : [...ENGINEER_DEFAULT_FEEDS]);
      setLocalTimers(Array.isArray(timers) ? [...timers] : [...INITIAL_MEDICAL_TIMERS]);
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
    }
  }, [isOpen, initialTab, feeds, timers, accessibility, customAiPrompt, appStyle, customWallpaper, scheduledHours]);

  // When selected feed changes, populate the form fields
  useEffect(() => {
    if (localFeeds.length > 0 && selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds.length) {
      const f = localFeeds[selectedFeedIndex] as any;
      const primarySource = (f.sources && f.sources[0]) || f;
      setFeedType(primarySource.type || (primarySource.url?.includes('youtube.com') ? 'youtube' : primarySource.url?.includes('pikabu.ru') ? 'pikabu' : primarySource.url?.includes('4pda') ? '4pda' : primarySource.url?.includes('reddit') ? 'reddit' : 'rss'));
      setFeedName(f.name || f.title || '');
      setFeedSearchQuery(primarySource.searchQuery || primarySource.query || '');
      setFeedHashtagsText(primarySource.hashtags?.join('\n') || primarySource.keywords?.join('\n') || '');
    }
  }, [selectedFeedIndex, localFeeds]);

  // Robust ESC key listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        onPlaySound?.('click');
      }
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, onClose, onPlaySound]);

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

  
  const handleApplyFeed = () => {
    // The FeedConfigEditor updates localFeeds in real-time.
    // We just return it for consistency.
    onPlaySound?.('success');
    return localFeeds;
  };

  
  const handleUpdateSelectedFeed = (updatedFeed: FeedConfig) => {
    if (selectedFeedIndex < 0 || selectedFeedIndex >= localFeeds.length) return;
    const newFeeds = [...localFeeds];
    newFeeds[selectedFeedIndex] = updatedFeed;
    setLocalFeeds(newFeeds);
  };

  const handleSaveAll = () => {
    try {
      let feedsToSave = localFeeds;
      // If the user has an active edit but hasn't clicked apply, auto-apply it:
      if (selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds.length && feedName.trim()) {
        feedsToSave = handleApplyFeed();
      }
      
      // 1. Save local weather and AI settings to localStorage for immediate browser activation
      localStorage.setItem('belkin_weather_city', localCity);
      localStorage.setItem('belkin_weather_tz', localTimeZone);

      const uid = currentUser?.id;
      if (uid) {
        localStorage.setItem(`belkin_user_ai_provider_${uid}`, localProvider);
        if (localKey.trim()) {
          localStorage.setItem(`belkin_user_ai_key_${uid}`, localKey.trim());
        } else {
          localStorage.removeItem(`belkin_user_ai_key_${uid}`);
        }
        localStorage.setItem(`belkin_user_ai_model_${uid}`, localModel.trim());
        localStorage.setItem(`belkin_user_ai_url_${uid}`, localUrl.trim());

        // Remove legacy global keys so no other user on this browser sees them
        localStorage.removeItem('belkin_user_ai_provider');
        localStorage.removeItem('belkin_user_ai_key');
        localStorage.removeItem('belkin_user_ai_model');
        localStorage.removeItem('belkin_user_ai_url');
      } else {
        localStorage.setItem('belkin_user_ai_provider', localProvider);
        if (localKey.trim()) {
          localStorage.setItem('belkin_user_ai_key', localKey.trim());
        } else {
          localStorage.removeItem('belkin_user_ai_key');
        }
        localStorage.setItem('belkin_user_ai_model', localModel.trim());
        localStorage.setItem('belkin_user_ai_url', localUrl.trim());
      }

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
        aiApiKey: localKey.trim(),
        aiModel: localModel.trim(),
        aiUrl: localUrl.trim()
      };

      // 3. Save everything with a single atomic callback to avoid race conditions!
      if (onSaveAllWorkspaceSettings) {
        onSaveAllWorkspaceSettings(updates);
      } else {
        // Fallback to legacy individual triggers if callback is not supplied
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
            aiApiKey: localKey.trim(),
            aiModel: localModel.trim(),
            aiUrl: localUrl.trim()
          });
        }
      }
      
      setSavedSuccess(true);
      onPlaySound?.('ping');
      setTimeout(() => setSavedSuccess(false), 2000);
      
      // Trigger a refresh if they changed feeds
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
      sources: [
        {
          id: `src-${Date.now()}`,
          name: 'Новый источник',
          type: 'youtube',
          url: 'https://www.youtube.com/',
          query: 'поисковый запрос',
          keywords: ['тег 1', 'тег 2'],
          enabled: true
        }
      ]
    };
    setLocalFeeds([...localFeeds, newF]);
    setSelectedFeedIndex(localFeeds.length);
    onPlaySound?.('click');
  };

  const handleDeleteFeed = () => {
    if (localFeeds.length === 0) return;
    const updated = localFeeds.filter((_, idx) => idx !== selectedFeedIndex);
    setLocalFeeds(updated);
    if (selectedFeedIndex >= updated.length) {
      setSelectedFeedIndex(Math.max(0, updated.length - 1));
    }
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
    onPlaySound?.('click');
  };

  const handleToggleFeedEnabled = (index: number) => {
    const copy = [...localFeeds];
    copy[index] = {
      ...copy[index],
      enabled: copy[index].enabled !== false ? false : true,
    };
    setLocalFeeds(copy);
    onPlaySound?.('click');
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

  return (
    <div 
      id="belkin-control-center-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
          onPlaySound?.('click');
        }
      }}
    >
      <div 
        className="bg-[#0f1216] border border-[#2b2518] rounded-xl shadow-2xl w-full max-w-5xl h-[760px] max-h-[92vh] flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="bg-[#0b0e12] border-b border-[#2b2518] flex items-center justify-between px-4 py-3 select-none shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] animate-pulse"></div>
            <h2 className="font-mono text-xs uppercase tracking-wider font-bold text-[#ffcc00]">
              Центр управления источниками и настройками
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onPlaySound?.('click');
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer transition"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Main Body: Sidebar + Content */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#07090e]">
          
          {/* Left Vertical Navigation Sidebar */}
          <div className="w-full md:w-64 bg-[#0b0e12] border-b md:border-b-0 md:border-r border-[#2b2518] p-2 flex md:flex-col gap-1 overflow-x-auto md:overflow-y-auto shrink-0 select-none">
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
                  className={`w-full text-left px-3.5 py-2.5 font-mono text-xs uppercase tracking-wider font-bold transition-all rounded-lg cursor-pointer shrink-0 flex items-center justify-between ${
                    isActive
                      ? 'bg-[#181d26] text-[#ffcc00] border-l-2 border-[#ffcc00] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#121720]'
                  }`}
                >
                  <span className="truncate">{tab}</span>
                  {isActive && <span className="text-[10px] text-[#ffcc00]">●</span>}
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Content Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0b0e12]/95 space-y-4">
            
            {/* TAB 1: ✦ ИСТОЧНИКИ */}
            {activeTab === '✦ ИСТОЧНИКИ' && (
            <div className="space-y-3 animate-in fade-in duration-100 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#ffcc00] font-bold text-[11px] uppercase tracking-wide">
                  Управление источниками и сайтами
                </span>
                <span className="text-[10px] text-slate-400">
                  (Клик — выбрать, Двойной клик — включить/выключить)
                </span>
              </div>

              {/* Profession / Activity Curated Presets */}
              <div className="space-y-2 pb-2 border-b border-[#2b2518]">
                <div className="text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-[#ffcc00]" />
                  <span>Готовые наборы источников по видам деятельности (профессиям):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {CURATED_FEED_PRESETS.map((preset) => (
                    <div
                      key={preset.category}
                      onClick={() => {
                        const newFeeds: FeedConfig[] = preset.feeds.map((f: any, i) => ({
                          id: `preset-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 4)}`,
                          name: f.name || f.title,
                          category: preset.category,
                          enabled: true,
                          sources: [
                            {
                              id: `src-${Date.now()}-${i}`,
                              name: f.name || f.title,
                              type: (f.url && f.url.includes('youtube.com')) ? 'youtube' : (f.url && f.url.includes('pikabu.ru')) ? 'pikabu' : (f.url && f.url.includes('4pda')) ? '4pda' : 'rss',
                              url: f.url,
                              keywords: f.tags || f.hashtags || [],
                              enabled: true
                            }
                          ]
                        }));
                        // Append new feeds
                        setLocalFeeds(prev => {
                          return [...prev, ...newFeeds];
                        });
                        onPlaySound?.('success');
                      }}
                      className="p-2.5 rounded-lg bg-[#0f1218] hover:bg-[#181d26] border border-[#2b2518] hover:border-[#ffcc00]/50 cursor-pointer transition flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-200 group-hover:text-[#ffcc00] transition">
                          <span className="truncate">{preset.category}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-mono">
                            {preset.feeds.length} сайтов
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-amber-400 font-bold">
                        <span>Загрузить набор</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Redesigned Visually Convenient Sources List Box */}
              <div className="bg-[#07090e] border border-[#2b2518] rounded-xl p-3 max-h-56 overflow-y-auto space-y-2 font-mono text-xs select-none shadow-inner">
                {localFeeds.map((feed, idx) => {
                  const isSelected = selectedFeedIndex === idx;
                  const isEnabled = feed.enabled !== false;
                  const isError = feed.status === 'error';
                  const typeLabel = feed.type || 'rss';

                  return (
                    <div
                      key={feed.id || idx}
                      onClick={() => {
                        setSelectedFeedIndex(idx);
                        onPlaySound?.('click');
                      }}
                      onDoubleClick={() => handleToggleFeedEnabled(idx)}
                      className={`p-2.5 rounded-lg cursor-pointer transition flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-[#1e1910] text-[#ffcc00] font-bold border border-[#ffcc00]/50 shadow-sm' 
                          : isError
                            ? 'bg-[#1a0f12] text-rose-200 border border-rose-500/40'
                            : isEnabled 
                              ? 'bg-[#0f1218] text-slate-200 hover:bg-[#141a24] border border-[#2b2518]/60' 
                              : 'bg-[#090b0f] text-slate-500 line-through border border-slate-800/40 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isError ? 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]' : isEnabled ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]' : 'bg-slate-600'}`} />
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-amber-300 font-bold uppercase tracking-wider border border-slate-700 shrink-0">
                          {typeLabel}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-100 truncate flex items-center gap-2">
                            <span>{feed.name}</span>
                            {isError && (
                              <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 text-[9px] rounded border border-rose-500/30 uppercase font-bold tracking-normal">
                                Нерабочий / Ошибка
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate font-normal mt-0.5">{feed.searchQuery || feed.url}</div>
                          {isError && feed.errorMessage && (
                            <div className="text-[10px] text-rose-400 mt-0.5 truncate italic">
                              Причина: {feed.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx > 0) {
                                const copy = [...localFeeds];
                                const temp = copy[idx];
                                copy[idx] = copy[idx - 1];
                                copy[idx - 1] = temp;
                                setLocalFeeds(copy);
                                setSelectedFeedIndex(idx - 1);
                                onPlaySound?.('click');
                              }
                            }}
                            className="p-0.5 text-slate-400 hover:text-sky-300 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                            title="Переместить вверх"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === localFeeds.length - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (idx < localFeeds.length - 1) {
                                const copy = [...localFeeds];
                                const temp = copy[idx];
                                copy[idx] = copy[idx + 1];
                                copy[idx + 1] = temp;
                                setLocalFeeds(copy);
                                setSelectedFeedIndex(idx + 1);
                                onPlaySound?.('click');
                              }
                            }}
                            className="p-0.5 text-slate-400 hover:text-sky-300 disabled:opacity-30 disabled:hover:text-slate-400 cursor-pointer"
                            title="Переместить вниз"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>

                        {feed.hashtags && feed.hashtags.length > 0 && (
                          <span className="hidden sm:inline text-[10px] text-slate-500 font-normal">
                            #{feed.hashtags.slice(0, 2).join(', #')}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFeedEnabled(idx);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            isEnabled 
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
                          }`}
                        >
                          {isEnabled ? 'Активен'  : 'Отключен'}
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
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                          title="Удалить источник"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {localFeeds.length === 0 && (
                  <div className="p-6 text-center text-slate-500">
                    Список источников пуст. Нажмите «Новый» ниже, чтобы добавить первый сайт.
                  </div>
                )}
              </div>

              
              {localFeeds.length > 0 && selectedFeedIndex >= 0 && selectedFeedIndex < localFeeds.length ? (
                <div className="bg-[#09111c] border border-[#1e3a5f] rounded-xl p-3 sm:p-4 mt-4">
                  <FeedConfigEditor 
                    feed={localFeeds[selectedFeedIndex]} 
                    onChange={handleUpdateSelectedFeed}
                    onPlaySound={onPlaySound}
                  />
                </div>
              ) : null}

              {/* Control Buttons Row matching engineering buttons */}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
                <button
                  onClick={handleAddNewFeed}
                  className="px-3 py-2 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Новый</span>
                </button>

                <button
                  onClick={handleApplyFeed}
                  className="px-3 py-2 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Применить</span>
                </button>

                <button
                  onClick={handleDeleteFeed}
                  className="px-3 py-2 bg-[#1f1012] hover:bg-[#2e1518] text-rose-300 border border-rose-950/60 rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Удалить</span>
                </button>

                <button
                  onClick={() => handleMoveFeed('up')}
                  className="px-3 py-2 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>Вверх</span>
                </button>

                <button
                  onClick={() => handleMoveFeed('down')}
                  className="px-3 py-2 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>Вниз</span>
                </button>
              </div>

              {/* Full refresh trigger matching bottom button on screenshot */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    const nextFeeds = handleApplyFeed();
                    if (nextFeeds) {
                      onUpdateFeeds(nextFeeds);
                    }
                    onTriggerRefresh?.();
                    onPlaySound?.('success');
                  }}
                  disabled={isRefreshing}
                  className="w-full py-2.5 bg-[#091e36] hover:bg-[#0f2e52] disabled:bg-[#061221] text-[#38bdf8] disabled:text-[#38bdf8]/50 border border-[#38bdf8]/40 disabled:border-[#38bdf8]/20 rounded font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 text-[#38bdf8] ${isRefreshing ? 'animate-spin text-[#38bdf8]/50' : ''}`} />
                  <span>{isRefreshing ? 'Идет синхронизация и обработка ИИ...' : '↻ Перераспределить и обработать новости'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ✦ AI-РЕДАКТОР (Exact Prompt Customization from screenshot 2) */}
          {activeTab === '✦ AI-РЕДАКТОР' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
              
              
              {/* AI Provider Config */}
              <div className="p-3 bg-[#0d1622] border border-[#1e3a5f] rounded-lg space-y-3">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-sky-400" />
                  <span>Настройки провайдера ИИ</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase tracking-wider">Провайдер</label>
                    <select
                      value={localProvider}
                      onChange={(e) => {
                        setLocalProvider(e.target.value);
                        if (e.target.value === 'openrouter') setLocalUrl('https://openrouter.ai/api/v1');
                        else if (e.target.value === 'openai') setLocalUrl('https://api.openai.com/v1');
                        else setLocalUrl('');
                      }}
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded p-2 text-slate-200 text-xs focus:outline-hidden"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="custom">Custom (OpenAI-compatible)</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] uppercase tracking-wider">Модель</label>
                    <input
                      type="text"
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                      placeholder={localProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-3.5-turbo'}
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded p-2 text-slate-200 text-xs focus:outline-hidden"
                    />
                  </div>
                  
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-slate-400 text-[10px] uppercase tracking-wider">API Ключ (Сохраняется локально)</label>
                    <input
                      type="password"
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded p-2 text-slate-200 text-xs focus:outline-hidden"
                    />
                  </div>
                  
                  {localProvider !== 'gemini' && (
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-slate-400 text-[10px] uppercase tracking-wider">Base URL</label>
                      <input
                        type="text"
                        value={localUrl}
                        onChange={(e) => setLocalUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="w-full bg-[#05080c] border border-[#1e3a5f] rounded p-2 text-slate-200 text-xs focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>
              </div>


              {/* Quota Saving Mode Toggle */}
              <div className="p-3 bg-[#0d1622] border border-[#1e3a5f] rounded-lg flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-white font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Автоматическая AI-обработка новых новостей</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    При отключении автоматической AI-обработки новые ленты загружаются мгновенно без запросов к AI. Обработку можно запускать вручную для нужных статей.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onChangeEnableAutoAiProcessing?.(!enableAutoAiProcessing);
                    onPlaySound?.('click');
                  }}
                  className={`px-3.5 py-2 rounded-lg font-bold text-xs transition shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm ${
                    enableAutoAiProcessing
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${enableAutoAiProcessing ? 'bg-slate-950 animate-ping' : 'bg-slate-500'}`} />
                  <span>{enableAutoAiProcessing ? 'ВКЛ' : 'ВЫКЛ'}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-slate-200 font-bold text-xs">
                  Промпт редактирования новостей:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.engineer);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-sky-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Инженер
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.medical);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-rose-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Кардиолог
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.economist);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-emerald-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Экономист
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.automobilist);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-amber-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Автомобилист
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.it);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-indigo-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    IT & Dev
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.business);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-teal-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Бизнес
                  </button>
                  <button
                    onClick={() => {
                      setLocalPrompt(DEFAULT_AI_PROMPTS.universal);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-slate-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer"
                  >
                    Универсальный
                  </button>
                </div>
              </div>

              {/* Big customizable prompt textarea matching screenshot */}
              <div className="p-1 bg-[#05080c] border border-[#1e3a5f] rounded-lg shadow-inner">
                <textarea
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  rows={8}
                  className="w-full bg-transparent p-3 text-slate-100 text-xs font-mono leading-relaxed focus:outline-hidden resize-y"
                  placeholder="Введите системный промпт для AI-обработки новостей..."
                />
              </div>

              <div className="p-3 bg-[#0d1622] border border-[#1e3a5f] rounded text-slate-300 text-[11px] leading-relaxed space-y-1.5">
                <div className="text-[#38bdf8] font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Как нейросеть использует этот промпт:</span>
                </div>
                <p>
                  Каждый входящий материал (видео YouTube, статьи 4PDA, посты Reddit и ленты новостей) отправляется в Gemini 3.7 Flash вместе с вашим промптом. Нейросеть генерирует выжимку с сохранением моделей микросхем, симптомов и методов ремонта.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: 🕒 РАСПИСАНИЕ (3 times a day: 6:00, 12:00, 19:00 or first launch after) */}
          {activeTab === '🕒 РАСПИСАНИЕ' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
              
              {/* SECTION: Город и системное время программы */}
              <div className="p-3.5 bg-[#09111c] border border-[#1e3a5f] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-200 font-bold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#ffcc00]" />
                    <span>Город и системное время программы:</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#04070a] border border-[#ffcc00]/50 text-[#ffcc00] font-mono font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-[#ffcc00]" />
                    <span>{cityClock.timeStr}</span>
                    <span className="text-[10px] text-slate-400 font-normal">({cityClock.utcOffsetStr})</span>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Время во всей программе (часы в шапке, текущий день в календаре, обратные отсчеты рабочих смен, метки заметок) задается городом, выбранным здесь или в блоке погоды слева.
                </p>

                {/* City Input and Timezone Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold text-[11px] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Город для синхронизации:</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={localCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalCity(val);
                          const detectedTz = getTimeZoneForCity(val);
                          setLocalTimeZone(detectedTz);
                        }}
                        placeholder="Например: Пушкино, Москва, Екатеринбург..."
                        className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300 font-bold text-[11px] flex items-center gap-1">
                      <Compass className="w-3.5 h-3.5 text-[#38bdf8]" />
                      <span>Часовой пояс (IANA Timezone):</span>
                    </label>
                    <select
                      value={localTimeZone}
                      onChange={(e) => {
                        setLocalTimeZone(e.target.value);
                      }}
                      className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                    >
                      {POPULAR_CITY_PRESETS.map((p) => (
                        <option key={`${p.name}-${p.tz}`} value={p.tz}>
                          {p.name} — {p.note} ({p.tz})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


              </div>

              <div className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider pt-2">
                Автоматическое расписание обновления источников
              </div>

              <div className="p-3.5 bg-[#09111c] border border-[#1e3a5f] rounded-lg space-y-3">
                <div className="text-slate-200 font-bold">
                  Обновление происходит 3 раза в день:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { hour: 6, label: '06:00 Утра', desc: 'или при первом запуске после 6:00' },
                    { hour: 12, label: '12:00 Дня', desc: 'или при первом запуске после 12:00' },
                    { hour: 19, label: '19:00 Вечера', desc: 'или при первом запуске после 19:00' },
                  ].map((slot) => {
                    const isChecked = localHours.includes(slot.hour);
                    return (
                      <div 
                        key={slot.hour}
                        onClick={() => {
                          if (isChecked) {
                            setLocalHours(localHours.filter(h => h !== slot.hour));
                          } else {
                            setLocalHours([...localHours, slot.hour].sort((a,b) => a-b));
                          }
                          onPlaySound?.('click');
                        }}
                        className={`p-3 rounded border cursor-pointer transition ${
                          isChecked 
                            ? 'bg-[#132338] border-[#38bdf8] text-slate-100 shadow-sm' 
                            : 'bg-[#06090e] border-[#1b2b40] text-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className={isChecked ? 'text-[#38bdf8]' : 'text-slate-300'}>{slot.label}</span>
                          <CheckCircle2 className={`w-4 h-4 ${isChecked ? 'text-[#38bdf8]' : 'text-slate-600'}`} />
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {slot.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Clinical / Workplace Timers */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-200 font-bold">
                    Контрольные точки смены и таймеры ({localTimers.length}):
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const sorted = [...localTimers].sort((a, b) => 
                          parseTargetTimeToSeconds(a.targetTime) - parseTargetTimeToSeconds(b.targetTime)
                        );
                        setLocalTimers(sorted);
                        onPlaySound?.('click');
                      }}
                      className="px-2 py-1 bg-[#101b2b] hover:bg-[#1b2b40] text-sky-300 border border-[#1e3a5f] rounded text-[10px] cursor-pointer transition"
                      title="Упорядочить контрольные точки по времени дня"
                    >
                      ⇅ По порядку времени
                    </button>
                  </div>
                </div>

                {/* Quick Presets for shift templates */}
                <div className="p-2.5 bg-[#05080c] border border-[#1e3a5f] rounded flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400 font-bold">Шаблоны смен:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTimers([
                        { id: 't-round', name: 'Утренний обход', targetTime: '08:30', status: 'active' },
                        { id: 't-patients', name: 'Приём пациентов', targetTime: '11:00', status: 'active' },
                        { id: 't-lunch', name: 'Обед / перерыв', targetTime: '13:30', status: 'active' },
                        { id: 't-lecture', name: 'Консилиум / обучение', targetTime: '16:00', status: 'active' },
                        { id: 't-shift-end', name: 'Конец смены', targetTime: '19:00', status: 'active', isEndShift: true },
                      ]);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#16202e] hover:bg-[#202f45] text-rose-300 border border-[#2a3f5a] rounded text-[10px] cursor-pointer"
                  >
                    🩺 Медицинская смена
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTimers([
                        { id: 't-plan', name: 'Планерка & приёмка', targetTime: '09:00', status: 'active' },
                        { id: 't-solder', name: 'Диагностика & пайка', targetTime: '12:00', status: 'active' },
                        { id: 't-lunch-eng', name: 'Обед / перерыв', targetTime: '14:00', status: 'active' },
                        { id: 't-delivery', name: 'Выдача аппаратов', targetTime: '17:30', status: 'active' },
                        { id: 't-close-eng', name: 'Закрытие сервиса', targetTime: '20:00', status: 'active', isEndShift: true },
                      ]);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#16202e] hover:bg-[#202f45] text-sky-300 border border-[#2a3f5a] rounded text-[10px] cursor-pointer"
                  >
                    🛠 Инженерная смена
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLocalTimers([
                        { id: 't-office-start', name: 'Начало рабочего дня', targetTime: '09:00', status: 'active' },
                        { id: 't-office-lunch', name: 'Обеденный перерыв', targetTime: '13:00', status: 'active' },
                        { id: 't-office-sync', name: 'Итоги и синхронизация', targetTime: '17:30', status: 'active' },
                        { id: 't-office-end', name: 'Завершение дня', targetTime: '18:00', status: 'active', isEndShift: true },
                      ]);
                      onPlaySound?.('click');
                    }}
                    className="px-2 py-1 bg-[#16202e] hover:bg-[#202f45] text-amber-300 border border-[#2a3f5a] rounded text-[10px] cursor-pointer"
                  >
                    💼 Офисный день
                  </button>
                </div>

                {/* Timers list with live countdown indicators */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {localTimers.map((t, idx) => {
                    const previewState = calculateTimerState(
                      t.targetTime,
                      t.status,
                      cityClock.hours,
                      cityClock.minutes,
                      cityClock.seconds,
                      true
                    );
                    const isDone = previewState.effectiveStatus === 'done';

                    return (
                      <div
                        key={t.id}
                        className="p-2.5 bg-[#09111c] border border-[#1e3a5f] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            maxLength={60}
                            value={t.name}
                            onChange={(e) => {
                              const updated = [...localTimers];
                              updated[idx].name = e.target.value || 'Таймер';
                              setLocalTimers(updated);
                            }}
                            className="bg-[#05080c] border border-[#1e3a5f] rounded px-2.5 py-1 text-slate-200 text-xs flex-1"
                            placeholder="Название таймера"
                          />
                          <input
                            type="time"
                            value={t.targetTime}
                            onChange={(e) => {
                              const updated = [...localTimers];
                              updated[idx].targetTime = e.target.value || '12:00';
                              setLocalTimers(updated);
                            }}
                            className="bg-[#05080c] border border-[#1e3a5f] rounded px-2 py-1 text-[#38bdf8] font-bold text-xs w-22 shrink-0 text-center"
                          />
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Sound Selector & Preview */}
                          <select
                            value={t.soundId || 'success'}
                            onChange={(e) => {
                              const updated = [...localTimers];
                              updated[idx].soundId = e.target.value;
                              setLocalTimers(updated);
                              onPlaySound?.(e.target.value);
                            }}
                            className="bg-[#05080c] border border-[#1e3a5f] rounded px-2 py-1 text-slate-300 text-[11px]"
                            title="Звуковой сигнал"
                          >
                            <option value="success">🔔 Сигнал 1 (Стандарт)</option>
                            <option value="chime">🎼 Перезвон</option>
                            <option value="bell">🔔 Колокол</option>
                            <option value="alert">🚨 Сирена</option>
                            <option value="star">✨ Арпеджио</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              onPlaySound?.(t.soundId || 'success');
                            }}
                            className="p-1 text-[#38bdf8] hover:bg-[#132338] rounded cursor-pointer"
                            title="Прослушать звук"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Mute Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...localTimers];
                              updated[idx].isMuted = !t.isMuted;
                              setLocalTimers(updated);
                              onPlaySound?.('click');
                            }}
                            className={`p-1 rounded cursor-pointer ${
                              t.isMuted ? 'text-rose-400 bg-rose-500/10' : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title={t.isMuted ? 'Звук отключен (Mute)' : 'Звук включен'}
                          >
                            {t.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 opacity-60" />}
                          </button>

                          {/* Repeat Mode */}
                          <select
                            value={t.repeatMode || 'daily'}
                            onChange={(e) => {
                              const updated = [...localTimers];
                              updated[idx].repeatMode = e.target.value as any;
                              setLocalTimers(updated);
                              onPlaySound?.('click');
                            }}
                            className="bg-[#05080c] border border-[#1e3a5f] rounded px-1.5 py-1 text-slate-300 text-[11px]"
                            title="Повтор"
                          >
                            <option value="daily">🔄 Каждый день</option>
                            <option value="weekdays">📅 По будням</option>
                            <option value="none">1️⃣ Однократно</option>
                          </select>

                          {/* Countdown preview / Status */}
                          <div className="w-16 text-right font-mono text-[11px]">
                            {isDone ? (
                              <span className="text-slate-500 font-bold">✓ Прошло</span>
                            ) : (
                              <span className="text-[#38bdf8] font-bold tabular-nums">
                                {previewState.formattedCountdown}
                              </span>
                            )}
                          </div>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => {
                              setLocalTimers(localTimers.filter((_, i) => i !== idx));
                              onPlaySound?.('click');
                            }}
                            className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                            title="Удалить таймер"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {localTimers.length === 0 && (
                    <div className="p-3 text-center text-slate-500 bg-[#05080c] border border-dashed border-[#1e3a5f] rounded text-xs">
                      Нет таймеров. Добавьте новую контрольную точку или выберите шаблон выше.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newT: MedicalTimerItem = {
                      id: `timer-${Date.now()}`,
                      name: `Новая контрольная точка`,
                      targetTime: '18:00',
                      status: 'active',
                    };
                    setLocalTimers([...localTimers, newT]);
                    onPlaySound?.('click');
                  }}
                  className="px-3 py-1.5 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>Добавить контрольную точку</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: 🎨 ОФОРМЛЕНИЕ (Custom Wallpapers & Styles) */}
          {activeTab === '🎨 ОФОРМЛЕНИЕ' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
              <div className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider">
                Универсальная настройка стиля и фоновых обоев
              </div>

              {/* Style presets */}
              <div className="p-3 bg-[#09111c] border border-[#1e3a5f] rounded-lg space-y-2">
                <div className="text-slate-200 font-bold">
                  Выберите стиль приложения:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'engineer', label: 'Инженер', desc: 'Пайка, схемы, чипы' },
                    { id: 'medical', label: 'Кардиолог', desc: 'Клинические гайдлайны' },
                    { id: 'economist', label: 'Экономист', desc: 'Рынки, финансы, тренды' },
                    { id: 'automobilist', label: 'Автомобилист', desc: 'ДВС, ТО, автосервис' },
                    { id: 'it', label: 'IT & Dev', desc: 'Код, релизы, уязвимости' },
                    { id: 'business', label: 'Бизнес', desc: 'Стартапы и рост' },
                    { id: 'universal', label: 'Универсальный', desc: 'Любая сфера' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setLocalStyle(st.id as AppArchetypeStyle);
                        if (st.id === 'engineer') setLocalPrompt(DEFAULT_AI_PROMPTS.engineer);
                        if (st.id === 'medical') setLocalPrompt(DEFAULT_AI_PROMPTS.medical);
                        if (st.id === 'economist') setLocalPrompt(DEFAULT_AI_PROMPTS.economist);
                        if (st.id === 'automobilist') setLocalPrompt(DEFAULT_AI_PROMPTS.automobilist);
                        if (st.id === 'it') setLocalPrompt(DEFAULT_AI_PROMPTS.it);
                        if (st.id === 'business') setLocalPrompt(DEFAULT_AI_PROMPTS.business);
                        if (st.id === 'universal') setLocalPrompt(DEFAULT_AI_PROMPTS.universal);
                        onPlaySound?.('click');
                      }}
                      className={`p-2.5 rounded text-left border cursor-pointer transition ${
                        localStyle === st.id
                          ? 'bg-[#142840] border-[#38bdf8] text-white shadow-sm'
                          : 'bg-[#06090e] border-[#1b2b40] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-xs text-sky-300">{st.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wallpaper upload & presets */}
              <div className="p-3 bg-[#09111c] border border-[#1e3a5f] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-slate-200 font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#38bdf8]" />
                    <span>Фоновые обои рабочего стола:</span>
                  </div>

                  {localWallpaper && (
                    <button
                      onClick={() => {
                        setLocalWallpaper('');
                        onChangeCustomWallpaper('');
                        onPlaySound?.('click');
                      }}
                      className="text-rose-400 hover:underline text-[10px] cursor-pointer"
                    >
                      Сбросить к стандарту
                    </button>
                  )}
                </div>

                {/* Upload custom button */}
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2 bg-[#122238] hover:bg-[#1a3150] text-[#38bdf8] border border-[#38bdf8]/50 rounded font-bold flex items-center gap-2 cursor-pointer transition text-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Загрузить свою картинку (с диска)</span>
                  </button>

                  <input
                    type="text"
                    value={localWallpaper.startsWith('data:') ? 'Пользовательское изображение загружено' : localWallpaper}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLocalWallpaper(val);
                      onChangeCustomWallpaper(val);
                    }}
                    placeholder="Или вставьте прямую ссылку на картинку (https://...)"
                    className="flex-1 bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-2 text-xs text-slate-200 focus:outline-hidden"
                  />
                </div>

                {/* Wallpapers presets thumbnails */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[11px] text-slate-400">Готовые высококачественные обои:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {presetWallpapers.map((pw, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          setLocalWallpaper(pw.url);
                          onChangeCustomWallpaper(pw.url);
                          onPlaySound?.('click');
                        }}
                        className={`relative rounded border overflow-hidden cursor-pointer group h-16 transition ${
                          localWallpaper === pw.url ? 'border-[#38bdf8] ring-2 ring-[#38bdf8]/40' : 'border-[#1e3a5f] hover:border-sky-400'
                        }`}
                      >
                        <img
                          src={pw.url}
                          alt={pw.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-end p-1 text-[9px] text-white font-bold truncate">
                          {pw.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: # ФИЛЬТРЫ */}
          {activeTab === '# ФИЛЬТРЫ' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
              <h3 className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider">
                Ключевые слова & Фильтрация новостей
              </h3>
              <p className="text-slate-300 font-sans">
                Приоритетные хэштеги и фильтрация по категориям:
              </p>
              <div className="flex flex-wrap gap-2">
                {['FRP', 'Android', 'Apple', 'Микропайка', 'PMIC', 'Ремонт техники', '4PDA', 'BGA Reball', 'Google Account', 'Схемы'].map((kw) => (
                  <span key={kw} className="px-2.5 py-1 rounded bg-[#0e1a2b] text-[#38bdf8] border border-[#1e3a5f] text-xs">
                    #{kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: A+ ДОСТУПНОСТЬ */}
          {activeTab === 'A+ ДОСТУПНОСТЬ' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
              <h3 className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider">
                Параметры масштабирования интерфейса
              </h3>

              <div className="p-4 bg-[#09111c] border border-[#1e3a5f] rounded-md space-y-4 font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1b2b40]">
                  <label className="text-slate-200 font-bold">
                    Масштаб интерфейса:
                  </label>
                  <select
                    value={localScale}
                    onChange={(e) => setLocalScale(Number(e.target.value))}
                    className="bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                  >
                    <option value={100}>100 % (Стандарт)</option>
                    <option value={125}>125 %</option>
                    <option value={150}>150 % (Увеличенный)</option>
                    <option value={175}>175 %</option>
                    <option value={200}>200 % (Максимальный)</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-slate-200 font-bold">
                    Острота зрения (ориентир):
                  </label>
                  <select
                    value={localAcuity}
                    onChange={(e) => setLocalAcuity(e.target.value)}
                    className="bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                  >
                    <option value="Не указывать">Не указывать</option>
                    <option value="-1.0 D">-1.0 D</option>
                    <option value="-2.0 D">-2.0 D</option>
                    <option value="-3.0 D">-3.0 D</option>
                    <option value="-4.0 D">-4.0 D</option>
                    <option value="-5.0 D и более">-5.0 D и более</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ♥ О ПРОЕКТЕ (Exact Layout from Screenshot 1) */}
          {activeTab === '♥ О ПРОЕКТЕ' && (
            <div className="space-y-4 animate-in fade-in duration-100 font-mono text-xs">
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
                {/* Yellow QR box container */}
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
        </div>

        {/* Modal Bottom Actions matching screenshots */}
        <div className="bg-[#080b0f] border-t border-[#1b2b40] px-4 py-3 flex items-center justify-between shrink-0 select-none">
          <button
            onClick={() => {
              onClose();
              onPlaySound?.('click');
            }}
            className="px-4 py-2 rounded bg-[#0d1622] hover:bg-[#152336] text-slate-300 font-mono text-xs transition cursor-pointer border border-[#1e3a5f]"
          >
            Закрыть (Esc)
          </button>

          <button
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
