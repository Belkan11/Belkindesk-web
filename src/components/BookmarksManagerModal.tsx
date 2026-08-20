import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Edit3, 
  Trash2, 
  Pin, 
  ExternalLink, 
  Globe, 
  Check, 
  Bookmark,
  Sparkles,
  Code2,
  Kanban,
  FileText,
  Palette,
  Mail,
  Search
} from 'lucide-react';
import { DesktopBookmark } from '../types';

interface BookmarksManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: DesktopBookmark[];
  onSaveBookmark: (bookmark: DesktopBookmark) => void;
  onDeleteBookmark: (id: string) => void;
  onTogglePin: (id: string) => void;
}

const AVAILABLE_ICONS = [
  { id: 'Globe', label: 'Веб', icon: Globe },
  { id: 'Code2', label: 'Код / GitHub', icon: Code2 },
  { id: 'Kanban', label: 'Jira / Задачи', icon: Kanban },
  { id: 'FileText', label: 'Документы', icon: FileText },
  { id: 'Palette', label: 'Дизайн / Figma', icon: Palette },
  { id: 'Mail', label: 'Почта', icon: Mail },
  { id: 'Sparkles', label: 'ИИ / Gemini', icon: Sparkles },
];

const PRESET_COLORS = [
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#ec4899', // Pink
  '#ef4444', // Red
  '#06b6d4', // Cyan
  '#64748b', // Slate
];

export const BookmarksManagerModal: React.FC<BookmarksManagerModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSaveBookmark,
  onDeleteBookmark,
  onTogglePin,
}) => {
  const [editingBookmark, setEditingBookmark] = useState<Partial<DesktopBookmark> | null>(null);
  const [search, setSearch] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  if (!isOpen) return null;

  const categories = ['all', ...Array.from(new Set(bookmarks.map((b) => b.category).filter(Boolean)))];

  const filteredBookmarks = bookmarks.filter((b) => {
    if (activeCategoryFilter !== 'all' && b.category !== activeCategoryFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStartCreate = () => {
    setEditingBookmark({
      id: `bm-${Date.now()}`,
      title: '',
      url: 'https://',
      category: 'Разработка',
      icon: 'Globe',
      color: '#f59e0b',
      isPinned: true,
      clickCount: 0,
      description: '',
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBookmark || !editingBookmark.title?.trim() || !editingBookmark.url?.trim()) {
      return;
    }

    let normalizedUrl = editingBookmark.url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }

    onSaveBookmark({
      id: editingBookmark.id || `bm-${Date.now()}`,
      title: editingBookmark.title.trim(),
      url: normalizedUrl,
      category: editingBookmark.category?.trim() || 'Общие',
      icon: editingBookmark.icon || 'Globe',
      color: editingBookmark.color || '#f59e0b',
      isPinned: !!editingBookmark.isPinned,
      clickCount: editingBookmark.clickCount || 0,
      description: editingBookmark.description?.trim() || '',
    });

    setEditingBookmark(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-2xl h-[650px] max-h-[88vh] bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-mono">Панель закладок рабочего стола</h2>
              <p className="text-xs text-slate-400">Быстрый доступ к рабочим сервисам, репозиториям и порталам</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* If Editing/Creating Form is Open */}
          {editingBookmark ? (
            <form onSubmit={handleSaveForm} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="text-sm font-semibold text-amber-300">
                  {bookmarks.some((b) => b.id === editingBookmark.id) ? 'Редактирование закладки' : 'Новая закладка'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingBookmark(null)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Отмена
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Название закладки *</label>
                  <input
                    type="text"
                    required
                    value={editingBookmark.title || ''}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, title: e.target.value })}
                    placeholder="Например: GitHub Repos"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Категория</label>
                  <input
                    type="text"
                    value={editingBookmark.category || ''}
                    onChange={(e) => setEditingBookmark({ ...editingBookmark, category: e.target.value })}
                    placeholder="Разработка, Задачи, Дизайн..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Ссылка (URL) *</label>
                <input
                  type="text"
                  required
                  value={editingBookmark.url || ''}
                  onChange={(e) => setEditingBookmark({ ...editingBookmark, url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Краткое описание (опционально)</label>
                <input
                  type="text"
                  value={editingBookmark.description || ''}
                  onChange={(e) => setEditingBookmark({ ...editingBookmark, description: e.target.value })}
                  placeholder="Назначение ссылки или комментарий..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Icon & Color selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Иконка</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_ICONS.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = editingBookmark.icon === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setEditingBookmark({ ...editingBookmark, icon: item.id })}
                          className={`p-2 rounded-lg border flex items-center gap-1 text-xs transition cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                          }`}
                          title={item.label}
                        >
                          <IconComp className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-2">Цветовой акцент</label>
                  <div className="flex items-center gap-2">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditingBookmark({ ...editingBookmark, color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition cursor-pointer ${
                          editingBookmark.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110' : 'opacity-80 hover:opacity-100'
                        }`}
                      >
                        {editingBookmark.color === c && <Check className="w-3.5 h-3.5 text-white drop-shadow" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pin checkbox */}
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={!!editingBookmark.isPinned}
                  onChange={(e) => setEditingBookmark({ ...editingBookmark, isPinned: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900"
                />
                <span>Закрепить на верхней панели быстрого доступа</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBookmark(null)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition shadow"
                >
                  Сохранить закладку
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Controls bar: search, category, create */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Поиск по закладкам..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={activeCategoryFilter}
                    onChange={(e) => setActiveCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-950/70 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c === 'all' ? 'Все категории' : c}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={handleStartCreate}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition cursor-pointer shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать</span>
                  </button>
                </div>
              </div>

              {/* Bookmarks List */}
              <div className="space-y-2">
                {filteredBookmarks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Закладки не найдены. Нажмите «Создать», чтобы добавить первую!
                  </div>
                ) : (
                  filteredBookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${bm.color || '#f59e0b'}20`, color: bm.color || '#f59e0b' }}
                        >
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <a
                              href={bm.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="text-sm font-semibold text-slate-200 hover:text-amber-400 transition truncate flex items-center gap-1"
                            >
                              {bm.title}
                              <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                            </a>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                              {bm.category}
                            </span>
                            {bm.isPinned && (
                              <span className="flex items-center gap-0.5 text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                <Pin className="w-2.5 h-2.5 rotate-45" /> Закреплено
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{bm.url}</p>
                          {bm.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">{bm.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => onTogglePin(bm.id)}
                          className={`p-1.5 rounded hover:bg-slate-800 transition cursor-pointer ${
                            bm.isPinned ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                          }`}
                          title={bm.isPinned ? 'Открепить' : 'Закрепить на панели'}
                        >
                          <Pin className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingBookmark(bm)}
                          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition cursor-pointer"
                          title="Редактировать"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteBookmark(bm.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
