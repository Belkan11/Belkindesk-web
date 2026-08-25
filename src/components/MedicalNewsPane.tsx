import React, { useState } from 'react';
import { Search, Star, AlignLeft, LayoutGrid, Image as ImageIcon, Sparkles, Clock, Check, Trash2, Plus, RotateCw } from 'lucide-react';
import { Article, FeedConfig, AppArchetypeStyle } from '../types';

interface MedicalNewsPaneProps {
  articles: Article[];
  feeds: FeedConfig[];
  activeFeedId: string | null;
  onSelectFeed: (feedId: string | null) => void;
  onSelectArticle: (article: Article) => void;
  onToggleStar: (articleId: string) => void;
  onToggleRead: (articleId: string) => void;
  onDeleteArticle: (articleId: string) => void;
  isStarredFilter: boolean;
  onToggleStarredFilter: (active: boolean) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
  appStyle?: AppArchetypeStyle;
  onReprocessArticles?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshStatusMessage?: string;
  onOpenAddFeed: () => void;
}

export const MedicalNewsPane: React.FC<MedicalNewsPaneProps> = ({
  articles,
  feeds,
  activeFeedId,
  onSelectFeed,
  onSelectArticle,
  onToggleStar,
  onToggleRead,
  onDeleteArticle,
  isStarredFilter,
  onToggleStarredFilter,
  onPlaySound,
  appStyle = 'classic',
  onReprocessArticles,
  onRefresh,
  isRefreshing = false,
  refreshStatusMessage = '',
  onOpenAddFeed,
}) => {
  const isModern = appStyle === 'modern';
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'single-line' | 'three-lines'>(() => {
    return (localStorage.getItem('belkindesk_news_view_mode') as 'single-line' | 'three-lines') || 'three-lines';
  });

  const handleSetViewMode = (mode: 'single-line' | 'three-lines') => {
    setViewMode(mode);
    localStorage.setItem('belkindesk_news_view_mode', mode);
    onPlaySound?.('click');
  };

  // Filter articles based on feed, search, and starred filter (no hard limits in search area)
  const filteredArticles = React.useMemo(() => {
    const rawMatches = articles.filter((art) => {
      if (isStarredFilter && !art.isStarred) return false;
      if (activeFeedId && art.feedId !== activeFeedId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          art.title.toLowerCase().includes(q) ||
          ((art.ai?.titleRu || art.titleRu) && (art.ai?.titleRu || art.titleRu).toLowerCase().includes(q)) ||
          ((art.ai?.summaryOneLine || art.summaryOneLine) && (art.ai?.summaryOneLine || art.summaryOneLine).toLowerCase().includes(q)) ||
          ((art.ai?.summaryThreeLines || art.summaryThreeLines) && (art.ai?.summaryThreeLines || art.summaryThreeLines).toLowerCase().includes(q)) ||
          art.contentSnippet?.toLowerCase().includes(q) ||
          art.feedTitle?.toLowerCase().includes(q) ||
          (art.categories && art.categories.some((c) => c.toLowerCase().includes(q))) ||
          ((art.ai?.keyTerms || art.keyTerms) && (art.ai?.keyTerms || art.keyTerms).some((k) => k.toLowerCase().includes(q)))
        );
      }
      return true;
    });

    if (activeFeedId) {
      // Single feed view: show all available news items (unrestricted up to 100)
      return rawMatches.slice(0, 100);
    }

    // If searching, do NOT apply the limit of 10 articles per source
    if (searchQuery.trim()) {
      return rawMatches;
    }

    // Multi-feed view: return up to 50 articles per source to keep the dashboard performant yet comprehensive
    const countPerSource: Record<string, number> = {};
    const result: Article[] = [];
    for (const art of rawMatches) {
      const sourceKey = art.feedId || art.feedTitle || 'default';
      const currentCount = countPerSource[sourceKey] || 0;
      if (currentCount < 50) {
        countPerSource[sourceKey] = currentCount + 1;
        result.push(art);
      }
    }
    return result;
  }, [articles, isStarredFilter, activeFeedId, searchQuery]);

  const starredCount = articles.filter((a) => a.isStarred).length;

  return (
    <div className={`flex-1 flex flex-col overflow-hidden p-2.5 font-mono text-xs select-none transition-all duration-300 ${
      isModern ? 'bg-[#0a0f1d]/20 backdrop-blur-md' : 'bg-[#0b0e12]/85 backdrop-blur-xs'
    }`}>
      {/* 1. Top Search & Controls Bar */}
      <div className="relative mb-2 shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по новостям и терминам..."
            className={`w-full border rounded px-3 py-1.5 text-xs transition pr-8 font-mono ${
              isModern
                ? 'bg-[#0a0f1d]/30 border-cyan-500/30 text-slate-100 placeholder-slate-400 focus:border-cyan-400/60'
                : 'bg-[#12161d] border-[#2b2518] text-slate-200 placeholder-slate-500 focus:border-[#ffcc00]/60'
            }`}
          />
          <Search className={`w-3.5 h-3.5 absolute right-3 top-2.5 ${isModern ? 'text-cyan-400/70' : 'text-slate-500'}`} />
        </div>

        {/* View Mode Switcher: Single-Line vs Three-Lines */}
        <div className="flex items-center bg-[#12161d] border border-[#2b2518] rounded p-0.5 shrink-0">
          <button
            onClick={() => handleSetViewMode('single-line')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
              viewMode === 'single-line'
                ? 'bg-[#ffcc00] text-black shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a202a]'
            }`}
            title="Однострочный режим: заголовок + 1 предложение в строку"
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1 строка</span>
          </button>

          <button
            onClick={() => handleSetViewMode('three-lines')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
              viewMode === 'three-lines'
                ? 'bg-[#ffcc00] text-black shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a202a]'
            }`}
            title="Трехстрочные карточки: заголовок + 3 строки описания"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3 строки</span>
          </button>
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="mb-2 flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
          <span>Поиск: &laquo;{searchQuery}&raquo;</span>
          <span className="text-[#ffcc00]">Найдено: {filteredArticles.length}</span>
        </div>
      )}

      {/* 2. Main Two-Column Layout: Feeds Channels (Left) | News Feed (Right) */}
      <div className="flex-1 flex gap-2 overflow-hidden">
        {/* Left Sub-column: Channels & Categories Filter */}
        <div className={`w-32 sm:w-36 md:w-40 rounded-xl p-1.5 overflow-y-auto space-y-1.5 shrink-0 flex flex-col justify-between transition-all ${
          isModern
            ? 'bg-[#0a1020]/60 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-950/20'
            : 'bg-[#0e1116] border border-[#2b2518]'
        }`}>
          <div className="space-y-1 overflow-y-auto flex-1">
            <button
              onClick={() => {
                onSelectFeed(null);
                onToggleStarredFilter(false);
                onPlaySound?.('click');
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-between ${
                activeFeedId === null && !isStarredFilter
                  ? isModern
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 shadow-[0_0_10px_rgba(56,189,248,0.4)] font-black'
                    : 'bg-[#ffcc00] text-black shadow-xs font-black'
                  : isModern
                  ? 'text-slate-300 hover:text-cyan-200 hover:bg-cyan-950/30'
                  : 'text-slate-300 hover:bg-[#181d24]'
              }`}
            >
              <span>Все источники</span>
              <span className="text-[10px] opacity-75 font-mono">{articles.length}</span>
            </button>

            <div className={`pt-1 pb-1 border-b ${isModern ? 'border-cyan-500/20' : 'border-[#20252e]/70'}`}></div>

            {feeds.map((feed) => {
              const isSelected = activeFeedId === feed.id && !isStarredFilter;
              const count = articles.filter((a) => a.feedId === feed.id).length;

              return (
                <button
                  key={feed.id}
                  onClick={() => {
                    onSelectFeed(feed.id);
                    onToggleStarredFilter(false);
                    onPlaySound?.('click');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] transition cursor-pointer flex items-center justify-between gap-1.5 ${
                    isSelected
                      ? isModern
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/50 font-bold shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                        : 'bg-[#2a2417] text-[#ffcc00] border border-[#ffcc00]/40 font-bold'
                      : isModern
                      ? 'text-slate-300 hover:text-cyan-200 hover:bg-cyan-950/30'
                      : 'text-slate-300 hover:bg-[#161a22]'
                  }`}
                  title={feed.title}
                >
                  <span className="truncate leading-tight">{feed.title}</span>
                  {count > 0 && (
                    <span className={`text-[9px] shrink-0 font-mono ${isModern ? 'text-cyan-400/80' : 'text-slate-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Add Button (+) */}
          <div className={`pt-2 mt-1 border-t shrink-0 ${isModern ? 'border-cyan-500/20' : 'border-[#20252e]/80'}`}>
            <button
              onClick={() => {
                onOpenAddFeed();
                onPlaySound?.('click');
              }}
              className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition cursor-pointer font-bold shadow-sm ${
                isModern
                  ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                  : 'bg-[#141820] hover:bg-[#1c222e] text-[#ffcc00] border border-[#2b2518] hover:border-[#ffcc00]/50'
              }`}
              title="Добавить новый сайт или источник"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Добавить источник</span>
            </button>
          </div>
        </div>

        {/* Right Sub-column: Articles Feed */}
        <div className={`flex-1 flex flex-col rounded-xl overflow-hidden transition-all ${
          isModern
            ? 'bg-[#0a1020]/60 backdrop-blur-md border border-cyan-500/30 shadow-lg shadow-cyan-950/20'
            : 'bg-[#0e1116] border border-[#2b2518]'
        }`}>
          {/* Header Bar */}
          <div className={`p-2.5 border-b flex items-center justify-between text-[11px] ${
            isModern ? 'bg-[#0d172a]/70 border-cyan-500/30 text-cyan-300' : 'bg-[#12161e] border-[#2b2518] text-slate-400'
          }`}>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${isModern ? 'text-cyan-200 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]' : 'text-[#ffcc00]'}`}>
                {activeFeedId
                  ? feeds.find((f) => f.id === activeFeedId)?.title || 'Выбранный канал'
                  : isStarredFilter
                  ? 'Избранные новости'
                  : 'Лента новостей'}
              </span>
              <span className="text-slate-600">|</span>
              <span className={`text-[10px] ${isModern ? 'text-cyan-400/80' : 'text-slate-500'}`}>
                {viewMode === 'single-line' ? 'Режим: Однострочный' : 'Режим: 3-строчные карточки'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {onRefresh && (
                <button
                  onClick={() => {
                    onRefresh();
                    onPlaySound?.('click');
                  }}
                  disabled={isRefreshing}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-bold transition cursor-pointer shadow-sm ${
                    isModern
                      ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/60'
                      : 'border-[#ffcc00]/30 bg-[#ffcc00]/10 text-[#ffcc00] hover:bg-[#ffcc00]/20 hover:border-[#ffcc00]/60'
                  } ${isRefreshing ? 'animate-spin opacity-70 cursor-not-allowed' : ''}`}
                  title="Запустить последовательный скрейпинг и обновление всех источников"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Обновить ленту</span>
                </button>
              )}
              <span className="text-[10px] text-slate-500">
                {filteredArticles.length} материалов
              </span>
            </div>
          </div>

          {/* Articles Container */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 relative">
            {isRefreshing && (
              <div className="absolute inset-0 bg-[#070a10]/95 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10 select-none animate-in fade-in duration-200">
                <div className="max-w-md w-full space-y-5">
                  {/* Glowing Spinner with Sparkles */}
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffcc00]/20 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-[#ffcc00] border-t-transparent animate-spin duration-700" />
                    <Sparkles className="w-5 h-5 text-[#ffcc00] animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <div className="text-[#ffcc00] font-sans font-bold text-[11px] tracking-widest uppercase animate-pulse">
                      СИНХРОНИЗАЦИЯ С ИИ GEMINI 3.7 FLASH
                    </div>
                    <div className="p-3 bg-[#0d121a] border border-[#ffcc00]/20 rounded font-mono text-[11px] text-slate-300 leading-relaxed shadow-inner">
                      {refreshStatusMessage || 'Пожалуйста, подождите... Идет извлечение статей, фильтрация рекламы и адаптация материалов...'}
                    </div>
                  </div>

                  {/* Pulsing high tech loading bar */}
                  <div className="w-56 h-1.5 bg-slate-850 rounded-full mx-auto overflow-hidden relative border border-[#ffcc00]/10">
                    <div className="h-full bg-gradient-to-r from-[#ffcc00] to-[#ffd633] animate-pulse w-full" />
                  </div>

                  <div className="text-[9px] text-slate-500 font-mono tracking-wide uppercase flex items-center justify-center gap-4">
                    <span>⚡ Очистка рекламы</span>
                    <span>•</span>
                    <span>✍ Перевод</span>
                    <span>•</span>
                    <span>✦ Персонализация</span>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'single-line' ? (
              /* ============================================================== */
              /* 1. SINGLE-LINE MODE (Заголовок + 1 предложение в 1 строку)     */
              /* ============================================================== */
              <div className="space-y-1">
                {filteredArticles.map((art, idx) => {
                  const displayTitle = (art.ai?.titleRu || art.titleRu) || art.title;
                  const displaySnippet = (art.ai?.summaryOneLine || art.summaryOneLine) || art.contentSnippet || '';
                  const hasImages = (art.imageUrls && art.imageUrls.length > 0) || !!art.imageUrl;

                  return (
                    <div
                      key={`${art.id}-${idx}`}
                      onClick={() => {
                        onSelectArticle(art);
                        onToggleRead(art.id);
                        onPlaySound?.('click');
                      }}
                      className={`group flex items-center gap-2 px-3 py-2 rounded-xl border transition cursor-pointer ${
                        isModern
                          ? !art.isRead
                            ? 'bg-[#0c162d]/70 backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/70 hover:bg-[#112040]/80 shadow-[0_4px_15px_rgba(0,0,0,0.3)]'
                            : 'bg-[#080e1a]/50 backdrop-blur-md border-cyan-500/15 hover:border-cyan-400/50 opacity-80'
                          : !art.isRead
                          ? 'bg-[#14181f] border-[#2b2518] hover:border-[#ffcc00]/50 hover:bg-[#1a212c]'
                          : 'bg-[#0f1318] border-[#1f242d] hover:border-[#384152] opacity-85'
                      }`}
                    >
                      {/* Unread Status Dot */}
                      {!art.isRead ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d] shrink-0" title="Не прочитано" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0 opacity-40" />
                      )}

                      {/* Source Channel Tag */}
                      <span className="text-[10px] text-[#ffcc00]/90 bg-[#1f1b13] px-1.5 py-0.5 rounded border border-[#3d3320] shrink-0 max-w-[110px] truncate font-mono">
                        {art.feedTitle || 'Новость'}
                      </span>

                      {/* Headline & 1-Sentence Summary Combined in Single Line */}
                      <div className="flex-1 flex items-baseline gap-1.5 min-w-0 overflow-hidden text-xs">
                        <span className={`font-sans font-semibold shrink-0 transition ${isModern ? 'text-slate-100 group-hover:text-cyan-300' : 'text-slate-100 group-hover:text-[#ffcc00]'}`}>
                          {displayTitle}
                        </span>
                        {displaySnippet && (
                          <>
                            <span className="text-slate-600 shrink-0">—</span>
                            <span className="text-slate-400 font-sans text-[11px] truncate opacity-85">
                              {displaySnippet}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Image Indicator Badge */}
                      {hasImages && (
                        <span className="flex items-center gap-0.5 text-[9px] text-sky-400 bg-sky-950/40 px-1 py-0.2 rounded border border-sky-800/40 shrink-0 font-mono" title="Содержит фото">
                          <ImageIcon className="w-2.5 h-2.5" />
                          <span>фото</span>
                        </span>
                      )}

                      {/* Date/Time */}
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 hidden md:inline">
                        {art.pubDate}
                      </span>

                      {/* Star Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(art.id);
                          onPlaySound?.('star');
                        }}
                        className={`p-1 transition cursor-pointer shrink-0 rounded hover:bg-black/40 ${
                          art.isStarred ? 'text-[#ffcc00]' : 'text-slate-600 hover:text-slate-400'
                        }`}
                        title={art.isStarred ? 'Убрать из избранного' : 'Добавить в избранное'}
                      >
                        <Star className={`w-3.5 h-3.5 ${art.isStarred ? 'fill-[#ffcc00]' : ''}`} />
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteArticle(art.id);
                        }}
                        className="p-1 transition cursor-pointer shrink-0 rounded text-slate-600 hover:text-red-400 hover:bg-black/40"
                        title="Удалить карточку новости"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ============================================================== */
              /* 2. THREE-LINES CARD MODE (Заголовок + 3 строки описания)        */
              /* ============================================================== */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 sm:gap-1.5">
                {filteredArticles.map((art, idx) => {
                  const displayTitle = (art.ai?.titleRu || art.titleRu) || art.title;
                  const displayDesc = (art.ai?.summaryThreeLines || art.summaryThreeLines) || (art.ai?.summaryOneLine || art.summaryOneLine) || art.contentSnippet || '';
                  const img = (art.imageUrls && art.imageUrls[0]) || art.imageUrl;

                  return (
                    <div
                      key={`${art.id}-${idx}`}
                      onClick={() => {
                        onSelectArticle(art);
                        onToggleRead(art.id);
                        onPlaySound?.('click');
                      }}
                      className={`group flex flex-col justify-between p-2 sm:p-2.5 rounded-lg border transition cursor-pointer relative ${
                        isModern
                          ? !art.isRead
                            ? 'bg-[#0c162d]/70 backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/70 hover:bg-[#112040]/80 shadow-[0_3px_12px_rgba(0,0,0,0.4)]'
                            : 'bg-[#080e1a]/50 backdrop-blur-md border-cyan-500/15 hover:border-cyan-400/50 opacity-80'
                          : !art.isRead
                          ? 'bg-[#14181f] border-[#2b2518] hover:border-[#ffcc00]/60 hover:bg-[#1a212d]'
                          : 'bg-[#10141a] border-[#1e232c] hover:border-[#3a4352] opacity-90'
                      }`}
                    >
                      <div>
                        {/* Top Card Meta Row */}
                        <div className="flex items-center justify-between gap-1 mb-1 text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-1">
                            {!art.isRead ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4d4d] shrink-0" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-700 shrink-0 opacity-40" />
                            )}
                            <span className={`font-mono font-bold px-1 py-0.5 rounded border text-[9px] ${
                              isModern
                                ? 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30'
                                : 'text-[#ffcc00] bg-[#221c12] border-[#3b3220]'
                            }`}>
                              {art.feedTitle}
                            </span>
                            <span className="text-slate-500 font-mono truncate max-w-[80px]">{art.pubDate}</span>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleStar(art.id);
                                onPlaySound?.('star');
                              }}
                              className={`p-0.5 transition cursor-pointer rounded hover:bg-black/40 ${
                                art.isStarred ? 'text-[#ffcc00]' : 'text-slate-600 hover:text-slate-400'
                              }`}
                              title={art.isStarred ? 'Убрать из избранного' : 'Добавить в избранное'}
                            >
                              <Star className={`w-3 h-3 ${art.isStarred ? 'fill-[#ffcc00]' : ''}`} />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteArticle(art.id);
                              }}
                              className="p-0.5 transition cursor-pointer rounded text-slate-600 hover:text-red-400 hover:bg-black/40"
                              title="Удалить карточку новости"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Image Layout */}
                        <div className="flex gap-1.5 items-start">
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-sans text-[10.5px] sm:text-[11.5px] font-bold leading-tight transition line-clamp-2 ${isModern ? 'text-slate-100 group-hover:text-cyan-300' : 'text-slate-100 group-hover:text-[#ffcc00]'}`}>
                              {displayTitle}
                            </h4>
                            {/* 2-lines description for shorter height */}
                            <p className="text-slate-300 font-sans text-[9.5px] sm:text-[10px] line-clamp-2 mt-0.5 leading-tight opacity-85">
                              {displayDesc}
                            </p>
                          </div>

                          {img && (
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded bg-slate-900 border border-[#2b2518]/60 shrink-0 overflow-hidden relative">
                              <img
                                src={img}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                onError={(e) => {
                                  (e.currentTarget as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Tags / Key Terms */}
                      {(art.ai?.keyTerms || art.keyTerms) && (art.ai?.keyTerms || art.keyTerms).length > 0 && (
                        <div className="mt-1 pt-1 border-t border-[#202632]/40 flex flex-wrap gap-0.5 items-center">
                          {(art.ai?.keyTerms || art.keyTerms).slice(0, 3).map((term, tIdx) => (
                            <span
                              key={tIdx}
                              className="text-[8px] sm:text-[9px] text-[#ffcc00]/80 bg-[#1c1810] px-1 py-0.2 rounded border border-[#3b3220]/60 font-mono"
                            >
                              #{term}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filteredArticles.length === 0 && (
              <div className="text-center py-16 text-slate-500 text-xs font-mono">
                {isStarredFilter ? 'Нет избранных новостей' : 'По заданным источникам и фильтрам ничего не найдено.'}
              </div>
            )}
          </div>

          {/* Bottom Bar: Starred Filter Toggle */}
          <div className={`p-1.5 border-t flex items-center justify-between gap-2 ${isModern ? 'bg-[#0a1020]/80 border-cyan-500/30' : 'bg-[#12161e] border-[#2b2518]'}`}>
            <button
              onClick={() => {
                onToggleStarredFilter(!isStarredFilter);
                onPlaySound?.('click');
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] sm:text-xs transition cursor-pointer font-bold ${
                isStarredFilter
                  ? isModern
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-[0_0_10px_rgba(56,189,248,0.5)]'
                    : 'bg-[#ffcc00] text-black'
                  : isModern
                  ? 'text-cyan-300 hover:bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-[#d4af37] hover:bg-[#221c12] border border-[#d4af37]/30'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>★ Избранное ({starredCount})</span>
            </button>

            {onReprocessArticles && (
              <button
                onClick={() => {
                  onReprocessArticles();
                  onPlaySound?.('click');
                }}
                disabled={isRefreshing || articles.length === 0}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] transition cursor-pointer font-bold disabled:opacity-40 disabled:cursor-not-allowed uppercase font-mono shadow-sm ${
                  isModern
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                    : 'bg-[#ffcc00] text-black hover:bg-[#ffd633]'
                }`}
                title="Обработать текущие статьи с помощью AI согласно вашему промпту"
              >
                <Sparkles className="w-3 h-3 animate-pulse" />
                <span>Обработать выбранные AI</span>
              </button>
            )}

            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              BelkinDESK MED · RSS + LLM Pipeline
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
