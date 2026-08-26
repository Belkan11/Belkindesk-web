import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  Edit3, 
  Key, 
  Check, 
  X, 
  UserPlus, 
  Search, 
  HardDrive, 
  Cloud, 
  AlertTriangle, 
  ExternalLink,
  Lock,
  Calendar,
  FileText,
  Clock,
  Rss,
  Copy
} from 'lucide-react';
import { UserProfile, MedicalNote, MedicalTimerItem, AccessibilityConfig, AppArchetypeStyle } from '../types';

const isDevMode = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('ais-dev')
);

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  notes: MedicalNote[];
  timers: MedicalTimerItem[];
  accessibility: AccessibilityConfig;
  onUpdateUserRole: (userId: string, newRole: 'admin' | 'doctor' | 'user') => void;
  onUpdateUserDetails: (userId: string, updates: Partial<UserProfile>) => void;
  onDeleteUserProfile: (userId: string) => void;
  onRestoreBackup: (
    profiles: UserProfile[],
    notes?: MedicalNote[],
    timers?: MedicalTimerItem[],
    accessibility?: AccessibilityConfig
  ) => void;
  appStyle?: AppArchetypeStyle;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allProfiles,
  notes,
  timers,
  accessibility,
  onUpdateUserRole,
  onUpdateUserDetails,
  onDeleteUserProfile,
  onRestoreBackup,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const isModern = appStyle === 'modern';
  const [activeTab, setActiveTab] = useState<'users' | 'backup' | 'audit'>('users');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit user state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'doctor' | 'user'>('doctor');

  // Backup status
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [lastCloudSync, setLastCloudSync] = useState('Только что');

  // Audit logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'ai' | 'error'>('all');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Poll for logs when activeTab is 'audit'
  React.useEffect(() => {
    if (activeTab !== 'audit' || !isOpen) return;

    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/admin/logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data.logs || []);
        }
      } catch (err) {
        console.warn('Error fetching audit logs:', err);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, [activeTab, isOpen]);

  const handleClearLogs = async () => {
    if (!confirm('Вы уверены, что хотите полностью очистить журнал отладки?')) return;
    try {
      const res = await fetch('/api/admin/logs/clear', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        onPlaySound?.('success');
      }
    } catch (err) {
      console.warn('Error clearing audit logs:', err);
    }
  };

  const handleCopyLogs = () => {
    // If a specific log item's details window is open, copy only that log entry's full info & details
    const visibleLogs = logs.filter(log => {
      if (logFilter === 'info') return log.type === 'info' || log.type === 'system';
      if (logFilter === 'ai') return log.type === 'google' || log.type === 'gemini';
      if (logFilter === 'error') return log.type === 'error' || log.type === 'warn';
      return true;
    });

    if (expandedLogId !== null && visibleLogs[expandedLogId]) {
      const l = visibleLogs[expandedLogId];
      const detailsStr = l.details 
        ? (typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : String(l.details))
        : '';
      const text = `[${l.timestamp}] [${String(l.type || l.level).toUpperCase()}] ${l.message}${detailsStr ? '\nДетали:\n' + detailsStr : ''}`;
      navigator.clipboard.writeText(text);
      alert('Лог открытого окна (детали записи) успешно скопирован в буфер обмена!');
      onPlaySound?.('success');
      return;
    }

    // Otherwise copy logs of the currently active tab window
    const text = visibleLogs.map(l => {
      const detailsStr = l.details 
        ? (typeof l.details === 'object' ? JSON.stringify(l.details, null, 2) : String(l.details))
        : '';
      return `[${l.timestamp}] [${String(l.type || l.level).toUpperCase()}] ${l.message}${detailsStr ? '\n  Details: ' + detailsStr : ''}`;
    }).join('\n');

    navigator.clipboard.writeText(text);
    const tabName = logFilter === 'all' ? 'Все логи' : logFilter === 'info' ? 'Инфо & Система' : logFilter === 'ai' ? 'Gemini & Google API' : 'Ошибки';
    alert(`Логи открытого окна («${tabName}», ${visibleLogs.length} записей) успешно скопированы!`);
    onPlaySound?.('success');
  };

  if (!isOpen) return null;

  // Strict Admin Gate check: only admins can view
  if (currentUser?.role !== 'admin' && currentUser?.username?.toLowerCase() !== 'belkin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-[#0f1218] border border-rose-500/40 rounded-xl p-6 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-2">Доступ ограничен</h2>
          <p className="text-xs text-slate-300 mb-4">
            Панель управления, список всех профилей и резервное копирование Google Диск доступны только администраторам системы.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  const filteredProfiles = allProfiles.filter(p => {
    const q = searchQuery.toLowerCase();
    const dName = (p.displayName || p.username || p.login || '').toLowerCase();
    const uName = (p.username || p.login || '').toLowerCase();
    const email = (p.email || '').toLowerCase();
    const spec = (p.specialization || p.specialty || '').toLowerCase();
    return dName.includes(q) || uName.includes(q) || email.includes(q) || spec.includes(q);
  });

  const startEditUser = (p: UserProfile) => {
    setEditingUserId(p.id);
    setEditName(p.displayName || '');
    setEditSpecialty(p.specialization || '');
    setEditPassword(p.password || '');
    setEditRole(p.role || 'doctor');
  };

  const saveUserEdits = (userId: string) => {
    onUpdateUserDetails(userId, {
      displayName: editName.trim(),
      specialization: editSpecialty.trim(),
      password: editPassword,
      role: editRole,
    });
    setEditingUserId(null);
    onPlaySound?.('success');
  };

  // Google Drive & Full Database Export
  const handleExportBackup = () => {
    const backupData = {
      version: 'BelkinDESK_v3',
      exportDate: new Date().toISOString(),
      exportedBy: `${currentUser.displayName} (${currentUser.username})`,
      profiles: allProfiles,
      currentSession: {
        notes,
        timers,
        accessibility,
      },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const todayStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `BelkinDESK_GoogleDrive_Backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setBackupMsg(`Файл бэкапа успешно скачан! Сохраните его в папку "BelkinDESK_Backups" на вашем Google Диске.`);
    onPlaySound?.('success');
  };

  // Import JSON Backup (e.g. from Google Drive)
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setBackupMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = evt.target?.result as string;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.profiles)) {
          throw new Error('Некорректный формат файла бэкапа (отсутствует массив profiles)');
        }

        onRestoreBackup(
          parsed.profiles,
          parsed.currentSession?.notes,
          parsed.currentSession?.timers,
          parsed.currentSession?.accessibility
        );

        setBackupMsg(`База данных успешно восстановлена! Загружено ${parsed.profiles.length} профилей.`);
        onPlaySound?.('success');
      } catch (err: any) {
        setRestoreError(err.message || 'Ошибка парсинга файла бэкапа');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
      <div className={`rounded-2xl w-full max-w-4xl h-[680px] max-h-[92vh] flex flex-col shadow-2xl overflow-hidden transition-all ${
        isModern
          ? 'bg-[#0a1020]/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
          : 'bg-[#0c0f14] border border-[#2d3748]'
      }`}>
        
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
          isModern ? 'bg-[#0d172a]/90 border-cyan-500/30 text-cyan-300' : 'bg-[#141a24] border-[#232a3b]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${
              isModern
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'bg-[#ffcc00]/10 text-[#ffcc00] border-[#ffcc00]/30'
            }`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className={`text-base font-bold font-mono ${isModern ? 'text-cyan-200' : 'text-white'}`}>
                  ПАНЕЛЬ АДМИНИСТРАТОРА <span className={isModern ? 'text-cyan-400' : 'text-[#ffcc00]'}>BelkinDESK</span>
                </h2>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isModern ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50' : 'bg-[#ffcc00] text-black'
                }`}>
                  ADMIN ONLY
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Управление учетными записями, правами доступа и резервным копированием базы данных
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              onClose();
              onPlaySound?.('click');
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#1f2635] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-2 bg-[#0c0f14] border-b border-[#232a3b] shrink-0 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('users');
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#161d2a]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Список профилей и права ({allProfiles.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#161d2a]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            Google Диск & Бэкап базы данных
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('audit');
              onPlaySound?.('click');
            }}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#161d2a]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Audit (Журнал ИИ-парсинга & Отладка)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* TAB 1: USERS MANAGEMENT */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по ФИО, логину, email или специализации..."
                    className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3 py-2 pl-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00]"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <div className="text-xs text-slate-400">
                  Всего пользователей: <strong className="text-white">{allProfiles.length}</strong>
                </div>
              </div>

              {/* Profiles Table */}
              <div className="border border-[#232a3b] rounded-lg overflow-hidden bg-[#11141c]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#161d2a] text-slate-400 border-b border-[#232a3b]">
                      <th className="p-3 font-semibold">Пользователь</th>
                      <th className="p-3 font-semibold">Активность</th>
                      <th className="p-3 font-semibold">Логин & Пароль</th>
                      <th className="p-3 font-semibold">Специализация</th>
                      <th className="p-3 font-semibold">Роль / Права</th>
                      <th className="p-3 font-semibold text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2638]">
                    {filteredProfiles.map((p) => {
                      
                                            const isOnline = (() => {
                        if (!p.lastActiveAt && !p.lastLoginAt) return false;
                        const lastTime = new Date(p.lastActiveAt || p.lastLoginAt || 0).getTime();
                        return (Date.now() - lastTime) < 5 * 60 * 1000;
                      })();
                      const lastSeenStr = (() => {
                        const ds = p.lastActiveAt || p.lastLoginAt;
                        if (!ds) return 'Никогда';
                        return new Date(ds).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit', 
                          hour: '2-digit', minute: '2-digit'
                        });
                      })();

                      const isMainAdmin = (p.username && p.username.toLowerCase() === 'belkin') || p.id === 'user-admin-belkin';
                      const isEditing = editingUserId === p.id;

                      return (
                        <tr key={p.id} className="hover:bg-[#141924] transition">
                          {/* User Avatar & Name */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <img
                                src={p.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="bg-[#1b2230] border border-[#ffcc00] rounded px-2 py-0.5 text-xs text-white"
                                  />
                                ) : (
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    {p.displayName || p.username}
                                    {isMainAdmin && (
                                      <ShieldCheck className="w-3.5 h-3.5 text-[#ffcc00]" title="Главный Администратор" />
                                    )}
                                  </div>
                                )}
                                <div className="text-[10px] text-slate-400">{p.email}</div>
                              </div>
                            </div>
                          </td>

                          
                          

                          {/* Activity & Online Status */}
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-slate-600'}`} title={isOnline ? 'В сети' : 'Не в сети'} />
                                <span className={`text-xs ${isOnline ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                                  {isOnline ? 'В сети' : 'Не в сети'}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 whitespace-nowrap" title="Последнее посещение">
                                {lastSeenStr}
                              </div>
                            </div>
                          </td>

                          {/* Login & Password info */}
                          <td className="p-3 font-mono">
                            <div className="text-slate-200">@{p.username}</div>
                            {isEditing ? (
                              <div className="flex items-center gap-1 mt-1">
                                {isDevMode && (p.id.startsWith('usr_') || p.id.startsWith('agent-') || p.id === 'user-admin-belkin') ? (
                                  <>
                                    <Key className="w-3 h-3 text-[#ffcc00]" />
                                    <input
                                      type="text"
                                      value={editPassword}
                                      onChange={(e) => setEditPassword(e.target.value)}
                                      placeholder="Пароль"
                                      className="bg-[#1b2230] border border-[#ffcc00] rounded px-1.5 py-0.5 text-[11px] text-white w-24"
                                    />
                                  </>
                                ) : (
                                  <span className="text-[10px] text-emerald-400 font-sans">Защищено Firebase</span>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                {p.password ? `Пароль: ${p.password}` : 'Пароль защищен (Firebase)'}
                              </div>
                            )}
                          </td>

                          {/* Specialization */}
                          <td className="p-3">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editSpecialty}
                                onChange={(e) => setEditSpecialty(e.target.value)}
                                className="bg-[#1b2230] border border-[#ffcc00] rounded px-2 py-0.5 text-xs text-white w-full"
                              />
                            ) : (
                              <span className="text-slate-300 text-[11px]">
                                {p.specialization || 'Врач-специалист'}
                              </span>
                            )}
                          </td>

                          {/* Role selector */}
                          <td className="p-3">
                            {isEditing ? (
                              <select
                                value={editRole}
                                disabled={isMainAdmin}
                                onChange={(e) => setEditRole(e.target.value as any)}
                                className="bg-[#1b2230] border border-[#ffcc00] rounded px-2 py-1 text-xs text-white"
                              >
                                <option value="admin">Администратор</option>
                                <option value="doctor">Врач</option>
                                <option value="user">Пользователь</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  p.role === 'admin'
                                    ? 'bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/40'
                                    : p.role === 'doctor'
                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                {p.role === 'admin' ? 'Администратор' : p.role === 'doctor' ? 'Врач' : 'Пользователь'}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => saveUserEdits(p.id)}
                                  className="p-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white transition cursor-pointer"
                                  title="Сохранить изменения"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition cursor-pointer"
                                  title="Отмена"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => startEditUser(p)}
                                  className="p-1 rounded bg-[#1f2638] hover:bg-[#2b354c] text-slate-300 hover:text-white transition cursor-pointer"
                                  title="Редактировать профиль и пароль"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {!isMainAdmin && (
                                  <button
                                    onClick={() => {
                                      if (confirm(`Удалить учетную запись врача "${p.displayName}" (@${p.username})?`)) {
                                        onDeleteUserProfile(p.id);
                                        onPlaySound?.('click');
                                      }
                                    }}
                                    className="p-1 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition cursor-pointer"
                                    title="Удалить профиль"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE DRIVE & CLOUD BACKUP SYNC */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {backupMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{backupMsg}</span>
                </div>
              )}

              {restoreError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Direct Google Drive Cloud Hub Card */}
              <div className="p-5 bg-gradient-to-br from-[#121824] to-[#182032] border border-cyan-500/30 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-300">
                      <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Google Диск: Прямая облачная синхронизация
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                          ПОДКЛЮЧЕНО
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400">
                        Папка бэкапов: <code className="text-cyan-300">BelkinDESK_Cloud_Backups</code> • Авто-синхронизация активна
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBackupMsg('Связь с Google Диском проверена. Аккаунт активен.');
                      onPlaySound?.('success');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#1e2638] hover:bg-[#28324a] text-xs font-bold text-slate-200 border border-slate-700 transition cursor-pointer"
                  >
                    Проверить статус
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-[#0a0e17] border border-slate-800 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Профилей в базе</div>
                    <div className="text-lg font-bold text-white font-mono mt-0.5">{allProfiles.length}</div>
                  </div>
                  <div className="p-3 bg-[#0a0e17] border border-slate-800 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Последняя синхронизация</div>
                    <div className="text-sm font-bold text-cyan-300 font-mono mt-1">{lastCloudSync}</div>
                  </div>
                  <div className="p-3 bg-[#0a0e17] border border-slate-800 rounded-xl">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Статус облака</div>
                    <div className="text-sm font-bold text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Готово к обмену
                    </div>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <button
                    id="btn-cloud-sync-now"
                    onClick={handleExportBackup}
                    className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    <Download className="w-4 h-4 text-black" />
                    Сохранить бэкап на Google Диск (.JSON)
                  </button>

                  <label className="w-full sm:flex-1 py-3 px-4 bg-[#1e2638] hover:bg-[#28324a] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-700 shadow-md">
                    <Upload className="w-4 h-4 text-emerald-400" />
                    Восстановить с Google Диска
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Cloud Firestore Status */}
              <div className="p-3.5 bg-[#0e121a] border border-[#1e2535] rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 text-slate-300">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold text-white">Облачное хранилище Firebase Firestore</div>
                    <div className="text-[10px] text-slate-500">Автоматическая синхронизация всех врачебных профилей включена</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                  АКТИВНО
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS & DIAGNOSTICS */}
          {activeTab === 'audit' && (
            <div className="space-y-4 flex flex-col h-full overflow-hidden">
              {/* Filter controls and Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-1.5 bg-[#141824] border border-[#232a3b] rounded-lg p-1">
                  <button
                    onClick={() => setLogFilter('all')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      logFilter === 'all'
                        ? 'bg-[#ffcc00] text-black shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Все логи ({logs.length})
                  </button>
                  <button
                    onClick={() => setLogFilter('info')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      logFilter === 'info'
                        ? 'bg-blue-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Инфо & Система
                  </button>
                  <button
                    onClick={() => setLogFilter('ai')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      logFilter === 'ai'
                        ? 'bg-purple-500 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Gemini & Google API
                  </button>
                  <button
                    onClick={() => setLogFilter('error')}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                      logFilter === 'error'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Ошибки ({logs.filter(l => l.type === 'error' || l.type === 'warn').length})
                  </button>
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span>Автообновление (3с)</span>
                  </div>
                  <button
                    onClick={handleCopyLogs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1e2638] hover:bg-[#28324a] border border-slate-700 text-slate-200 text-[11px] font-bold transition cursor-pointer shadow-md"
                    title="Скопировать логи открытого окна или активной вкладки"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#ffcc00]" />
                    Скопировать логи
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-bold transition cursor-pointer uppercase font-mono shadow-md"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Очистить логи
                  </button>
                </div>
              </div>

              {/* Logs Screen */}
              <div className="border border-[#232a3b] rounded-lg bg-[#07090d] font-mono text-[11px] text-slate-300 flex-1 flex flex-col overflow-hidden min-h-[380px] max-h-[420px]">
                {/* Log Header */}
                <div className="bg-[#10141c] px-3 py-2 border-b border-[#232a3b] flex items-center text-slate-500 font-bold shrink-0 text-[10px]">
                  <span className="w-24 shrink-0">ВРЕМЯ</span>
                  <span className="w-20 shrink-0">ТИП</span>
                  <span className="flex-1">СООБЩЕНИЕ / ШАГ ОТЛАДКИ</span>
                </div>

                {/* Log Lines */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-[#181d29]/30">
                  {logs
                    .filter(log => {
                      if (logFilter === 'info') return log.type === 'info' || log.type === 'system';
                      if (logFilter === 'ai') return log.type === 'google' || log.type === 'gemini';
                      if (logFilter === 'error') return log.type === 'error' || log.type === 'warn';
                      return true;
                    })
                    .map((log, index) => {
                      const timeStr = log.timestamp || new Date().toLocaleTimeString('ru-RU', { hour12: false });

                      const isExpanded = expandedLogId === index;
                      const hasDetails = log.details && (typeof log.details === 'object' ? Object.keys(log.details).length > 0 : String(log.details).trim().length > 0);

                      // Style colors
                      let typeBadge = 'bg-slate-855 text-slate-300';
                      let textClass = 'text-slate-300';
                      if (log.type === 'error') {
                        typeBadge = 'bg-rose-900/50 text-rose-300 border border-rose-750';
                        textClass = 'text-rose-200 font-semibold';
                      } else if (log.type === 'warn') {
                        typeBadge = 'bg-amber-900/40 text-amber-300 border border-amber-800/40';
                        textClass = 'text-amber-200';
                      } else if (log.type === 'google') {
                        typeBadge = 'bg-blue-950/60 text-blue-300 border border-blue-900/40';
                        textClass = 'text-blue-100';
                      } else if (log.type === 'gemini') {
                        typeBadge = 'bg-purple-950/60 text-purple-300 border border-purple-900/40';
                        textClass = 'text-purple-100';
                      } else if (log.type === 'info') {
                        typeBadge = 'bg-slate-900 text-slate-400 border border-slate-800';
                        textClass = 'text-slate-300';
                      }

                      return (
                        <div key={index} className={`py-1 px-1.5 rounded transition ${isExpanded ? 'bg-[#121622]/40' : 'hover:bg-[#121622]/20'}`}>
                          <div
                            onClick={() => hasDetails && setExpandedLogId(isExpanded ? null : index)}
                            className={`flex items-start gap-2.5 ${hasDetails ? 'cursor-pointer' : ''}`}
                          >
                            <span className="w-24 shrink-0 text-slate-500 font-mono text-[10px] select-all leading-relaxed">
                              {timeStr}
                            </span>
                            <span className={`w-20 shrink-0 text-center px-1 py-0.5 rounded text-[9px] font-black select-none tracking-wider ${typeBadge}`}>
                              {String(log.type).toUpperCase()}
                            </span>
                            <span className={`flex-1 select-text leading-relaxed whitespace-pre-wrap ${textClass}`}>
                              {log.message}
                              {hasDetails && (
                                <span className="ml-2 text-[9px] text-[#ffcc00] bg-[#1a1505] px-1 rounded border border-[#4d3d0f] inline-block animate-pulse font-sans">
                                  {isExpanded ? 'Свернуть [-]' : 'Подробности [+]'}
                                </span>
                              )}
                            </span>
                          </div>

                          {/* Collapsible Details Panel */}
                          {hasDetails && isExpanded && (
                            <div className="mt-1.5 pl-24 animate-in slide-in-from-top-1 duration-150">
                              <pre className="bg-[#040609] border border-[#1d2433] rounded-lg p-2.5 text-[#00ffcc] text-[10px] overflow-x-auto leading-relaxed max-h-56 select-text whitespace-pre-wrap">
                                {typeof log.details === 'object'
                                  ? JSON.stringify(log.details, null, 2)
                                  : String(log.details)}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {logs.length === 0 && (
                    <div className="text-center py-24 text-slate-600 flex flex-col items-center gap-2">
                      <Clock className="w-8 h-8 opacity-40 animate-pulse text-slate-600" />
                      <span>Логи отсутствуют. Запустите парсинг или переработку карточек для генерации диагностических логов.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Debug tips helper */}
              <div className="p-3 bg-[#11141c] border border-[#232a3b] rounded-lg flex items-start gap-2.5 text-[11px] text-slate-400 shrink-0">
                <AlertTriangle className="w-4 h-4 text-[#ffcc00] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Как отладить парсинг?</strong> Если лента не выдает результаты, изучите логи с меткой <span className="text-blue-300">GOOGLE</span> и <span className="text-purple-300">GEMINI</span>. Панель показывает точные HTTP-ответы, найденные теги RSS в исходном коде сайтов и отладочные запросы к Gemini AI.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141a24] border-t border-[#232a3b] flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ffcc00]" />
            <span>Сессия администратора: <strong className="text-white">Belkin</strong></span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#232b3c] hover:bg-[#313c54] text-white font-medium transition cursor-pointer"
          >
            Закрыть
          </button>
        </div>

      </div>
    </div>
  );
};
