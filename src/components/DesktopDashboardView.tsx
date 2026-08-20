import React from 'react';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  Bookmark, 
  Radio, 
  Play, 
  Pause, 
  Coffee, 
  CheckCircle2, 
  Circle, 
  ExternalLink, 
  Plus, 
  Flame, 
  Sparkles, 
  ChevronRight,
  Briefcase,
  Home,
  ShieldAlert,
  Palmtree,
  ArrowRight
} from 'lucide-react';
import { UserProfile, Article, DesktopBookmark, CalendarEvent, WorkDaySchedule } from '../types';

interface DesktopDashboardViewProps {
  currentUser: UserProfile;
  articles: Article[];
  onSwitchView: (view: 'news-reader' | 'work-calendar' | 'timer-desk') => void;
  onSelectArticle: (article: Article) => void;
  onOpenBookmark: (bookmark: DesktopBookmark) => void;
  onOpenBookmarksManager: () => void;
  onToggleEventComplete: (id: string) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
  onOpenAddFeed: () => void;
}

export const DesktopDashboardView: React.FC<DesktopDashboardViewProps> = ({
  currentUser,
  articles,
  onSwitchView,
  onSelectArticle,
  onOpenBookmark,
  onOpenBookmarksManager,
  onToggleEventComplete,
  onPlaySound,
  onOpenAddFeed,
}) => {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const todaySchedule = (currentUser.workSchedules || {})[todayStr] || {
    date: todayStr,
    shiftType: 'work-office',
    startTime: '09:00',
    endTime: '18:00',
  };

  const todayEvents = (currentUser.calendarEvents || []).filter((ev) => ev.date === todayStr);
  const unreadArticles = articles.filter((a) => !a.isRead).slice(0, 6);
  const pinnedBookmarks = (currentUser.bookmarks || []).filter((b) => b.isPinned);

  const getShiftBadge = (type: string) => {
    switch (type) {
      case 'work-remote':
        return { label: '🏠 Удаленный день', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
      case 'day-off':
        return { label: '☕ Выходной день', class: 'bg-slate-700/40 text-slate-400 border-slate-700' };
      case 'vacation':
        return { label: '🏖️ Отпуск', class: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
      case 'duty':
        return { label: '🚨 Дежурство', class: 'bg-red-500/20 text-red-300 border-red-500/30' };
      case 'work-office':
      default:
        return { label: '🏢 Работа в офисе', class: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
    }
  };

  const shiftInfo = getShiftBadge(todaySchedule.shiftType);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 sm:p-6 select-none font-sans">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Top Desktop Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest font-mono">
                Рабочий стол пользователя
              </span>
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${shiftInfo.class}`}>
                {shiftInfo.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-mono tracking-tight">
              Добрый день, {currentUser.displayName}! 👋
            </h1>
            <p className="text-xs text-slate-400">
              Сегодня {today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })} • {todaySchedule.startTime || '09:00'} - {todaySchedule.endTime || '18:00'}
            </p>
          </div>

          {/* Quick Hub Navigation Buttons */}
          <div className="flex items-center gap-2.5 z-10">
            <button
              onClick={() => onSwitchView('timer-desk')}
              className="px-3.5 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition cursor-pointer shadow flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4" />
              <span>Таймеры дня</span>
            </button>

            <button
              onClick={() => onSwitchView('work-calendar')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Календарь и график</span>
            </button>

            <button
              onClick={() => onSwitchView('news-reader')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition cursor-pointer border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <Radio className="w-4 h-4 text-orange-400" />
              <span>Ленты RSS</span>
            </button>
          </div>
        </div>

        {/* 3-Column Desktop Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* COLUMN 1: WORK TIMERS & BOOKMARKS */}
          <div className="space-y-6">
            {/* Quick Work Shift Card */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Учёт рабочего времени
                </span>
                <button
                  onClick={() => onSwitchView('timer-desk')}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  Подробнее <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-400">График на сегодня</div>
                  <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                    {todaySchedule.startTime || '09:00'} — {todaySchedule.endTime || '18:00'} (8ч)
                  </div>
                </div>
                <button
                  onClick={() => onSwitchView('timer-desk')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition cursor-pointer flex items-center gap-1"
                >
                  <Play className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Старт</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Цель на день: 8 часов</span>
                <span className="text-emerald-400 font-medium">Норма готова</span>
              </div>
            </div>

            {/* Bookmarks Quick Dock */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  Быстрые закладки
                </span>
                <button
                  onClick={onOpenBookmarksManager}
                  className="text-[11px] text-amber-400 hover:underline"
                >
                  Настроить
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {pinnedBookmarks.map((bm) => (
                  <a
                    key={bm.id}
                    href={bm.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={() => onOpenBookmark(bm)}
                    className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition flex items-center gap-2 group cursor-pointer text-xs"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: bm.color || '#f59e0b' }}
                    />
                    <span className="font-medium text-slate-200 truncate group-hover:text-amber-300">
                      {bm.title}
                    </span>
                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 ml-auto shrink-0 opacity-0 group-hover:opacity-100" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 2: TODAY'S AGENDA & TASKS */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-blue-400" />
                  План и встречи на сегодня ({todayEvents.length})
                </span>
                <button
                  onClick={() => onSwitchView('work-calendar')}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
                >
                  Календарь <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {todayEvents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                  <span>Событий на сегодня нет.</span>
                  <button
                    onClick={() => onSwitchView('work-calendar')}
                    className="mt-2 text-amber-400 hover:underline font-semibold"
                  >
                    + Добавить событие
                  </button>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto">
                  {todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5 text-xs hover:border-slate-700 transition"
                    >
                      <button
                        onClick={() => {
                          onToggleEventComplete(ev.id);
                          onPlaySound?.('click');
                        }}
                        className="mt-0.5 text-slate-400 hover:text-amber-400 cursor-pointer shrink-0"
                      >
                        {ev.isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold truncate ${
                              ev.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                            }`}
                          >
                            {ev.title}
                          </span>
                          {ev.priority === 'critical' && (
                            <span className="px-1 py-0.2 rounded text-[9px] bg-red-500/20 text-red-400 border border-red-500/30">
                              Срочно
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1 font-mono">
                          {ev.time && <span className="text-amber-400">{ev.time}</span>}
                          <span className="capitalize text-slate-500">{ev.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: LATEST NEWS STREAM */}
          <div className="space-y-6">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-md space-y-3 h-full flex flex-col">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 font-mono flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-orange-400" />
                  Свежие новости и сайты ({unreadArticles.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onOpenAddFeed}
                    className="p-1 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition cursor-pointer flex items-center gap-1"
                    title="Добавить новый сайт или источник"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </button>
                  <button
                    onClick={() => onSwitchView('news-reader')}
                    className="text-[11px] text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    Все новости <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
                {unreadArticles.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Нет непрочитанных новостей
                  </div>
                ) : (
                  unreadArticles.map((art, idx) => (
                    <div
                      key={`${art.id}-${idx}`}
                      onClick={() => {
                        onSelectArticle(art);
                        onSwitchView('news-reader');
                      }}
                      className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 hover:bg-slate-900 transition cursor-pointer text-xs group"
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 font-mono mb-1">
                        <span className="truncate max-w-[120px]">{art.feedTitle}</span>
                        <span>•</span>
                        <span>{art.pubDate ? new Date(art.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      </div>
                      <h4 className="font-semibold text-slate-200 group-hover:text-amber-300 line-clamp-2 leading-tight">
                        {art.title}
                      </h4>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
