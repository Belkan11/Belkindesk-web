import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CloudRain, 
  Sun, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  Calendar as CalendarIcon, 
  Pencil, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Settings, 
  ExternalLink, 
  Folder, 
  FileCode, 
  Globe,
  Copy,
  Info,
  Lock,
  Unlock
} from 'lucide-react';
import { MedicalTimerItem, WorkDaySchedule, DesktopBookmark, AppArchetypeStyle } from '../types';
import { WeatherWidget } from './WeatherWidget';
import { useCityClock, calculateTimerState, parseTargetTimeToSeconds } from '../utils/timeZone';
import { BottomBookmarksSettingsModal } from './BottomBookmarksSettingsModal';
import { INITIAL_BOOKMARKS } from '../utils/storage';

interface DayEntryItem {
  id: string;
  text: string;
  time?: string;
  isDone?: boolean;
}

interface MedicalLeftPanelProps {
  timers: MedicalTimerItem[];
  onUpdateTimers: (timers: MedicalTimerItem[]) => void;
  workSchedules: Record<string, WorkDaySchedule>;
  onUpdateWorkSchedules: (schedules: Record<string, WorkDaySchedule>) => void;
  bookmarks?: DesktopBookmark[];
  onUpdateBookmarks?: (bookmarks: DesktopBookmark[]) => void;
  appStyle?: AppArchetypeStyle;
  onOpenSettingsTab?: (tabName: string) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

const STORAGE_DAY_ENTRIES_KEY = 'belkindesk_calendar_day_entries';

const MONTH_NAMES_RU = [
  'ЯНВАРЬ',
  'ФЕВРАЛЬ',
  'МАРТ',
  'АПРЕЛЬ',
  'МАЙ',
  'ИЮНЬ',
  'ИЮЛЬ',
  'АВГУСТ',
  'СЕНТЯБРЬ',
  'ОКТЯБРЬ',
  'НОЯБРЬ',
  'ДЕКАБРЬ',
];

const MONTH_NAMES_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

// Initial default entries for key clinical dates
const DEFAULT_INITIAL_ENTRIES: Record<string, DayEntryItem[]> = {
  '2026-06-06': [
    { id: 'entry-6-1', text: 'Утренний клинический обход ОРИТ', time: '08:30', isDone: true },
    { id: 'entry-6-2', text: 'Консилиум по сложному кардиопациенту', time: '11:00', isDone: false },
    { id: 'entry-6-3', text: 'Вебинар РКО: новые рекомендации', time: '15:00', isDone: false },
  ],
  '2026-06-07': [
    { id: 'entry-7-1', text: 'Выходной день после дежурства', time: '', isDone: false },
  ],
  '2026-06-08': [
    { id: 'entry-8-1', text: 'Плановая коронарография (2 пациента)', time: '10:00', isDone: false },
  ],
};

export const MedicalLeftPanel: React.FC<MedicalLeftPanelProps> = ({
  timers,
  onUpdateTimers,
  workSchedules,
  onUpdateWorkSchedules,
  bookmarks = INITIAL_BOOKMARKS,
  onUpdateBookmarks,
  appStyle = 'classic',
  onOpenSettingsTab,
  onPlaySound,
}) => {
  const cityClock = useCityClock();
  const isModern = appStyle === 'modern';
  const alertedTimersRef = useRef<Set<string>>(new Set());

  // Bookmarks launcher state
  const [isBookmarksSettingsOpen, setIsBookmarksSettingsOpen] = useState(false);
  const [launcherFeedback, setLauncherFeedback] = useState<{ message: string } | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Sound chime when a timer hits targetTime (00:00:00) during live usage
  useEffect(() => {
    const curSec = cityClock.hours * 3600 + cityClock.minutes * 60 + cityClock.seconds;
    timers.forEach((t) => {
      const targetSec = parseTargetTimeToSeconds(t.targetTime);
      if (curSec === targetSec && !alertedTimersRef.current.has(t.id)) {
        alertedTimersRef.current.add(t.id);
        onPlaySound?.('success');
      }
    });
  }, [cityClock.hours, cityClock.minutes, cityClock.seconds, timers, onPlaySound]);

  // Quick toggle timer status (done <-> active)
  const handleToggleTimer = (id: string) => {
    onPlaySound?.('click');
    const updated = timers.map((t) => {
      if (t.id === id) {
        const state = calculateTimerState(
          t.targetTime,
          t.status,
          cityClock.hours,
          cityClock.minutes,
          cityClock.seconds,
          false,
          t.lastDoneDate,
          cityClock.dateStr
        );
        const nextStatus: 'done' | 'active' = state.effectiveStatus === 'done' ? 'active' : 'done';
        return { 
          ...t, 
          status: nextStatus,
          lastDoneDate: nextStatus === 'done' ? cityClock.dateStr : undefined
        };
      }
      return t;
    });
    onUpdateTimers(updated);
  };

  // Launch bookmark handler (link / file / folder)
  const handleLaunchBookmark = (bm: DesktopBookmark) => {
    onPlaySound?.('click');
    const type = bm.type || 'link';

    if (type === 'link') {
      const targetUrl = bm.url.startsWith('http') ? bm.url : `https://${bm.url}`;
      window.open(targetUrl, '_blank');
      return;
    }

    if (type === 'folder') {
      const folderPath = bm.url || 'D:\\';
      try {
        navigator.clipboard.writeText(folderPath);
      } catch {}
      setLauncherFeedback({
        message: `Путь к папке скопирован: ${folderPath}`,
      });
      setTimeout(() => setLauncherFeedback(null), 4000);
      return;
    }

    if (type === 'file') {
      const filePath = bm.url || 'C:\\Windows\\System32\\cmd.exe';
      try {
        navigator.clipboard.writeText(filePath);
      } catch {}
      setLauncherFeedback({
        message: `Ярлык скопирован в буфер: ${filePath}`,
      });
      setTimeout(() => setLauncherFeedback(null), 4000);
      return;
    }
  };

  // Synchronized dynamic current date from selected city
  const todayYear = cityClock.year;
  const todayMonth = cityClock.month; // 0-11
  const todayDate = cityClock.day; // 1-31

  // Active viewing month and year in calendar
  const [viewYear, setViewYear] = useState<number>(todayYear);
  const [viewMonth, setViewMonth] = useState<number>(todayMonth);

  // Sync view when city/date changes
  useEffect(() => {
    setViewYear(cityClock.year);
    setViewMonth(cityClock.month);
    setSelectedDay(cityClock.day);
  }, [cityClock.year, cityClock.month, cityClock.day]);

  // Selected day number in current viewing month
  const [selectedDay, setSelectedDay] = useState<number>(todayDate);
  const [newEntryText, setNewEntryText] = useState<string>('');

  // Editing state for day entries
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('');

  // Daily entries store
  const [dayEntries, setDayEntries] = useState<Record<string, DayEntryItem[]>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DAY_ENTRIES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_INITIAL_ENTRIES;
  });

  const saveDayEntries = (entries: Record<string, DayEntryItem[]>) => {
    setDayEntries(entries);
    try {
      localStorage.setItem(STORAGE_DAY_ENTRIES_KEY, JSON.stringify(entries));
    } catch {}
  };

  // Month navigation
  const handlePrevMonth = () => {
    onPlaySound?.('click');
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    onPlaySound?.('click');
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
    setSelectedDay(1);
  };

  const handleGoToToday = () => {
    onPlaySound?.('click');
    setViewYear(todayYear);
    setViewMonth(todayMonth);
    setSelectedDay(todayDate);
  };

  // Dynamically calculate grid of days for viewYear / viewMonth (Monday-first grid)
  const calendarDays = useMemo(() => {
    // Number of days in current viewing month
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Day of week for 1st of month: 0=Sun, 1=Mon, ..., 6=Sat -> convert to Monday-first (0=Mon...6=Sun)
    const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    // Number of days in previous month
    const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

    const items: Array<{
      day: number;
      isCurrentMonth: boolean;
      dateStr: string;
      isToday: boolean;
    }> = [];

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      const dateStr = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      items.push({
        day,
        isCurrentMonth: false,
        dateStr,
        isToday: false,
      });
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = viewYear === todayYear && viewMonth === todayMonth && day === todayDate;
      items.push({
        day,
        isCurrentMonth: true,
        dateStr,
        isToday,
      });
    }

    // 3. Next month leading days to complete full weeks (multiples of 7)
    const totalFilled = items.length;
    const remaining = totalFilled % 7 === 0 ? 0 : 7 - (totalFilled % 7);
    for (let day = 1; day <= remaining; day++) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      const dateStr = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      items.push({
        day,
        isCurrentMonth: false,
        dateStr,
        isToday: false,
      });
    }

    return items;
  }, [viewYear, viewMonth, todayYear, todayMonth, todayDate]);

  // Selected date string in YYYY-MM-DD
  const selectedDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
  const isSelectedDateToday = viewYear === todayYear && viewMonth === todayMonth && selectedDay === todayDate;

  // Helper to determine day type: 'work' (default/unmarked), 'day-off' (green), 'event' (red)
  const getDayType = (dateStr: string, dayNum: number, isCurM: boolean = true): 'work' | 'day-off' | 'event' => {
    if (!isCurM) return 'work';
    const s = workSchedules[dateStr];
    if (s?.shiftType === 'day-off' || s?.shiftType === 'vacation') return 'day-off';
    if (s?.shiftType === 'event' || s?.shiftType === 'duty' || s?.shiftType === 'sick-leave') return 'event';
    if (s?.shiftType === 'work-office' || s?.shiftType === 'work-remote') return 'work';
    return 'work';
  };

  // Calendar click behavior:
  // 1. First click on a different date -> select that date for editing and viewing events.
  // 2. Next click on the ALREADY selected date -> set green marker (day-off).
  // 3. Next click -> set red marker (event).
  // 4. Next click -> clear marker / no fill (work).
  const handleDayClick = (dayItem: { day: number; isCurrentMonth: boolean; dateStr: string }) => {
    if (!dayItem.isCurrentMonth) return;
    onPlaySound?.('click');

    // If clicking a date that is NOT currently selected -> simply select it for editing/viewing events
    if (selectedDay !== dayItem.day) {
      setSelectedDay(dayItem.day);
      return;
    }

    // If calendar is locked, prevent color changes by clicks
    if (isLocked) {
      return;
    }

    // If clicking on the ALREADY selected date -> cycle: green (day-off) -> red (event) -> clear (work) -> green...
    const currentType = getDayType(dayItem.dateStr, dayItem.day);
    let nextType: 'work-office' | 'day-off' | 'event' = 'day-off';
    if (currentType === 'work') {
      nextType = 'day-off'; // green marker
    } else if (currentType === 'day-off') {
      nextType = 'event'; // red marker
    } else {
      nextType = 'work-office'; // cancel fill / unmarked
    }

    const updated: Record<string, WorkDaySchedule> = {
      ...workSchedules,
      [dayItem.dateStr]: {
        date: dayItem.dateStr,
        shiftType: nextType,
        notes: nextType === 'day-off' ? 'Выходной' : nextType === 'event' ? 'Событие / дежурство' : 'Рабочий день',
      },
    };
    onUpdateWorkSchedules(updated);
  };

  // Explicit status changer from the bottom panel
  const handleSetDayType = (type: 'work-office' | 'day-off' | 'event') => {
    if (isLocked) {
      onPlaySound?.('click');
      return;
    }
    onPlaySound?.('click');
    const updated: Record<string, WorkDaySchedule> = {
      ...workSchedules,
      [selectedDateStr]: {
        date: selectedDateStr,
        shiftType: type,
        notes: type === 'day-off' ? 'Выходной' : type === 'event' ? 'Событие / дежурство' : 'Рабочий день',
      },
    };
    onUpdateWorkSchedules(updated);
  };

  // Add entry for selected day
  const handleAddEntry = (textToAdd?: string) => {
    const text = (textToAdd || newEntryText).trim();
    if (!text) return;
    onPlaySound?.('click');

    const currentList = dayEntries[selectedDateStr] || [];
    const newEntry: DayEntryItem = {
      id: `entry-${Date.now()}`,
      text: text,
      time: cityClock.timeShort,
      isDone: false,
    };

    const updated = {
      ...dayEntries,
      [selectedDateStr]: [...currentList, newEntry],
    };
    saveDayEntries(updated);
    setNewEntryText('');
  };

  // Start editing entry
  const handleStartEdit = (entry: DayEntryItem) => {
    onPlaySound?.('click');
    setEditingEntryId(entry.id);
    setEditText(entry.text);
    setEditTime(entry.time || '');
  };

  // Save edited entry
  const handleSaveEdit = (entryId: string) => {
    const trimmed = editText.trim();
    if (!trimmed) {
      handleDeleteEntry(entryId);
      setEditingEntryId(null);
      return;
    }
    onPlaySound?.('click');
    const currentList = dayEntries[selectedDateStr] || [];
    const updatedList = currentList.map((e) =>
      e.id === entryId ? { ...e, text: trimmed, time: editTime.trim() } : e
    );
    saveDayEntries({
      ...dayEntries,
      [selectedDateStr]: updatedList,
    });
    setEditingEntryId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    onPlaySound?.('click');
    setEditingEntryId(null);
  };

  // Toggle entry done status
  const handleToggleEntry = (entryId: string) => {
    onPlaySound?.('click');
    const currentList = dayEntries[selectedDateStr] || [];
    const updatedList = currentList.map((e) => (e.id === entryId ? { ...e, isDone: !e.isDone } : e));
    saveDayEntries({
      ...dayEntries,
      [selectedDateStr]: updatedList,
    });
  };

  // Delete entry
  const handleDeleteEntry = (entryId: string) => {
    onPlaySound?.('click');
    const currentList = dayEntries[selectedDateStr] || [];
    const updatedList = currentList.filter((e) => e.id !== entryId);
    saveDayEntries({
      ...dayEntries,
      [selectedDateStr]: updatedList,
    });
  };

  // Selected day info
  const selectedDayType = getDayType(selectedDateStr, selectedDay);
  const selectedDayEntriesList = dayEntries[selectedDateStr] || [];

  // Day of week name for arbitrary date
  const getDayOfWeekName = (year: number, month: number, day: number) => {
    const d = new Date(year, month, day);
    return ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][d.getDay()];
  };

  return (
    <aside 
      className={`w-64 sm:w-72 md:w-80 flex flex-col justify-between p-2.5 text-xs select-none font-mono shrink-0 overflow-y-auto transition-all duration-300 ${
        isModern
          ? 'bg-[#091122]/45 backdrop-blur-xl border-r border-cyan-500/20 shadow-2xl'
          : 'bg-[#0e1115]/90 backdrop-blur-xs border-r border-[#2b2518]'
      }`}
    >
      <div className="space-y-2.5">
        {/* 1. Medical Shift Timers Card */}
        <div 
          className={`rounded-xl p-2 space-y-1.5 transition-all ${
            isModern
              ? 'border border-cyan-500/30 bg-[#0b162c]/50 backdrop-blur-md shadow-lg shadow-cyan-950/20'
              : 'border border-[#3b3220] bg-[#14181d] shadow-sm'
          }`}
        >
          <div 
            className={`flex items-center justify-between pb-1 border-b text-[10px] ${
              isModern ? 'border-cyan-500/25 text-cyan-300' : 'border-[#2b2518] text-slate-400'
            }`}
          >
            <span className={`font-bold uppercase tracking-wider ${isModern ? 'text-cyan-200' : 'text-slate-300'}`}>
              Расписание смены
            </span>
            <button 
              onClick={() => onOpenSettingsTab?.('🕒 РАСПИСАНИЕ')}
              className={`${isModern ? 'text-cyan-300 hover:text-cyan-100 hover:underline' : 'text-[#d4af37] hover:underline'} cursor-pointer`}
            >
              Настроить
            </button>
          </div>

          <div className="space-y-1">
            {timers.map((t) => {
              const state = calculateTimerState(
                t.targetTime,
                t.status,
                cityClock.hours,
                cityClock.minutes,
                cityClock.seconds,
                false,
                t.lastDoneDate,
                cityClock.dateStr
              );
              const isDone = state.effectiveStatus === 'done';
              const isExpired = state.isExpiredToday;

              return (
                <div
                  key={t.id}
                  onClick={() => handleToggleTimer(t.id)}
                  className={`grid grid-cols-[1fr_38px_56px] items-center gap-1.5 px-2 py-1 rounded text-[11px] cursor-pointer transition ${
                    isDone
                      ? isModern
                        ? 'bg-[#0c1527]/30 text-slate-500 line-through opacity-50 hover:opacity-80'
                        : 'bg-[#1a1e24]/40 text-slate-500 line-through opacity-60 hover:opacity-90 hover:bg-[#1a1e24]/70'
                      : state.isAlmostDue
                      ? isModern
                        ? 'bg-amber-500/20 border border-amber-400/60 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                        : 'bg-[#221c10] border border-[#ffcc00]/50 text-[#ffcc00] hover:bg-[#2e2616]'
                      : isModern
                        ? 'bg-[#0d1c36]/60 border border-cyan-500/15 text-slate-100 hover:border-cyan-400/40 hover:bg-[#112444]/80'
                        : 'bg-[#181d24] text-slate-200 hover:bg-[#202731]'
                  }`}
                  title={`Контрольная точка: ${t.name} (${t.targetTime}). ${isDone ? 'Истёк или выполнен (включится автоматически после 00:00)' : 'Активен'}. Нажмите для ручного переключения.`}
                >
                  <span className={`truncate text-left font-sans text-[11px] ${isDone ? 'line-through text-slate-500' : ''}`} title={t.name}>{t.name}</span>
                  <span className={`${isModern ? 'text-cyan-400/70' : 'text-slate-400'} font-bold text-center tabular-nums text-[10px]`}>{t.targetTime}</span>
                  <span className={`font-bold text-right tabular-nums tracking-tight font-mono text-[10px] ${
                    isDone 
                      ? 'text-slate-500 font-normal' 
                      : state.isAlmostDue
                      ? (isModern ? 'text-amber-300 animate-pulse drop-shadow-[0_0_4px_rgba(245,158,11,0.6)]' : 'text-[#ffcc00] animate-pulse')
                      : (isModern ? 'text-cyan-300 drop-shadow-[0_0_4px_rgba(56,189,248,0.5)]' : 'text-[#38bdf8]')
                  }`}>
                    {isDone ? (isExpired ? 'истёк' : 'done') : state.formattedCountdown}
                  </span>
                </div>
              );
            })}
            {timers.length === 0 && (
              <div className="text-center py-2 text-slate-500 text-[10px]">
                Нет активных таймеров
              </div>
            )}
          </div>
        </div>

        {/* 2. Live Weather Block with customizable city */}
        <div className={isModern ? 'rounded-xl overflow-hidden border border-cyan-500/30 bg-[#0b162c]/50 backdrop-blur-md shadow-lg shadow-cyan-950/20' : ''}>
          <WeatherWidget onPlaySound={onPlaySound} />
        </div>

        {/* 3. Shift Calendar Matrix (Current Month & Navigation) */}
        <div 
          className={`rounded-xl p-2 shadow-sm space-y-1.5 transition-all ${
            isModern
              ? 'border border-cyan-500/30 bg-[#0b162c]/50 backdrop-blur-md shadow-lg shadow-cyan-950/20'
              : 'border border-[#3b3220] bg-[#14181d]'
          }`}
        >
          <div 
            className={`flex items-center justify-between text-[10px] font-bold pb-1 border-b ${
              isModern ? 'border-cyan-500/25 text-slate-200' : 'border-[#2b2518] text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className={`p-0.5 rounded cursor-pointer transition ${
                  isModern ? 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40' : 'text-slate-400 hover:text-white hover:bg-[#252c38]'
                }`}
                title="Предыдущий месяц"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className={`uppercase tracking-wide font-mono ${
                isModern ? 'text-cyan-300' : 'text-[#ffcc00]'
              }`}>
                {MONTH_NAMES_RU[viewMonth]} {viewYear}
              </span>
              <button
                onClick={handleNextMonth}
                className={`p-0.5 rounded cursor-pointer transition ${
                  isModern ? 'text-slate-300 hover:text-cyan-300 hover:bg-cyan-950/40' : 'text-slate-400 hover:text-white hover:bg-[#252c38]'
                }`}
                title="Следующий месяц"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleGoToToday}
                className={`text-[9px] px-1.5 py-0.5 rounded border cursor-pointer transition ${
                  isModern 
                    ? 'bg-cyan-950/40 hover:bg-cyan-500 hover:text-black text-cyan-200 border-cyan-500/40' 
                    : 'bg-[#252c38] hover:bg-[#ffcc00] hover:text-black text-slate-300 border-[#3b3220]'
                }`}
                title="Перейти к сегодняшнему числу"
              >
                Сегодня ({todayDate})
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsLocked(!isLocked);
                  onPlaySound?.('click');
                }}
                className={`p-0.5 rounded border cursor-pointer transition flex items-center justify-center ${
                  isLocked 
                    ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border-rose-500/30' 
                    : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-500/30'
                }`}
                title={isLocked ? "Разблокировать изменение цвета дат кликами" : "Заблокировать изменение цвета дат кликами"}
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                ) : (
                  <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 pb-0.5">
            <span>Пн</span>
            <span>Вт</span>
            <span>Ср</span>
            <span>Чт</span>
            <span>Пт</span>
            <span className={isModern ? 'text-cyan-300/80' : 'text-slate-300'}>Сб</span>
            <span className={isModern ? 'text-cyan-300/80' : 'text-slate-300'}>Вс</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={idx}
                    className="h-7 rounded flex items-center justify-center text-[11px] bg-transparent text-slate-700 select-none"
                  >
                    {item.day}
                  </div>
                );
              }

              const isToday = item.isToday;
              const isSelected = item.day === selectedDay;
              const dayType = getDayType(item.dateStr, item.day, true);

              let bgClass = isModern 
                ? 'bg-[#0c182e]/60 text-slate-200 hover:bg-[#122444] border border-cyan-500/10' 
                : 'bg-[#181d24] text-slate-300 hover:bg-[#252c38]';
              if (dayType === 'day-off') {
                bgClass = isModern
                  ? 'bg-emerald-500/40 text-emerald-100 font-black hover:bg-emerald-500/60 border border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                  : 'bg-[#22c55e] text-black font-black hover:bg-[#16a34a] shadow-xs';
              } else if (dayType === 'event') {
                bgClass = isModern
                  ? 'bg-rose-500/40 text-rose-100 font-black hover:bg-rose-500/60 border border-rose-400/60 shadow-[0_0_8px_rgba(244,63,94,0.35)]'
                  : 'bg-[#ef4444] text-white font-black hover:bg-[#dc2626] shadow-xs';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(item)}
                  className={`h-7 rounded flex items-center justify-center cursor-pointer transition text-[11px] relative font-bold ${bgClass}`}
                  title={`${item.day} ${MONTH_NAMES_GENITIVE[viewMonth]} (${getDayOfWeekName(viewYear, viewMonth, item.day)}): ${
                    dayType === 'day-off' ? 'Выходной (зеленый)' : dayType === 'event' ? 'Событие (красное)' : 'Рабочий день'
                  }${isToday ? ' • СЕГОДНЯ' : ''}`}
                >
                  {/* Selected Day Blue Highlight Outline */}
                  {isSelected && (
                    <span 
                      className={`absolute -inset-[2px] rounded border-2 ${
                        isModern 
                          ? 'border-[#00f0ff] shadow-[0_0_12px_#00f0ff,inset_0_0_6px_rgba(0,240,255,0.5)]' 
                          : 'border-[#00e5ff] shadow-[0_0_10px_#00e5ff,inset_0_0_4px_rgba(0,229,255,0.4)]'
                      } pointer-events-none z-20`}
                    />
                  )}

                  {/* For today: neon cyan indicator in modern mode, yellow in classic */}
                  {isToday && (
                    <span 
                      className={`absolute inset-[2px] rounded-xs pointer-events-none border-2 z-10 ${
                        isModern 
                          ? 'border-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' 
                          : 'border-[#facc15] shadow-[0_0_4px_rgba(250,204,21,0.6)]'
                      }`}
                      title="Сегодня"
                    />
                  )}
                  <span className="relative z-10">{item.day}</span>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div 
            className={`grid grid-cols-4 gap-1 text-[9px] pt-1.5 px-0.5 border-t ${
              isModern ? 'border-cyan-500/20 text-slate-300' : 'border-[#232933] text-slate-400'
            }`}
          >
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-xs ${isModern ? 'bg-[#0c182e] border border-cyan-500/30' : 'bg-[#181d24] border border-[#444]'}`}></span> Раб.
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-xs ${isModern ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-[#22c55e]'}`}></span> Выходн.
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-xs ${isModern ? 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.8)]' : 'bg-[#ef4444]'}`}></span> Событие
            </span>
            <span className="flex items-center gap-1">
              <span className={`w-2 h-2 rounded-xs border-2 ${isModern ? 'border-cyan-400' : 'border-[#facc15]'}`}></span> Сегодня
            </span>
          </div>
        </div>

        {/* 4. Daily Notes / Entries Panel for Selected Day */}
        <div 
          className={`rounded-xl p-2.5 shadow-sm space-y-2 font-mono transition-all ${
            isModern 
              ? 'border border-cyan-500/30 bg-[#0b162c]/50 backdrop-blur-md shadow-lg shadow-cyan-950/20' 
              : 'border border-[#3b3220] bg-[#14181d]'
          }`}
        >
          {/* Header of selected day */}
          <div className={`flex items-center justify-between pb-1.5 border-b ${
            isModern ? 'border-cyan-500/25' : 'border-[#2b2518]'
          }`}>
            <div className="flex items-center gap-1.5 text-slate-200">
              <CalendarIcon className={`w-3.5 h-3.5 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
              <span className={`font-bold text-[11px] ${isModern ? 'text-cyan-100' : 'text-white'}`}>
                {selectedDay} {MONTH_NAMES_GENITIVE[viewMonth]} ({getDayOfWeekName(viewYear, viewMonth, selectedDay)})
              </span>
              {isSelectedDateToday && (
                <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                  isModern 
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-black shadow-[0_0_8px_rgba(251,191,36,0.5)]' 
                    : 'bg-[#facc15] text-black'
                }`}>
                  Сегодня
                </span>
              )}
            </div>

            {/* Current day status badge */}
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                selectedDayType === 'day-off'
                  ? isModern
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                    : 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50'
                  : selectedDayType === 'event'
                  ? isModern
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]'
                    : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/50'
                  : isModern
                    ? 'bg-[#0d1c36]/60 text-slate-300 border border-cyan-500/30'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {selectedDayType === 'day-off' ? '🟢 Выходной' : selectedDayType === 'event' ? '🔴 Событие' : '⚪ Рабочий'}
            </span>
          </div>

          {/* Quick status switch buttons */}
          <div className={`grid grid-cols-3 gap-1 text-[10px] transition-all duration-200 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
            <button
              disabled={isLocked}
              onClick={() => handleSetDayType('work-office')}
              className={`py-1 px-1 rounded text-center font-bold transition border ${
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedDayType === 'work'
                  ? isModern
                    ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                    : 'bg-[#1f2937] text-white border-slate-400'
                  : isModern
                    ? 'bg-[#0a1424]/60 text-slate-400 border-cyan-500/20 hover:bg-[#112444]'
                    : 'bg-[#12161c] text-slate-400 border-[#2b2518] hover:bg-[#1c222b]'
              }`}
              title={isLocked ? "Разблокируйте замок календаря для изменения" : "Переключить на рабочий день"}
            >
              ⚪ Рабочий
            </button>
            <button
              disabled={isLocked}
              onClick={() => handleSetDayType('day-off')}
              className={`py-1 px-1 rounded text-center font-bold transition border ${
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedDayType === 'day-off'
                  ? isModern
                    ? 'bg-emerald-500/40 text-emerald-200 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    : 'bg-[#15803d] text-white border-[#22c55e]'
                  : isModern
                    ? 'bg-[#0a1424]/60 text-slate-400 border-cyan-500/20 hover:bg-[#112444]'
                    : 'bg-[#12161c] text-[#22c55e] border-[#2b2518] hover:bg-[#15803d]/20'
              }`}
              title={isLocked ? "Разблокируйте замок календаря для изменения" : "Переключить на выходной"}
            >
              🟢 Выходной
            </button>
            <button
              disabled={isLocked}
              onClick={() => handleSetDayType('event')}
              className={`py-1 px-1 rounded text-center font-bold transition border ${
                isLocked ? 'cursor-not-allowed' : 'cursor-pointer'
              } ${
                selectedDayType === 'event'
                  ? isModern
                    ? 'bg-rose-500/40 text-rose-200 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                    : 'bg-[#b91c1c] text-white border-[#ef4444]'
                  : isModern
                    ? 'bg-[#0a1424]/60 text-slate-400 border-cyan-500/20 hover:bg-[#112444]'
                    : 'bg-[#12161c] text-[#ef4444] border-[#2b2518] hover:bg-[#b91c1c]/20'
              }`}
              title={isLocked ? "Разблокируйте замок календаря для изменения" : "Переключить на событие"}
            >
              🔴 Событие
            </button>
          </div>

          {/* Entries list for the day */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {selectedDayEntriesList.map((entry) => {
              const isEditing = editingEntryId === entry.id;

              if (isEditing) {
                return (
                  <div
                    key={entry.id}
                    className={`p-1.5 rounded space-y-1 shadow-inner text-xs ${
                      isModern 
                        ? 'bg-[#0b1426] border border-cyan-400' 
                        : 'bg-[#0b0e12] border border-[#ffcc00]'
                    }`}
                  >
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(entry.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      placeholder="Текст записи..."
                      autoFocus
                      className={`w-full rounded px-1.5 py-1 text-[11px] focus:outline-hidden ${
                        isModern
                          ? 'bg-[#080f1d] border border-cyan-500/40 text-slate-100 focus:border-cyan-300'
                          : 'bg-[#161a22] border border-[#3b3220] text-slate-100 focus:border-[#ffcc00]'
                      }`}
                    />
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      <input
                        type="text"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit(entry.id);
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        placeholder="Время (напр. 14:30)"
                        className={`w-24 rounded px-1.5 py-0.5 text-[10px] focus:outline-hidden ${
                          isModern
                            ? 'bg-[#080f1d] border border-cyan-500/40 text-slate-200 focus:border-cyan-300'
                            : 'bg-[#161a22] border border-[#3b3220] text-slate-200 focus:border-[#ffcc00]'
                        }`}
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSaveEdit(entry.id)}
                          className="px-2 py-0.5 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold rounded text-[10px] flex items-center gap-1 cursor-pointer transition"
                          title="Сохранить изменения (Enter)"
                        >
                          <Check className="w-3 h-3" /> Сохранить
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-slate-400 hover:text-white bg-[#1c222b] hover:bg-[#2b3543] rounded cursor-pointer transition"
                          title="Отмена (Esc)"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={entry.id}
                  className={`group flex items-center justify-between gap-1.5 p-1.5 rounded text-[11px] border transition ${
                    entry.isDone
                      ? isModern
                        ? 'bg-[#0a1424]/30 border-transparent text-slate-500'
                        : 'bg-[#12161d] border-transparent text-slate-500'
                      : isModern
                        ? 'bg-[#0d1c36]/60 border-cyan-500/20 text-slate-200 hover:border-cyan-400/40'
                        : 'bg-[#181e26] border-[#2c3442] text-slate-200 hover:border-slate-500'
                  }`}
                >
                  <button
                    onClick={() => handleToggleEntry(entry.id)}
                    className="text-slate-400 hover:text-cyan-300 cursor-pointer shrink-0"
                    title={entry.isDone ? 'Снять отметку' : 'Отметить выполненным'}
                  >
                    {entry.isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300" />
                    )}
                  </button>

                  <div
                    onClick={() => handleStartEdit(entry)}
                    className={`flex-1 min-w-0 font-sans leading-tight cursor-pointer hover:text-white transition ${
                      entry.isDone ? 'line-through' : ''
                    }`}
                    title="Нажмите, чтобы отредактировать"
                  >
                    <span className="text-[11px] break-words">{entry.text}</span>
                    {entry.time && (
                      <span className={`text-[9px] font-mono ml-1.5 px-1 py-0.2 rounded ${
                        isModern 
                          ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-500/30' 
                          : 'text-[#ffcc00] bg-[#202732]'
                      }`}>
                        {entry.time}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleStartEdit(entry)}
                      className={`p-1 rounded cursor-pointer transition ${
                        isModern
                          ? 'text-slate-400 hover:text-cyan-300 bg-[#0a1424] hover:bg-cyan-950'
                          : 'text-slate-400 hover:text-[#ffcc00] bg-[#14181f] hover:bg-[#202733]'
                      }`}
                      title="Редактировать запись"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 bg-[#14181f] hover:bg-rose-500/20 rounded cursor-pointer transition"
                      title="Удалить запись"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {selectedDayEntriesList.length === 0 && (
              <div className={`py-2.5 text-center text-slate-500 text-[10px] font-sans rounded border border-dashed ${
                isModern ? 'bg-[#070f1e]/40 border-cyan-500/20' : 'bg-[#0f1217] border-[#2b2518]'
              }`}>
                Нет записей на этот день
              </div>
            )}
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-1 text-[9px]">
            <button
              onClick={() => handleAddEntry('Суточный обход ОРИТ (08:30)')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                isModern
                  ? 'bg-[#0d1c36]/80 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                  : 'bg-[#1c222b] hover:bg-[#283243] text-slate-300 border border-[#333]'
              }`}
            >
              + Обход
            </button>
            <button
              onClick={() => handleAddEntry('Консилиум кардиологов (14:00)')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                isModern
                  ? 'bg-[#0d1c36]/80 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                  : 'bg-[#1c222b] hover:bg-[#283243] text-slate-300 border border-[#333]'
              }`}
            >
              + Консилиум
            </button>
            <button
              onClick={() => handleAddEntry('Дежурство по приёмному отделению')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                isModern
                  ? 'bg-[#0d1c36]/80 hover:bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                  : 'bg-[#1c222b] hover:bg-[#283243] text-slate-300 border border-[#333]'
              }`}
            >
              + Дежурство
            </button>
          </div>

          {/* Input field to add entry */}
          <div className="flex items-center gap-1 pt-1">
            <input
              type="text"
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddEntry();
              }}
              placeholder="Добавить запись / процедуру..."
              className={`flex-1 rounded px-2 py-1 text-[11px] placeholder-slate-500 focus:outline-hidden transition ${
                isModern
                  ? 'bg-[#070e1a]/80 border border-cyan-500/30 text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40'
                  : 'bg-[#0b0e12] border border-[#3b3220] text-slate-200 focus:border-[#ffcc00]'
              }`}
            />
            <button
              onClick={() => handleAddEntry()}
              disabled={!newEntryText.trim()}
              className={`p-1.5 font-bold rounded cursor-pointer transition shrink-0 ${
                isModern
                  ? 'bg-cyan-400 hover:bg-cyan-300 text-black disabled:bg-slate-800 disabled:text-slate-600 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                  : 'bg-[#ffcc00] disabled:bg-slate-800 text-black disabled:text-slate-600'
              }`}
              title="Добавить запись"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Bottom Quick Launcher Buttons (Configurable 3 bookmarks: http / file / folder) */}
      <div className={`pt-2 mt-2 relative ${isModern ? 'border-t border-cyan-500/20' : 'border-t border-[#2b2518]'}`}>
        <div className="flex items-center justify-between pb-1 text-[10px] text-slate-400 font-mono">
          <span className={`font-bold uppercase tracking-wider text-[9px] ${isModern ? 'text-cyan-400/80' : 'text-slate-500'}`}>
            Быстрый доступ
          </span>
          <button
            onClick={() => {
              setIsBookmarksSettingsOpen(true);
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-1 cursor-pointer transition text-[10px] ${
              isModern ? 'text-cyan-300 hover:text-white' : 'text-[#ffcc00] hover:text-white'
            }`}
            title="Настроить 3 кнопки быстрого доступа"
          >
            <Settings className={`w-3 h-3 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
            <span>Настроить</span>
          </button>
        </div>

        {/* Feedback Toast / Helper when file or folder is clicked */}
        {launcherFeedback && (
          <div className={`mb-1.5 p-1.5 rounded text-[10px] text-slate-200 flex items-center justify-between animate-in fade-in shadow-md ${
            isModern 
              ? 'bg-[#0c182e]/90 border border-cyan-400/50 shadow-cyan-950/50' 
              : 'bg-[#161b22] border border-[#ffcc00]/50'
          }`}>
            <div className="flex items-center gap-1.5 min-w-0">
              <Info className={`w-3.5 h-3.5 shrink-0 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`} />
              <span className="truncate">{launcherFeedback.message}</span>
            </div>
            <button
              onClick={() => setLauncherFeedback(null)}
              className="p-0.5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 text-center text-slate-300 font-mono text-[11px]">
          {(bookmarks ?? []).filter(bm => bm && (bm.title || bm.url)).slice(0, 3).map((bm, bIdx) => {
            const isFile = bm.type === 'file';
            const isFolder = bm.type === 'folder';
            return (
              <button
                key={bm.id || bIdx}
                id={`btn-bookmark-${bIdx + 1}`}
                onClick={() => handleLaunchBookmark(bm)}
                className={`py-1.5 px-1 rounded border transition cursor-pointer active:scale-95 text-slate-200 flex items-center justify-center gap-1 group truncate ${
                  isModern
                    ? isFile
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                      : isFolder
                      ? 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.2)]'
                      : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400/50 shadow-[0_0_8px_rgba(56,189,248,0.2)]'
                    : isFile
                    ? 'bg-[#221c10] hover:bg-[#2e2616] border-[#ffcc00]/40 hover:border-[#ffcc00]'
                    : isFolder
                    ? 'bg-[#15231a] hover:bg-[#1f3327] border-[#22c55e]/40 hover:border-[#22c55e]'
                    : 'bg-[#1c222b] hover:bg-[#2b3543] border-[#3b3220] hover:border-slate-500'
                }`}
                title={`${bm.title} (${bm.type === 'file' ? 'Файл/Ярлык' : bm.type === 'folder' ? 'Папка в проводнике' : 'Web-ссылка'}): ${bm.url}`}
              >
                {isFile ? (
                  <FileCode className={`w-3 h-3 shrink-0 ${isModern ? 'text-amber-300' : 'text-[#ffcc00]'}`} />
                ) : isFolder ? (
                  <Folder className={`w-3 h-3 shrink-0 ${isModern ? 'text-emerald-300' : 'text-[#22c55e]'}`} />
                ) : (
                  <Globe className={`w-3 h-3 shrink-0 ${isModern ? 'text-cyan-300' : 'text-[#38bdf8]'}`} />
                )}
                <span className="truncate font-bold">{bm.title || `Кнопка ${bIdx + 1}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Modal for Bottom 3 Bookmarks */}
      {isBookmarksSettingsOpen && (
        <BottomBookmarksSettingsModal
          isOpen={isBookmarksSettingsOpen}
          onClose={() => setIsBookmarksSettingsOpen(false)}
          bookmarks={bookmarks ?? []}
          onSaveBookmarks={(updated) => {
            onUpdateBookmarks?.(updated);
          }}
          appStyle={appStyle}
          onPlaySound={onPlaySound}
        />
      )}
    </aside>
  );
};

