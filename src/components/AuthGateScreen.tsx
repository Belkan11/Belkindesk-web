import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  LogIn, 
  UserPlus, 
  AlertCircle,
  HeartPulse,
  CheckCircle2, 
  Database,
  Sparkles,
  Bot,
  Rss
} from 'lucide-react';
import { UserProfile } from '../types';
import { ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS } from '../data/curatedFeeds';
import { INITIAL_BOOKMARKS } from '../utils/storage';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, saveUserProfileToFirestore } from '../utils/firebase';

const isDevMode = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('ais-dev')
);

interface AuthGateScreenProps {
  onAuthSuccess?: (userId: string) => void;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
  profiles: UserProfile[];
  onSetProfiles: (profiles: UserProfile[]) => void;
}

const AVATAR_OPTIONS = [
  { id: 'av-1', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80', label: 'Врач 1' },
  { id: 'av-2', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&auto=format&fit=crop&q=80', label: 'Врач 2' },
  { id: 'av-3', url: 'https://images.unsplash.com/photo-1594824813689-d1bf1e45903b?w=150&auto=format&fit=crop&q=80', label: 'Врач 3' },
  { id: 'av-4', url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150&auto=format&fit=crop&q=80', label: 'Врач 4' },
  { id: 'av-5', url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&auto=format&fit=crop&q=80', label: 'Врач 5' },
];

const SPECIALTY_OPTIONS = [
  'Кардиология & РКО',
  'Анестезиология и реанимация (ОРИТ)',
  'Терапия & Общая врачебная практика',
  'Неврология & ЦВБ',
  'Хирургия & Интервенционная кардиология',
  'Функциональная диагностика (ЭКГ, ЭхоКГ)',
  'Эндокринология',
  'Студент / Ординатор / Исследователь'
];

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onAuthSuccess,
  onPlaySound,
  profiles,
  onSetProfiles,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    
    const cleanLogin = loginUsername.trim().toLowerCase();
    
    // Find registered email
    let email = '';
    const matchedProfile = profiles.find(
      (p) => (p.username && p.username.toLowerCase() === cleanLogin) || 
             (p.login && p.login.toLowerCase() === cleanLogin) ||
             (p.email && p.email.toLowerCase() === cleanLogin)
    );

    if (cleanLogin.includes('@')) {
      email = cleanLogin;
    } else if (matchedProfile && matchedProfile.email) {
      email = matchedProfile.email;
    } else {
      email = `${cleanLogin}@local.desk`;
    }

    try {
      // Authenticate with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
      const uid = userCredential.user.uid;

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (error: any) {
      console.warn('Firebase login failed:', error);

      // 1. One-time legacy migration (Category A)
      const legacyProfile = profiles.find(
        (p) => ((p.username && p.username.toLowerCase() === cleanLogin) || 
               (p.login && p.login.toLowerCase() === cleanLogin)) &&
               p.password && p.password === loginPassword
      );

      if (legacyProfile) {
        try {
          // On-the-fly register legacy user in Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(auth, legacyProfile.email || `${cleanLogin}@local.desk`, loginPassword);
          const uid = userCredential.user.uid;

          // Migrate and clean profile (remove the raw password)
          const migratedProfile: UserProfile = {
            ...legacyProfile,
            id: uid,
            updatedAt: new Date().toISOString()
          };
          delete migratedProfile.password;

          await saveUserProfileToFirestore(migratedProfile);

          const nextProfiles = profiles.map(p => p.id === legacyProfile.id ? migratedProfile : p);
          onSetProfiles(nextProfiles);

          onPlaySound?.('success');
          onAuthSuccess?.(uid);
          return;
        } catch (migrationErr: any) {
          console.error('Legacy migration to Firebase Auth failed:', migrationErr);
          
          if (migrationErr.code === 'auth/email-already-in-use') {
            setLoginError('Этот аккаунт уже перенесен в облако. Войдите с помощью пароля Firebase.');
          } else if (migrationErr.code === 'auth/network-request-failed') {
            setLoginError('Для первой миграции аккаунта требуется интернет-соединение.');
          } else {
            setLoginError(`Ошибка переноса аккаунта в Firebase: ${migrationErr.message || migrationErr}`);
          }
          return;
        }
      }

      // 2. Active Dev Mode bypass for system agents and demo users (Category B)
      if (isDevMode) {
        const demoProfile = profiles.find(
          (p) => ((p.username && p.username.toLowerCase() === cleanLogin) || 
                 (p.login && p.login.toLowerCase() === cleanLogin)) &&
                 p.password === loginPassword &&
                 (p.id.startsWith('agent-') || p.id === 'user-admin-belkin')
        );
        if (demoProfile) {
          console.log('Dev Mode: bypass Firebase and log in directly using local demo credentials');
          onPlaySound?.('success');
          onAuthSuccess?.(demoProfile.id);
          return;
        }
      }

      // If migration or dev login is not applicable, display typical auth error
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setLoginError('Неверный пароль или логин');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('Пользователь с таким никнеймом или email не найден');
      } else if (error.code === 'auth/network-request-failed') {
        setLoginError('Ошибка сети. Проверьте интернет-соединение.');
      } else {
        setLoginError('Неверный логин/email или пароль');
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    
    const cleanLogin = regUsername.trim();
    if (!cleanLogin) {
      setRegError('Никнейм не может быть пустым');
      return;
    }

    // Check locally first to prevent client-side overlap
    const exists = profiles.some(
      (p) => (p.username && p.username.toLowerCase() === cleanLogin.toLowerCase()) || 
             (p.login && p.login.toLowerCase() === cleanLogin.toLowerCase())
    );

    if (exists) {
      setRegError('Этот никнейм уже занят');
      return;
    }

    const email = `${cleanLogin.toLowerCase()}@local.desk`;

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, regPassword);
      const uid = userCredential.user.uid;

      const isFirstAdmin = profiles.length === 0 || cleanLogin.toLowerCase() === 'belkin';
      const newProfile: UserProfile = {
        id: uid, // Use Firebase Auth user ID as profile ID
        username: cleanLogin,
        login: cleanLogin,
        email: email,
        displayName: cleanLogin,
        role: isFirstAdmin ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: [],
        timers: [],
        feeds: [...ENGINEER_DEFAULT_FEEDS],
        bookmarks: [...INITIAL_BOOKMARKS],
        workSchedules: {},
        accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
        appStyle: 'engineer',
        customWallpaper: '',
        customAiPrompt: DEFAULT_AI_PROMPTS.engineer,
        scheduledHours: [6, 12, 19],
      };

      // Save user profile to Firestore (with no password field)
      await saveUserProfileToFirestore(newProfile);

      const nextProfiles = [...profiles, newProfile];
      onSetProfiles(nextProfiles);

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (error: any) {
      console.error('Firebase Auth registration failed:', error);

      if (error.code === 'auth/email-already-in-use') {
        setRegError('Этот никнейм или email уже занят');
        return;
      } else if (error.code === 'auth/weak-password') {
        setRegError('Пароль должен быть не менее 6 символов');
        return;
      } else if (error.code === 'auth/network-request-failed') {
        setRegError('Для регистрации необходимо подключение к интернету');
        return;
      }

      // If in Dev Mode, allow fallback to secure local registration (Category B)
      if (isDevMode) {
        const isFirstAdmin = profiles.length === 0 || cleanLogin.toLowerCase() === 'belkin';
        const localUid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newProfile: UserProfile = {
          id: localUid,
          username: cleanLogin,
          login: cleanLogin,
          email: email,
          password: regPassword, // Keep password for local fallback logins
          displayName: cleanLogin,
          role: isFirstAdmin ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          notes: [],
          timers: [],
          feeds: [...ENGINEER_DEFAULT_FEEDS],
          bookmarks: [...INITIAL_BOOKMARKS],
          workSchedules: {},
          accessibility: { scalePercent: 100, visualAcuity: 'Не указывать' },
          appStyle: 'engineer',
          customWallpaper: '',
          customAiPrompt: DEFAULT_AI_PROMPTS.engineer,
          scheduledHours: [6, 12, 19],
        };

        try {
          await saveUserProfileToFirestore(newProfile);
        } catch (fErr) {
          console.warn('Could not save new local profile to Firestore:', fErr);
        }

        const nextProfiles = [...profiles, newProfile];
        onSetProfiles(nextProfiles);

        onPlaySound?.('success');
        onAuthSuccess?.(localUid);
        return;
      }

      setRegError(`Ошибка регистрации: ${error.message || error}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090c] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-[#ffcc00] selection:text-black">
      {/* Background medical grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#161a2215_1px,transparent_1px),linear-gradient(to_bottom,#161a2215_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40"></div>
      
      {/* Ambient glowing radial blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-[#ffcc00]/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2 font-mono">
            Belkin<span className="text-[#ffcc00]">DESK</span> <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">2.0 Web</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md mx-auto leading-relaxed">
            Универсальная цифровая экосистема для специалистов, инженеров и исследователей. Мониторинг контента, смены, таймеры и ИИ-аналитика.
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0f1218] border border-[#232a3b] rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 bg-[#090c10] border-b border-[#232a3b] p-1 gap-1">
            <button
              id="tab-login-btn"
              type="button"
              onClick={() => {
                setMode('login');
                setLoginError(null);
                onPlaySound?.('click');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition ${
                mode === 'login'
                  ? 'bg-[#1a2130] text-[#ffcc00] shadow-sm border border-[#ffcc00]/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Вход
            </button>
            <button
              id="tab-register-btn"
              type="button"
              onClick={() => {
                setMode('register');
                setRegError(null);
                onPlaySound?.('click');
              }}
              className={`flex items-center justify-center gap-2 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition ${
                mode === 'register'
                  ? 'bg-[#1a2130] text-[#ffcc00] shadow-sm border border-[#ffcc00]/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Регистрация
            </button>
          </div>

          <div className="p-6 sm:p-7">
            {/* LOGIN FORM */}
            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#ffcc00]" /> Персональная авторизация
                  </span>
                </div>

                {loginError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Никнейм / Логин</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="Введите никнейм"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Пароль</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#ffcc00]/10"
                >
                  <LogIn className="w-4 h-4" />
                  Войти
                </button>
              </form>
            ) : (
              /* REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#ffcc00]" /> Регистрация
                  </span>
                </div>

                {regError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-rose-300 text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{regError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Никнейм / Логин</label>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder="Введите никнейм"
                    className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Пароль</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/10"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Зарегистрироваться
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 max-w-xl mx-auto w-full px-4">
          <div className="grid grid-cols-4 gap-2 text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-800/40 rounded-lg">
              <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Gemini AI</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-800/40 rounded-lg">
              <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Firestore</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-800/40 rounded-lg">
              <Rss className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">RSS Parser</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-800/40 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">Secure Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
