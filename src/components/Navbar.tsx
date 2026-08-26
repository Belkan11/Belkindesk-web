import React, { useState } from 'react';
import { 
  Radio, 
  Sparkles, 
  Plus, 
  RotateCw, 
  Columns2, 
  LayoutGrid, 
  List, 
  Columns3, 
  SlidersHorizontal, 
  User, 
  MessageSquareQuote, 
  CheckCheck,
  ChevronDown,
  Calendar,
  Clock,
  LayoutDashboard,
  Bookmark,
  Coffee,
  Play
} from 'lucide-react';
import { UserProfile, UserWorkspaceConfig } from '../types';

interface NavbarProps {
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  onSwitchUser: (userId: string) => void;
  onOpenUserCabinet: () => void;
  onOpenAddFeed: () => void;
  onOpenAIDigest: () => void;
  onOpenAIAsk: () => void;
  onOpenSettings: () => void;
  onRefreshAll: () => void;
  onMarkAllRead: () => void;
  isRefreshing: boolean;
  onUpdateConfig: (partial: Partial<UserWorkspaceConfig>) => void;
  unreadCount: number;
  onToggleBookmarksBar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allProfiles,
  onSwitchUser,
  onOpenUserCabinet,
  onOpenAddFeed,
  onOpenAIDigest,
  onOpenAIAsk,
  onOpenSettings,
  onRefreshAll,
  onMarkAllRead,
  isRefreshing,
  onUpdateConfig,
  unreadCount,
  onToggleBookmarksBar,
}) => {
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);

  const { layoutMode, activeDesktopView = 'news-reader', showBookmarksBar } = currentUser.workspaceConfig;

  const layoutIcons = {
    'split-reader': <Columns2 className="w-4 h-4" />,
    'cards-grid': <LayoutGrid className="w-4 h-4" />,
    'magazine-compact': <Columns3 className="w-4 h-4" />,
    'headlines-list': <List className="w-4 h-4" />,
  };

  const layoutLabels = {
    'split-reader': '3-Панельный ридер',
    'cards-grid': 'Сетка карточек',
    'magazine-compact': 'Журнал (компакт)',
    'headlines-list': 'Список заголовков',
  };

  return (
    <header className="h-14 border-b border-slate-700/60 bg-slate-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between select-none z-30 shrink-0 gap-2">
      {/* Left: Brand & Main Navigation Mode Switcher */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-orange-500 to-indigo-600 flex items-center justify-center shadow-md shadow-orange-500/20 text-white font-bold text-base shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-slate-100 tracking-tight text-sm sm:text-base font-mono">PulseDesk</span>
              <span className="text-[9px] uppercase font-semibold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PRO
              </span>
            </div>
          </div>
        </div>

        {/* Workstation View Tabs */}
        <nav className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/90 gap-0.5">
          <button
            id="nav-tab-news"
            onClick={() => onUpdateConfig({ activeDesktopView: 'news-reader' })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeDesktopView === 'news-reader'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Ленты RSS и материалы подписок"
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Ленты RSS</span>
            {unreadCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                activeDesktopView === 'news-reader' ? 'bg-slate-950 text-amber-400' : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              }`}>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-calendar"
            onClick={() => onUpdateConfig({ activeDesktopView: 'work-calendar' })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeDesktopView === 'work-calendar'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Календарь, график смен и дедлайны"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Календарь & График</span>
          </button>

          <button
            id="nav-tab-timer"
            onClick={() => onUpdateConfig({ activeDesktopView: 'timer-desk' })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeDesktopView === 'timer-desk'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Таймер смены и Pomodoro"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Таймер дня</span>
          </button>

          <button
            id="nav-tab-hub"
            onClick={() => onUpdateConfig({ activeDesktopView: 'desktop-hub' })}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeDesktopView === 'desktop-hub'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
            title="Общий рабочий стол и дашборд"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Рабочий стол</span>
          </button>
        </nav>
      </div>

      {/* Right: Actions, AI Buttons, Settings & Profile */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Toggle Bookmarks Toolbar */}
        <button
          id="btn-nav-toggle-bookmarks"
          onClick={() => {
            if (onToggleBookmarksBar) onToggleBookmarksBar();
            else onUpdateConfig({ showBookmarksBar: !showBookmarksBar });
          }}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            showBookmarksBar
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'text-slate-400 border-slate-700/60 hover:text-slate-200 hover:bg-slate-800'
          }`}
          title={showBookmarksBar ? 'Скрыть панель закладок' : 'Показать панель закладок'}
        >
          <Bookmark className="w-4 h-4" />
        </button>

        {/* Gemini AI Hub Buttons (only when in news reader or hub) */}
        <button
          id="btn-nav-ai-digest"
          onClick={onOpenAIDigest}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-500/30 hover:border-indigo-400 transition cursor-pointer shadow-xs"
          title="Сгенерировать сводку главных новостей дня с помощью Gemini"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden lg:inline">AI Дайджест</span>
        </button>

        <button
          id="btn-nav-ai-ask"
          onClick={onOpenAIAsk}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-purple-950/40 text-purple-200 border border-purple-800/60 hover:bg-purple-900/50 hover:border-purple-600 transition cursor-pointer"
          title="Спросить ИИ по материалам ваших подписок"
        >
          <MessageSquareQuote className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden xl:inline">Спросить ленты</span>
        </button>

        {/* Add Feed Button */}
        <button
          id="btn-nav-add-feed"
          onClick={onOpenAddFeed}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-slate-950 hover:bg-amber-400 active:scale-95 transition cursor-pointer shadow-xs font-sans"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span className="hidden sm:inline">Источник</span>
        </button>

        {/* UI Style Switchers */}
        <div className="flex items-center gap-1 bg-slate-950/40 p-0.5 rounded-lg border border-slate-700/50 backdrop-blur-sm">
          <button
            id="btn-style-classic"
            onClick={() => onUpdateConfig({ layoutMode: 'split-reader' })}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all border ${
              layoutMode === 'split-reader'
                ? 'text-amber-400 bg-slate-800/80 border-amber-500/30'
                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800/60 border-transparent hover:border-amber-500/30'
            }`}
          >
            Classic
          </button>
          <button
            id="btn-style-modern"
            onClick={() => onUpdateConfig({ layoutMode: 'cards-grid' })}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all border ${
              layoutMode === 'cards-grid'
                ? 'text-cyan-100 bg-cyan-950/40 border-cyan-400/50 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                : 'text-cyan-200 bg-cyan-950/20 backdrop-blur-md border-cyan-500/30 shadow-[0_0_10px_rgba(34,211,238,0.2)] hover:bg-cyan-950/40 hover:text-cyan-100 hover:border-cyan-400/50'
            }`}
          >
            Modern
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-700/60 mx-0.5 hidden sm:block"></div>

        {/* Refresh button */}
        <button
          id="btn-nav-refresh-all"
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className={`p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer ${
            isRefreshing ? 'animate-spin text-amber-400' : ''
          }`}
          title="Обновить все ленты"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Mark All Read */}
        <button
          id="btn-nav-mark-all-read"
          onClick={onMarkAllRead}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Отметить все как прочитанные"
        >
          <CheckCheck className="w-4 h-4" />
        </button>

        {/* Layout Switcher Dropdown (active when in news mode) */}
        {activeDesktopView === 'news-reader' && (
          <div className="relative">
            <button
              id="btn-nav-layout-menu"
              onClick={() => setLayoutDropdownOpen(!layoutDropdownOpen)}
              className="flex items-center gap-1 p-1.5 px-2 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer border border-slate-700/40"
              title="Сменить раскладку новостей"
            >
              {layoutIcons[layoutMode]}
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {layoutDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
                <div className="px-3 py-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                  Раскладка ленты
                </div>
                {(['split-reader', 'cards-grid', 'magazine-compact', 'headlines-list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      onUpdateConfig({ layoutMode: mode });
                      setLayoutDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-700 transition cursor-pointer ${
                      layoutMode === mode ? 'text-amber-400 font-medium bg-slate-700/50' : 'text-slate-200'
                    }`}
                  >
                    {layoutIcons[mode]}
                    <span>{layoutLabels[mode]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Workspace Settings */}
        <button
          id="btn-nav-settings"
          onClick={onOpenSettings}
          className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          title="Параметры рабочего стола"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>

        <div className="h-5 w-[1px] bg-slate-700/60 mx-0.5"></div>

        {/* User Account / Cabinet Switcher */}
        <div className="relative">
          <button
            id="btn-nav-user-profile"
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-1.5 sm:gap-2 p-1 sm:pr-2 rounded-lg hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer text-xs"
          >
            <img
              src={currentUser.avatar}
              alt={currentUser.displayName}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-500/40"
              referrerPolicy="no-referrer"
            />
            <span className="hidden sm:inline font-medium text-slate-200 max-w-[100px] truncate">
              {currentUser.displayName}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs animate-scale-up">
              <div className="px-3 py-2 border-b border-slate-700/60 mb-1">
                <div className="font-semibold text-slate-100">{currentUser.displayName}</div>
                <div className="text-slate-400 text-[11px] truncate">{currentUser.email}</div>
              </div>

              {/* Only show profile switcher to admin */}
              {currentUser.role === 'admin' && (
                <>
                  <div className="px-3 py-1 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
                    Переключить личный кабинет
                  </div>

                  {allProfiles.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSwitchUser(p.id);
                        setUserDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-slate-700 transition cursor-pointer ${
                        p.id === currentUser.id ? 'bg-amber-500/10 text-amber-300 font-medium' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <img src={p.avatar} alt="" className="w-5 h-5 rounded-full object-cover" referrerPolicy="no-referrer" />
                        <span className="truncate">{p.displayName}</span>
                      </div>
                      {p.id === currentUser.id && <span className="text-[10px] text-amber-400 font-semibold">Активен</span>}
                    </button>
                  ))}
                </>
              )}

              <div className="border-t border-slate-700/60 mt-1 pt-1">
                <button
                  onClick={() => {
                    onOpenUserCabinet();
                    setUserDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer font-medium"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>Управление кабинетами & Профиль</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
