import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Briefcase, 
  Home, 
  Coffee, 
  Palmtree, 
  Thermometer, 
  ShieldAlert, 
  Sparkles, 
  CalendarDays,
  Flag,
  Users,
  Edit2,
  X,
  Lock,
  Unlock
} from 'lucide-react';
import { CalendarEvent, WorkDaySchedule, DayShiftType, UserProfile } from '../types';

interface WorkCalendarViewProps {
  currentUser: UserProfile;
  onSaveSchedule: (date: string, schedule: WorkDaySchedule) => void;
  onSaveEvent: (event: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleEventComplete: (id: string) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const SHIFT_TYPES_CONFIG: Record<DayShiftType, { label: string; icon: React.ReactNode; color: string; badgeClass: string }> = {
  'work-office': {
    label: 'Офис',
    icon: <Briefcase className="w-3 h-3" />,
    color: '#3b82f6',
    badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  },
  'work-remote': {
    label: 'Удаленка',
    icon: <Home className="w-3 h-3" />,
    color: '#10b981',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'day-off': {
    label: 'Выходной',
    icon: <Coffee className="w-3 h-3" />,
    color: '#64748b',
    badgeClass: 'bg-slate-700/40 text-slate-400 border-slate-700',
  },
  'vacation': {
    label: 'Отпуск',
    icon: <Palmtree className="w-3 h-3" />,
    color: '#ec4899',
    badgeClass: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  },
  'sick-leave': {
    label: 'Больничный',
    icon: <Thermometer className="w-3 h-3" />,
    color: '#f59e0b',
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  'duty': {
    label: 'Дежурство',
    icon: <ShieldAlert className="w-3 h-3" />,
    color: '#ef4444',
    badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
  },
};

export const WorkCalendarView: React.FC<WorkCalendarViewProps> = ({
  currentUser,
  onSaveSchedule,
  onSaveEvent,
  onDeleteEvent,
  onToggleEventComplete,
  onPlaySound,
}) => {
  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-11
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [isLocked, setIsLocked] = useState<boolean>(true);

  // Modal for adding/editing event
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    title: '',
    time: '12:00',
    type: 'meeting',
    priority: 'medium',
    description: '',
  });

  // Shift editor drawer / popover
  const [isShiftEditorOpen, setIsShiftEditorOpen] = useState(false);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  // Calendar matrix calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Days in month
    const totalDays = lastDayOfMonth.getDate();

    // Day of week for first day (0=Sunday, 1=Monday -> convert to Monday=0, Sunday=6)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Previous month padding
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevD = prevMonthLastDay - i;
      const prevM = currentMonth === 0 ? 12 : currentMonth;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      days.push({
        dateStr: `${prevY}-${String(prevM).padStart(2, '0')}-${String(prevD).padStart(2, '0')}`,
        dayNumber: prevD,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    // Current month days
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month padding to fill complete weeks (42 cells or 35 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = currentMonth === 11 ? 1 : currentMonth + 2;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      days.push({
        dateStr: `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [currentYear, currentMonth, today]);

  // Schedules & Events lookup
  const userSchedules = currentUser.workSchedules || {};
  const userEvents = currentUser.calendarEvents || [];

  // Selected date details
  const selectedDaySchedule = userSchedules[selectedDate] || {
    date: selectedDate,
    shiftType: 'work-office',
    startTime: '09:00',
    endTime: '18:00',
    notes: '',
  };

  const selectedDayEvents = useMemo(() => {
    return userEvents.filter((ev) => ev.date === selectedDate);
  }, [userEvents, selectedDate]);

  // Monthly stats
  const monthStats = useMemo(() => {
    let officeCount = 0;
    let remoteCount = 0;
    let dayOffCount = 0;
    let vacationCount = 0;

    (Object.entries(userSchedules) as [string, WorkDaySchedule][]).forEach(([date, sched]) => {
      const [y, m] = date.split('-').map(Number);
      if (y === currentYear && m === currentMonth + 1 && sched) {
        if (sched.shiftType === 'work-office') officeCount++;
        else if (sched.shiftType === 'work-remote') remoteCount++;
        else if (sched.shiftType === 'day-off') dayOffCount++;
        else if (sched.shiftType === 'vacation') vacationCount++;
      }
    });

    const plannedWorkHours = (officeCount + remoteCount) * 8;

    return { officeCount, remoteCount, dayOffCount, vacationCount, plannedWorkHours };
  }, [userSchedules, currentYear, currentMonth]);

  // Handle shift change
  const handleSetShift = (type: DayShiftType) => {
    if (isLocked) {
      onPlaySound?.('click');
      return;
    }
    onSaveSchedule(selectedDate, {
      ...selectedDaySchedule,
      date: selectedDate,
      shiftType: type,
      startTime: type === 'day-off' || type === 'vacation' ? undefined : selectedDaySchedule.startTime || '09:00',
      endTime: type === 'day-off' || type === 'vacation' ? undefined : selectedDaySchedule.endTime || '18:00',
    });
    onPlaySound?.('click');
  };

  const handleSaveNewEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title?.trim()) return;

    onSaveEvent({
      id: `ev-${Date.now()}`,
      title: newEvent.title.trim(),
      date: selectedDate,
      time: newEvent.time || '12:00',
      type: newEvent.type || 'meeting',
      priority: newEvent.priority || 'medium',
      description: newEvent.description?.trim() || '',
      isCompleted: false,
    });

    setNewEvent({
      title: '',
      time: '12:00',
      type: 'meeting',
      priority: 'medium',
      description: '',
    });
    setIsEventModalOpen(false);
    onPlaySound?.('success');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full bg-slate-950 overflow-hidden font-sans select-none">
      {/* LEFT / CENTER: CALENDAR GRID */}
      <div className="flex-1 flex flex-col border-r border-slate-800/80 overflow-y-auto">
        {/* Calendar Navigation Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CalendarIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-100 font-mono">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h1>
                <button
                  onClick={handleGoToToday}
                  className="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer border border-slate-700"
                >
                  Сегодня
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLocked(!isLocked);
                    onPlaySound?.('click');
                  }}
                  className={`px-2 py-0.5 text-[11px] font-bold rounded flex items-center gap-1 transition cursor-pointer border ${
                    isLocked 
                      ? 'bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border-rose-500/30' 
                      : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-400 border-emerald-500/30'
                  }`}
                  title={isLocked ? "Разблокировать изменение графика" : "Заблокировать изменение графика"}
                >
                  {isLocked ? (
                    <>
                      <Lock className="w-3 h-3 text-rose-400 animate-pulse" />
                      <span>Блок</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3 h-3 text-emerald-400" />
                      <span>Правка</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-400">График смен, рабочие часы и синхронизация задач</p>
            </div>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Предыдущий месяц"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Следующий месяц"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Month Metrics Bar */}
        <div className="px-4 py-2.5 bg-slate-900/30 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Офис: <strong className="text-slate-200">{monthStats.officeCount} дн</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Удаленка: <strong className="text-slate-200">{monthStats.remoteCount} дн</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span> Выходные: <strong className="text-slate-200">{monthStats.dayOffCount} дн</strong>
            </span>
          </div>
          <div className="font-mono text-amber-400 font-semibold">
            План: {monthStats.plannedWorkHours} ч
          </div>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80 text-center text-xs font-semibold text-slate-400 py-2">
          {WEEK_DAYS.map((d, i) => (
            <div key={d} className={i >= 5 ? 'text-amber-500/80' : ''}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-950">
          {calendarDays.map((cell) => {
            const isSelected = cell.dateStr === selectedDate;
            const sched = userSchedules[cell.dateStr];
            const dayEvents = userEvents.filter((ev) => ev.date === cell.dateStr);
            const shiftConfig = sched ? SHIFT_TYPES_CONFIG[sched.shiftType] : null;

            return (
              <div
                key={cell.dateStr}
                onClick={() => {
                  setSelectedDate(cell.dateStr);
                  onPlaySound?.('click');
                }}
                className={`min-h-[90px] sm:min-h-[105px] p-1.5 sm:p-2 border-b border-r border-slate-800/60 flex flex-col justify-between transition cursor-pointer relative group ${
                  cell.isCurrentMonth ? 'bg-slate-950 hover:bg-slate-900/70' : 'bg-slate-950/40 text-slate-600 hover:bg-slate-900/30'
                } ${isSelected ? 'ring-2 ring-amber-500 ring-inset bg-amber-500/5' : ''}`}
              >
                {/* Day number & shift badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold font-mono ${
                      cell.isToday
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                        : cell.isCurrentMonth
                        ? 'text-slate-200'
                        : 'text-slate-600'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {/* Shift marker badge */}
                  {shiftConfig && cell.isCurrentMonth && (
                    <span
                      className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${shiftConfig.badgeClass}`}
                    >
                      {shiftConfig.icon}
                      <span className="hidden sm:inline">{shiftConfig.label}</span>
                    </span>
                  )}
                </div>

                {/* Day Events preview */}
                <div className="space-y-1 mt-1 overflow-hidden">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium truncate flex items-center gap-1 border ${
                        ev.isCompleted
                          ? 'bg-slate-900/80 text-slate-500 line-through border-slate-800'
                          : ev.priority === 'critical'
                          ? 'bg-red-500/20 text-red-300 border-red-500/30'
                          : ev.type === 'meeting'
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{
                        backgroundColor: ev.priority === 'critical' ? '#ef4444' : '#6366f1'
                      }}></span>
                      <span className="truncate">{ev.time ? `${ev.time} ` : ''}{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-slate-400 pl-1 font-mono">
                      +{dayEvents.length - 2} еще
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT SIDE: SELECTED DAY SCHEDULE & AGENDA DETAILS */}
      <div className="w-full lg:w-96 bg-slate-900/90 border-l border-slate-800 flex flex-col h-auto lg:h-full shrink-0 overflow-y-auto">
        {/* Selected Date Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider">
              Выбранный день
            </span>
            <h2 className="text-base font-bold text-slate-100 font-mono">
              {new Date(selectedDate).toLocaleDateString('ru-RU', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </h2>
          </div>

          <button
            onClick={() => setIsEventModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Событие</span>
          </button>
        </div>

        <div className="p-4 space-y-5 flex-1">
          {/* Shift selector panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Тип рабочего графика:</span>
              {isLocked && (
                <span className="text-[10px] text-rose-400 font-mono font-bold flex items-center gap-1 animate-pulse">
                  <Lock className="w-2.5 h-2.5" />
                  <span>Блокировка</span>
                </span>
              )}
            </div>
            <div className={`grid grid-cols-3 gap-1.5 transition-opacity duration-200 ${isLocked ? 'opacity-50' : 'opacity-100'}`}>
              {(Object.keys(SHIFT_TYPES_CONFIG) as DayShiftType[]).map((st) => {
                const conf = SHIFT_TYPES_CONFIG[st];
                const isActive = selectedDaySchedule.shiftType === st;
                return (
                  <button
                    key={st}
                    disabled={isLocked}
                    onClick={() => handleSetShift(st)}
                    className={`p-2 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition ${
                      isLocked ? 'cursor-not-allowed border-slate-900 bg-slate-950/20' : 'cursor-pointer'
                    } ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-xs'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span style={{ color: conf.color }}>{conf.icon}</span>
                    <span className="text-[11px]">{conf.label}</span>
                  </button>
                );
              })}
            </div>
            {isLocked && (
              <p className="text-[10px] text-slate-500 italic text-center">
                🔓 Разблокируйте замок в шапке, чтобы изменить тип графика
              </p>
            )}

            {/* Work hours display */}
            {selectedDaySchedule.shiftType !== 'day-off' && selectedDaySchedule.shiftType !== 'vacation' && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Рабочие часы:
                </span>
                <span className="font-mono font-semibold text-slate-200">
                  {selectedDaySchedule.startTime || '09:00'} — {selectedDaySchedule.endTime || '18:00'} (8ч)
                </span>
              </div>
            )}
          </div>

          {/* Day Events & Tasks list */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
                События и задачи на день ({selectedDayEvents.length})
              </span>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                Событий на этот день не запланировано. Нажмите «+ Событие», чтобы добавить встречу или дедлайн.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 flex items-start justify-between gap-2.5 group hover:border-slate-700 transition"
                  >
                    <button
                      onClick={() => {
                        onToggleEventComplete(ev.id);
                        onPlaySound?.('click');
                      }}
                      className="mt-0.5 text-slate-400 hover:text-amber-400 transition cursor-pointer shrink-0"
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
                          className={`text-xs font-semibold truncate ${
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

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                        {ev.time && (
                          <span className="flex items-center gap-1 font-mono text-amber-400">
                            <Clock className="w-3 h-3" />
                            {ev.time}
                          </span>
                        )}
                        <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {ev.type}
                        </span>
                      </div>

                      {ev.description && (
                        <p className="text-[11px] text-slate-400 mt-1">{ev.description}</p>
                      )}
                    </div>

                    <button
                      onClick={() => onDeleteEvent(ev.id)}
                      className="text-slate-600 hover:text-red-400 p-1 transition opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Удалить событие"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: ADD NEW EVENT */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <h3 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                <span>Добавить событие / задачу</span>
              </h3>
              <button
                onClick={() => setIsEventModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewEvent} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Название события *</label>
                <input
                  type="text"
                  required
                  value={newEvent.title || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  placeholder="Например: Дневной синк команды"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Время начала</label>
                  <input
                    type="time"
                    value={newEvent.time || '10:00'}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Тип события</label>
                  <select
                    value={newEvent.type || 'meeting'}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500 text-xs"
                  >
                    <option value="meeting">Встреча / Синк</option>
                    <option value="deadline">Дедлайн</option>
                    <option value="release">Релиз</option>
                    <option value="review">Код-ревью</option>
                    <option value="task">Рабочая задача</option>
                    <option value="call">Звонок клиенту</option>
                    <option value="personal">Личное</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Приоритет</label>
                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, priority: p })}
                      className={`flex-1 py-1.5 rounded-lg border text-[11px] font-medium transition cursor-pointer capitalize ${
                        newEvent.priority === p
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {p === 'critical' ? 'Критично' : p === 'high' ? 'Высокий' : p === 'medium' ? 'Средний' : 'Низкий'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Описание / Заметки</label>
                <textarea
                  rows={2}
                  value={newEvent.description || ''}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  placeholder="Дополнительные детали встречи..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEventModalOpen(false)}
                  className="px-3 py-1.5 text-slate-400 hover:bg-slate-800 rounded-lg transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 font-semibold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-lg transition shadow"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
