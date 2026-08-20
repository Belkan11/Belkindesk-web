import React, { useState } from 'react';
import { 
  X, 
  HelpCircle, 
  Sparkles, 
  Settings, 
  Bookmark, 
  FileText, 
  Clock, 
  Calendar, 
  Search, 
  BookOpen, 
  CheckCircle,
  Lightbulb,
  Cpu
} from 'lucide-react';

interface InteractiveGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  appStyle?: 'classic' | 'modern';
  onPlaySound?: (type: 'click' | 'success') => void;
}

type GuideTab = 'basics' | 'agents' | 'control' | 'utilities' | 'ai';

export const InteractiveGuideModal: React.FC<InteractiveGuideModalProps> = ({
  isOpen,
  onClose,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('basics');
  const isModern = appStyle === 'modern';

  if (!isOpen) return null;

  const tabs: { id: GuideTab; label: string; icon: React.ReactNode }[] = [
    { id: 'basics', label: 'Основы', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'agents', label: 'Персонализация', icon: <Cpu className="w-4 h-4" /> },
    { id: 'control', label: 'Управление источниками', icon: <Settings className="w-4 h-4" /> },
    { id: 'utilities', label: 'Виджеты & Органайзер', icon: <Calendar className="w-4 h-4" /> },
    { id: 'ai', label: 'Ассистент Gemini', icon: <Sparkles className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
      <div 
        className={`w-full max-w-4xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border transition-all ${
          isModern 
            ? 'bg-[#0b0f19] border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]' 
            : 'bg-[#12161f] border-[#2c261b] text-slate-100'
        }`}
      >
        {/* Header */}
        <div className={`p-4 flex items-center justify-between border-b ${
          isModern ? 'border-cyan-500/20 bg-cyan-950/20' : 'border-[#2c261b] bg-[#161b26]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isModern ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[#ffcc00]/10 text-[#ffcc00]'}`}>
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-sm sm:text-base font-bold tracking-tight ${isModern ? 'text-cyan-200' : 'text-white'}`}>
                Интерактивное руководство пользователя
              </h2>
              <p className={`text-[11px] font-mono ${isModern ? 'text-cyan-300/70' : 'text-slate-400'}`}>
                Узнайте, как получить максимум от вашей интеллектуальной рабочей станции BelkinDESK
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              onPlaySound?.('click');
            }}
            className={`p-1 rounded-full hover:bg-white/10 transition ${isModern ? 'text-cyan-300 hover:text-white' : 'text-slate-400 hover:text-white'}`}
            title="Закрыть руководство"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Tabbed Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* Left Sidebar Menu */}
          <div className={`w-full md:w-64 p-3 flex flex-row md:flex-col gap-1 border-r overflow-x-auto md:overflow-y-auto shrink-0 ${
            isModern ? 'border-cyan-500/10 bg-[#070b13]' : 'border-[#2c261b] bg-[#0d1017]'
          }`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onPlaySound?.('click');
                }}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap text-left ${
                  activeTab === tab.id
                    ? isModern
                      ? 'bg-cyan-500/15 text-cyan-300 border-l-2 border-cyan-400 shadow-sm'
                      : 'bg-[#ffcc00]/10 text-[#ffcc00] border-l-2 border-[#ffcc00]'
                    : isModern ? 'text-cyan-200/70 hover:text-cyan-200 hover:bg-cyan-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {/* TAB: BASICS */}
            {activeTab === 'basics' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-emerald-400 font-mono">[01]</span> Добро пожаловать на борт!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>BelkinDESK ENGINEER 2.0</strong> — это универсальная цифровая рабочая станция для специалистов, инженеров, исследователей и увлеченных профессионалов. Она объединяет мониторинг контента, управление сменами, таймеры и ИИ-аналитику в едином интерфейсе.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-[#151922] border-[#2c261b]'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className="p-1.5 rounded bg-emerald-500/15 text-emerald-400 shrink-0">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 mb-1">Два основных режима</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Переключайтесь между вкладками <strong>«ЗАМЕТКИ»</strong> (для ведения личного блокнота, списков задач и заметок) и <strong>«НОВОСТИ»</strong> (для ленты актуальных публикаций с автопереводом).
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-cyan-950/10 border-cyan-500/20' : 'bg-[#151922] border-[#2c261b]'}`}>
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded shrink-0 ${isModern ? 'bg-cyan-500/15 text-cyan-300' : 'bg-amber-500/15 text-[#ffcc00]'}`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100 mb-1">Стилизация интерфейса</h4>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          В левом верхнем углу шапки находятся переключатели: <strong>«Классический»</strong> (инженерный темный янтарный дизайн) и <strong>«Современный»</strong> (высокотехнологичный аврора-стиль).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scenario Application Guide */}
                <div className={`p-3.5 rounded-lg border ${isModern ? 'bg-cyan-950/20 border-cyan-500/30' : 'bg-[#171c26] border-[#2c261b]'} space-y-2`}>
                  <h4 className="text-xs font-bold text-[#ffcc00] uppercase tracking-wide flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-3.5 h-3.5" /> Сценарии применения программы для разных задач:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                      <strong className="text-white block mb-0.5">🛠 Инженеры и ремонтники:</strong>
                      Мониторинг тем по ремонту электроники, плат, схем BGA ребола через 4PDA, Reddit и YouTube. Поиск технических гайдов с мгновенным переводом.
                    </div>
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                      <strong className="text-white block mb-0.5">🍳 Кулинары и шефы:</strong>
                      Сбор рецептов из кулинарных RSS-лент и видео, ведение заметок по рецептуре, расчет таймеров выпечки.
                    </div>
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                      <strong className="text-white block mb-0.5">💻 IT-специалисты и сисадмины:</strong>
                      Слежение за обновлениями софта, патчами безопасности, новостями Habr и GitHub с помощью настраиваемых cron-синхронизаций.
                    </div>
                    <div className="p-2 bg-black/20 rounded border border-white/5">
                      <strong className="text-white block mb-0.5">📚 Студенты и исследователи:</strong>
                      Сбор научных публикаций, ведение структурированного архива заметок и глубокая суммаризация текстов с помощью ИИ.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PERSONALIZATION */}
            {activeTab === 'agents' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isModern ? 'text-cyan-200' : 'text-slate-100'}`}>
                    <span className={isModern ? 'text-cyan-400' : 'text-[#ffcc00]'}><Cpu className="w-4.5 h-4.5" /></span> Индивидуальная настройка рабочего пространства
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Каждый пользователь полностью настраивает рабочую станцию под себя:
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-cyan-950/15 border border-cyan-500/20 rounded-lg space-y-1.5">
                    <h4 className="text-xs font-bold text-cyan-300">1. Самостоятельное добавление источников</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Вы можете добавлять любые веб-источники, RSS-ленты и поисковые запросы, которые необходимы именно вам. Система не навязывает шаблоны — всё адаптируется под ваши задачи.
                    </p>
                  </div>

                  <div className="p-3 bg-indigo-950/15 border border-indigo-500/20 rounded-lg space-y-1.5">
                    <h4 className="text-xs font-bold text-indigo-300">2. Персональные системные промпты ИИ</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Задавайте собственные инструкции для модели Gemini, чтобы получать ровно тот формат структурирования, перевода и анализа данных, который требуется в вашей работе.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-950/15 border border-amber-500/20 rounded-lg space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-300">3. Личные заметки и расписание смен</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Используйте встроенный календарь дежурств, таймеры и блокнот для ведения рабочих дел, планирования смен и сохранения ценных материалов в избранное.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CONTROL */}
            {activeTab === 'control' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className={`text-base font-bold flex items-center gap-2 ${isModern ? 'text-cyan-200' : 'text-slate-100'}`}>
                    <span className={isModern ? 'text-cyan-400' : 'text-[#ffcc00]'}><Settings className="w-4.5 h-4.5" /></span> Центр управления источниками
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Нажмите на иконку шестерёнки <strong className={isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}>«Центр Управления»</strong> в правом верхнем углу шапки, чтобы настроить индивидуальные поисковые ленты для ИИ-агента.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#080d19]' : 'bg-[#151922]'} border-slate-700/50`}>
                    <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Как добавить свой поисковый канал?
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Вы можете указать любой ключевой поисковый запрос (например, <i>«ремонт кофемашин Delonghi»</i>) и выбрать целевую платформу (YouTube, Habr, Reddit, Pikabu). При синхронизации система автоматически выполнит поиск, извлечет материалы и передаст их ИИ-ассистенту.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#080d19]' : 'bg-[#151922]'} border-slate-700/50`}>
                    <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Тонкая настройка ИИ-инструкций
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Вы можете изменить <strong>«Собственный системный промпт для ИИ»</strong> для любого источника. Это заставит Gemini структурировать получаемый контент именно так, как требуется лично вам (например, переводить на конкретный язык, выделять только таблицы цен или составлять чек-листы).
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#080d19]' : 'bg-[#151922]'} border-slate-700/50`}>
                    <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span> Синхронизация по времени (Cron-планировщик)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Задайте часы автоматического сканирования. Приложение будет самостоятельно опрашивать веб-источники в указанное время, чтобы к началу вашей рабочей смены у вас уже был готов свежий адаптированный дайджест.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: UTILITIES */}
            {activeTab === 'utilities' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span className="text-emerald-400"><Calendar className="w-4.5 h-4.5" /></span> Виджеты левой панели & Органайзер
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Левая колонка рабочей станции укомплектована необходимыми автономными микро-сервисами, которые помогают координировать рабочий день:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#070b13]' : 'bg-[#151922]'} border-slate-800`}>
                    <h4 className={`text-xs font-bold flex items-center gap-1.5 mb-1 ${isModern ? 'text-cyan-300' : 'text-[#ffcc00]'}`}>
                      <Clock className="w-3.5 h-3.5" /> Таймер Помодоро / Смены
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Отслеживает общее время вашей рабочей смены и циклы концентрации. Можно запускать, приостанавливать, а по завершении прозвучит приятный ретро-звуковой сигнал.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#070b13]' : 'bg-[#151922]'} border-slate-800`}>
                    <h4 className="text-xs font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                      <Calendar className="w-3.5 h-3.5" /> Календарь дежурств (Смен)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Позволяет составлять график дежурств (смена «Сутки через трое», «День/Ночь» и т.д.). Даты дежурств подсвечиваются ярким контрастным цветом прямо в календаре.
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#070b13]' : 'bg-[#151922]'} border-slate-800`}>
                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 mb-1">
                      <FileText className="w-3.5 h-3.5" /> Быстрые Заметки & Списки
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Вкладка <strong>«ЗАМЕТКИ»</strong> работает как интерактивный блокнот. Создавайте категории, пишите тексты с автосохранением и формируйте списки дел (To-Do).
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${isModern ? 'bg-[#070b13]' : 'bg-[#151922]'} border-slate-800`}>
                    <h4 className="text-xs font-bold text-pink-400 flex items-center gap-1.5 mb-1">
                      <Bookmark className="w-3.5 h-3.5" /> Закладки & Избранное
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Вы можете сохранять понравившиеся карточки в Избранное (кликнув на звездочку) и размещать быстрые ссылки на часто используемые сайты в нижней панели закладок.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI HELP */}
            {activeTab === 'ai' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-cyan-300 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5" /> Возможности ИИ-Ассистента Gemini
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>BelkinDESK</strong> не просто переводит статьи. Он интегрирует глубокий разбор контента с помощью нейросетевой модели:
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0 border border-cyan-500/20">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Автоматический перевод и сжатие (Суммаризация)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        ИИ полностью переводит иностранный текст, исправляет ошибки форматирования и генерирует три блока: <i>«Суть в одну строку»</i> (для быстрого сканирования), <i>«Суть в три строки»</i> (для детального понимания) и <i>«Подробный разбор»</i> с исходными кодами или рецептом.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-500/20">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Прямой чат с документом (Кнопка «Задать вопрос ИИ»)</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        Открыв любую карточку, вы увидите выдвижную панель <strong>«Задать вопрос ИИ»</strong>. Вы можете спросить у Gemini совет по конкретной детали статьи (например: <i>«Какое жало использовать для этой микросхемы?»</i> или <i>«Чем заменить этот сыр?»</i>), и модель мгновенно даст ответ с учётом контекста.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded bg-pink-500/10 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0 border border-pink-500/20">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">Генерация Сводных Дайджестов за день</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                        Нажмите кнопку <strong>«Сгенерировать дайджест ИИ»</strong> в боковом меню под списком тем, чтобы получить общую аналитическую выжимку по всем новостям за последние 24 часа.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-3 px-5 flex items-center justify-between border-t ${
          isModern ? 'border-cyan-500/20 bg-cyan-950/20' : 'border-[#2c261b] bg-[#161b26]'
        }`}>
          <span className="text-[10px] text-slate-500 font-mono">
            Версия системы: BelkinDESK v3.7.0 (Stable)
          </span>
          <button
            onClick={() => {
              onClose();
              onPlaySound?.('success');
            }}
            className={`px-4 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              isModern
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-black font-semibold'
                : 'bg-[#ffcc00] hover:bg-[#e6b800] text-black'
            }`}
          >
            Всё понятно, начать работу!
          </button>
        </div>
      </div>
    </div>
  );
};
