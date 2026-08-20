import React, { useState, useEffect } from 'react';
import { 
  X, 
  Globe, 
  FileCode, 
  Folder, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Sliders,
  Settings,
  HelpCircle,
  HardDrive,
  Laptop
} from 'lucide-react';
import { DesktopBookmark, AppArchetypeStyle } from '../types';
import { INITIAL_BOOKMARKS } from '../utils/storage';

interface BottomBookmarksSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookmarks: DesktopBookmark[];
  onSaveBookmarks: (bookmarks: DesktopBookmark[]) => void;
  appStyle?: AppArchetypeStyle;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const BottomBookmarksSettingsModal: React.FC<BottomBookmarksSettingsModalProps> = ({
  isOpen,
  onClose,
  bookmarks,
  onSaveBookmarks,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const isModern = appStyle === 'modern';
  const [localSlots, setLocalSlots] = useState<DesktopBookmark[]>(() => {
    if (Array.isArray(bookmarks) && bookmarks.length >= 3) {
      return bookmarks.slice(0, 3);
    }
    return INITIAL_BOOKMARKS;
  });

  const [activeSlotIdx, setActiveSlotIdx] = useState<number>(0);
  const [copiedHint, setCopiedHint] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (Array.isArray(bookmarks) && bookmarks.length >= 3) {
        setLocalSlots(bookmarks.slice(0, 3));
      } else {
        setLocalSlots(INITIAL_BOOKMARKS);
      }
    }
  }, [isOpen, bookmarks]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentSlot = localSlots[activeSlotIdx] || localSlots[0];

  const handleUpdateCurrentSlot = (updates: Partial<DesktopBookmark>) => {
    setLocalSlots((prev) => {
      const copy = [...prev];
      copy[activeSlotIdx] = {
        ...copy[activeSlotIdx],
        ...updates,
      };
      return copy;
    });
  };

  const handleSave = () => {
    onSaveBookmarks(localSlots);
    onPlaySound?.('success');
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalSlots(INITIAL_BOOKMARKS);
    onPlaySound?.('click');
  };

  const PRESETS_BY_TYPE = {
    link: [
      { title: 'http:\\\\', url: 'https://scardio.ru', desc: 'РКО Кардиология' },
      { title: 'PubMed', url: 'https://pubmed.ncbi.nlm.nih.gov', desc: 'Медицинские статьи' },
      { title: 'Google', url: 'https://google.com', desc: 'Поисковик' },
      { title: '4PDA', url: 'https://4pda.to', desc: 'Форум техники' },
      { title: 'Pikabu', url: 'https://pikabu.ru', desc: 'Новости и кейсы' },
    ],
    file: [
      { title: 'run.exe', url: 'C:\\Windows\\System32\\cmd.exe', desc: 'Командная строка Windows' },
      { title: 'calc.exe', url: 'calc.exe', desc: 'Калькулятор Windows' },
      { title: 'notepad.exe', url: 'notepad.exe', desc: 'Блокнот Windows' },
      { title: 'Medical.exe', url: 'C:\\Program Files\\Medical\\viewer.exe', desc: 'Программа клиники' },
      { title: 'Журнал.xlsx', url: 'D:\\Отчеты\\Журнал_2026.xlsx', desc: 'Таблица Excel' },
    ],
    folder: [
      { title: 'D:\\', url: 'D:\\Медицинский архив', desc: 'Диск D: Архив протоколов' },
      { title: 'C:\\Docs', url: 'C:\\Users\\User\\Documents', desc: 'Папка Мои Документы' },
      { title: 'E:\\DICOM', url: 'E:\\МРТ_КТ_DICOM', desc: 'Папка снимков' },
      { title: '\\\\SERVER', url: '\\\\192.168.1.100\\Shared', desc: 'Сетевая папка клиники' },
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none font-sans text-xs">
      <div className={`w-full max-w-xl h-[620px] max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
        isModern
          ? 'bg-[#0a1020]/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
          : 'bg-[#0f1217] border border-[#ffcc00]/50'
      }`}>
        
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
          isModern ? 'bg-[#0d172a]/90 border-cyan-500/30 text-cyan-300' : 'bg-[#141820] border-[#2b2518]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
              isModern
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'bg-[#ffcc00]/15 text-[#ffcc00] border border-[#ffcc00]/40'
            }`}>
              ⚡
            </div>
            <div>
              <h2 className={`text-sm font-bold font-mono flex items-center gap-2 ${isModern ? 'text-cyan-200' : 'text-slate-100'}`}>
                <span>Настройка 3 кнопок быстрого доступа</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                  isModern ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50' : 'bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/30'
                }`}>
                  Нижний блок
                </span>
              </h2>
              <p className={`text-[11px] ${isModern ? 'text-cyan-300/70' : 'text-slate-400'}`}>
                Выберите тип: Web-ссылка (HTTP), ярлык программы/файла или путь к папке в проводнике Windows
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1 rounded transition cursor-pointer ${isModern ? 'text-cyan-300 hover:text-white hover:bg-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slot Selector Tabs (Кнопка 1, Кнопка 2, Кнопка 3) */}
        <div className={`grid grid-cols-3 p-1.5 border-b gap-1 shrink-0 font-mono ${
          isModern ? 'bg-[#070b13] border-cyan-500/20' : 'bg-[#0a0d11] border-[#2b2518]'
        }`}>
          {localSlots.map((slot, idx) => {
            const isSelected = activeSlotIdx === idx;
            const typeLabel = slot.type === 'file' ? '📄 Ярлык' : slot.type === 'folder' ? '📁 Папка' : '🌐 Ссылка';
            return (
              <button
                key={slot.id || idx}
                onClick={() => {
                  setActiveSlotIdx(idx);
                  onPlaySound?.('click');
                }}
                className={`py-2 px-2 rounded text-center transition cursor-pointer border flex flex-col items-center justify-center gap-0.5 ${
                  isSelected
                    ? isModern
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                      : 'bg-[#1e2530] border-[#ffcc00] text-white shadow-sm'
                    : isModern
                      ? 'bg-[#0d1424] border-cyan-500/20 text-cyan-300/70 hover:text-cyan-200 hover:bg-cyan-500/10'
                      : 'bg-[#12161c] border-[#2b2518] text-slate-400 hover:text-slate-200 hover:bg-[#181d24]'
                }`}
              >
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-bold ${isModern ? 'text-cyan-400' : 'text-[#ffcc00]'}`}>№{idx + 1}</span>
                  <span className="font-bold text-xs truncate max-w-[90px]">{slot.title || `Кнопка ${idx + 1}`}</span>
                </div>
                <span className="text-[9px] text-slate-500 font-sans">{typeLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200">
          
          {/* 1. Button Title */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
              Текст на кнопке (название)
            </label>
            <input
              type="text"
              value={currentSlot.title}
              onChange={(e) => handleUpdateCurrentSlot({ title: e.target.value })}
              placeholder="Например: run.exe, D:\, http:\\, Архив, PubMed..."
              className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-mono focus:outline-hidden"
            />
          </div>

          {/* 2. Type Selector (3 mutually exclusive types) */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Тип действия (выберите один из 3 вариантов)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Type A: HTTP Web Link */}
              <button
                type="button"
                onClick={() => {
                  handleUpdateCurrentSlot({ 
                    type: 'link', 
                    url: currentSlot.url.startsWith('http') ? currentSlot.url : 'https://' 
                  });
                  onPlaySound?.('click');
                }}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  currentSlot.type === 'link' || !currentSlot.type
                    ? 'bg-[#182330] border-[#38bdf8] text-white shadow-sm ring-1 ring-[#38bdf8]/40'
                    : 'bg-[#0e1217] border-[#2b2518] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Globe className={`w-4 h-4 ${currentSlot.type === 'link' || !currentSlot.type ? 'text-[#38bdf8]' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">HTTP ссылка</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Веб-сайт или портал в браузере (https://...)
                </p>
              </button>

              {/* Type B: Windows File Shortcut */}
              <button
                type="button"
                onClick={() => {
                  handleUpdateCurrentSlot({ 
                    type: 'file', 
                    url: currentSlot.url.includes('\\') ? currentSlot.url : 'C:\\Windows\\System32\\cmd.exe' 
                  });
                  onPlaySound?.('click');
                }}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  currentSlot.type === 'file'
                    ? 'bg-[#292015] border-[#ffcc00] text-white shadow-sm ring-1 ring-[#ffcc00]/40'
                    : 'bg-[#0e1217] border-[#2b2518] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className={`w-4 h-4 ${currentSlot.type === 'file' ? 'text-[#ffcc00]' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Ярлык файла</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Исполняемый .exe или документ в Windows
                </p>
              </button>

              {/* Type C: Windows Folder Path */}
              <button
                type="button"
                onClick={() => {
                  handleUpdateCurrentSlot({ 
                    type: 'folder', 
                    url: currentSlot.url.includes('\\') ? currentSlot.url : 'D:\\' 
                  });
                  onPlaySound?.('click');
                }}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                  currentSlot.type === 'folder'
                    ? 'bg-[#17271e] border-[#22c55e] text-white shadow-sm ring-1 ring-[#22c55e]/40'
                    : 'bg-[#0e1217] border-[#2b2518] text-slate-400 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className={`w-4 h-4 ${currentSlot.type === 'folder' ? 'text-[#22c55e]' : 'text-slate-500'}`} />
                  <span className="font-bold text-xs">Папка Windows</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Путь к папке в проводнике (D:\, C:\Users\...)
                </p>
              </button>
            </div>
          </div>

          {/* 3. Path / URL Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                {currentSlot.type === 'file'
                  ? 'Путь к исполняемому файлу / ярлыку'
                  : currentSlot.type === 'folder'
                  ? 'Путь к папке в проводнике Windows'
                  : 'Web-адрес ссылки (URL)'}
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {currentSlot.type === 'file' ? 'C:\\...\\app.exe' : currentSlot.type === 'folder' ? 'D:\\Папка' : 'https://...'}
              </span>
            </div>
            <input
              type="text"
              value={currentSlot.url}
              onChange={(e) => handleUpdateCurrentSlot({ url: e.target.value })}
              placeholder={
                currentSlot.type === 'file'
                  ? 'C:\\Program Files\\App\\program.exe или calc.exe'
                  : currentSlot.type === 'folder'
                  ? 'D:\\Медицинский архив или C:\\Documents'
                  : 'https://scardio.ru'
              }
              className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-mono focus:outline-hidden"
            />
          </div>

          {/* 4. Quick Presets Chips */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
              Быстрые шаблоны для выбора:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(PRESETS_BY_TYPE[currentSlot.type || 'link'] || PRESETS_BY_TYPE.link).map((p, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => {
                    handleUpdateCurrentSlot({
                      title: p.title,
                      url: p.url,
                      description: p.desc,
                    });
                    onPlaySound?.('click');
                  }}
                  className="px-2.5 py-1 rounded bg-[#161b22] hover:bg-[#222a36] border border-[#2b2518] hover:border-[#ffcc00]/50 text-slate-300 text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5"
                >
                  <span className="text-[#ffcc00] font-bold">{p.title}</span>
                  <span className="text-slate-500 text-[10px]">({p.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Informational Help Box */}
          <div className="p-3 bg-[#0a0d11] rounded-lg border border-[#2b2518] text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-bold font-mono">
              <Laptop className="w-3.5 h-3.5 text-[#ffcc00]" />
              <span>Поведение при нажатии на панели:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400">
              <li><strong className="text-slate-300">HTTP ссылка:</strong> мгновенно открывает сайт в новой вкладке браузера.</li>
              <li><strong className="text-slate-300">Ярлык файла / Папка:</strong> копирует готовую команду запуска (например, <code className="text-[#ffcc00] bg-[#1a1f26] px-1 rounded">explorer.exe "D:\Папка"</code>) в буфер обмена и выводит уведомление с кнопкой прямого открытия.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-[#2b2518] bg-[#141820] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer text-xs font-mono"
          >
            Сбросить (run.exe, D:\, http:\\)
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer text-xs"
            >
              Отмена
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold font-mono transition cursor-pointer text-xs flex items-center gap-1.5 shadow-md"
            >
              <Check className="w-3.5 h-3.5" />
              Сохранить кнопки
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
