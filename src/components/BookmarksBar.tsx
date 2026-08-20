import React, { useState } from 'react';
import { 
  Plus, 
  ExternalLink, 
  Settings2, 
  Bookmark, 
  Pin, 
  Sparkles,
  Globe,
  Kanban,
  FileText,
  Palette,
  Code2,
  Mail,
  FolderPlus,
  Compass
} from 'lucide-react';
import { DesktopBookmark } from '../types';

interface BookmarksBarProps {
  bookmarks: DesktopBookmark[];
  onOpenBookmark: (bookmark: DesktopBookmark) => void;
  onOpenManager: () => void;
  onQuickAdd: () => void;
}

export const BookmarksBar: React.FC<BookmarksBarProps> = ({
  bookmarks,
  onOpenBookmark,
  onOpenManager,
  onQuickAdd,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean)))];

  const filteredBookmarks = bookmarks.filter((b) => {
    if (activeCategory === 'all') return true;
    return b.category === activeCategory;
  });

  const getBookmarkIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'github':
      case 'code':
      case 'code2':
        return <Code2 className="w-3.5 h-3.5" />;
      case 'kanban':
      case 'jira':
        return <Kanban className="w-3.5 h-3.5" />;
      case 'figma':
      case 'palette':
        return <Palette className="w-3.5 h-3.5" />;
      case 'notion':
      case 'filetext':
      case 'doc':
        return <FileText className="w-3.5 h-3.5" />;
      case 'mail':
        return <Mail className="w-3.5 h-3.5" />;
      case 'sparkles':
      case 'ai':
        return <Sparkles className="w-3.5 h-3.5" />;
      default:
        return <Globe className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="h-10 bg-slate-900/95 border-b border-slate-800/80 px-3 flex items-center justify-between gap-3 text-xs select-none shrink-0 overflow-x-auto scrollbar-none z-20">
      {/* Category Tabs & Quick Links */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
        <div className="flex items-center gap-1 text-slate-400 font-medium mr-1 text-[11px] shrink-0">
          <Bookmark className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Закладки:</span>
        </div>

        {/* Filter categories if more than 1 */}
        {categories.length > 2 && (
          <div className="flex items-center gap-1 mr-2 border-r border-slate-800 pr-2 shrink-0">
            {categories.slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {cat === 'all' ? 'Все' : cat}
              </button>
            ))}
          </div>
        )}

        {/* Bookmark Items */}
        <div className="flex items-center gap-1 shrink-0">
          {filteredBookmarks.map((bm) => {
            return (
              <a
                key={bm.id}
                href={bm.url}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => onOpenBookmark(bm)}
                className="group flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/60 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/50 hover:border-amber-500/40 transition cursor-pointer shadow-xs max-w-[160px]"
                title={`${bm.title} — ${bm.url}\n${bm.description || ''}`}
              >
                <span
                  className="shrink-0 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform"
                  style={{ color: bm.color || '#f59e0b' }}
                >
                  {getBookmarkIcon(bm.icon)}
                </span>
                <span className="truncate font-medium text-[11px]">{bm.title}</span>
                {bm.isPinned && (
                  <Pin className="w-2.5 h-2.5 text-amber-400/70 shrink-0 rotate-45" />
                )}
              </a>
            );
          })}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-1.5 shrink-0 pl-2">
        <button
          id="btn-quick-add-bookmark"
          onClick={onQuickAdd}
          className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 transition cursor-pointer"
          title="Добавить новую закладку"
        >
          <Plus className="w-3 h-3" />
          <span className="hidden md:inline">Добавить</span>
        </button>

        <button
          id="btn-manage-bookmarks"
          onClick={onOpenManager}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
          title="Управление всеми закладками"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
