import React, { useState } from 'react';
import { 
  RotateCw, 
  Settings, 
  Minus, 
  Plus, 
  Square, 
  X, 
  Sparkles,
  User,
  Database,
  ShieldCheck,
  LogOut,
  Clock,
  MapPin,
  HelpCircle
} from 'lucide-react';
import { UserProfile, AppArchetypeStyle } from '../types';
import { useCityClock } from '../utils/timeZone';
import { InteractiveGuideModal } from './InteractiveGuideModal';

interface BelkinHeaderProps {
  activeTab: 'notes' | 'news';
  onChangeTab: (tab: 'notes' | 'news') => void;
  onRefresh: () => void;
  isRefreshing: boolean;
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
  onRefresh,
  isRefreshing,
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
      className={`h-10 px-3 flex items-center justify-between select-none text-xs font-mono shrink-0 z-20 transition-all duration-300 ${
        isModern
          ? 'bg-[#0a0f1d]/55 backdrop-blur-xl border-b border-cyan-500/30 shadow-[0_4px_25px_rgba(0,0,0,0.5)]'
          : 'bg-[#0f1216] border-b border-[#2b2518]'
      }`}
    >
      {/* Left: Brand logo & icon markers */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 font-bold tracking-wider">
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
          <span className={`text-xs font-bold font-sans ${
            isModern 
              ? 'px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] tracking-widest' 
              : 'text-[#e6b800]'
          }`}>
            MED
          </span>
        </div>

        {/* Geometric Style Switcher Buttons (Left = Classic Amber/Dark, Right = Modern Vibrant Translucent Glass) */}
        <div className="hidden sm:flex items-center gap-1.5">
          {/* Left Button: Classic Design (фиксированный классический янтарный стиль) */}
          <div
            id="btn-style-classic"
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectAppStyle?.('classic');
              onPlaySound?.('click');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectAppStyle?.('classic');
                onPlaySound?.('click');
              }
            }}
            className={`w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all duration-200 ${
              !isModern
                ? 'bg-[#ffcc00] ring-2 ring-[#ffcc00]/70 shadow-[0_0_10px_rgba(255,204,0,0.6)] scale-105'
                : 'bg-[#ffcc00]/30 hover:bg-[#ffcc00]/70 border border-[#ffcc00]/50 hover:scale-105 opacity-60 hover:opacity-100'
            }`}
            title="Классический интерфейс: Тёмная янтарная палитра с плотными панелями"
          >
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${!isModern ? 'bg-black' : 'bg-black/80'}`}></span>
          </div>

          {/* Right Button: Modern Design (новый красочный, стильный прозрачный дизайн) */}
          <div
            id="btn-style-modern"
            role="button"
            tabIndex={0}
            onClick={() => {
              onSelectAppStyle?.('modern');
              onPlaySound?.('click');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onSelectAppStyle?.('modern');
                onPlaySound?.('click');
              }
            }}
            className={`w-3.5 h-3.5 rotate-45 flex items-center justify-center cursor-pointer transition-all duration-200 ${
              isModern
                ? 'bg-gradient-to-br from-cyan-400 via-sky-400 to-indigo-500 border border-cyan-200 ring-2 ring-cyan-400/80 shadow-[0_0_14px_rgba(56,189,248,0.8)] scale-105'
                : 'border border-[#8b774b] bg-transparent hover:border-cyan-400 hover:bg-cyan-500/20 hover:scale-105 opacity-60 hover:opacity-100'
            }`}
            title="Современный интерфейс: Аврора Гласс — красочная неоновая палитра и прозрачный стиль для обоев"
          ></div>
        </div>
      </div>

      {/* Center: Main Navigation Tabs */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center rounded p-0.5 transition-all ${
          isModern 
            ? 'bg-[#080e1a]/60 border border-cyan-500/30 backdrop-blur-md shadow-inner' 
            : 'bg-[#07090b] border border-[#2b2518]'
        }`}>
          <button
            id="tab-notes"
            onClick={() => {
              onChangeTab('notes');
              onPlaySound?.('click');
            }}
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition cursor-pointer ${
              activeTab === 'notes'
                ? isModern
                  ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                  : 'text-[#ffcc00] border-b-2 border-[#ffcc00] bg-[#1a1710]/60'
                : isModern
                  ? 'text-slate-400 hover:text-cyan-200'
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
            className={`px-3 py-1 rounded text-xs font-bold uppercase transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'news'
                ? isModern
                  ? 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                  : 'text-[#ffcc00] border-b-2 border-[#ffcc00] bg-[#1a1710]/60'
                : isModern
                  ? 'text-slate-400 hover:text-cyan-200'
                  : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>НОВОСТИ</span>
          </button>
        </div>

        {/* Refresh button */}
        <button
          id="btn-refresh-feed"
          onClick={() => {
            onRefresh();
            onPlaySound?.('click');
          }}
          disabled={isRefreshing}
          className={`p-1.5 transition-all duration-300 cursor-pointer rounded-md border active:scale-90 flex items-center justify-center ${
            isModern 
              ? 'border-cyan-500/10 text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/15 hover:border-cyan-400/30 hover:shadow-[0_0_8px_rgba(34,211,238,0.2)]' 
              : 'border-amber-500/10 text-slate-400 hover:text-[#ffcc00] hover:bg-[#ffcc00]/15 hover:border-[#ffcc00]/30 hover:shadow-[0_0_8px_rgba(255,204,0,0.15)]'
          } ${isRefreshing ? (isModern ? 'animate-spin text-cyan-400 border-cyan-400/30 bg-cyan-500/5' : 'animate-spin text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/5') : ''}`}
          title="Обновить данные и ленты: Кликните, чтобы ИИ проверил все ваши поисковые каналы и создал свежие карточки"
        >
          <RotateCw className="w-3.5 h-3.5 transition-transform duration-300" />
        </button>

        {/* Interactive Guide button */}
        <button
          id="btn-interactive-guide"
          onClick={() => {
            setIsGuideOpen(true);
            onPlaySound?.('success');
          }}
          className={`relative flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[10px] uppercase cursor-pointer transition-all duration-200 border shrink-0 ${
            isModern
              ? 'bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-400/60 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
              : 'bg-[#ffcc00]/10 hover:bg-[#ffcc00]/25 border-[#ffcc00]/60 text-[#ffcc00]'
          }`}
          title="Открыть интерактивное руководство пользователя и гид по интерфейсу"
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isModern ? 'bg-cyan-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isModern ? 'bg-cyan-400' : 'bg-amber-500'}`}></span>
          </span>
          <HelpCircle className="w-3 h-3" />
          <span>ГИД ПО ИНТЕРФЕЙСУ</span>
        </button>

        <div className={`font-bold px-0.5 ${isModern ? 'text-cyan-500/60' : 'text-slate-600'}`}>=</div>

        {/* Unread badge */}
        <div 
          onClick={() => {
            onChangeTab('news');
            onPlaySound?.('click');
          }}
          className={`px-2 py-0.5 rounded-full font-bold text-[10px] cursor-pointer shadow-sm hover:brightness-110 tracking-tight transition ${
            isModern
              ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'bg-[#ef4444] text-white'
          }`}
          title="Непрочитанные медицинские новости"
        >
          {unreadNewsCount > 99 ? '99+' : unreadNewsCount || '99+'}
        </div>
      </div>

      {/* Right: User Profile / Cloud DB, Settings Gear, and Window Scale Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Admin Panel Button (Restricted only to Administrator Belkin) */}
        {isAdmin && (
          <button
            id="btn-admin-panel"
            onClick={() => {
              onOpenAdminModal?.();
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded font-bold text-[11px] transition cursor-pointer shadow-sm ${
              isModern
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                : 'bg-[#ffcc00]/15 hover:bg-[#ffcc00]/25 border border-[#ffcc00]/60 text-[#ffcc00]'
            }`}
            title="Панель Администратора: Управление всеми профилями, правами и бэкап Google Диск"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
            <span className="hidden sm:inline">Админ-панель</span>
          </button>
        )}

        {/* Live Synchronized City Time Badge */}
        <div
          onClick={() => {
            onOpenSettings();
            onPlaySound?.('click');
          }}
          className={`hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded cursor-pointer transition shadow-xs ${
            isModern
              ? 'bg-[#0d172a]/60 border border-cyan-500/40 text-slate-100 hover:border-cyan-300 hover:bg-[#11203b]/80 shadow-[0_0_12px_rgba(56,189,248,0.15)]'
              : 'bg-[#151921] border border-[#ffcc00]/40 text-slate-200 hover:border-[#ffcc00] hover:bg-[#1a202c]'
          }`}
          title={`Время синхронизировано по городу: ${cityClock.city} (${cityClock.utcOffsetStr}, ${cityClock.timeZone}). Кликните для изменения города в настройках.`}
        >
          <MapPin className={`w-3 h-3 shrink-0 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
          <span className="text-[11px] font-sans font-bold text-slate-200 max-w-[80px] truncate">
            {cityClock.city}
          </span>
          <span className={`font-mono font-bold text-xs tabular-nums ${isModern ? 'text-cyan-300 drop-shadow-[0_0_6px_rgba(56,189,248,0.5)]' : 'text-[#ffcc00]'}`}>
            {cityClock.timeStr}
          </span>
          <span className={`text-[9px] font-mono ${isModern ? 'text-cyan-400/80' : 'text-slate-400'}`}>
            {cityClock.utcOffsetStr}
          </span>
        </div>

        {/* User Account Pill (Click to open profile & settings) */}
        <button
          id="btn-user-profile-header"
          type="button"
          onClick={() => {
            onOpenUserCabinet?.();
            onPlaySound?.('click');
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded transition cursor-pointer shadow-xs ${
            isModern
              ? 'bg-[#0d172a]/60 hover:bg-[#15233e]/80 border border-indigo-500/40 hover:border-cyan-400 text-slate-200 shadow-[0_0_10px_rgba(99,102,241,0.15)]'
              : 'bg-[#161a22] hover:bg-[#202733] border border-[#2d3748] hover:border-[#ffcc00]/60 text-slate-200'
          }`}
          title={`Личный профиль: ${currentUser?.displayName || currentUser?.username} (${currentUser?.profession || currentUser?.specialization || 'Врач'}). Нажмите для редактирования.`}
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
          <span className="text-[11px] font-bold text-white max-w-[100px] truncate hidden md:inline font-mono">
            {currentUser?.displayName || currentUser?.username || 'Врач'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" title="Персональная база данных активна"></span>
        </button>

        {/* Settings Gear (ЦЕНТР УПРАВЛЕНИЯ НОВОСТЯМИ) */}
        <button
          id="btn-control-center"
          onClick={() => {
            onOpenSettings();
            onPlaySound?.('click');
          }}
          className={`p-1 transition cursor-pointer rounded ${
            isModern ? 'text-slate-400 hover:text-cyan-300' : 'text-slate-400 hover:text-[#ffcc00]'
          }`}
          title="Центр управления новостями & Доступность"
        >
          <Settings className="w-4 h-4" />
        </button>

        <div className={`h-3.5 w-[1px] mx-0.5 ${isModern ? 'bg-cyan-500/30' : 'bg-[#2b2518]'}`}></div>

        {/* Window controls */}
        <button
          id="btn-scale-minus"
          onClick={() => {
            if (scalePercent > 100) onToggleScale();
            onPlaySound?.('click');
          }}
          className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
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
          className={`p-1 transition cursor-pointer ${
            scalePercent > 100 
              ? (isModern ? 'text-cyan-300 font-bold' : 'text-[#ffcc00] font-bold') 
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title={`Масштаб: ${scalePercent}%. Клик для переключения 100% / 150%`}
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
          className="p-1 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          title="На весь экран"
        >
          <Square className="w-3 h-3" />
        </button>

        {/* Logout / Sign Out Button */}
        <button
          id="btn-logout"
          onClick={() => {
            if (confirm('Выйти из личного кабинета?')) {
              onLogout?.();
              onPlaySound?.('click');
            }
          }}
          className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
          title="Выйти из учетной записи"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
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

