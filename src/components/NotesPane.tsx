import React, { useState } from 'react';
import { Search, Plus, Trash2, Pencil, Check, X, Clock, FileText } from 'lucide-react';
import { MedicalNote, AppArchetypeStyle } from '../types';

interface NotesPaneProps {
  notes: MedicalNote[];
  onAddNote: (text: string) => void;
  onEditNote?: (id: string, newText: string) => void;
  onDeleteNote: (id: string) => void;
  appStyle?: AppArchetypeStyle;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const NotesPane: React.FC<NotesPaneProps> = ({
  notes,
  onAddNote,
  onEditNote,
  onDeleteNote,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const isModern = appStyle === 'modern';
  const [searchQuery, setSearchQuery] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const handleSaveNew = () => {
    if (!newNoteText.trim()) return;
    onAddNote(newNoteText.trim());
    setNewNoteText('');
    onPlaySound?.('success');
  };

  const handleStartEdit = (note: MedicalNote) => {
    onPlaySound?.('click');
    setEditingNoteId(note.id);
    setEditingText(note.text);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      onDeleteNote(id);
      onPlaySound?.('click');
      setEditingNoteId(null);
      return;
    }

    if (onEditNote) {
      onEditNote(id, trimmed);
    }
    onPlaySound?.('success');
    setEditingNoteId(null);
  };

  const handleCancelEdit = () => {
    onPlaySound?.('click');
    setEditingNoteId(null);
  };

  const handleKeyDownNew = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSaveNew();
    }
  };

  const filteredNotes = notes.filter((n) =>
    n.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`flex-1 flex flex-col overflow-hidden p-3 font-mono transition-all ${
      isModern
        ? 'bg-[#080e1a]/80 backdrop-blur-xl border border-cyan-500/20 shadow-xl'
        : 'bg-[#0b0e12]/85 backdrop-blur-xs'
    }`}>
      {/* 1. Header & Search Box */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по заметкам..."
            className={`w-full rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden transition ${
              isModern
                ? 'bg-[#0d172a]/70 border border-cyan-500/30 focus:border-cyan-400 shadow-inner'
                : 'bg-[#12161d] border border-[#2b2518] focus:border-[#ffcc00]/60'
            }`}
          />
          <Search className={`w-3.5 h-3.5 absolute right-3 top-2.5 ${isModern ? 'text-cyan-400/70' : 'text-slate-500'}`} />
        </div>
        <span className={`text-[10px] shrink-0 font-mono ${isModern ? 'text-cyan-300/80' : 'text-slate-500'}`}>
          Всего: {notes.length}
        </span>
      </div>

      {/* 2. Notes List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredNotes.map((note) => {
          const isEditing = editingNoteId === note.id;

          if (isEditing) {
            return (
              <div
                key={note.id}
                className={`p-3 rounded-xl border-2 shadow-lg space-y-2 text-xs ${
                  isModern
                    ? 'bg-[#0c162d]/90 backdrop-blur-md border-cyan-400 shadow-[0_0_15px_rgba(56,189,248,0.3)]'
                    : 'bg-[#10141b] border-[#ffcc00]'
                }`}
              >
                <div className={`flex items-center justify-between text-[10px] font-bold pb-1 border-b ${
                  isModern ? 'text-cyan-300 border-cyan-500/30' : 'text-[#ffcc00] border-[#2b2518]'
                }`}>
                  <span className="flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> Редактирование заметки
                  </span>
                  <span className={isModern ? 'text-cyan-400/70' : 'text-slate-500'}>{note.timestampStr}</span>
                </div>

                <textarea
                  rows={4}
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.ctrlKey && e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveEdit(note.id);
                    }
                    if (e.key === 'Escape') {
                      handleCancelEdit();
                    }
                  }}
                  autoFocus
                  placeholder="Текст заметки..."
                  className={`w-full rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden font-sans resize-y min-h-[80px] ${
                    isModern
                      ? 'bg-[#080e1a]/80 border border-cyan-500/40 focus:border-cyan-400'
                      : 'bg-[#0b0e12] border border-[#3b3220] focus:border-[#ffcc00]'
                  }`}
                />

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-500">
                    Ctrl+Enter — сохранить • Esc — отмена
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSaveEdit(note.id)}
                      className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shadow-xs"
                    >
                      <Check className="w-3.5 h-3.5" /> Сохранить
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition ${
                        isModern ? 'bg-cyan-950/50 hover:bg-cyan-900/50 text-cyan-200 border border-cyan-500/30' : 'bg-[#1a212b] hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" /> Отмена
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={note.id}
              className={`group p-3.5 rounded-xl border transition relative text-xs leading-relaxed ${
                isModern
                  ? 'bg-[#0a1020]/60 backdrop-blur-md border-cyan-500/30 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/20'
                  : 'bg-[#13171f] border-[#2e2617] hover:border-[#4a3e26]'
              }`}
            >
              <div className={`flex items-center justify-between text-[10px] font-bold pb-1.5 border-b mb-2 ${
                isModern ? 'text-cyan-300 border-cyan-500/20' : 'text-[#d4af37] border-[#232730]/60'
              }`}>
                <div className="flex items-center gap-1.5">
                  <Clock className={`w-3 h-3 ${isModern ? 'text-cyan-400/80' : 'text-slate-500'}`} />
                  <span>{note.timestampStr || '2026-06-25 19:32'}</span>
                </div>

                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleStartEdit(note)}
                    className={`p-1 rounded-lg cursor-pointer transition ${
                      isModern
                        ? 'text-cyan-300 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-[#ffcc00] bg-[#181d26] hover:bg-[#252c38]'
                    }`}
                    title="Редактировать заметку"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>

                  <button
                    onClick={() => {
                      onDeleteNote(note.id);
                      onPlaySound?.('click');
                    }}
                    className={`p-1 rounded-lg cursor-pointer transition ${
                      isModern
                        ? 'text-rose-300 hover:text-rose-100 bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30'
                        : 'text-slate-400 hover:text-red-400 bg-[#181d26] hover:bg-red-500/20'
                    }`}
                    title="Удалить заметку"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p 
                onClick={() => handleStartEdit(note)}
                className="text-slate-200 whitespace-pre-wrap break-words font-sans text-xs sm:text-[13px] leading-relaxed select-text max-h-64 overflow-y-auto cursor-pointer hover:text-white transition"
                title="Нажмите для редактирования"
              >
                {note.text}
              </p>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
            <FileText className={`w-8 h-8 ${isModern ? 'text-cyan-500/40' : 'text-slate-700'}`} />
            <span>{searchQuery ? 'Заметки по запросу не найдены' : 'Нет сохраненных заметок'}</span>
          </div>
        )}
      </div>

      {/* 3. Bottom Note Input */}
      <div className={`mt-3 pt-2.5 border-t flex flex-col sm:flex-row gap-2 ${isModern ? 'border-cyan-500/20' : 'border-[#2b2518]'}`}>
        <textarea
          rows={2}
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onKeyDown={handleKeyDownNew}
          placeholder="Новая заметка... (Ctrl+Enter — сохранить)"
          className={`flex-1 rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden resize-none font-sans ${
            isModern
              ? 'bg-[#0d172a]/70 border border-cyan-500/30 focus:border-cyan-400'
              : 'bg-[#12161d] border border-[#2b2518] focus:border-[#ffcc00]/60'
          }`}
        />

        <button
          onClick={handleSaveNew}
          disabled={!newNoteText.trim()}
          className={`px-4 py-2 font-bold font-mono text-xs rounded-lg transition cursor-pointer self-end shrink-0 shadow-sm flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
            isModern
              ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_10px_rgba(56,189,248,0.4)]'
              : 'bg-[#ffcc00] hover:bg-[#ffe066] text-black'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ сохранить</span>
        </button>
      </div>
    </div>
  );
};


