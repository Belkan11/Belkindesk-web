import React, { useState } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Moon, 
  Sun, 
  Volume2, 
  Keyboard, 
  RotateCw, 
  ShieldAlert, 
  Sparkles,
  Check,
  Palette
} from 'lucide-react';
import { UserWorkspaceConfig } from '../types';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: UserWorkspaceConfig;
  onUpdateConfig: (partial: Partial<UserWorkspaceConfig>) => void;
}

export const WorkspaceSettingsModal: React.FC<WorkspaceSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'theme' | 'filters' | 'shortcuts'>('general');
  const [newMuteWord, setNewMuteWord] = useState('');
  const [newHighlightWord, setNewHighlightWord] = useState('');

  if (!isOpen) return null;

  const handleAddMute = () => {
    if (!newMuteWord.trim()) return;
    const current = config.keywordMutes || [];
    if (!current.includes(newMuteWord.trim())) {
      onUpdateConfig({ keywordMutes: [...current, newMuteWord.trim()] });
      setNewMuteWord('');
    }
  };

  const handleRemoveMute = (word: string) => {
    onUpdateConfig({ keywordMutes: (config.keywordMutes || []).filter((w) => w !== word) });
  };

  const handleAddHighlight = () => {
    if (!newHighlightWord.trim()) return;
    const current = config.keywordHighlights || [];
    if (!current.includes(newHighlightWord.trim())) {
      onUpdateConfig({ keywordHighlights: [...current, newHighlightWord.trim()] });
      setNewHighlightWord('');
    }
  };

  const handleRemoveHighlight = (word: string) => {
    onUpdateConfig({ keywordHighlights: (config.keywordHighlights || []).filter((w) => w !== word) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-amber-400 flex items-center justify-center border border-slate-700">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Параметры рабочего стола</h2>
              <p className="text-[11px] text-slate-400">Настройка авто-обновления, тем, фильтрации и горячих клавиш</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-3 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'general'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Основные
          </button>

          <button
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'theme'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Внешний вид & Тема
          </button>

          <button
            onClick={() => setActiveTab('filters')}
            className={`px-4 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'filters'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Умная фильтрация & Спам
          </button>

          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`px-4 py-2.5 font-medium border-b-2 transition ${
              activeTab === 'shortcuts'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Горячие клавиши
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 text-xs text-slate-200 space-y-4">
          
          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Автоматическая синхронизация лент</div>
                    <div className="text-[11px] text-slate-400">Интервал фонового опроса RSS потоков</div>
                  </div>
                  <select
                    value={config.autoRefreshMinutes}
                    onChange={(e) => onUpdateConfig({ autoRefreshMinutes: Number(e.target.value) })}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value={5}>Каждые 5 минут</option>
                    <option value={15}>Каждые 15 минут</option>
                    <option value={30}>Каждые 30 минут</option>
                    <option value={60}>Раз в час</option>
                    <option value={0}>Только вручную</option>
                  </select>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Панель закладок быстрого доступа</div>
                    <div className="text-[11px] text-slate-400">Отображать панель закладок под верхней строкой навигации</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.showBookmarksBar !== false}
                    onChange={(e) => onUpdateConfig({ showBookmarksBar: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Дневная норма рабочего времени</div>
                    <div className="text-[11px] text-slate-400">Целевое количество часов для таймера смены</div>
                  </div>
                  <select
                    value={config.dailyWorkGoalHours || 8}
                    onChange={(e) => onUpdateConfig({ dailyWorkGoalHours: Number(e.target.value) })}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
                  >
                    <option value={4}>4 часа (парт-тайм)</option>
                    <option value={6}>6 часов</option>
                    <option value={8}>8 часов (стандарт 5/2)</option>
                    <option value={10}>10 часов</option>
                    <option value={12}>12 часов (смена)</option>
                  </select>
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Звуковые эффекты действий</div>
                    <div className="text-[11px] text-slate-400">Легкие звуки при отметке прочитанного, таймерах и сохранении</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableSoundEffects}
                    onChange={(e) => onUpdateConfig({ enableSoundEffects: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                </div>

                <div className="border-t border-slate-800/80 pt-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-200">Десктопные горячие клавиши</div>
                    <div className="text-[11px] text-slate-400">Управление лентами клавишами J / K / S / M / R</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.enableKeyboardShortcuts}
                    onChange={(e) => onUpdateConfig({ enableKeyboardShortcuts: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 accent-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: THEME */}
          {activeTab === 'theme' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="space-y-2">
                <div className="font-semibold text-slate-200">Цветовая палитра оформления:</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'dark-luxury', name: 'Dark Luxury (Классика)', desc: 'Глубокий обсидиановый фон с янтарными акцентами', bg: 'bg-slate-950 border-amber-500/40' },
                    { id: 'nordic-slate', name: 'Nordic Slate', desc: 'Холодные сланцевые и графитовые тона', bg: 'bg-slate-900 border-cyan-500/40' },
                    { id: 'clean-light', name: 'Clean Light', desc: 'Светлая тема с мягким контрастом для дневного чтения', bg: 'bg-slate-800 border-slate-600' },
                    { id: 'sepia-reader', name: 'Sepia Reader', desc: 'Теплая бумага для комфорта глаз', bg: 'bg-amber-950/40 border-amber-600/40' },
                  ].map((th) => (
                    <div
                      key={th.id}
                      onClick={() => onUpdateConfig({ theme: th.id as UserWorkspaceConfig['theme'] })}
                      className={`p-3 rounded-xl border transition cursor-pointer ${
                        config.theme === th.id
                          ? 'ring-2 ring-amber-500 bg-amber-500/10 border-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-slate-100">{th.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{th.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FILTERS & SPAM MUTE */}
          {activeTab === 'filters' && (
            <div className="space-y-5 max-w-lg mx-auto py-2">
              {/* Highlight Keywords */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ключевые слова для подсветки</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Статьи с этими словами будут визуально подсвечены в ленте
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Например: Python, Gemini, LLM..."
                    value={newHighlightWord}
                    onChange={(e) => setNewHighlightWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddHighlight()}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                  />
                  <button
                    onClick={handleAddHighlight}
                    className="px-3 py-1.5 bg-amber-500 text-slate-950 font-bold rounded-lg hover:bg-amber-400"
                  >
                    + Добавить
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(config.keywordHighlights || []).map((w) => (
                    <span
                      key={w}
                      className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full flex items-center gap-1 text-[11px]"
                    >
                      <span>{w}</span>
                      <button onClick={() => handleRemoveHighlight(w)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Mute Keywords */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <div className="font-semibold text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Скрывать статьи (Спам-фильтр)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Статьи, содержащие эти слова в заголовках, будут автоматически скрыты
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Например: реклама, промо, спонсор..."
                    value={newMuteWord}
                    onChange={(e) => setNewMuteWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMute()}
                    className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                  />
                  <button
                    onClick={handleAddMute}
                    className="px-3 py-1.5 bg-rose-500 text-white font-bold rounded-lg hover:bg-rose-400"
                  >
                    + Скрыть
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(config.keywordMutes || []).map((w) => (
                    <span
                      key={w}
                      className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full flex items-center gap-1 text-[11px]"
                    >
                      <span>{w}</span>
                      <button onClick={() => handleRemoveMute(w)} className="hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SHORTCUTS CHEAT SHEET */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-3 max-w-lg mx-auto py-2">
              <div className="text-[11px] text-slate-400 mb-1">
                Классические клавиатурные сочетания как в профессиональных десктопных RSS-клиентах:
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800 bg-slate-950">
                {[
                  { key: 'J / ↓', desc: 'Следующая публикация в списке' },
                  { key: 'K / ↑', desc: 'Предыдущая публикация в списке' },
                  { key: 'S', desc: 'Добавить / удалить из Избранного (Star)' },
                  { key: 'M', desc: 'Переключить статус прочитано / не прочитано' },
                  { key: 'B', desc: 'Сохранить в «Читать позже» (Bookmark)' },
                  { key: 'R', desc: 'Обновить все ленты (Refresh)' },
                  { key: 'V / O', desc: 'Открыть оригинал статьи на сайте в новой вкладке' },
                  { key: 'Esc', desc: 'Закрыть модальное окно или ридер' },
                ].map((sc, i) => (
                  <div key={i} className="p-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-300">{sc.desc}</span>
                    <span className="px-2 py-0.5 bg-slate-800 text-amber-400 font-mono font-bold rounded border border-slate-700 text-[11px]">
                      {sc.key}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
