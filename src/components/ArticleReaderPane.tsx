import React, { useState } from 'react';
import { 
  ExternalLink, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Star, 
  Bookmark, 
  Share2, 
  Check, 
  Copy, 
  Type, 
  Maximize2, 
  X, 
  Clock, 
  User, 
  Tag, 
  MessageSquare, 
  FileText, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { Article, UserWorkspaceConfig } from '../types';
import { aiSummarizeArticle } from '../utils/feedApi';

interface ArticleReaderPaneProps {
  article: Article | null;
  onClose?: () => void;
  onToggleStar: (articleId: string) => void;
  onToggleSaved: (articleId: string) => void;
  onToggleRead: (articleId: string) => void;
  config: UserWorkspaceConfig;
  onSaveNote?: (articleId: string, note: string) => void;
  userNote?: string;
  onAdaptArticle?: (articleId: string) => Promise<void>;
  isRefreshing?: boolean;
}

export const ArticleReaderPane: React.FC<ArticleReaderPaneProps> = ({
  article,
  onClose,
  onToggleStar,
  onToggleSaved,
  onToggleRead,
  config,
  onSaveNote,
  userNote = '',
  onAdaptArticle,
  isRefreshing = false,
}) => {
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isSerif, setIsSerif] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryData, setSummaryData] = useState<{
    summary?: string;
    takeaways?: string[];
    sentiment?: string;
    estimatedReadMinutes?: number;
    keyEntities?: string[];
    symptom?: string;
    diagnosis?: string;
    solution?: string;
  } | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [noteText, setNoteText] = useState(userNote);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Update notes if prop changes
  React.useEffect(() => {
    setNoteText(userNote);
  }, [userNote, article?.id]);

  // Reset summary when article changes
  React.useEffect(() => {
    setSummaryData(null);
    if (isPlayingAudio) {
      window.speechSynthesis?.cancel();
      setIsPlayingAudio(false);
    }
  }, [article?.id]);

  if (!article) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-slate-950/40 p-8 text-slate-500 select-none">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 shadow-inner">
          <FileText className="w-8 h-8 text-slate-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-400">Выберите публикацию для чтения</h3>
        <p className="text-xs text-slate-500 max-w-sm text-center mt-1">
          Используйте стрелки или кликайте по статьям в списке. Клавиши <span className="font-mono text-amber-400">J / K</span> для быстрой навигации.
        </p>
      </main>
    );
  }

  const handleGenerateSummary = async (mode = 'executive') => {
    setIsSummarizing(true);
    try {
      const data = await aiSummarizeArticle(article.title, article.content || article.contentSnippet, mode);
      setSummaryData(data);
    } catch (err: unknown) {
      const error = err as Error;
      alert(`Ошибка AI выжимки: ${error.message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggleAudio = () => {
    if (!('speechSynthesis' in window)) {
      alert('Синтез речи не поддерживается в данном браузере');
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
    } else {
      window.speechSynthesis.cancel();
      const plainText = `${article.title}. ${article.contentSnippet || ''}`;
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.rate = 1.0;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
      setIsPlayingAudio(true);
    }
  };

  const handleCopyLink = () => {
    if (article.link) {
      navigator.clipboard.writeText(article.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sentimentColors: Record<string, { bg: string; text: string; label: string }> = {
    positive: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', label: 'Позитивный тон' },
    neutral: { bg: 'bg-slate-500/15 border-slate-500/30', text: 'text-slate-300', label: 'Нейтральный тон' },
    negative: { bg: 'bg-rose-500/15 border-rose-500/30', text: 'text-rose-400', label: 'Критический тон' },
    analytical: { bg: 'bg-indigo-500/15 border-indigo-500/30', text: 'text-indigo-300', label: 'Глубокая аналитика' },
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-slate-950/80 overflow-hidden relative">
      {/* Reader Top Action Bar */}
      <div className="h-12 px-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Source Link */}
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition cursor-pointer"
          >
            <span>{article.feedTitle}</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            {article.pubDate}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* AI 1-Click Summary */}
          <button
            id="btn-reader-ai-summarize"
            onClick={() => handleGenerateSummary('executive')}
            disabled={isSummarizing}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition cursor-pointer ${
              summaryData
                ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/50'
                : 'bg-indigo-950/50 text-indigo-300 border border-indigo-700/50 hover:bg-indigo-900/60'
            }`}
            title="Сгенерировать AI-выжимку и ключевые тезисы через Gemini"
          >
            <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${isSummarizing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSummarizing ? 'Анализ...' : 'AI Выжимка'}</span>
          </button>

          {/* Text to Speech */}
          <button
            id="btn-reader-tts"
            onClick={handleToggleAudio}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isPlayingAudio
                ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse'
                : 'text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700/60'
            }`}
            title={isPlayingAudio ? 'Остановить чтение' : 'Озвучить статью голосом'}
          >
            {isPlayingAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Star Toggle */}
          <button
            id="btn-reader-star"
            onClick={() => onToggleStar(article.id)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              article.isStarred
                ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
                : 'text-slate-300 hover:text-yellow-400 hover:bg-slate-800 border-slate-700/60'
            }`}
            title="Избранное"
          >
            <Star className={`w-4 h-4 ${article.isStarred ? 'fill-current' : ''}`} />
          </button>

          {/* Save Later */}
          <button
            id="btn-reader-save"
            onClick={() => onToggleSaved(article.id)}
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              article.isSavedLater
                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800 border-slate-700/60'
            }`}
            title="Читать позже"
          >
            <Bookmark className={`w-4 h-4 ${article.isSavedLater ? 'fill-current' : ''}`} />
          </button>

          {/* Copy link */}
          <button
            id="btn-reader-copy-link"
            onClick={handleCopyLink}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
            title="Скопировать ссылку"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Typography Controls */}
          <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 ml-1">
            <button
              onClick={() => setFontSize(fontSize === 'lg' ? 'md' : fontSize === 'md' ? 'sm' : 'sm')}
              className={`px-1.5 py-0.5 text-[11px] rounded transition ${fontSize === 'sm' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="Маленький шрифт"
            >
              A-
            </button>
            <button
              onClick={() => setFontSize(fontSize === 'sm' ? 'md' : fontSize === 'md' ? 'lg' : 'lg')}
              className={`px-1.5 py-0.5 text-[11px] rounded transition ${fontSize === 'lg' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="Крупный шрифт"
            >
              A+
            </button>
            <button
              onClick={() => setIsSerif(!isSerif)}
              className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition ${isSerif ? 'bg-slate-700 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'}`}
              title="Переключить Serif / Sans"
            >
              {isSerif ? 'Serif' : 'Sans'}
            </button>
          </div>
        </div>
      </div>

      {/* Article Content Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 max-w-4xl mx-auto w-full space-y-6">
        
        {/* Article Header */}
        <header className="space-y-3 pb-6 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {article.feedTitle}
            </span>
            {article.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                <span>{article.author}</span>
              </span>
            )}
            <span className="flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{article.pubDate}</span>
            </span>
          </div>

          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
            {(article.ai?.titleRu || article.titleRu) || article.title}
          </h1>

          {(article.ai?.titleRu || article.titleRu) && (article.ai?.titleRu || article.titleRu) !== article.title && (
            <p className="text-xs text-slate-400 italic">Оригинал: {article.title}</p>
          )}

          {article.categories && article.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {article.categories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-[11px] rounded-full bg-slate-800/80 text-slate-400 border border-slate-700/60 font-mono"
                >
                  #{cat}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Manual on-demand AI translation & diagnostic template adaptation */}
        {(!(article.ai?.summaryOneLine || article.summaryOneLine) || (article.ai?.titleRu || article.titleRu) === article.title) && onAdaptArticle && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-inner font-sans">
            <div className="space-y-1">
              <div className="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Энергосбережение: карточка без ИИ-обработки</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed max-w-xl">
                Для сохранения лимитов ИИ автоматический перевод отключен. Вы можете вручную перевести статью, создать выжимку и заполнить карту ремонта.
              </p>
            </div>
            <button
              onClick={() => onAdaptArticle(article.id)}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-bold text-xs rounded-lg transition shrink-0 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isRefreshing ? 'Обработка...' : 'Адаптировать с ИИ'}</span>
            </button>
          </div>
        )}

        {/* Engineering / Diagnostic Case Card (Symptom, Diagnosis, Solution) */}
        {((article.symptom || article.diagnosis || article.solution) || 
          (summaryData && (summaryData.symptom || summaryData.diagnosis || summaryData.solution))) && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-amber-950/20 border border-slate-800 space-y-4 shadow-xl relative overflow-hidden">
            {/* Ambient indicator accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/20 via-amber-500 to-amber-500/20"></div>
            
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-xs text-amber-400 uppercase tracking-widest font-mono">
                Диагностическая карта ремонта
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Symptom block */}
              {((article.symptom) || (summaryData?.symptom)) && (
                <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] font-extrabold text-red-400 uppercase tracking-wider font-mono">
                    ⚠️ Симптомы дефекта
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {article.symptom || summaryData?.symptom}
                  </p>
                </div>
              )}

              {/* Diagnosis block */}
              {((article.diagnosis) || (summaryData?.diagnosis)) && (
                <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider font-mono">
                    🔍 Диагностика
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {article.diagnosis || summaryData?.diagnosis}
                  </p>
                </div>
              )}

              {/* Solution block */}
              {((article.solution) || (summaryData?.solution)) && (
                <div className="space-y-1 bg-slate-950/40 p-3.5 rounded-xl border border-slate-800/80">
                  <div className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider font-mono">
                    ✅ Решение / Ремонт
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans">
                    {article.solution || summaryData?.solution}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gemini AI Intelligence Box (if generated) */}
        {summaryData && (
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/50 via-slate-900 to-purple-950/40 border border-indigo-500/40 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <span className="font-bold text-xs text-indigo-200 uppercase tracking-wider font-mono">
                  Gemini AI Summary & Анализ
                </span>
              </div>

              {summaryData.sentiment && sentimentColors[summaryData.sentiment] && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sentimentColors[summaryData.sentiment].bg} ${sentimentColors[summaryData.sentiment].text}`}>
                  {sentimentColors[summaryData.sentiment].label}
                </span>
              )}
            </div>

            {summaryData.summary && (
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-indigo-900/40">
                {summaryData.summary}
              </p>
            )}

            {summaryData.takeaways && summaryData.takeaways.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] font-semibold text-indigo-300">Ключевые тезисы:</div>
                <ul className="space-y-1 text-xs text-slate-300">
                  {summaryData.takeaways.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"></span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summaryData.keyEntities && summaryData.keyEntities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-indigo-900/40 text-[10px] text-slate-400">
                <span className="font-semibold text-indigo-300">Ключевые объекты:</span>
                {summaryData.keyEntities.map((ent, i) => (
                  <span key={i} className="px-1.5 py-0.2 rounded bg-indigo-900/30 text-indigo-200 border border-indigo-700/40">
                    {ent}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cover Image */}
        {article.imageUrl && (
          <div className="rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 max-h-[420px]">
            <img
              src={article.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        {/* Main Article Body (Clean Reader Mode) */}
        <div
          className={`leading-relaxed text-slate-200 space-y-4 ${
            isSerif ? 'font-serif' : 'font-sans'
          } ${
            fontSize === 'lg'
              ? 'text-base md:text-lg leading-loose'
              : fontSize === 'sm'
              ? 'text-xs md:text-sm'
              : 'text-sm md:text-base leading-relaxed'
          }`}
        >
          {article.content && article.content.includes('<') ? (
            <div
              className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-amber-400 prose-img:rounded-xl"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <div className="space-y-4">
              <p>{article.contentSnippet || article.content}</p>
              <p className="text-slate-400 italic">
                Полный текст статьи и интерактивные медиа-материалы доступны на официальном сайте источника.
              </p>
            </div>
          )}
        </div>

        {/* Article Personal Notes Section */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2 mt-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Личная заметка к статье</span>
            </span>
            {noteText !== userNote && onSaveNote && (
              <button
                onClick={() => onSaveNote(article.id, noteText)}
                className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-[10px] rounded hover:bg-amber-400 transition"
              >
                Сохранить заметку
              </button>
            )}
          </div>
          <textarea
            placeholder="Запишите свои мысли, выводы или задачи по этой статье..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full h-20 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Bottom Original Link Button */}
        <div className="pt-6 pb-12 text-center border-t border-slate-800">
          <a
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/15 transition cursor-pointer"
          >
            <span>Перейти к первоисточнику статьи</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </main>
  );
};
