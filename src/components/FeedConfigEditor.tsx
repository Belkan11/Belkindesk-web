import React, { useState } from 'react';
import { FeedConfig, NewsSource, SourceType } from '../types';
import { Plus, Trash2, Settings2, Link as LinkIcon, Search, Check } from 'lucide-react';

interface Props {
  feed: FeedConfig;
  onChange: (feed: FeedConfig) => void;
  onPlaySound?: (sound: string) => void;
}

export const FeedConfigEditor: React.FC<Props> = ({ feed, onChange, onPlaySound }) => {
  const updateFeed = (updates: Partial<FeedConfig>) => {
    onChange({ ...feed, ...updates });
  };

  const addSource = () => {
    const newSource: NewsSource = {
      id: `src-${Date.now()}`,
      name: 'Новый источник',
      type: 'rss',
      enabled: true,
      url: '',
    };
    updateFeed({ sources: [...(feed.sources || []), newSource] });
    onPlaySound?.('click');
  };

  const updateSource = (idx: number, updates: Partial<NewsSource>) => {
    const newSources = [...(feed.sources || [])];
    newSources[idx] = { ...newSources[idx], ...updates };
    updateFeed({ sources: newSources });
  };

  const removeSource = (idx: number) => {
    const newSources = [...(feed.sources || [])];
    newSources.splice(idx, 1);
    updateFeed({ sources: newSources });
    onPlaySound?.('click');
  };

  const toggleSourceEnabled = (idx: number) => {
    const s = (feed.sources || [])[idx];
    updateSource(idx, { enabled: !s.enabled });
    onPlaySound?.('click');
  };

  const joinKeywords = (kws?: string[]) => (kws || []).join('\n');
  const splitKeywords = (text: string) => text.split('\n').map(t => t.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Basic Info */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Название ленты</label>
            <input 
              type="text"
              value={feed.name || ''}
              onChange={e => updateFeed({ name: e.target.value })}
              className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
              placeholder="iPhone 17 Repair"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Описание (опционально)</label>
            <textarea 
              value={feed.description || ''}
              onChange={e => updateFeed({ description: e.target.value })}
              rows={2}
              className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
              placeholder="Новости и материалы по ремонту..."
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-300 mb-1">Язык (опционально)</label>
              <input 
                type="text"
                value={feed.language || ''}
                onChange={e => updateFeed({ language: e.target.value })}
                className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                placeholder="ru, en"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold text-slate-300 mb-1">Лимит (шт)</label>
              <input 
                type="number"
                value={feed.maxArticles || 10}
                onChange={e => updateFeed({ maxArticles: parseInt(e.target.value) || 10 })}
                className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
              />
            </div>
            <div className="w-24">
              <label className="block text-xs font-bold text-slate-300 mb-1">Обнов. (мин)</label>
              <input 
                type="number"
                value={feed.refreshInterval || 60}
                onChange={e => updateFeed({ refreshInterval: parseInt(e.target.value) || 60 })}
                className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
              />
            </div>
          </div>
        </div>

        {/* Global Keywords */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-bold text-emerald-400 mb-1">Include (Обязательно)</label>
              <textarea 
                value={joinKeywords(feed.keywords)}
                onChange={e => updateFeed({ keywords: splitKeywords(e.target.value) })}
                rows={3}
                className="w-full bg-[#05080c] border border-emerald-900/50 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
                placeholder="iPhone 17\nrepair"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-rose-400 mb-1">Exclude (Исключить)</label>
              <textarea 
                value={joinKeywords(feed.excludeKeywords)}
                onChange={e => updateFeed({ excludeKeywords: splitKeywords(e.target.value) })}
                rows={3}
                className="w-full bg-[#05080c] border border-rose-900/50 rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                placeholder="case\ncover"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Keyword Mode</label>
            <select
              value={feed.keywordMode || 'ANY'}
              onChange={e => updateFeed({ keywordMode: e.target.value as 'ANY' | 'ALL' })}
              className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-3 py-1.5 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
            >
              <option value="ANY">Любое слово (ANY) — статья пройдет, если есть хотя бы 1 совпадение</option>
              <option value="ALL">Все слова (ALL) — статья пройдет, только если есть все слова</option>
            </select>
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-[#1e3a5f]/50 w-full" />

      {/* Sources List */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[#38bdf8] font-bold text-xs uppercase tracking-wider">Источники ({feed.sources?.length || 0})</h4>
          <button
            onClick={addSource}
            className="px-2 py-1 bg-[#0c1929] hover:bg-[#14263d] text-slate-200 border border-[#1e3a5f] rounded font-bold transition flex items-center justify-center gap-1 cursor-pointer text-xs"
          >
            <Plus className="w-3 h-3 text-[#38bdf8]" />
            Добавить источник
          </button>
        </div>

        <div className="space-y-2">
          {(feed.sources || []).map((source, idx) => (
            <div key={source.id || idx} className={`p-3 rounded-lg border transition ${source.enabled ? 'bg-[#09111c] border-[#1e3a5f]/60' : 'bg-[#05080c] border-[#1e3a5f]/30 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-full sm:w-1/4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Тип</label>
                      <select
                        value={source.type || 'rss'}
                        onChange={(e) => updateSource(idx, { type: e.target.value as SourceType })}
                        className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-2 py-1 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8] cursor-pointer"
                      >
                        <option value="rss">RSS</option>
                        <option value="atom">Atom</option>
                        <option value="website">Website</option>
                        <option value="youtube">YouTube</option>
                        <option value="search">Search</option>
                        <option value="reddit">Reddit</option>
                        <option value="telegram">Telegram</option>
                        <option value="pikabu">Pikabu</option>
                        <option value="4pda">4PDA</option>
                      </select>
                    </div>
                    <div className="w-full sm:w-1/4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Название (опц.)</label>
                      <input
                        type="text"
                        value={source.name || ''}
                        onChange={(e) => updateSource(idx, { name: e.target.value })}
                        className="w-full bg-[#05080c] border border-[#1e3a5f] rounded px-2 py-1 text-slate-100 text-xs focus:outline-hidden focus:border-[#38bdf8]"
                        placeholder="My Blog"
                      />
                    </div>
                    <div className="w-full sm:w-2/4">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">URL</label>
                      <div className="flex items-center bg-[#05080c] border border-[#1e3a5f] rounded focus-within:border-[#38bdf8]">
                        <LinkIcon className="w-3 h-3 text-slate-500 ml-2" />
                        <input
                          type="text"
                          value={source.url || ''}
                          onChange={(e) => updateSource(idx, { url: e.target.value })}
                          className="w-full bg-transparent px-2 py-1 text-slate-100 text-xs focus:outline-hidden"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Query (if applicable for Search/YouTube types, but good to have globally available per source) */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="w-full">
                      <label className="block text-[10px] font-bold text-slate-400 mb-0.5">Поисковый запрос / Query (если поддерживается типом)</label>
                      <div className="flex items-center bg-[#05080c] border border-[#1e3a5f] rounded focus-within:border-[#38bdf8]">
                        <Search className="w-3 h-3 text-slate-500 ml-2" />
                        <input
                          type="text"
                          value={source.query || ''}
                          onChange={(e) => updateSource(idx, { query: e.target.value,   })}
                          className="w-full bg-transparent px-2 py-1 text-slate-100 text-xs focus:outline-hidden"
                          placeholder="iPhone 17 teardown"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end pt-4">
                  <button
                    onClick={() => toggleSourceEnabled(idx)}
                    className={`px-2 py-1 text-[10px] font-bold rounded border transition ${
                      source.enabled 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {source.enabled ? 'Включен' : 'Отключен'}
                  </button>
                  <button
                    onClick={() => removeSource(idx)}
                    className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                    title="Удалить источник"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {(!feed.sources || feed.sources.length === 0) && (
            <div className="p-4 text-center text-slate-500 text-xs bg-[#05080c] border border-[#1e3a5f]/50 rounded-lg">
              У этой ленты нет источников. Добавьте первый источник (RSS, Website, YouTube и т.д.).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
