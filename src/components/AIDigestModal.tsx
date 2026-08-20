import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  ExternalLink, 
  TrendingUp, 
  CheckCircle2, 
  Layers, 
  Calendar, 
  Flame,
  Copy,
  Check
} from 'lucide-react';
import { Article, AIDigestResult } from '../types';
import { aiGenerateDigest } from '../utils/feedApi';

interface AIDigestModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
  currentCategory: string;
}

export const AIDigestModal: React.FC<AIDigestModalProps> = ({
  isOpen,
  onClose,
  articles,
  currentCategory,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [digest, setDigest] = useState<AIDigestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (articles.length === 0) {
      setError('Недостаточно статей для генерации дайджеста. Добавьте источники или обновите ленту.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await aiGenerateDigest(articles, currentCategory);
      setDigest(data);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyDigest = () => {
    if (!digest) return;
    let text = `# ${digest.title} (${digest.date})\n\n`;
    text += `## Главные события:\n`;
    digest.topStories.forEach((s, i) => {
      text += `${i + 1}. **${s.title}** (${s.feedTitle})\n   ${s.summary}\n`;
    });
    text += `\n## Тренды:\n`;
    digest.overallTrends.forEach((t) => {
      text += `- ${t}\n`;
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">AI Daily Digest & Сводка новостей</h2>
              <p className="text-[11px] text-slate-400">
                Синтез главных событий по вашим подпискам с помощью модели Gemini
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {digest && (
              <button
                onClick={handleCopyDigest}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Скопировано' : 'Копировать'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 text-xs text-slate-200">
          {!digest && !isLoading && (
            <div className="py-12 text-center space-y-4 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Персональный информационный дайджест</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Gemini изучит последние {Math.min(articles.length, 15)} публикаций в текущей категории ({currentCategory}) и подготовит лаконичный структурированный отчет для быстрого погружения.
                </p>
              </div>
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition cursor-pointer"
              >
                Сформировать дайджест
              </button>
            </div>
          )}

          {isLoading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <div className="text-sm font-semibold text-slate-200">Gemini анализирует ваши ленты...</div>
              <p className="text-xs text-slate-500">Группировка событий, выделение ключевых трендов и тезисов</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {digest && !isLoading && (
            <div className="space-y-6">
              {/* Digest Title & Date */}
              <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-slate-100">{digest.title}</h1>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-indigo-400" />
                    <span>{digest.date || 'Сводка за сегодня'}</span>
                  </span>
                </div>
                <button
                  onClick={handleGenerate}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/40 rounded-lg text-xs font-semibold transition"
                >
                  Пересоздать
                </button>
              </div>

              {/* Key Takeaways */}
              {digest.keyTakeaways && digest.keyTakeaways.length > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-indigo-950/30 border border-amber-500/30 space-y-2">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Главные выводы в 3 пунктах</span>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {digest.keyTakeaways.map((k, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0"></span>
                        <span>{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Top Stories */}
              <div className="space-y-3">
                <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ключевые события и публикации</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {digest.topStories.map((story, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-indigo-400 font-semibold mb-1">
                          <span className="truncate">{story.feedTitle}</span>
                          <span className={`px-1.5 py-0.2 rounded uppercase font-bold text-[9px] ${
                            story.impact === 'high' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {story.impact === 'high' ? 'Важно' : 'Тренд'}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-100 text-xs">{story.title}</h4>
                        <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                          {story.summary}
                        </p>
                      </div>

                      {story.link && (
                        <div className="pt-2 mt-2 border-t border-slate-800 flex justify-end">
                          <a
                            href={story.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
                          >
                            <span>Оригинал статьи</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Trends */}
              {digest.overallTrends && digest.overallTrends.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    <span>Общие тренды и векторы развития</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {digest.overallTrends.map((tr, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs">
                        {tr}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
