import React, { useState } from 'react';
import { 
  Inbox, 
  Sparkles, 
  Star, 
  Bookmark, 
  Folder, 
  FolderOpen, 
  Pin, 
  PinOff, 
  Rss, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown, 
  FileUp, 
  FileDown,
  AlertCircle,
  Hash,
  ExternalLink,
  Bot,
  Cpu,
  Orbit,
  TrendingUp,
  ShieldCheck,
  Gamepad2
} from 'lucide-react';
import { FeedConfig, UserProfile } from '../types';

interface SidebarFeedTreeProps {
  currentUser: UserProfile;
  activeFilter: 'all' | 'unread' | 'starred' | 'saved';
  activeCategory: string;
  activeFeedId: string | null;
  unreadCounts: Record<string, number>;
  totalUnread: number;
  totalStarred: number;
  totalSaved: number;
  onSelectFilter: (filter: 'all' | 'unread' | 'starred' | 'saved') => void;
  onSelectCategory: (cat: string) => void;
  onSelectFeed: (feedId: string | null) => void;
  onTogglePinFeed: (feedId: string) => void;
  onDeleteFeed: (feedId: string) => void;
  onOpenAddFeed: () => void;
  onExportOpml: () => void;
}

export const SidebarFeedTree: React.FC<SidebarFeedTreeProps> = ({
  currentUser,
  activeFilter,
  activeCategory,
  activeFeedId,
  unreadCounts,
  totalUnread,
  totalStarred,
  totalSaved,
  onSelectFilter,
  onSelectCategory,
  onSelectFeed,
  onTogglePinFeed,
  onDeleteFeed,
  onOpenAddFeed,
  onExportOpml,
}) => {
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategoryCollapse = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Group feeds by category
  const categoriesMap: Record<string, FeedConfig[]> = {};
  currentUser.feeds.forEach((feed) => {
    const cat = feed.category || 'Другое';
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(feed);
  });

  const pinnedFeeds = currentUser.feeds.filter((f) => f.isPinned);

  const getCategoryIcon = (name: string) => {
    if (name.includes('ИИ') || name.includes('AI')) return <Bot className="w-3.5 h-3.5 text-indigo-400" />;
    if (name.includes('Технолог') || name.includes('Разработк')) return <Cpu className="w-3.5 h-3.5 text-cyan-400" />;
    if (name.includes('Космос') || name.includes('Наук')) return <Orbit className="w-3.5 h-3.5 text-purple-400" />;
    if (name.includes('Финанс') || name.includes('Рынк')) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
    if (name.includes('Безопасн') || name.includes('Security')) return <ShieldCheck className="w-3.5 h-3.5 text-red-400" />;
    if (name.includes('Игр') || name.includes('Game')) return <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />;
    return <Folder className="w-3.5 h-3.5 text-slate-400" />;
  };

  return (
    <aside className="w-64 bg-slate-900/95 border-r border-slate-700/60 flex flex-col justify-between shrink-0 select-none text-slate-300 text-xs overflow-hidden h-full">
      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        
        {/* Prominent Add Feed Button */}
        <div className="px-1">
          <button
            onClick={onOpenAddFeed}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-md transition transform active:scale-95 cursor-pointer text-xs"
            title="Добавить новый источник"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Добавить источник</span>
          </button>
        </div>

        {/* Quick Filter Section */}
        <div className="space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
            Рабочий поток
          </div>

          <button
            id="nav-filter-all"
            onClick={() => onSelectFilter('all')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeFilter === 'all' && activeCategory === 'all' && activeFeedId === null
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-amber-400" />
              <span>Все публикации</span>
            </div>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {totalUnread}
              </span>
            )}
          </button>

          <button
            id="nav-filter-unread"
            onClick={() => onSelectFilter('unread')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeFilter === 'unread'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Непрочитанные</span>
            </div>
            {totalUnread > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {totalUnread}
              </span>
            )}
          </button>

          <button
            id="nav-filter-starred"
            onClick={() => onSelectFilter('starred')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeFilter === 'starred'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>Избранное</span>
            </div>
            {totalStarred > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                {totalStarred}
              </span>
            )}
          </button>

          <button
            id="nav-filter-saved"
            onClick={() => onSelectFilter('saved')}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer font-medium ${
              activeFilter === 'saved'
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Bookmark className="w-4 h-4 text-blue-400" />
              <span>Читать позже</span>
            </div>
            {totalSaved > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {totalSaved}
              </span>
            )}
          </button>
        </div>

        {/* Pinned Feeds Quick Access */}
        {pinnedFeeds.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 flex items-center gap-1">
              <Pin className="w-3 h-3 text-amber-400" />
              <span>Закрепленные ленты</span>
            </div>
            {pinnedFeeds.map((feed) => {
              const unread = unreadCounts[feed.id] || 0;
              const isSelected = activeFeedId === feed.id;
              return (
                <div
                  key={`pin-${feed.id}`}
                  onClick={() => onSelectFeed(feed.id)}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 font-medium'
                      : 'hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"></span>
                    <span className="truncate">{feed.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && (
                      <span className="text-[10px] px-1 bg-slate-800 text-amber-400 rounded font-semibold">
                        {unread}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinFeed(feed.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition"
                      title="Открепить"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Categories / Folders Tree */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Папки и источники
            </span>
            <button
              onClick={onOpenAddFeed}
              className="text-amber-400 hover:text-amber-300 p-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Добавить новый источник"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {Object.keys(categoriesMap).length === 0 ? (
            <div className="p-3 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              Нет подписок. Нажмите «+», чтобы добавить первую ленту!
            </div>
          ) : (
            Object.entries(categoriesMap).map(([categoryName, feeds]) => {
              const isCollapsed = !!collapsedCategories[categoryName];
              const categoryUnread = feeds.reduce((sum, f) => sum + (unreadCounts[f.id] || 0), 0);
              const isCategoryActive = activeCategory === categoryName && activeFeedId === null;

              return (
                <div key={categoryName} className="space-y-0.5">
                  {/* Category Header */}
                  <div
                    onClick={() => onSelectCategory(categoryName)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-lg transition cursor-pointer ${
                      isCategoryActive
                        ? 'bg-slate-800 text-amber-300 font-semibold'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <button
                        onClick={(e) => toggleCategoryCollapse(categoryName, e)}
                        className="p-0.5 text-slate-400 hover:text-white"
                      >
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {getCategoryIcon(categoryName)}
                      <span className="truncate font-medium">{categoryName}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {categoryUnread > 0 && (
                        <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded font-semibold border border-slate-700">
                          {categoryUnread}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sub-Feeds */}
                  {!isCollapsed && (
                    <div className="pl-4 space-y-0.5 border-l border-slate-800 ml-3">
                      {feeds.map((feed) => {
                        const isFeedActive = activeFeedId === feed.id;
                        const unread = unreadCounts[feed.id] || 0;

                        return (
                          <div
                            key={feed.id}
                            onClick={() => onSelectFeed(feed.id)}
                            className={`group flex items-center justify-between px-2 py-1 rounded-md transition cursor-pointer text-[11px] ${
                              isFeedActive
                                ? 'bg-amber-500/20 text-amber-200 font-medium'
                                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  feed.status === 'error'
                                    ? 'bg-rose-500'
                                    : feed.status === 'loading'
                                    ? 'bg-amber-400 animate-ping'
                                    : 'bg-emerald-500/80'
                                }`}
                              ></span>
                              <span className="truncate">{feed.name}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {unread > 0 && (
                                <span className="text-[10px] text-slate-400 group-hover:text-amber-400 font-mono">
                                  {unread}
                                </span>
                              )}
                              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTogglePinFeed(feed.id);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-amber-400 transition"
                                  title={feed.isPinned ? 'Открепить' : 'Закрепить'}
                                >
                                  <Pin className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteFeed(feed.id);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-rose-400 transition"
                                  title="Удалить подписку"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/70 space-y-2">
        <button
          onClick={onOpenAddFeed}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700/60 transition cursor-pointer text-xs"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span>Добавить сайт или источник</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span className="text-emerald-400 font-medium">Изолированные профили</span>

          <span className="text-amber-400 font-medium">Firebase Security</span>
        </div>
      </div>
    </aside>
  );
};
