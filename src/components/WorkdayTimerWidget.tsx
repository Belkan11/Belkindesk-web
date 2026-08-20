import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Coffee, 
  Clock, 
  Flame, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  History,
  Timer as TimerIcon,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { WorkdayTimerSession, UserProfile } from '../types';

interface WorkdayTimerWidgetProps {
  currentUser: UserProfile;
  onSaveSession: (session: WorkdayTimerSession) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const WorkdayTimerWidget: React.FC<WorkdayTimerWidgetProps> = ({
  currentUser,
  onSaveSession,
  onPlaySound,
}) => {
  // --- 1. WORKDAY SHIFT TIMER STATE ---
  const [isShiftActive, setIsShiftActive] = useState<boolean>(() => {
    return localStorage.getItem(`pulsedesk_shift_active_${currentUser.id}`) === 'true';
  });
  const [isShiftPaused, setIsShiftPaused] = useState<boolean>(() => {
    return localStorage.getItem(`pulsedesk_shift_paused_${currentUser.id}`) === 'true';
  });
  const [shiftStartTime, setShiftStartTime] = useState<string | null>(() => {
    return localStorage.getItem(`pulsedesk_shift_start_${currentUser.id}`);
  });
  const [shiftWorkedSeconds, setShiftWorkedSeconds] = useState<number>(() => {
    const val = localStorage.getItem(`pulsedesk_shift_worked_${currentUser.id}`);
    return val ? parseInt(val, 10) : 0;
  });
  const [shiftBreakSeconds, setShiftBreakSeconds] = useState<number>(() => {
    const val = localStorage.getItem(`pulsedesk_shift_break_${currentUser.id}`);
    return val ? parseInt(val, 10) : 0;
  });

  // Daily target goal (in seconds)
  const targetGoalHours = currentUser.workspaceConfig?.dailyWorkGoalHours || 8;
  const targetGoalSeconds = targetGoalHours * 3600;

  // --- 2. POMODORO TIMER STATE ---
  const [pomodoroMode, setPomodoroMode] = useState<'work' | 'short-break' | 'long-break'>('work');
  const [pomodoroSecondsLeft, setPomodoroSecondsLeft] = useState<number>(25 * 60);
  const [isPomodoroRunning, setIsPomodoroRunning] = useState<boolean>(false);
  const [pomodoroCycles, setPomodoroCycles] = useState<number>(0);
  const [currentTaskTitle, setCurrentTaskTitle] = useState<string>('');

  // Active tab in timer panel: 'shift' | 'pomodoro' | 'logs'
  const [activeTab, setActiveTab] = useState<'shift' | 'pomodoro' | 'logs'>('shift');

  // Workday ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isShiftActive) {
      interval = setInterval(() => {
        if (isShiftPaused) {
          setShiftBreakSeconds((prev) => {
            const next = prev + 1;
            localStorage.setItem(`pulsedesk_shift_break_${currentUser.id}`, next.toString());
            return next;
          });
        } else {
          setShiftWorkedSeconds((prev) => {
            const next = prev + 1;
            localStorage.setItem(`pulsedesk_shift_worked_${currentUser.id}`, next.toString());
            return next;
          });
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isShiftActive, isShiftPaused, currentUser.id]);

  // Pomodoro ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPomodoroRunning && pomodoroSecondsLeft > 0) {
      interval = setInterval(() => {
        setPomodoroSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (isPomodoroRunning && pomodoroSecondsLeft === 0) {
      // Pomodoro cycle finished!
      setIsPomodoroRunning(false);
      onPlaySound?.('success');

      if (pomodoroMode === 'work') {
        const nextCycles = pomodoroCycles + 1;
        setPomodoroCycles(nextCycles);
        if (nextCycles % 4 === 0) {
          setPomodoroMode('long-break');
          setPomodoroSecondsLeft(15 * 60);
        } else {
          setPomodoroMode('short-break');
          setPomodoroSecondsLeft(5 * 60);
        }
      } else {
        setPomodoroMode('work');
        setPomodoroSecondsLeft(25 * 60);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPomodoroRunning, pomodoroSecondsLeft, pomodoroMode, pomodoroCycles, onPlaySound]);

  // Handlers for shift
  const handleStartShift = () => {
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setIsShiftActive(true);
    setIsShiftPaused(false);
    if (!shiftStartTime) {
      setShiftStartTime(nowStr);
      localStorage.setItem(`pulsedesk_shift_start_${currentUser.id}`, nowStr);
    }
    localStorage.setItem(`pulsedesk_shift_active_${currentUser.id}`, 'true');
    localStorage.setItem(`pulsedesk_shift_paused_${currentUser.id}`, 'false');
    onPlaySound?.('click');
  };

  const handlePauseShift = () => {
    setIsShiftPaused(true);
    localStorage.setItem(`pulsedesk_shift_paused_${currentUser.id}`, 'true');
    onPlaySound?.('click');
  };

  const handleResumeShift = () => {
    setIsShiftPaused(false);
    localStorage.setItem(`pulsedesk_shift_paused_${currentUser.id}`, 'false');
    onPlaySound?.('click');
  };

  const handleEndShift = () => {
    if (window.confirm('Завершить текущую рабочую смену и сохранить результаты в журнал?')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const newSession: WorkdayTimerSession = {
        id: `sess-${Date.now()}`,
        date: todayStr,
        startedAt: shiftStartTime || '09:00',
        endedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        totalWorkedSeconds: shiftWorkedSeconds,
        totalBreakSeconds: shiftBreakSeconds,
        notes: currentTaskTitle || 'Рабочая смена',
      };

      onSaveSession(newSession);

      // Reset state
      setIsShiftActive(false);
      setIsShiftPaused(false);
      setShiftStartTime(null);
      setShiftWorkedSeconds(0);
      setShiftBreakSeconds(0);

      localStorage.removeItem(`pulsedesk_shift_active_${currentUser.id}`);
      localStorage.removeItem(`pulsedesk_shift_paused_${currentUser.id}`);
      localStorage.removeItem(`pulsedesk_shift_start_${currentUser.id}`);
      localStorage.removeItem(`pulsedesk_shift_worked_${currentUser.id}`);
      localStorage.removeItem(`pulsedesk_shift_break_${currentUser.id}`);

      onPlaySound?.('success');
    }
  };

  // Pomodoro controls
  const handleSelectPomodoroPreset = (mode: 'work' | 'short-break' | 'long-break', minutes: number) => {
    setIsPomodoroRunning(false);
    setPomodoroMode(mode);
    setPomodoroSecondsLeft(minutes * 60);
  };

  const handleResetPomodoro = () => {
    setIsPomodoroRunning(false);
    if (pomodoroMode === 'work') setPomodoroSecondsLeft(25 * 60);
    else if (pomodoroMode === 'short-break') setPomodoroSecondsLeft(5 * 60);
    else setPomodoroSecondsLeft(15 * 60);
  };

  // Formatters
  const formatTimeHHMMSS = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const formatTimeMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.min(100, Math.round((shiftWorkedSeconds / targetGoalSeconds) * 100));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-y-auto p-4 sm:p-6 select-none font-sans">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Top Header & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-xs">
              <TimerIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-100 font-mono tracking-tight">Таймер рабочего дня</h1>
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                  isShiftActive 
                    ? isShiftPaused ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {isShiftActive ? (isShiftPaused ? '☕ На перерыве' : '🟢 В работе') : '⚪ Смена не начата'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Учёт отработанного времени, интервальный Pomodoro-фокус и статистика дня
              </p>
            </div>
          </div>

          {/* Subtabs */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
            <button
              onClick={() => setActiveTab('shift')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'shift'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Рабочая смена</span>
            </button>

            <button
              onClick={() => setActiveTab('pomodoro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pomodoro'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Pomodoro ({pomodoroCycles})</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>История</span>
            </button>
          </div>
        </div>

        {/* TAB 1: WORKDAY SHIFT CONTROLS */}
        {activeTab === 'shift' && (
          <div className="space-y-6 animate-fade-in">
            {/* Big Main Display Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Digital Counter */}
                <div className="text-center md:text-left space-y-2">
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold font-mono">
                    Отработано за сегодня
                  </span>
                  <div className="text-5xl sm:text-6xl font-bold font-mono tracking-tight text-slate-100 flex items-center justify-center md:justify-start gap-2">
                    <span>{formatTimeHHMMSS(shiftWorkedSeconds)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 justify-center md:justify-start">
                    <span>Цель: <strong className="text-slate-200">{targetGoalHours} ч</strong></span>
                    <span>•</span>
                    <span>Прогресс: <strong className="text-amber-400">{progressPercent}%</strong></span>
                    <span>•</span>
                    <span>Перерыв: <strong className="text-slate-300">{formatTimeHHMMSS(shiftBreakSeconds)}</strong></span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {!isShiftActive ? (
                    <button
                      onClick={handleStartShift}
                      className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold text-sm hover:from-emerald-400 hover:to-teal-500 active:scale-95 transition cursor-pointer shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>Начать рабочий день</span>
                    </button>
                  ) : (
                    <>
                      {isShiftPaused ? (
                        <button
                          onClick={handleResumeShift}
                          className="px-5 py-3 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm hover:bg-emerald-400 active:scale-95 transition cursor-pointer flex items-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-slate-950" />
                          <span>Продолжить работу</span>
                        </button>
                      ) : (
                        <button
                          onClick={handlePauseShift}
                          className="px-5 py-3 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold text-sm hover:bg-amber-500/30 active:scale-95 transition cursor-pointer flex items-center gap-2"
                        >
                          <Coffee className="w-4 h-4" />
                          <span>Перерыв на кофе</span>
                        </button>
                      )}

                      <button
                        onClick={handleEndShift}
                        className="px-5 py-3 rounded-xl bg-slate-800 text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 font-semibold text-sm transition cursor-pointer flex items-center gap-2"
                        title="Завершить смену и записать в журнал"
                      >
                        <Square className="w-4 h-4" />
                        <span>Завершить смену</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar & Goal */}
              <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center sm:text-left">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Начало смены</span>
                  <div className="text-base font-bold text-slate-200 font-mono mt-0.5">
                    {shiftStartTime || '—'}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Осталось до нормы</span>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {shiftWorkedSeconds >= targetGoalSeconds
                      ? 'Норма выполнена! 🎉'
                      : formatTimeHHMMSS(Math.max(0, targetGoalSeconds - shiftWorkedSeconds))}
                  </div>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400">Эффективность дня</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {shiftWorkedSeconds + shiftBreakSeconds > 0
                      ? `${Math.round((shiftWorkedSeconds / (shiftWorkedSeconds + shiftBreakSeconds)) * 100)}%`
                      : '100%'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Task Input */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-3">
              <span className="text-xs font-semibold text-slate-300 shrink-0">Текущий фокус задачи:</span>
              <input
                type="text"
                value={currentTaskTitle}
                onChange={(e) => setCurrentTaskTitle(e.target.value)}
                placeholder="Например: Разработка модуля авторизации & ревью pull request..."
                className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        )}

        {/* TAB 2: POMODORO FOCUS TIMER */}
        {activeTab === 'pomodoro' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl">
              {/* Presets */}
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => handleSelectPomodoroPreset('work', 25)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    pomodoroMode === 'work'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  🍅 Фокус (25 мин)
                </button>
                <button
                  onClick={() => handleSelectPomodoroPreset('short-break', 5)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    pomodoroMode === 'short-break'
                      ? 'bg-teal-500 text-slate-950 shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  ☕ Короткий отдых (5 мин)
                </button>
                <button
                  onClick={() => handleSelectPomodoroPreset('long-break', 15)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    pomodoroMode === 'long-break'
                      ? 'bg-indigo-500 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  🌴 Длинный перерыв (15 мин)
                </button>
              </div>

              {/* Big Countdown */}
              <div className="py-4">
                <div className="text-7xl sm:text-8xl font-black font-mono tracking-tight text-slate-100">
                  {formatTimeMMSS(pomodoroSecondsLeft)}
                </div>
                <p className="text-xs font-medium text-slate-400 mt-2">
                  {pomodoroMode === 'work'
                    ? '🎯 Глубокий фокус над задачей'
                    : '🧘 Время размяться и сделать глоток воды'}
                </p>
              </div>

              {/* Pomodoro Action Buttons */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setIsPomodoroRunning(!isPomodoroRunning);
                    onPlaySound?.('click');
                  }}
                  className={`px-8 py-3.5 rounded-xl font-bold text-base transition cursor-pointer shadow-lg active:scale-95 flex items-center gap-2 ${
                    isPomodoroRunning
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400 shadow-orange-500/20'
                  }`}
                >
                  {isPomodoroRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-slate-950" />}
                  <span>{isPomodoroRunning ? 'Пауза' : 'Старт таймера'}</span>
                </button>

                <button
                  onClick={handleResetPomodoro}
                  className="p-3.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition cursor-pointer"
                  title="Сбросить интервал"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>

              {/* Streak info */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Завершено циклов за сегодня: <strong className="text-amber-400">{pomodoroCycles}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SHIFT HISTORY LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
              <h3 className="text-sm font-bold text-slate-200 font-mono mb-3 flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <span>История рабочих смен</span>
              </h3>

              {currentUser.timerSessions && currentUser.timerSessions.length > 0 ? (
                <div className="space-y-2.5">
                  {currentUser.timerSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200">{s.date} ({s.startedAt} — {s.endedAt || '—'})</div>
                        <div className="text-slate-400">{s.notes || 'Без описания'}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">{formatTimeHHMMSS(s.totalWorkedSeconds)}</div>
                        <div className="text-[10px] text-slate-500">Перерыв: {formatTimeHHMMSS(s.totalBreakSeconds)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Журнал пуст. Завершите свою первую смену, чтобы увидеть сохраненную статистику!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
