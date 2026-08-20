import React, { useState } from 'react';
import { 
  Settings, 
  Minus, 
  Plus, 
  Square, 
  X, 
  Sparkles,
  User,
  ShieldCheck,
  LogOut,
  Clock,
  HelpCircle
} from 'lucide-react';
import { UserProfile, AppArchetypeStyle } from '../types';
import { useCityClock } from '../utils/timeZone';
import { InteractiveGuideModal } from './InteractiveGuideModal';

interface BelkinHeaderProps {
  activeTab: 'notes' | 'news';
  onChangeTab: (tab: 'notes' | 'news') => void;
  unreadNewsCount: number;
  onOpenSettings: () => void;
  currentUser?: UserProfile;
  appStyle?: AppArchetypeStyle;
  onSelectAppStyle?: (style: AppArchetypeStyle) => void;
  onOpenUserCabinet?: () => void;
  onOpenAuthModal?: () => void;
  onOpenAdminModal?: () => void;
  onLogout?: () => void;
  scalePercent: number;
  onToggleScale: () => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const BelkinHeader: React.FC<BelkinHeaderProps> = ({
  activeTab,
  onChangeTab,
  unreadNewsCount,
  onOpenSettings,
  currentUser,
  appStyle = 'classic',
  onSelectAppStyle,
  onOpenUserCabinet,
  onOpenAuthModal,
  onOpenAdminModal,
  onLogout,
  scalePercent,
  onToggleScale,
  onPlaySound,
}) => {
  const cityClock = useCityClock();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'belkin';
  const isModern = appStyle === 'modern';
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  return (
    <header 
      className={`h-11 px-3 flex items-center justify-between select-none text-xs font-mono shrink-0 z-20 transition-all duration-300 ${
        isModern
          ? 'bg-[#0a0f1d]/60 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
          : 'bg-[#0f1216] border-b border-[#2b2518]'
      }`}
    >
      {/* Group 1: Brand & Theme Style Switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 font-bold tracking-wider">
          <span className={`text-sm ${isModern ? 'text-[#ff3366] drop-shadow-[0_0_8px_rgba(255,51,102,0.6)] animate-pulse' : 'text-[#ff4d4d]'}`}>
            ♥
          </span>
          <span className={`tracking-wide font-sans font-bold text-xs sm:text-sm ${
            isModern 
              ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-sky-200 to-indigo-300 font-extrabold' 
              : 'text-slate-100'
          }`}>
            BELKIN DESK
          </span>
        </div>

        {/* Theme Style Selector Dots */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-800">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectAppStyle?.('classic');
              onPlaySound?.('click');
            }}
            className={`w-3.5 h-3.5 rounded flex items-center justify-center cursor-pointer transition-all ${
              !isModern
                ? 'bg-[#ffcc00] ring-2 ring-[#ffcc00]/70 shadow-[0_0_8px_rgba(255,204,0,0.6)] scale-105'
                : 'bg-[#ffcc00]/30 hover:bg-[#ffcc00]/70 border border-[#ffcc00]/50 opacity-60 hover:opacity-100'
            }`}
            title="Классический интерфейс: Тёмная янтарная палитра"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectAppStyle?.('modern');
              onPlaySound?.('click');
            }}
            className={`w-3.5 h-3.5 rotate-45 flex items-center justify-center cursor-pointer transition-all ${
              isModern
                ? 'bg-gradient-to-br from-cyan-400 to-indigo-500 border border-cyan-200 ring-2 ring-cyan-400/80 shadow-[0_0_10px_rgba(56,189,248,0.8)] scale-105'
                : 'border border-[#8b774b] bg-transparent hover:border-cyan-400 hover:bg-cyan-500/20 opacity-60 hover:opacity-100'
            }`}
            title="Современный интерфейс: Аврора Гласс"
          ></div>
        </div>
      </div>

      {/* Group 2: Navigation Tabs, Unread Badge & Guide */}
      <div className="flex items-center gap-2.5">
        <div className={`flex items-center rounded-lg p-0.5 border ${
          isModern 
            ? 'bg-[#080e1a]/70 border-cyan-500/30 backdrop-blur-md shadow-inner' 
            : 'bg-[#07090b] border-[#2b2518]'
        }`}>
          <button
            id="tab-notes"
            onClick={() => {
              onChangeTab('notes');
              onPlaySound?.('click');
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition cursor-pointer ${
              activeTab === 'notes'
                ? isModern
                  ? 'text-cyan-300 bg-cyan-500/20 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : 'text-[#ffcc00] bg-[#1a1710]/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ЗАМЕТКИ
          </button>

          <button
            id="tab-news"
            onClick={() => {
              onChangeTab('news');
              onPlaySound?.('click');
            }}
            className={`px-3 py-1 rounded-md text-xs font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'news'
                ? isModern
                  ? 'text-cyan-300 bg-cyan-500/20 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                  : 'text-[#ffcc00] bg-[#1a1710]/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>НОВОСТИ</span>
          </button>
        </div>

        {/* Unread badge pill */}
        <div 
          onClick={() => {
            onChangeTab('news');
            onPlaySound?.('click');
          }}
          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] cursor-pointer shadow-sm hover:brightness-110 tracking-tight transition ${
            isModern
              ? 'bg-gradient-to-r from-rose-500 to-indigo-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]'
              : 'bg-[#ef4444] text-white'
          }`}
          title="Непрочитанные новости и статьи"
        >
          {unreadNewsCount > 99 ? '99+' : unreadNewsCount || '99+'}
        </div>

        {/* Interactive Guide Button */}
        <button
          id="btn-interactive-guide"
          onClick={() => {
            setIsGuideOpen(true);
            onPlaySound?.('success');
          }}
          className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase cursor-pointer transition border shrink-0 ${
            isModern
              ? 'bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
              : 'bg-[#ffcc00]/10 hover:bg-[#ffcc00]/25 border-[#ffcc00]/50 text-[#ffcc00]'
          }`}
          title="Гид по интерфейсу"
        >
          <HelpCircle className="w-3 h-3" />
          <span>ГИД</span>
        </button>
      </div>

      {/* Group 3: User Profile, Time, Settings & Window Controls */}
      <div className="flex items-center gap-1.5">
        {/* Admin Panel Button */}
        {isAdmin && (
          <button
            id="btn-admin-panel"
            onClick={() => {
              onOpenAdminModal?.();
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer shadow-sm border ${
              isModern
                ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-300'
                : 'bg-[#ffcc00]/15 hover:bg-[#ffcc00]/25 border-[#ffcc00]/50 text-[#ffcc00]'
            }`}
            title="Панель Администратора"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Админ</span>
          </button>
        )}

        {/* Minimal City Time Clock (Location & timezone omitted for space saving) */}
        <div
          onClick={() => {
            onOpenSettings();
            onPlaySound?.('click');
          }}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg cursor-pointer transition border ${
            isModern
              ? 'bg-[#0d172a]/60 border-cyan-500/30 text-cyan-300 hover:border-cyan-400'
              : 'bg-[#151921] border-[#ffcc00]/30 text-[#ffcc00] hover:border-[#ffcc00]'
          }`}
          title={`Текущее время (${cityClock.city}, ${cityClock.utcOffsetStr}). Кликните для настроек.`}
        >
          <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
          <span className="font-mono font-bold text-xs tabular-nums">
            {cityClock.timeStr}
          </span>
        </div>

        {/* User Account Pill */}
        <button
          id="btn-user-profile-header"
          type="button"
          onClick={() => {
            onOpenUserCabinet?.();
            onPlaySound?.('click');
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer border ${
            isModern
              ? 'bg-[#0d172a]/60 hover:bg-[#15233e]/80 border-indigo-500/40 hover:border-cyan-400 text-slate-200'
              : 'bg-[#161a22] hover:bg-[#202733] border-[#2d3748] hover:border-[#ffcc00]/60 text-slate-200'
          }`}
          title={`Личный профиль: ${currentUser?.displayName || currentUser?.username}`}
        >
          {currentUser?.avatar ? (
            <img
              src={currentUser.avatar}
              alt=""
              className={`w-4 h-4 rounded-full object-cover ring-1 ${isModern ? 'ring-cyan-400' : 'ring-[#ffcc00]'}`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className={`w-3.5 h-3.5 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
          )}
          <span className="text-[11px] font-bold text-white max-w-[90px] truncate hidden md:inline font-mono">
            {currentUser?.displayName || currentUser?.username || 'Врач'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
        </button>

        {/* Settings Gear */}
        <button
          id="btn-control-center"
          onClick={() => {
            onOpenSettings();
            onPlaySound?.('click');
          }}
          className={`p-1.5 rounded-lg border transition cursor-pointer ${
            isModern 
              ? 'border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/50' 
              : 'border-[#2b2518] bg-[#14171f] text-slate-300 hover:text-[#ffcc00] hover:border-[#ffcc00]/50'
          }`}
          title="Центр управления & Настройки"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className={`h-4 w-[1px] mx-0.5 ${isModern ? 'bg-cyan-500/30' : 'bg-[#2b2518]'}`}></div>

        {/* Window Scale & Action Controls */}
        <div className="flex items-center gap-1">
          <button
            id="btn-scale-minus"
            onClick={() => {
              if (scalePercent > 100) onToggleScale();
              onPlaySound?.('click');
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isModern ? 'border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-cyan-300' : 'border-[#2b2518] bg-[#14171f] text-slate-300 hover:text-[#ffcc00]'
            }`}
            title="Уменьшить масштаб (100%)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-scale-plus"
            onClick={() => {
              onToggleScale();
              onPlaySound?.('click');
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              scalePercent > 100 
                ? (isModern ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold' : 'border-[#ffcc00] bg-[#ffcc00]/20 text-[#ffcc00] font-bold')
                : (isModern ? 'border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-cyan-300' : 'border-[#2b2518] bg-[#14171f] text-slate-300 hover:text-[#ffcc00]')
            }`}
            title={`Масштаб: ${scalePercent}%. Переключить 100% / 150%`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-window-maximize"
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isModern ? 'border-cyan-500/20 bg-cyan-500/5 text-slate-300 hover:text-cyan-300' : 'border-[#2b2518] bg-[#14171f] text-slate-300 hover:text-[#ffcc00]'
            }`}
            title="На весь экран"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-logout"
            onClick={() => {
              if (confirm('Выйти из личного кабинета?')) {
                onLogout?.();
                onPlaySound?.('click');
              }
            }}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isModern ? 'border-rose-500/20 bg-rose-500/5 text-rose-300 hover:text-rose-200 hover:border-rose-400/50' : 'border-rose-950 bg-rose-950/40 text-rose-300 hover:text-rose-100'
            }`}
            title="Выйти из учетной записи"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <InteractiveGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        appStyle={appStyle}
        onPlaySound={onPlaySound}
      />
    </header>
  );
};
