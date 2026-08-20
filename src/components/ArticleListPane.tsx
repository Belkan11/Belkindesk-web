import React from 'react';
import { 
  Search, 
  Star, 
  Bookmark, 
  Check, 
  Clock, 
  ExternalLink, 
  Sparkles, 
  Filter, 
  SortDesc, 
  Layers, 
  Flame,
  Tag
} from 'lucide-react';
import { Article, UserWorkspaceConfig } from '../types';

interface ArticleListPaneProps {
  articles: Article[];
  selectedArticleId: string | null;
  onSelectArticle: (article: Article) => void;
  onToggleStar: (articleId: string, e: React.MouseEvent) => void;
  onToggleRead: (articleId: string, e: React.MouseEvent) => void;
  onToggleSaved: (articleId: string, e: React.MouseEvent) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  config: UserWorkspaceConfig;
  feedTitle?: string;
  isLoading: boolean;
}

export const ArticleListPane: React.FC<ArticleListPaneProps> = ({
  articles,
  selectedArticleId,
  onSelectArticle,
  onToggleStar,
  onToggleRead,
  onToggleSaved,
  searchQuery,
  onSearchChange,
  config,
  feedTitle = 'Все публикации',
  isLoading,
}) => {
  const { layoutMode, keywordHighlights = [] } = config;

  const isHighlighted = (text: string) => {
    if (!text || keywordHighlights.length === 0) return false;
    return keywordHighlights.some((kw) => text.toLowerCase().includes(kw.toLowerCase()));
  };

  return (
    <section className={`flex flex-col h-full bg-slate-950/60 overflow-hidden ${
      layoutMode === 'split-reader' ? 'w-96 border-r border-slate-700/60 shrink-0' : 'flex-1'
    }`}>
      {/* Top Search & Filter Header */}
      <div className="p-3 border-b border-slate-800 bg-slate-900/60 space-y-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <h2 className="text-sm font-bold text-slate-100 truncate">{feedTitle}</h2>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {articles.length}
            </span>
          </div>
          {isLoading && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              <span className="font-mono">Синхронизация...</span>
            </div>
          )}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск по заголовкам, авторам, ключевым словам..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-800/80 border border-slate-700/80 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition"
          />
        </div>
      </div>

      {/* Article List Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {articles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
            <Layers className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-400">Публикаций пока нет</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              {searchQuery ? 'По вашему поисковому запросу ничего не найдено' : 'Проверьте фильтры или нажмите кнопку синхронизации вверху'}
            </p>
          </div>
        ) : layoutMode === 'cards-grid' ? (
          /* Cards Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-1">
            {articles.map((art, idx) => {
              const isSelected = selectedArticleId === art.id;
              const highlighted = isHighlighted(art.title) || isHighlighted(art.contentSnippet);

              return (
                <article
                  key={`${art.id}-${idx}`}
                  id={`article-card-${art.id}-${idx}`}
                  onClick={() => onSelectArticle(art)}
                  className={`group relative flex flex-col bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:border-amber-500/50 hover:shadow-lg ${
                    isSelected ? 'border-amber-500 ring-1 ring-amber-500/50 shadow-md' : 'border-slate-800/90'
                  } ${art.isRead ? 'opacity-75' : 'opacity-100'}`}
                >
                  {/* Card Cover Image */}
                  {art.imageUrl && (
                    <div className="h-36 w-full bg-slate-800 overflow-hidden relative">
                      <img
                        src={art.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                      <span className="absolute bottom-2 left-2 text-[10px] font-semibold bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded text-amber-400 border border-slate-700">
                        {art.feedTitle}
                      </span>
                    </div>
                  )}

                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      {!art.imageUrl && (
                        <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold mb-1">
                          <span className="truncate">{art.feedTitle}</span>
                        </div>
                      )}

                      <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${
                        art.isRead ? 'text-slate-300' : 'text-slate-100'
                      } ${highlighted ? 'text-amber-200' : ''}`}>
                        {art.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-3 mt-1 leading-relaxed">
                        {art.contentSnippet}
                      </p>
                      {art.symptom && (
                        <div className="mt-2 text-[10px] bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 space-y-0.5">
                          <div className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span> Диагностика
                          </div>
                          <div className="text-[10px] text-slate-300 font-medium line-clamp-1">
                            {art.symptom}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer / Meta & Actions */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{art.pubDate}</span>
                      </span>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => onToggleStar(art.id, e)}
                          className={`p-1 rounded hover:bg-slate-800 transition ${
                            art.isStarred ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'
                          }`}
                          title="В избранное"
                        >
                          <Star className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => onToggleSaved(art.id, e)}
                          className={`p-1 rounded hover:bg-slate-800 transition ${
                            art.isSavedLater ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'
                          }`}
                          title="Читать позже"
                        >
                          <Bookmark className="w-3.5 h-3.5 fill-current" />
                        </button>
                        <button
                          onClick={(e) => onToggleRead(art.id, e)}
                          className={`p-1 rounded hover:bg-slate-800 transition ${
                            art.isRead ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                          }`}
                          title={art.isRead ? 'Отметить непрочитанным' : 'Отметить прочитанным'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : layoutMode === 'magazine-compact' ? (
          /* Magazine Compact Layout */
          <div className="space-y-2">
            {articles.map((art, idx) => {
              const isSelected = selectedArticleId === art.id;
              const highlighted = isHighlighted(art.title);

              return (
                <article
                  key={`${art.id}-${idx}`}
                  id={`article-mag-${art.id}-${idx}`}
                  onClick={() => onSelectArticle(art)}
                  className={`group flex items-start gap-3 p-2.5 bg-slate-900 border rounded-xl transition cursor-pointer hover:border-amber-500/40 ${
                    isSelected ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-800/80'
                  } ${art.isRead ? 'opacity-70' : 'opacity-100'}`}
                >
                  {art.imageUrl && (
                    <div className="w-20 h-20 bg-slate-800 rounded-lg overflow-hidden shrink-0">
                      <img src={art.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="font-semibold text-amber-400 truncate max-w-[200px]">
                          {art.feedTitle}
                        </span>
                        <span>{art.pubDate}</span>
                      </div>

                      <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${
                        art.isRead ? 'text-slate-300' : 'text-slate-100'
                      } ${highlighted ? 'text-amber-200' : ''}`}>
                        {art.title}
                      </h3>

                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {art.contentSnippet}
                      </p>
                      {art.symptom && (
                        <div className="mt-1.5 text-[10px] bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 space-y-0.5">
                          <div className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span> Диагностика
                          </div>
                          <div className="text-[10px] text-slate-300 font-medium line-clamp-1">
                            {art.symptom}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-1 text-[10px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        {art.categories?.slice(0, 2).map((c, i) => (
                          <span key={i} className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono text-[9px]">
                            #{c}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => onToggleStar(art.id, e)}
                          className={`p-1 rounded hover:bg-slate-800 ${art.isStarred ? 'text-yellow-400' : 'text-slate-500'}`}
                        >
                          <Star className="w-3 h-3 fill-current" />
                        </button>
                        <button
                          onClick={(e) => onToggleSaved(art.id, e)}
                          className={`p-1 rounded hover:bg-slate-800 ${art.isSavedLater ? 'text-blue-400' : 'text-slate-500'}`}
                        >
                          <Bookmark className="w-3 h-3 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : layoutMode === 'headlines-list' ? (
          /* Ultra Dense Headlines List */
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/80 divide-y divide-slate-800/80">
            {articles.map((art, idx) => {
              const isSelected = selectedArticleId === art.id;

              return (
                <div
                  key={`${art.id}-${idx}`}
                  id={`article-row-${art.id}-${idx}`}
                  onClick={() => onSelectArticle(art)}
                  className={`group flex items-center justify-between px-3 py-2 text-xs transition cursor-pointer hover:bg-slate-800/60 ${
                    isSelected ? 'bg-amber-500/15 text-amber-200' : art.isRead ? 'text-slate-400' : 'text-slate-100 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${art.isRead ? 'bg-slate-700' : 'bg-amber-400'}`}></span>
                    <span className="text-[10px] font-semibold text-amber-400/90 bg-slate-800 px-1.5 py-0.5 rounded shrink-0 border border-slate-700/60">
                      {art.feedTitle}
                    </span>
                    <span className="truncate">{art.title}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-500">
                    <span className="font-mono">{art.pubDate}</span>
                    <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => onToggleStar(art.id, e)}
                        className={`p-1 hover:text-yellow-400 ${art.isStarred ? 'text-yellow-400' : 'text-slate-500'}`}
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={(e) => onToggleRead(art.id, e)}
                        className={`p-1 hover:text-emerald-400 ${art.isRead ? 'text-emerald-400' : 'text-slate-500'}`}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Split Reader Middle List */
          <div className="space-y-1.5">
            {articles.map((art, idx) => {
              const isSelected = selectedArticleId === art.id;
              const highlighted = isHighlighted(art.title);

              return (
                <article
                  key={`${art.id}-${idx}`}
                  id={`article-split-${art.id}-${idx}`}
                  onClick={() => onSelectArticle(art)}
                  className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/60 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
                  } ${art.isRead ? 'opacity-70' : 'opacity-100'}`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${art.isRead ? 'bg-slate-700' : 'bg-amber-400'}`}></span>
                      <span className="font-semibold text-amber-400 truncate max-w-[160px]">
                        {art.feedTitle}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-slate-500 shrink-0">{art.pubDate}</span>
                  </div>

                  <h3 className={`text-xs font-bold leading-snug line-clamp-2 ${
                    art.isRead ? 'text-slate-300' : 'text-slate-100'
                  } ${highlighted ? 'text-amber-300' : ''}`}>
                    {art.title}
                  </h3>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {art.contentSnippet}
                  </p>
                  {art.symptom && (
                    <div className="mt-1.5 text-[10px] bg-amber-500/5 border border-amber-500/10 rounded-lg p-1.5 space-y-0.5">
                      <div className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse"></span> Диагностика
                      </div>
                      <div className="text-[10px] text-slate-300 font-medium line-clamp-1">
                        {art.symptom}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-800/60 text-[10px]">
                    <span className="text-slate-500 truncate max-w-[140px]">
                      {art.author || art.feedTitle}
                    </span>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => onToggleStar(art.id, e)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          art.isStarred ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'
                        }`}
                        title="Избранное"
                      >
                        <Star className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={(e) => onToggleSaved(art.id, e)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          art.isSavedLater ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'
                        }`}
                        title="Читать позже"
                      >
                        <Bookmark className="w-3 h-3 fill-current" />
                      </button>
                      <button
                        onClick={(e) => onToggleRead(art.id, e)}
                        className={`p-1 rounded hover:bg-slate-800 transition ${
                          art.isRead ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                        }`}
                        title={art.isRead ? 'Не прочитано' : 'Прочитано'}
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
