import { useState, useEffect, useCallback } from 'react';

export const STORAGE_CITY_KEY = 'belkindesk_weather_city';
export const STORAGE_TIMEZONE_KEY = 'belkindesk_timezone';
export const EVENT_CITY_TIMEZONE_CHANGE = 'belkindesk_city_timezone_change';

export const DEFAULT_CITY = 'Пушкино';
export const DEFAULT_TIMEZONE = 'Europe/Moscow';

// Rich dictionary of popular Russian, CIS, and world cities with standard IANA timezones
export const KNOWN_CITIES_TIMEZONES: Record<string, { timeZone: string; label: string; offsetLabel: string }> = {
  'пушкино': { timeZone: 'Europe/Moscow', label: 'Пушкино (Московская обл.)', offsetLabel: 'UTC+3' },
  'москва': { timeZone: 'Europe/Moscow', label: 'Москва', offsetLabel: 'UTC+3' },
  'санкт-петербург': { timeZone: 'Europe/Moscow', label: 'Санкт-Петербург', offsetLabel: 'UTC+3' },
  'спб': { timeZone: 'Europe/Moscow', label: 'Санкт-Петербург', offsetLabel: 'UTC+3' },
  'калининград': { timeZone: 'Europe/Kaliningrad', label: 'Калининград', offsetLabel: 'UTC+2' },
  'самара': { timeZone: 'Europe/Samara', label: 'Самара', offsetLabel: 'UTC+4' },
  'тольятти': { timeZone: 'Europe/Samara', label: 'Тольятти', offsetLabel: 'UTC+4' },
  'саратов': { timeZone: 'Europe/Saratov', label: 'Саратов', offsetLabel: 'UTC+4' },
  'волгоград': { timeZone: 'Europe/Volgograd', label: 'Волгоград', offsetLabel: 'UTC+3' },
  'казань': { timeZone: 'Europe/Moscow', label: 'Казань', offsetLabel: 'UTC+3' },
  'нижний новгород': { timeZone: 'Europe/Moscow', label: 'Нижний Новгород', offsetLabel: 'UTC+3' },
  'ростов-на-дону': { timeZone: 'Europe/Moscow', label: 'Ростов-на-Дону', offsetLabel: 'UTC+3' },
  'краснодар': { timeZone: 'Europe/Moscow', label: 'Краснодар', offsetLabel: 'UTC+3' },
  'сочи': { timeZone: 'Europe/Moscow', label: 'Сочи', offsetLabel: 'UTC+3' },
  'воронеж': { timeZone: 'Europe/Moscow', label: 'Воронеж', offsetLabel: 'UTC+3' },
  'уфа': { timeZone: 'Asia/Yekaterinburg', label: 'Уфа', offsetLabel: 'UTC+5' },
  'пермь': { timeZone: 'Asia/Yekaterinburg', label: 'Пермь', offsetLabel: 'UTC+5' },
  'екатеринбург': { timeZone: 'Asia/Yekaterinburg', label: 'Екатеринбург', offsetLabel: 'UTC+5' },
  'челябинск': { timeZone: 'Asia/Yekaterinburg', label: 'Челябинск', offsetLabel: 'UTC+5' },
  'тюмень': { timeZone: 'Asia/Yekaterinburg', label: 'Тюмень', offsetLabel: 'UTC+5' },
  'омск': { timeZone: 'Asia/Omsk', label: 'Омск', offsetLabel: 'UTC+6' },
  'новосибирск': { timeZone: 'Asia/Novosibirsk', label: 'Новосибирск', offsetLabel: 'UTC+7' },
  'томск': { timeZone: 'Asia/Tomsk', label: 'Томск', offsetLabel: 'UTC+7' },
  'барнаул': { timeZone: 'Asia/Barnaul', label: 'Барнаул', offsetLabel: 'UTC+7' },
  'кемерово': { timeZone: 'Asia/Novokuznetsk', label: 'Кемерово', offsetLabel: 'UTC+7' },
  'красноярск': { timeZone: 'Asia/Krasnoyarsk', label: 'Красноярск', offsetLabel: 'UTC+7' },
  'норильск': { timeZone: 'Asia/Krasnoyarsk', label: 'Норильск', offsetLabel: 'UTC+7' },
  'иркутск': { timeZone: 'Asia/Irkutsk', label: 'Иркутск', offsetLabel: 'UTC+8' },
  'улан-удэ': { timeZone: 'Asia/Irkutsk', label: 'Улан-Удэ', offsetLabel: 'UTC+8' },
  'чита': { timeZone: 'Asia/Chita', label: 'Чита', offsetLabel: 'UTC+9' },
  'якутск': { timeZone: 'Asia/Yakutsk', label: 'Якутск', offsetLabel: 'UTC+9' },
  'владивосток': { timeZone: 'Asia/Vladivostok', label: 'Владивосток', offsetLabel: 'UTC+10' },
  'хабаровск': { timeZone: 'Asia/Vladivostok', label: 'Хабаровск', offsetLabel: 'UTC+10' },
  'находка': { timeZone: 'Asia/Vladivostok', label: 'Находка', offsetLabel: 'UTC+10' },
  'южно-сахалинск': { timeZone: 'Asia/Sakhalin', label: 'Южно-Сахалинск', offsetLabel: 'UTC+11' },
  'магадан': { timeZone: 'Asia/Magadan', label: 'Магадан', offsetLabel: 'UTC+11' },
  'петропавловск-камчатский': { timeZone: 'Asia/Kamchatka', label: 'Петропавловск-Камчатский', offsetLabel: 'UTC+12' },
  'анадырь': { timeZone: 'Asia/Anadyr', label: 'Анадырь', offsetLabel: 'UTC+12' },
  'минск': { timeZone: 'Europe/Minsk', label: 'Минск', offsetLabel: 'UTC+3' },
  'алматы': { timeZone: 'Asia/Almaty', label: 'Алматы', offsetLabel: 'UTC+5' },
  'астана': { timeZone: 'Asia/Almaty', label: 'Астана', offsetLabel: 'UTC+5' },
  'ташкент': { timeZone: 'Asia/Tashkent', label: 'Ташкент', offsetLabel: 'UTC+5' },
  'бишкек': { timeZone: 'Asia/Bishkek', label: 'Бишкек', offsetLabel: 'UTC+6' },
  'душанбе': { timeZone: 'Asia/Dushanbe', label: 'Душанбе', offsetLabel: 'UTC+5' },
  'ереван': { timeZone: 'Asia/Yerevan', label: 'Ереван', offsetLabel: 'UTC+4' },
  'баку': { timeZone: 'Asia/Baku', label: 'Баку', offsetLabel: 'UTC+4' },
  'тбилиси': { timeZone: 'Asia/Tbilisi', label: 'Тбилиси', offsetLabel: 'UTC+4' },
  'дубай': { timeZone: 'Asia/Dubai', label: 'Дубай', offsetLabel: 'UTC+4' },
  'стамбул': { timeZone: 'Europe/Istanbul', label: 'Стамбул', offsetLabel: 'UTC+3' },
  'лондон': { timeZone: 'Europe/London', label: 'Лондон', offsetLabel: 'UTC+0/+1' },
  'париж': { timeZone: 'Europe/Paris', label: 'Париж', offsetLabel: 'UTC+1/+2' },
  'берлин': { timeZone: 'Europe/Berlin', label: 'Берлин', offsetLabel: 'UTC+1/+2' },
  'рим': { timeZone: 'Europe/Rome', label: 'Рим', offsetLabel: 'UTC+1/+2' },
  'нью-йорк': { timeZone: 'America/New_York', label: 'Нью-Йорк', offsetLabel: 'UTC-5/-4' },
  'лос-анджелес': { timeZone: 'America/Los_Angeles', label: 'Лос-Анджелес', offsetLabel: 'UTC-8/-7' },
  'пекин': { timeZone: 'Asia/Shanghai', label: 'Пекин', offsetLabel: 'UTC+8' },
  'токио': { timeZone: 'Asia/Tokyo', label: 'Токио', offsetLabel: 'UTC+9' },
};

export const POPULAR_CITY_PRESETS = [
  { name: 'Пушкино', tz: 'Europe/Moscow', note: 'UTC+3' },
  { name: 'Москва', tz: 'Europe/Moscow', note: 'UTC+3' },
  { name: 'Санкт-Петербург', tz: 'Europe/Moscow', note: 'UTC+3' },
  { name: 'Калининград', tz: 'Europe/Kaliningrad', note: 'UTC+2' },
  { name: 'Самара', tz: 'Europe/Samara', note: 'UTC+4' },
  { name: 'Екатеринбург', tz: 'Asia/Yekaterinburg', note: 'UTC+5' },
  { name: 'Новосибирск', tz: 'Asia/Novosibirsk', note: 'UTC+7' },
  { name: 'Красноярск', tz: 'Asia/Krasnoyarsk', note: 'UTC+7' },
  { name: 'Иркутск', tz: 'Asia/Irkutsk', note: 'UTC+8' },
  { name: 'Владивосток', tz: 'Asia/Vladivostok', note: 'UTC+10' },
  { name: 'Камчатка', tz: 'Asia/Kamchatka', note: 'UTC+12' },
  { name: 'Дубай', tz: 'Asia/Dubai', note: 'UTC+4' },
  { name: 'Лондон', tz: 'Europe/London', note: 'UTC+0/+1' },
  { name: 'Нью-Йорк', tz: 'America/New_York', note: 'UTC-5/-4' },
  { name: 'Токио', tz: 'Asia/Tokyo', note: 'UTC+9' },
];

/**
 * Resolves standard IANA timezone for a given city name
 */
export function getTimeZoneForCity(city: string): string {
  if (!city) return DEFAULT_TIMEZONE;
  const clean = city.trim().toLowerCase();
  
  // Exact or partial dictionary match
  if (KNOWN_CITIES_TIMEZONES[clean]) {
    return KNOWN_CITIES_TIMEZONES[clean].timeZone;
  }
  
  for (const [key, val] of Object.entries(KNOWN_CITIES_TIMEZONES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val.timeZone;
    }
  }

  // Check stored timezone
  try {
    const storedTz = localStorage.getItem(STORAGE_TIMEZONE_KEY);
    if (storedTz && isValidTimeZone(storedTz)) return storedTz;
  } catch {}

  return DEFAULT_TIMEZONE;
}

export function isValidTimeZone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function getStoredCity(): string {
  try {
    return localStorage.getItem(STORAGE_CITY_KEY) || DEFAULT_CITY;
  } catch {
    return DEFAULT_CITY;
  }
}

export function getStoredTimeZone(): string {
  try {
    const tz = localStorage.getItem(STORAGE_TIMEZONE_KEY);
    if (tz && isValidTimeZone(tz)) return tz;
    const city = getStoredCity();
    return getTimeZoneForCity(city);
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export function setStoredCityAndTimeZone(city: string, timeZone?: string): { city: string; timeZone: string } {
  const resolvedCity = city.trim() || DEFAULT_CITY;
  const resolvedTz = (timeZone && isValidTimeZone(timeZone)) ? timeZone : getTimeZoneForCity(resolvedCity);

  try {
    localStorage.setItem(STORAGE_CITY_KEY, resolvedCity);
    localStorage.setItem(STORAGE_TIMEZONE_KEY, resolvedTz);
  } catch {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_CITY_TIMEZONE_CHANGE, {
        detail: { city: resolvedCity, timeZone: resolvedTz },
      })
    );
  }

  return { city: resolvedCity, timeZone: resolvedTz };
}

const MONTH_NAMES_RU_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
];

const DAY_NAMES_RU = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'
];

const DAY_NAMES_RU_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export interface CityTimeInfo {
  city: string;
  timeZone: string;
  year: number;
  month: number; // 0-11
  day: number; // 1-31
  hours: number; // 0-23
  minutes: number; // 0-59
  seconds: number; // 0-59
  timeStr: string; // "14:50:32"
  timeShort: string; // "14:50"
  dateStr: string; // "YYYY-MM-DD"
  dateRu: string; // "14 августа 2026"
  dayOfWeek: string; // "Пятница"
  dayOfWeekShort: string; // "Пт"
  utcOffsetStr: string; // "UTC+3"
  fullFormatted: string; // "14 авг 2026, 14:50:32"
}

/**
 * Calculates current time parameters for specified timezone
 */
export function getCityTimeInfo(city?: string, customTz?: string, baseDate: Date = new Date()): CityTimeInfo {
  const resolvedCity = city || getStoredCity();
  const resolvedTz = customTz && isValidTimeZone(customTz) ? customTz : (getStoredTimeZone() || getTimeZoneForCity(resolvedCity));

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: resolvedTz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
      timeZoneName: 'short',
    });

    const parts = formatter.formatToParts(baseDate);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }

    const year = parseInt(p.year, 10) || baseDate.getFullYear();
    const month = (parseInt(p.month, 10) || (baseDate.getMonth() + 1)) - 1; // 0-11
    const day = parseInt(p.day, 10) || baseDate.getDate();
    const hours = (parseInt(p.hour, 10) === 24 ? 0 : parseInt(p.hour, 10)) || 0;
    const minutes = parseInt(p.minute, 10) || 0;
    const seconds = parseInt(p.second, 10) || 0;

    // Day of week in city timezone
    const dayFormatter = new Intl.DateTimeFormat('ru-RU', { timeZone: resolvedTz, weekday: 'long' });
    const dayOfWeek = dayFormatter.format(baseDate);
    const dayShortFormatter = new Intl.DateTimeFormat('ru-RU', { timeZone: resolvedTz, weekday: 'short' });
    const dayOfWeekShort = dayShortFormatter.format(baseDate);

    // Calculate UTC offset
    let utcOffsetStr = 'UTC+3';
    try {
      const nowUtc = baseDate.getTime();
      // Date in target timezone
      const localDate = new Date(baseDate.toLocaleString('en-US', { timeZone: resolvedTz }));
      const utcDate = new Date(baseDate.toLocaleString('en-US', { timeZone: 'UTC' }));
      const diffHours = Math.round((localDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60));
      utcOffsetStr = `UTC${diffHours >= 0 ? `+${diffHours}` : diffHours}`;
    } catch {}

    const pad = (n: number) => String(n).padStart(2, '0');
    const timeStr = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    const timeShort = `${pad(hours)}:${pad(minutes)}`;
    const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
    const dateRu = `${day} ${MONTH_NAMES_RU_GENITIVE[month]} ${year}`;
    const fullFormatted = `${day} ${MONTH_NAMES_RU_GENITIVE[month].slice(0, 3)} ${year}, ${timeStr}`;

    return {
      city: resolvedCity,
      timeZone: resolvedTz,
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      timeStr,
      timeShort,
      dateStr,
      dateRu,
      dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
      dayOfWeekShort: dayOfWeekShort.charAt(0).toUpperCase() + dayOfWeekShort.slice(1),
      utcOffsetStr,
      fullFormatted,
    };
  } catch (err) {
    // Fallback if Intl fails
    const pad = (n: number) => String(n).padStart(2, '0');
    const y = baseDate.getFullYear();
    const m = baseDate.getMonth();
    const d = baseDate.getDate();
    const h = baseDate.getHours();
    const min = baseDate.getMinutes();
    const s = baseDate.getSeconds();
    return {
      city: resolvedCity,
      timeZone: DEFAULT_TIMEZONE,
      year: y,
      month: m,
      day: d,
      hours: h,
      minutes: min,
      seconds: s,
      timeStr: `${pad(h)}:${pad(min)}:${pad(s)}`,
      timeShort: `${pad(h)}:${pad(min)}`,
      dateStr: `${y}-${pad(m + 1)}-${pad(d)}`,
      dateRu: `${d} ${MONTH_NAMES_RU_GENITIVE[m]} ${y}`,
      dayOfWeek: DAY_NAMES_RU[baseDate.getDay()],
      dayOfWeekShort: DAY_NAMES_RU_SHORT[baseDate.getDay()],
      utcOffsetStr: 'UTC+3',
      fullFormatted: `${d} ${MONTH_NAMES_RU_GENITIVE[m].slice(0, 3)} ${y}, ${pad(h)}:${pad(min)}:${pad(s)}`,
    };
  }
}

/**
 * Format timestamp in city timezone (e.g. for Notes: "14.08.26 19:45")
 */
export function formatCityTimestamp(date: Date | string = new Date(), timeZone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const info = getCityTimeInfo(undefined, timeZone, d);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yy = String(info.year).slice(2);
  return `${pad(info.day)}.${pad(info.month + 1)}.${yy} ${info.timeShort}`;
}

/**
 * React hook that ticks live every second and updates when city/timezone changes
 */
export function useCityClock(): CityTimeInfo {
  const [city, setCity] = useState<string>(getStoredCity);
  const [timeZone, setTimeZone] = useState<string>(getStoredTimeZone);
  const [timeInfo, setTimeInfo] = useState<CityTimeInfo>(() => getCityTimeInfo(city, timeZone));

  const refreshTime = useCallback(() => {
    const curCity = getStoredCity();
    const curTz = getStoredTimeZone();
    setTimeInfo(getCityTimeInfo(curCity, curTz));
  }, []);

  useEffect(() => {
    // 1. Live second ticker
    const timer = setInterval(refreshTime, 1000);

    // 2. Custom event listener for instant city/tz changes across components
    const handleCityChange = (e: any) => {
      if (e.detail) {
        if (e.detail.city) setCity(e.detail.city);
        if (e.detail.timeZone) setTimeZone(e.detail.timeZone);
      }
      refreshTime();
    };

    // 3. Storage event for multi-tab sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_CITY_KEY || e.key === STORAGE_TIMEZONE_KEY) {
        refreshTime();
      }
    };

    window.addEventListener(EVENT_CITY_TIMEZONE_CHANGE, handleCityChange);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(timer);
      window.removeEventListener(EVENT_CITY_TIMEZONE_CHANGE, handleCityChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshTime]);

  return timeInfo;
}

export interface TimerCalculationResult {
  countdownSeconds: number;
  formattedCountdown: string;
  isPast: boolean;
  isExpiredToday: boolean;
  effectiveStatus: 'done' | 'active';
  isAlmostDue: boolean; // < 15 minutes remaining
}

export function formatSecondsToHms(secs: number): string {
  if (secs <= 0) return '00:00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function parseTargetTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;
  const s = parts[2] ? parseInt(parts[2], 10) || 0 : 0;
  return h * 3600 + m * 60 + s;
}

/**
 * Accurately calculates dynamic timer countdown and status based on current city time.
 * Automatically strikes out expired timers today, and re-enables them after 00:00 midnight!
 */
export function calculateTimerState(
  targetTimeStr: string,
  userStatus: 'done' | 'active' | 'pending' | undefined,
  cityHours: number,
  cityMinutes: number,
  citySeconds: number,
  allowNextDayCountdown: boolean = false,
  lastDoneDate?: string,
  currentDateStr?: string
): TimerCalculationResult {
  const targetSec = parseTargetTimeToSeconds(targetTimeStr);
  const curSec = cityHours * 3600 + cityMinutes * 60 + citySeconds;
  const diff = targetSec - curSec;

  const isPast = diff <= 0;

  // Auto reset: if marked done on a previous date and now it's a new day after 00:00
  const isDoneFromPreviousDay = Boolean(
    userStatus === 'done' &&
    lastDoneDate &&
    currentDateStr &&
    lastDoneDate !== currentDateStr
  );

  // If time has already passed today -> automatic strikeout/done for today
  if (isPast) {
    return {
      countdownSeconds: 0,
      formattedCountdown: 'истёк',
      isPast: true,
      isExpiredToday: true,
      effectiveStatus: 'done',
      isAlmostDue: false,
    };
  }

  // If user explicitly marked it as done for today (not an old day)
  if (userStatus === 'done' && !isDoneFromPreviousDay) {
    return {
      countdownSeconds: 0,
      formattedCountdown: 'done',
      isPast: false,
      isExpiredToday: false,
      effectiveStatus: 'done',
      isAlmostDue: false,
    };
  }

  // Active future timer today (before targetTime)
  return {
    countdownSeconds: diff,
    formattedCountdown: formatSecondsToHms(diff),
    isPast: false,
    isExpiredToday: false,
    effectiveStatus: 'active',
    isAlmostDue: diff <= 900, // <= 15 minutes
  };
}
