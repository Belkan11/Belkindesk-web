import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Globe, 
  Compass, 
  Plus, 
  Check, 
  Search, 
  Rss, 
  FileUp, 
  FileDown, 
  Loader2, 
  AlertCircle,
  Tag,
  CheckCircle2,
  ExternalLink,
  Bot,
  Zap
} from 'lucide-react';
import { CURATED_FEED_PRESETS } from '../data/curatedFeeds';
import { FeedConfigEditor } from './FeedConfigEditor';
import { FeedConfig, AIDiscoveredFeed } from '../types';
import { aiDiscoverFeeds, discoverFeedsFromUrl, parseOpmlText } from '../utils/feedApi';

interface AddFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFeed: (feed: Omit<FeedConfig, 'id'>) => void;
  onAddMultipleFeeds: (feeds: Array<Omit<FeedConfig, 'id'>>) => void;
  customCategories: string[];
  existingFeedUrls: string[];
}

export const AddFeedModal: React.FC<AddFeedModalProps> = ({
  isOpen,
  onClose,
  onAddFeed,
  onAddMultipleFeeds,
  customCategories,
  existingFeedUrls,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'url' | 'catalog' | 'manual' | 'opml'>('ai');

  // AI Discovery state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<AIDiscoveredFeed[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedAiUrls, setSelectedAiUrls] = useState<Record<string, boolean>>({});

  // URL Discovery state
  const [siteUrlInput, setSiteUrlInput] = useState('');
  const [isUrlScanning, setIsUrlScanning] = useState(false);
  const [discoveredUrlFeeds, setDiscoveredUrlFeeds] = useState<Array<{ title: string; url: string; type: string }>>([]);
  const [discoveredSiteTitle, setDiscoveredSiteTitle] = useState('');
  const [urlScanError, setUrlScanError] = useState<string | null>(null);

  // Manual Feed state
  const [manualTitle, setManualTitle] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [manualCategory, setManualCategory] = useState(customCategories[0] || 'Технологии & Разработка');
  const [manualDescription, setManualDescription] = useState('');

  // OPML state
  const [opmlText, setOpmlText] = useState('');
  const [parsedOpmlFeeds, setParsedOpmlFeeds] = useState<Array<{ title: string; url: string; category: string }>>([]);

  const [customFeed, setCustomFeed] = useState<FeedConfig>({
    id: `custom-${Date.now()}`,
    name: '',
    category: customCategories[0] || 'Технологии & Разработка',
    description: '',
    sources: [],
    enabled: true,
    keywords: [],
    excludeKeywords: [],
    keywordMode: 'ANY'
  });

  const handleCustomAdd = () => {
    if (!customFeed.name.trim() || !customFeed.sources?.length) {
      alert("Укажите название ленты и добавьте хотя бы один источник!");
      return;
    }
    const feedToAdd = { ...customFeed };
    onAddFeed(feedToAdd);
    onClose();
  };


  if (!isOpen) return null;

  const handleAiDiscover = async (customQuery?: string) => {
    const q = customQuery || aiPrompt;
    if (!q.trim()) return;

    setIsAiLoading(true);
    setAiError(null);
    try {
      const feeds = await aiDiscoverFeeds(q);
      setAiResults(feeds);
      // Select all by default
      const map: Record<string, boolean> = {};
      feeds.forEach((f) => {
        if (!existingFeedUrls.includes(f.url)) {
          map[f.url] = true;
        }
      });
      setSelectedAiUrls(map);
    } catch (err: unknown) {
      const error = err as Error;
      setAiError(error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubscribeAiSelected = () => {
    const toAdd = aiResults
      .filter((f) => selectedAiUrls[f.url] && !existingFeedUrls.includes(f.url))
      .map((f) => ({
        title: f.title,
        url: f.url,
        siteUrl: f.siteUrl,
        category: f.category || 'ИИ & Нейросети',
        description: f.description,
        tags: f.tags,
        status: 'idle' as const,
      }));

    if (toAdd.length > 0) {
      onAddMultipleFeeds(toAdd);
      onClose();
    }
  };

  const handleScanSiteUrl = async () => {
    if (!siteUrlInput.trim()) return;
    setIsUrlScanning(true);
    setUrlScanError(null);
    try {
      const data = await discoverFeedsFromUrl(siteUrlInput.trim());
      setDiscoveredSiteTitle(data.siteTitle || siteUrlInput);
      setDiscoveredUrlFeeds(data.feeds || []);
      if (!data.feeds || data.feeds.length === 0) {
        setUrlScanError('RSS-потоки на сайте не найдены автоматически. Попробуйте ручной ввод.');
      }
    } catch (err: unknown) {
      const error = err as Error;
      setUrlScanError(error.message);
    } finally {
      setIsUrlScanning(false);
    }
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualUrl.trim()) return;

    onAddFeed({
      title: manualTitle.trim() || 'Пользовательский RSS',
      url: manualUrl.trim(),
      category: manualCategory,
      description: manualDescription.trim() || undefined,
      status: 'idle',
    });

    onClose();
  };

  const handleOpmlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setOpmlText(text);
        const parsed = parseOpmlText(text);
        setParsedOpmlFeeds(parsed);
      }
    };
    reader.readAsText(file);
  };

  const handleImportParsedOpml = () => {
    const toAdd = parsedOpmlFeeds
      .filter((f) => !existingFeedUrls.includes(f.url))
      .map((f) => ({
        title: f.title,
        url: f.url,
        category: f.category || 'Импортированные',
        status: 'idle' as const,
      }));

    if (toAdd.length > 0) {
      onAddMultipleFeeds(toAdd);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Добавить источники новостей</h2>
              <p className="text-[11px] text-slate-400">Умный поиск через Gemini AI, авто-сканирование сайта или OPML</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 shrink-0 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'ai'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Генератор подписок</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'url'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Поиск по сайту (URL)</span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'catalog'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Каталог популярных</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'manual'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Создать свою</span>
          </button>

          <button
            onClick={() => setActiveTab('opml')}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition cursor-pointer shrink-0 ${
              activeTab === 'opml'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Импорт OPML</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 text-xs text-slate-200">
          
          {/* TAB 1: GEMINI AI SMART FEED DISCOVERY */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-purple-950/50 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-100 text-xs">
                    Умное создание лент с помощью Gemini
                  </span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Опишите своими словами, что вы хотите читать: перечислите темы (например, «ИИ и трансформеры, Python, стартапы»), ключевые слова или названия любимых сайтов (Хабр, VC, 3DNews). Gemini сам подберет и проверит рабочие RSS потоки!
                </p>

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {[
                    'Хабр Python, нейросети, стартапы',
                    'Искусственный интеллект, LLM и агенты',
                    'Космос, астрономия и запуски ракет',
                    'Финансы, Bitcoin, фондовые рынки',
                    'Кибербезопасность и уязвимости CVE',
                    'Геймдев, Unreal Engine 5, Unity'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setAiPrompt(preset);
                        handleAiDiscover(preset);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-900/30 text-indigo-200 hover:bg-indigo-900/60 border border-indigo-700/40 text-[10px] transition cursor-pointer"
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Введите тему, сайты или ключевые слова..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiDiscover()}
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => handleAiDiscover()}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Поиск...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Создать подписки</span>
                    </>
                  )}
                </button>
              </div>

              {aiError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* AI Results */}
              {aiResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300">
                      Найдено источников: {aiResults.length}
                    </span>
                    <button
                      onClick={handleSubscribeAiSelected}
                      className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400 transition cursor-pointer text-xs"
                    >
                      Подписаться на выбранные ({Object.values(selectedAiUrls).filter(Boolean).length})
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {aiResults.map((feed) => {
                      const isSubscribed = existingFeedUrls.includes(feed.url);
                      const isChecked = !!selectedAiUrls[feed.url];

                      return (
                        <div
                          key={feed.url}
                          onClick={() => {
                            if (!isSubscribed) {
                              setSelectedAiUrls((prev) => ({ ...prev, [feed.url]: !prev[feed.url] }));
                            }
                          }}
                          className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            isSubscribed
                              ? 'bg-slate-950/60 border-slate-800 opacity-60'
                              : isChecked
                              ? 'bg-amber-500/10 border-amber-500/50'
                              : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-100 text-xs">{feed.title}</h4>
                              {isSubscribed ? (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Уже есть
                                </span>
                              ) : (
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-3.5 h-3.5 rounded border-slate-700 text-amber-500 accent-amber-500"
                                />
                              )}
                            </div>

                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {feed.description}
                            </p>
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 font-medium">
                              {feed.category}
                            </span>
                            <span className="font-mono truncate max-w-[140px] text-slate-500">
                              {feed.url}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SMART URL DISCOVERY */}
          {activeTab === 'url' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-semibold text-slate-200">Автоматический поиск RSS на любом сайте</div>
                <p className="text-[11px] text-slate-400">
                  Вставьте URL любого сайта или блога (например <span className="font-mono text-amber-400">theverge.com</span> или <span className="font-mono text-amber-400">https://habr.com</span>), и система автоматически просканирует и найдет все доступные каналы вещания.
                </p>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="https://example.com или domain.com"
                    value={siteUrlInput}
                    onChange={(e) => setSiteUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScanSiteUrl()}
                    className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleScanSiteUrl}
                    disabled={isUrlScanning || !siteUrlInput.trim()}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isUrlScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Сканировать</span>
                  </button>
                </div>
              </div>

              {urlScanError && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                  {urlScanError}
                </div>
              )}

              {discoveredUrlFeeds.length > 0 && (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-300">
                    Найденные ленты на {discoveredSiteTitle}:
                  </div>
                  <div className="space-y-2">
                    {discoveredUrlFeeds.map((f, i) => {
                      const isSubscribed = existingFeedUrls.includes(f.url);
                      return (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-3">
                            <h4 className="font-bold text-slate-200 text-xs">{f.title}</h4>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{f.url}</p>
                          </div>
                          <button
                            onClick={() => {
                              onAddFeed({
                                title: f.title || discoveredSiteTitle,
                                url: f.url,
                                siteUrl: siteUrlInput,
                                category: 'Технологии & Разработка',
                                status: 'idle',
                              });
                              onClose();
                            }}
                            disabled={isSubscribed}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                              isSubscribed
                                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                            }`}
                          >
                            {isSubscribed ? 'Добавлено' : 'Подписаться'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CURATED CATALOG */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              {CURATED_FEED_PRESETS.map((preset) => (
                <div key={preset.category} className="space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <div>
                      <h3 className="font-bold text-xs text-amber-300">{preset.category}</h3>
                      <p className="text-[11px] text-slate-400">{preset.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {preset.feeds.map((feed) => {
                      const isSubscribed = existingFeedUrls.includes(feed.url);

                      return (
                        <div
                          key={feed.url}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="font-bold text-slate-100 text-xs">{feed.title}</h4>
                              <button
                                onClick={() => {
                                  onAddFeed({
                                    title: feed.title,
                                    url: feed.url,
                                    siteUrl: feed.siteUrl,
                                    category: preset.category,
                                    description: feed.description,
                                    tags: feed.tags,
                                    status: 'idle',
                                  });
                                }}
                                disabled={isSubscribed}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer shrink-0 ${
                                  isSubscribed
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                }`}
                              >
                                {isSubscribed ? 'Подписан' : '+ Добавить'}
                              </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {feed.description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {feed.tags.map((t, idx) => (
                              <span key={idx} className="text-[9px] px-1.5 py-0.2 bg-slate-900 text-slate-400 rounded">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

                    {/* TAB 4: MANUAL RSS/ATOM ENTRY -> CUSTOM FEED */}
          {activeTab === 'manual' && (
            <div className="space-y-4 max-w-2xl mx-auto py-2">
              <div className="mb-4">
                <h3 className="font-bold text-slate-100 text-sm mb-1 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Конструктор пользовательской ленты
                </h3>
                <p className="text-xs text-slate-400">
                  Создайте гибкую ленту с множеством источников (RSS, YouTube, Reddit и др.), объединив их общими фильтрами и ключевыми словами.
                </p>
              </div>
              
              <div className="p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
                <FeedConfigEditor 
                  feed={customFeed} 
                  onChange={(updated) => setCustomFeed(updated)} 
                />
              </div>

              <div className="pt-3 sticky bottom-0 bg-slate-900/90 py-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCustomAdd}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Создать ленту
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: OPML IMPORT */}
          {activeTab === 'opml' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className="p-4 bg-slate-950 border border-dashed border-slate-700 rounded-xl text-center space-y-3">
                <FileUp className="w-8 h-8 mx-auto text-amber-400" />
                <div>
                  <h4 className="font-bold text-xs text-slate-200">
                    Импортируйте подписки из любого десктопного ридера
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Поддерживаются файлы OPML из QuiteRSS, Feedly, Inoreader, NetNewsWire, Feedreader и других.
                  </p>
                </div>

                <label className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg border border-slate-700 transition cursor-pointer">
                  <span>Выбрать .OPML файл на диске</span>
                  <input
                    type="file"
                    accept=".opml,.xml"
                    onChange={handleOpmlFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {parsedOpmlFeeds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Распознано источников: {parsedOpmlFeeds.length}
                    </span>
                    <button
                      onClick={handleImportParsedOpml}
                      className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg transition"
                    >
                      Импортировать все ({parsedOpmlFeeds.length})
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto custom-scrollbar border border-slate-800 rounded-lg divide-y divide-slate-800/60 bg-slate-950">
                    {parsedOpmlFeeds.map((f, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-200 truncate pr-2">{f.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
                          {f.url}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
