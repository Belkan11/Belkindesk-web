import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Lock, 
  Mail, 
  UserPlus, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Database, 
  Download, 
  Upload, 
  FolderSync, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Stethoscope, 
  Sparkles,
  Layers,
  HardDrive
} from 'lucide-react';
import { UserProfile, MedicalNote, MedicalTimerItem, AccessibilityConfig } from '../types';
import { 
  loginFirebaseUser, 
  registerFirebaseUser, 
  logoutFirebaseUser,
  saveUserDataToFirestore 
} from '../utils/firebase';
import { exportDatabaseToJson, parseBackupFile } from '../utils/backup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  notes: MedicalNote[];
  timers: MedicalTimerItem[];
  accessibility: AccessibilityConfig;
  onSelectUser: (id: string) => void;
  onSaveProfile: (profile: UserProfile) => void;
  onCreateUser: (name: string, email: string, avatar: string, specialization?: string) => void;
  onDeleteProfile: (id: string) => void;
  onRestoreBackup: (
    profiles: UserProfile[],
    notes?: MedicalNote[],
    timers?: MedicalTimerItem[],
    accessibility?: AccessibilityConfig
  ) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allProfiles,
  notes,
  timers,
  accessibility,
  onSelectUser,
  onSaveProfile,
  onCreateUser,
  onDeleteProfile,
  onRestoreBackup,
  onPlaySound,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'profiles' | 'backup'>('login');
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regSpec, setRegSpec] = useState('Кардиология');
  const [regAvatar, setRegAvatar] = useState(
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80'
  );
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Cloud sync state
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMsg, setCloudSyncMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleAvatars = [
    'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594824813629-9e8c454eef58?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&auto=format&fit=crop&q=80',
  ];

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccess(null);
    setLoginLoading(true);
    onPlaySound?.('click');

    try {
      const fbUser = await loginFirebaseUser(loginEmail.trim(), loginPassword);
      setLoginSuccess(`Успешный вход! Пользователь: ${fbUser.displayName || fbUser.email}`);
      onPlaySound?.('success');

      // Check if profile exists in local list, otherwise add
      const existing = allProfiles.find(p => p.email.toLowerCase() === (fbUser.email || '').toLowerCase() || p.id === fbUser.uid);
      if (existing) {
        onSelectUser(existing.id);
      } else {
        onCreateUser(fbUser.displayName || 'Врач', fbUser.email || loginEmail.trim(), regAvatar, 'Кардиология');
      }

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.warn('Login error:', err);
      // Friendly message
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setLoginError('Неверный логин или пароль');
      } else if (err.code === 'auth/user-not-found') {
        setLoginError('Пользователь с таким email не найден. Зарегистрируйтесь!');
      } else {
        setLoginError(err.message || 'Ошибка входа в систему');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setRegLoading(true);
    onPlaySound?.('click');

    try {
      if (regPassword.length < 6) {
        throw new Error('Пароль должен содержать не менее 6 символов');
      }

      const fbUser = await registerFirebaseUser(
        regEmail.trim(),
        regPassword,
        regName.trim(),
        {
          specialization: regSpec,
          avatar: regAvatar,
          notes,
          timers,
          accessibility,
        }
      );

      onPlaySound?.('success');
      onCreateUser(regName.trim(), regEmail.trim(), regAvatar, regSpec);

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      console.warn('Register error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setRegError('Этот email уже зарегистрирован. Пожалуйста, выполните вход.');
      } else {
        setRegError(err.message || 'Ошибка при регистрации');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleQuickDemoLogin = (profile: UserProfile) => {
    onPlaySound?.('success');
    onSelectUser(profile.id);
    onClose();
  };

  const handleExportBackup = () => {
    onPlaySound?.('star');
    exportDatabaseToJson(allProfiles, currentUser.id, notes, timers, accessibility);
    setCloudSyncMsg('База данных успешно выгружена! Сохраните файл в отдельную папку на Google Диске.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const pkg = parseBackupFile(content);
        onRestoreBackup(pkg.profiles, pkg.notes, pkg.timers, pkg.accessibility);
        onPlaySound?.('success');
        setCloudSyncMsg(`База данных успешно восстановлена (${pkg.profiles.length} профилей)!`);
      } catch (err: any) {
        alert(err.message || 'Ошибка чтения файла');
      }
    };
    reader.readAsText(file);
  };

  const handleManualCloudSave = async () => {
    setIsCloudSyncing(true);
    setCloudSyncMsg(null);
    onPlaySound?.('click');

    try {
      await saveUserDataToFirestore(currentUser.id, {
        id: currentUser.id,
        email: currentUser.email,
        displayName: currentUser.displayName,
        avatar: currentUser.avatar,
        feeds: currentUser.feeds,
        notes,
        timers,
        workSchedules: currentUser.workSchedules,
        calendarEvents: currentUser.calendarEvents,
        bookmarks: currentUser.bookmarks,
        accessibility,
        starredArticleIds: currentUser.starredArticleIds,
        readArticleIds: currentUser.readArticleIds,
        updatedAt: new Date().toISOString(),
      });
      onPlaySound?.('success');
      setCloudSyncMsg('Все персональные данные (календари, таймеры, заметки, подписки) синхронизированы в облако Firebase!');
    } catch (err: any) {
      setCloudSyncMsg('Синхронизация сохранена локально. Проверьте подключение к сети.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#0e1217] border-2 border-[#ffcc00]/40 rounded-xl shadow-[0_0_30px_rgba(255,204,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] font-mono">
        
        {/* Modal Top Header */}
        <div className="p-3 bg-[#14181f] border-b border-[#2b2518] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#241f14] border border-[#ffcc00]/50 text-[#ffcc00] flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>БАЗА ДАННЫХ & МУЛЬТИПРОФИЛИ</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Firebase Cloud
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Изолированные профили врачей, персональные календари, заметки и подписки
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2b2518] bg-[#0a0d11] px-2 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('login')}
            className={`px-3 py-2 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'login'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#1a1710]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" /> Вход в систему
          </button>

          <button
            onClick={() => setActiveTab('register')}
            className={`px-3 py-2 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'register'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#1a1710]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" /> Регистрация врача
          </button>

          <button
            onClick={() => setActiveTab('profiles')}
            className={`px-3 py-2 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'profiles'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#1a1710]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Профили ({allProfiles.length})
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-2 font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'backup'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#1a1710]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" /> Google Диск & Бэкап
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 text-xs text-slate-200 space-y-4">
          
          {/* TAB 1: LOGIN */}
          {activeTab === 'login' && (
            <div className="max-w-md mx-auto space-y-4 py-2">
              <div className="p-3 rounded bg-[#14181f] border border-[#2b2518] text-[11px] text-slate-300">
                <div className="font-bold text-[#ffcc00] mb-1 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Защищенная авторизация в облаке
                </div>
                Войдите со своим логином и паролем. Все ваши персональные заметки, таймеры, графики смен и подписки загрузятся автоматически.
              </div>

              {loginError && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-500/50 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{loginSuccess}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Email / Логин пользователя
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="doctor@belkindesk.med"
                      className="w-full bg-[#07090c] border border-[#2b2518] rounded px-3 py-2 pl-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#ffcc00]"
                    />
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Пароль
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#07090c] border border-[#2b2518] rounded px-3 py-2 pl-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#ffcc00]"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2.5 bg-[#ffcc00] hover:bg-[#ffe066] disabled:opacity-50 text-black font-bold rounded cursor-pointer transition flex items-center justify-center gap-2"
                  >
                    {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    <span>{loginLoading ? 'Вход в систему...' : 'Войти в рабочий стол'}</span>
                  </button>
                </div>
              </form>

              {/* Quick switch to existing doctor profiles */}
              <div className="pt-3 border-t border-[#232730]">
                <div className="text-[10px] text-slate-400 uppercase font-bold mb-2">
                  Или мгновенный вход в профиль врача:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allProfiles.map((prof) => (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => handleQuickDemoLogin(prof)}
                      className="p-2 rounded bg-[#131720] border border-[#2e2617] hover:border-[#ffcc00] flex items-center gap-2 text-left transition cursor-pointer group"
                    >
                      <img
                        src={prof.avatar}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-200 group-hover:text-[#ffcc00] truncate">
                          {prof.displayName}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate">{prof.email}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REGISTER */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="max-w-md mx-auto space-y-3 py-2">
              <div className="p-3 rounded bg-[#14181f] border border-[#2b2518] text-[11px] text-slate-300">
                <div className="font-bold text-[#ffcc00] mb-1 flex items-center gap-1">
                  <UserPlus className="w-3.5 h-3.5" /> Создание новой учетной записи врача
                </div>
                Будет создана отдельная защищенная база в облаке с собственным календарем, таймерами смен, заметками и лентами.
              </div>

              {regError && (
                <div className="p-2.5 rounded bg-red-950/60 border border-red-500/50 text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  ФИО врача / Название профиля <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Например: Д-р Беликович А.В."
                    className="w-full bg-[#07090c] border border-[#2b2518] rounded px-3 py-2 pl-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#ffcc00]"
                  />
                  <User className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Специализация
                  </label>
                  <select
                    value={regSpec}
                    onChange={(e) => setRegSpec(e.target.value)}
                    className="w-full bg-[#07090c] border border-[#2b2518] rounded px-2.5 py-2 text-xs text-slate-100 focus:outline-hidden focus:border-[#ffcc00]"
                  >
                    <option value="Кардиология">Кардиология</option>
                    <option value="Терапия">Терапия</option>
                    <option value="ОРИТ / Реанимация">ОРИТ / Реанимация</option>
                    <option value="Неврология">Неврология</option>
                    <option value="Хирургия">Хирургия</option>
                    <option value="Функциональная диагностика">Функциональная диагностика</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Email <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="belkovich@med.ru"
                    className="w-full bg-[#07090c] border border-[#2b2518] rounded px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#ffcc00]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Пароль учетной записи <span className="text-amber-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full bg-[#07090c] border border-[#2b2518] rounded px-3 py-2 pl-8 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-[#ffcc00]"
                  />
                  <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Аватар профиля
                </label>
                <div className="flex gap-2">
                  {sampleAvatars.map((av, idx) => (
                    <img
                      key={idx}
                      src={av}
                      alt=""
                      onClick={() => setRegAvatar(av)}
                      className={`w-8 h-8 rounded-full object-cover cursor-pointer transition ${
                        regAvatar === av ? 'ring-2 ring-[#ffcc00] scale-110' : 'opacity-50 hover:opacity-100'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-2.5 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 text-black font-bold rounded cursor-pointer transition flex items-center justify-center gap-2"
                >
                  {regLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>{regLoading ? 'Регистрация...' : 'Зарегистрировать и войти'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PROFILES SWITCH */}
          {activeTab === 'profiles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Активные профили в системе. У каждого свой набор заметок, графиков смен и новостей.
                </span>
                <button
                  onClick={handleManualCloudSave}
                  disabled={isCloudSyncing}
                  className="px-2.5 py-1 bg-[#1a212b] hover:bg-[#ffcc00] hover:text-black text-[#ffcc00] border border-[#ffcc00]/40 rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <FolderSync className={`w-3 h-3 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>Синхронизировать с облаком</span>
                </button>
              </div>

              {cloudSyncMsg && (
                <div className="p-2 rounded bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-[11px]">
                  {cloudSyncMsg}
                </div>
              )}

              <div className="grid gap-2">
                {allProfiles.map((p) => {
                  const isActive = p.id === currentUser.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex items-center justify-between transition ${
                        isActive
                          ? 'bg-[#181f2a] border-[#ffcc00] shadow-sm'
                          : 'bg-[#11141a] border-[#262c38] hover:border-[#3b4455]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-[#ffcc00]/50 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-100 flex items-center gap-2 truncate">
                            <span>{p.displayName}</span>
                            {isActive && (
                              <span className="text-[9px] bg-[#ffcc00] text-black px-1.5 py-0.2 rounded font-bold uppercase">
                                Активен
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">{p.email}</div>
                          <div className="text-[9px] text-[#ffcc00]/80 mt-0.5">
                            Подписок: {p.feeds?.length || 0} • Смен в графике: {Object.keys(p.workSchedules || {}).length}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive ? (
                          <>
                            <button
                              onClick={() => {
                                onSelectUser(p.id);
                                onPlaySound?.('click');
                                onClose();
                              }}
                              className="px-3 py-1 bg-[#ffcc00] hover:bg-[#ffe066] text-black font-bold rounded text-xs transition cursor-pointer"
                            >
                              Переключить
                            </button>
                            {allProfiles.length > 1 && (
                              <button
                                onClick={() => {
                                  if (confirm(`Удалить профиль «${p.displayName}»?`)) {
                                    onDeleteProfile(p.id);
                                    onPlaySound?.('click');
                                  }
                                }}
                                className="p-1.5 text-slate-500 hover:text-red-400 transition cursor-pointer"
                                title="Удалить профиль"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="text-right">
                            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Текущая сессия
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE DRIVE & JSON BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-4 max-w-lg mx-auto py-1">
              <div className="p-3 rounded bg-[#14181f] border border-[#2b2518] text-[11px] text-slate-300 space-y-2">
                <div className="font-bold text-[#ffcc00] flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4" /> Надежное хранение базы данных & Google Диск
                </div>
                <p>
                  Вы можете экспортировать полную базу данных в единый структурированный JSON-файл и сохранить его в отдельную защищенную папку на вашем Google Диске или локальном носителе.
                </p>
                <p className="text-slate-400 text-[10px]">
                  Экспортируются: аккаунты всех врачей, подписки на RSS-ленты, полные тексты заметок, таймеры дежурств, графики смен и настройки отображения.
                </p>
              </div>

              {cloudSyncMsg && (
                <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cloudSyncMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Export Card */}
                <div className="p-3.5 rounded bg-[#10141a] border border-[#2e2617] hover:border-[#ffcc00] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                      <Download className="w-4 h-4 text-[#ffcc00]" /> Экспорт базы (Google Диск)
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Скачать файл базы данных для сохранения в Google Drive папку
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="w-full py-2 bg-[#ffcc00] hover:bg-[#ffe066] text-black font-bold rounded text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .JSON бэкап</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-3.5 rounded bg-[#10141a] border border-[#2e2617] hover:border-[#ffcc00] transition flex flex-col justify-between space-y-3">
                  <div>
                    <div className="font-bold text-slate-100 flex items-center gap-1.5 mb-1">
                      <Upload className="w-4 h-4 text-emerald-400" /> Импорт из Google Диска
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Восстановить базу и профили из сохраненного файла
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImportBackup}
                      accept=".json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-[#1b2330] hover:bg-slate-700 text-slate-200 font-bold rounded text-xs transition cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Выбрать файл бэкапа</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloud Sync section */}
              <div className="p-3 rounded bg-[#0b0e12] border border-[#232730] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-slate-300">Firebase Firestore Cloud Realtime</span>
                </div>
                <button
                  onClick={handleManualCloudSave}
                  disabled={isCloudSyncing}
                  className="text-[#ffcc00] hover:underline font-bold cursor-pointer"
                >
                  {isCloudSyncing ? 'Синхронизация...' : 'Обновить в облаке'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
