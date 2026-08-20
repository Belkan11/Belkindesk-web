import React, { useState, useEffect, useCallback } from 'react';
import { 
  CloudRain, 
  Sun, 
  Cloud, 
  CloudSun, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  Search, 
  RotateCw, 
  MapPin, 
  Check, 
  X,
  Clock
} from 'lucide-react';
import { 
  getStoredCity, 
  setStoredCityAndTimeZone, 
  useCityClock, 
  getTimeZoneForCity,
  POPULAR_CITY_PRESETS 
} from '../utils/timeZone';

interface WeatherData {
  city: string;
  country?: string;
  temp: number;
  tempMin: number;
  tempMax: number;
  weatherCode: number;
  isDay: boolean;
  sunrise: string;
  sunset: string;
  description: string;
  humidity?: number;
  windSpeed?: number;
  timeZone?: string;
}

// WMO Weather interpretation codes
function getWeatherDescription(code: number): { text: string; icon: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'thunder' | 'snow' | 'fog' } {
  switch (code) {
    case 0:
      return { text: 'Ясно', icon: 'sun' };
    case 1:
    case 2:
      return { text: 'Переменная облачность', icon: 'cloud-sun' };
    case 3:
      return { text: 'Пасмурно', icon: 'cloud' };
    case 45:
    case 48:
      return { text: 'Туман', icon: 'fog' };
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return { text: 'Морось', icon: 'rain' };
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return { text: 'Дождь', icon: 'rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { text: 'Снегопад', icon: 'snow' };
    case 80:
    case 81:
    case 82:
      return { text: 'Ливень', icon: 'rain' };
    case 85:
    case 86:
      return { text: 'Метель', icon: 'snow' };
    case 95:
    case 96:
    case 99:
      return { text: 'Гроза', icon: 'thunder' };
    default:
      return { text: 'Облачно', icon: 'cloud' };
  }
}

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
}

export const WeatherWidget: React.FC<{ onPlaySound?: (type: 'click' | 'success' | 'star') => void }> = ({ onPlaySound }) => {
  const cityClock = useCityClock();
  const [city, setCity] = useState<string>(getStoredCity);
  const [isEditingCity, setIsEditingCity] = useState<boolean>(false);
  const [inputCity, setInputCity] = useState<string>(city);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync internal city state when cityClock changes externally
  useEffect(() => {
    if (cityClock.city && cityClock.city !== city) {
      setCity(cityClock.city);
      setInputCity(cityClock.city);
    }
  }, [cityClock.city, city]);

  const fetchWeather = useCallback(async (searchCity: string) => {
    const trimmed = searchCity.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Geocode city name to lat/lon via Open-Meteo Geocoding API
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        trimmed
      )}&count=1&language=ru&format=json`;
      
      const geoRes = await fetch(geoUrl);
      if (!geoRes.ok) throw new Error('Ошибка геокодирования');
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        throw new Error(`Город "${trimmed}" не найден`);
      }

      const location = geoData.results[0];
      const lat = location.latitude;
      const lon = location.longitude;
      const resolvedName = location.name || trimmed;
      const country = location.country;
      const detectedTimezone = location.timezone || getTimeZoneForCity(resolvedName);

      // 2. Fetch live weather and forecast
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`;

      const weatherRes = await fetch(weatherUrl);
      if (!weatherRes.ok) throw new Error('Ошибка получения погоды');
      const data = await weatherRes.json();

      const resolvedTz = data.timezone || detectedTimezone || getTimeZoneForCity(resolvedName);
      const current = data.current;
      const daily = data.daily;
      const wInfo = getWeatherDescription(current?.weather_code ?? 0);

      const parsed: WeatherData = {
        city: resolvedName,
        country: country,
        temp: Math.round(current?.temperature_2m ?? 18),
        tempMin: Math.round(daily?.temperature_2m_min?.[0] ?? (current?.temperature_2m ?? 18) - 4),
        tempMax: Math.round(daily?.temperature_2m_max?.[0] ?? (current?.temperature_2m ?? 18) + 4),
        weatherCode: current?.weather_code ?? 0,
        isDay: current?.is_day === 1,
        sunrise: formatTime(daily?.sunrise?.[0]),
        sunset: formatTime(daily?.sunset?.[0]),
        description: wInfo.text,
        humidity: current?.relative_humidity_2m ? Math.round(current.relative_humidity_2m) : undefined,
        windSpeed: current?.wind_speed_10m ? Math.round(current.wind_speed_10m) : undefined,
        timeZone: resolvedTz,
      };

      setWeather(parsed);
      setCity(resolvedName);
      
      // Update global city & timezone for entire app
      setStoredCityAndTimeZone(resolvedName, resolvedTz);
    } catch (err: any) {
      console.warn('Weather fetch error:', err);
      setError(err?.message || 'Не удалось загрузить данные');
      // Even on error, update timezone by dictionary if known
      const fallbackTz = getTimeZoneForCity(trimmed);
      setStoredCityAndTimeZone(trimmed, fallbackTz);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount & city change
  useEffect(() => {
    fetchWeather(city);
    // Refresh weather every 30 minutes
    const timer = setInterval(() => {
      fetchWeather(city);
    }, 30 * 60 * 1000);
    return () => clearInterval(timer);
  }, [city, fetchWeather]);

  const handleSaveCity = () => {
    const trimmed = inputCity.trim();
    if (!trimmed) return;
    onPlaySound?.('click');
    setIsEditingCity(false);
    fetchWeather(trimmed);
  };

  const handleCancelCity = () => {
    onPlaySound?.('click');
    setInputCity(city);
    setIsEditingCity(false);
    setError(null);
  };

  const renderWeatherIcon = () => {
    if (!weather) return <CloudRain className="w-5 h-5 text-[#38bdf8] inline-block ml-1" />;
    const { icon } = getWeatherDescription(weather.weatherCode);

    switch (icon) {
      case 'sun':
        return <Sun className="w-5 h-5 text-[#fbbf24] inline-block ml-1 animate-[spin_12s_linear_infinite]" />;
      case 'cloud-sun':
        return <CloudSun className="w-5 h-5 text-[#facc15] inline-block ml-1" />;
      case 'cloud':
        return <Cloud className="w-5 h-5 text-slate-300 inline-block ml-1" />;
      case 'thunder':
        return <CloudLightning className="w-5 h-5 text-amber-400 inline-block ml-1" />;
      case 'snow':
        return <Snowflake className="w-5 h-5 text-sky-200 inline-block ml-1 animate-pulse" />;
      case 'fog':
        return <CloudFog className="w-5 h-5 text-slate-400 inline-block ml-1" />;
      case 'rain':
      default:
        return <CloudRain className="w-5 h-5 text-[#38bdf8] inline-block ml-1 animate-pulse" />;
    }
  };

  return (
    <div className="rounded border border-[#3b3220] bg-[#14181d] p-2.5 text-slate-200 shadow-sm relative group space-y-2">
      {isEditingCity ? (
        /* Edit city mode */
        <div className="space-y-2 font-sans">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span className="flex items-center gap-1 text-[#ffcc00] font-bold">
              <MapPin className="w-3 h-3" /> Укажите город (задаёт время программы)
            </span>
            <span className="text-[9px] text-slate-500">Enter для поиска</span>
          </div>

          <div className="flex items-center gap-1">
            <input
              type="text"
              value={inputCity}
              onChange={(e) => setInputCity(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveCity();
                if (e.key === 'Escape') handleCancelCity();
              }}
              placeholder="Москва, Пушкино, Владивосток..."
              autoFocus
              className="flex-1 bg-[#0b0e12] border border-[#ffcc00] rounded px-2 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden"
            />
            <button
              onClick={handleSaveCity}
              disabled={!inputCity.trim() || loading}
              className="p-1.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:bg-slate-800 text-black font-bold rounded cursor-pointer transition shrink-0"
              title="Применить и синхронизировать время (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleCancelCity}
              className="p-1.5 bg-[#1f2633] hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition shrink-0"
              title="Отмена (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>


        </div>
      ) : (
        /* Normal weather display mode */
        <div className="space-y-1.5">
          {/* Top: Weather row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative shrink-0">
                <span className="text-2xl font-bold font-sans text-white tabular-nums">
                  {loading && !weather ? '--' : weather ? `${weather.temp > 0 ? `+${weather.temp}` : weather.temp}°` : '18°'}
                </span>
                {renderWeatherIcon()}
              </div>

              <div className="text-left leading-tight min-w-0">
                <div 
                  onClick={() => {
                    onPlaySound?.('click');
                    setInputCity(city);
                    setIsEditingCity(true);
                  }}
                  className="text-slate-100 font-bold text-xs font-sans flex items-center gap-1 cursor-pointer hover:text-[#ffcc00] group/city transition"
                  title="Нажмите, чтобы сменить город (синхронизирует время в программе)"
                >
                  <span className="truncate max-w-[95px]">{weather?.city || city}</span>
                  <Search className="w-2.5 h-2.5 text-slate-500 group-hover/city:text-[#ffcc00] shrink-0" />
                </div>

                <div className="text-[10px] text-slate-400 truncate">
                  {error ? (
                    <span className="text-amber-400">{error}</span>
                  ) : weather ? (
                    <span>
                      min {weather.tempMin > 0 ? `+${weather.tempMin}` : weather.tempMin}° / max{' '}
                      {weather.tempMax > 0 ? `+${weather.tempMax}` : weather.tempMax}°
                    </span>
                  ) : (
                    <span>min 14° / max 23°</span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right text-[10px] text-slate-400 shrink-0 font-mono">
              <div className="flex items-center justify-end gap-1 text-[#fbbf24]">
                <Sun className="w-3.5 h-3.5" />
                <span>{weather?.sunrise || '03:52'}</span>
                <button
                  onClick={() => {
                    onPlaySound?.('click');
                    fetchWeather(city);
                  }}
                  className={`ml-1 text-slate-500 hover:text-[#ffcc00] cursor-pointer ${loading ? 'animate-spin text-[#ffcc00]' : ''}`}
                  title="Обновить погоду"
                >
                  <RotateCw className="w-2.5 h-2.5" />
                </button>
              </div>
              <div className="text-slate-400">/ {weather?.sunset || '21:14'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

