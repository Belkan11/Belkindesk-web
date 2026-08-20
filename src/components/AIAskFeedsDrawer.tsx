import React, { useState } from 'react';
import { 
  X, 
  MessageSquareQuote, 
  Send, 
  Sparkles, 
  Loader2, 
  Bot, 
  User, 
  ExternalLink,
  HelpCircle
} from 'lucide-react';
import { Article } from '../types';
import { aiAskFeeds } from '../utils/feedApi';

interface AIAskFeedsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articles: Article[];
}

export const AIAskFeedsDrawer: React.FC<AIAskFeedsDrawerProps> = ({
  isOpen,
  onClose,
  articles,
}) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: 'Здравствуйте! Я ваш персональный AI-ассистент по лентам новостей. Задайте любой вопрос по текущим статьям и публикациям (например: «Что нового произошло в сфере ИИ?» или «Какие релизы обсуждают на Хабре?»), и я подготовлю точный ответ на основе ваших источников.',
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userText = query.trim();
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const answer = await aiAskFeeds(userText, articles);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err: unknown) {
      const error = err as Error;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Произошла ошибка при обработке запроса: ${error.message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQuestions = [
    'Что интересного пишут про искусственный интеллект сегодня?',
    'Сделай краткую сводку по хардверу и гаджетам',
    'Какие ключевые статьи вышли на Хабре?',
    'Есть ли срочные новости по рынкам или криптовалюте?',
  ];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <MessageSquareQuote className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">Спросить свои ленты (Gemini AI)</h3>
            <p className="text-[10px] text-slate-400">Ответы с опорой на ваши статьи</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 text-xs">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-purple-600/30 text-purple-300 flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/40">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-amber-500 text-slate-950 font-medium rounded-tr-none'
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none space-y-2'
              }`}
            >
              {msg.text}
            </div>

            {msg.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/30">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center text-slate-400 text-xs pl-8">
            <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
            <span>Gemini анализирует ваши статьи...</span>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-1.5 shrink-0">
          <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-purple-400" />
            <span>Примеры быстрых вопросов:</span>
          </div>
          <div className="space-y-1">
            {sampleQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuery(q);
                }}
                className="w-full text-left p-1.5 px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-[11px] text-slate-300 border border-slate-700/60 transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input bar */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-slate-800 bg-slate-900/90 flex gap-2 shrink-0"
      >
        <input
          type="text"
          placeholder="Спросите что-нибудь о ваших новостях..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
