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
  Rss,
  Loader2,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import { UserProfile } from '../types';
import { ENGINEER_DEFAULT_FEEDS, DEFAULT_AI_PROMPTS } from '../data/curatedFeeds';
import { INITIAL_BOOKMARKS } from '../utils/storage';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
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

export const AuthGateScreen: React.FC<AuthGateScreenProps> = ({
  onAuthSuccess,
  onPlaySound,
  profiles,
  onSetProfiles,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'migration'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isTestAuthActive, setIsTestAuthActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('belkindesk_use_test_auth') === 'true' || 
             localStorage.getItem('belkindesk_test_auth_active_server') === 'true';
    }
    return false;
  });

  React.useEffect(() => {
    console.log('Diagnostic log: querying test auth server status...');
    fetch('/api/test-auth/status')
      .then(res => res.json())
      .then(data => {
        console.log('Test Auth server status fetched:', data);
        if (data && data.enabled) {
          setIsTestAuthActive(true);
          localStorage.setItem('belkindesk_test_auth_active_server', 'true');
        } else {
          setIsTestAuthActive(false);
          localStorage.removeItem('belkindesk_test_auth_active_server');
        }
      })
      .catch(err => {
        console.error('Failed to fetch Test Auth status from server:', err);
      });
  }, []);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Migration state for legacy profile passwords < 6 characters
  const [migUsername, setMigUsername] = useState('');
  const [migOldPassword, setMigOldPassword] = useState('');
  const [migrationProfile, setMigrationProfile] = useState<UserProfile | null>(null);
  const [migrationNewPassword, setMigrationNewPassword] = useState('');
  const [migrationConfirmPassword, setMigrationConfirmPassword] = useState('');
  const [migrationError, setMigrationError] = useState<string | null>(null);

  // Helper to resolve an email from username / email input
  const resolveCandidateEmails = (input: string): string[] => {
    const clean = input.trim().toLowerCase();
    if (!clean) return [];
    if (clean.includes('@')) {
      return [clean];
    }
    if (clean === 'belkin') {
      return ['belkin@med.ru'];
    }
    const matchedProfile = profiles.find(
      (p) => (p.username && p.username.toLowerCase() === clean) || 
             (p.login && p.login.toLowerCase() === clean) ||
             (p.email && p.email.toLowerCase() === clean)
    );
    const emails: string[] = [];
    if (matchedProfile && matchedProfile.email) {
      emails.push(matchedProfile.email);
    }
    emails.push(`${clean}@pulsedesk.local`);
    emails.push(`${clean}@local.desk`);
    return Array.from(new Set(emails));
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setLoginError(null);
    setRegError(null);
    setMigrationProfile(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;
      const email = user.email || `${uid}@pulsedesk.local`;
      const displayName = user.displayName || user.email?.split('@')[0] || 'Пользователь Google';

      let existingProfile = profiles.find(p => p.id === uid);
      if (!existingProfile) {
        const newProfile: UserProfile = {
          id: uid,
          username: displayName,
          login: displayName,
          email: email,
          displayName: displayName,
          avatar: user.photoURL || undefined,
          role: 'user',
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
        await saveUserProfileToFirestore(newProfile);
        const nextProfiles = [...profiles, newProfile];
        onSetProfiles(nextProfiles);
      }

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (error.code === 'auth/popup-blocked') {
        setLoginError('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна для входа.');
        return;
      }
      if (error.code === 'auth/unauthorized-domain') {
        setLoginError('Домен приложения не добавлен в список разрешенных в Firebase Console.');
        return;
      }
      setLoginError(`Ошибка входа через Google: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMigrationError(null);
    setIsSubmitting(true);

    const cleanUsername = migUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setMigrationError('Введите никнейм для миграции');
      setIsSubmitting(false);
      return;
    }

    if (!migOldPassword) {
      setMigrationError('Введите старый пароль');
      setIsSubmitting(false);
      return;
    }

    if (!migrationNewPassword || migrationNewPassword.trim() === '') {
      setMigrationError('Новый пароль не может быть пустым');
      setIsSubmitting(false);
      return;
    }

    if (migrationNewPassword.length < 4) {
      setMigrationError('Новый пароль должен содержать минимум 4 символа');
      setIsSubmitting(false);
      return;
    }

    if (migrationNewPassword !== migrationConfirmPassword) {
      setMigrationError('Пароли не совпадают. Пожалуйста, проверьте ввод');
      setIsSubmitting(false);
      return;
    }

    // Find the legacy profile from profiles
    const legacyProfile = profiles.find(
      (p) => (p.username && p.username.toLowerCase() === cleanUsername) || 
             (p.login && p.login.toLowerCase() === cleanUsername) ||
             (p.email && p.email.toLowerCase() === cleanUsername)
    );

    if (!legacyProfile || legacyProfile.password !== migOldPassword) {
      setMigrationError('Неверный старый никнейм или старый пароль');
      setIsSubmitting(false);
      return;
    }

    // Determine the email to register
    let emailToRegister = legacyProfile.email || `${cleanUsername}@pulsedesk.local`;
    if (cleanUsername === 'belkin') {
      emailToRegister = 'belkin@med.ru';
    }

    try {
      let uid: string;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, migrationNewPassword);
        uid = userCredential.user.uid;
      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          const userCredential = await signInWithEmailAndPassword(auth, emailToRegister, migrationNewPassword);
          uid = userCredential.user.uid;
        } else {
          throw createErr;
        }
      }

      // Prepare migrated profile
      const migratedProfile: UserProfile = {
        ...legacyProfile,
        id: uid,
        email: emailToRegister,
        updatedAt: new Date().toISOString()
      };
      delete migratedProfile.password; // Strip legacy plain password

      // Save user profile to Firestore
      await saveUserProfileToFirestore(migratedProfile);

      // Update local profiles list
      const nextProfiles = profiles.map(p => p.id === legacyProfile.id ? migratedProfile : p);
      onSetProfiles(nextProfiles);

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (err: any) {
      console.error('Explicit legacy migration failed:', err);
      if (err.code === 'auth/weak-password') {
        setMigrationError('Пароль должен содержать минимум 6 символов');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMigrationError('Учетная запись с таким email уже существует в Firebase с другим паролем.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setMigrationError('Регистрация по email/паролю отключена в Firebase.');
      } else {
        setMigrationError(`Ошибка миграции: ${err.message || err}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    
    const cleanLogin = loginUsername.trim();
    if (!cleanLogin) {
      setLoginError('Введите никнейм или email');
      setIsSubmitting(false);
      return;
    }
    if (!loginPassword) {
      setLoginError('Введите пароль');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/test-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanLogin, password: loginPassword })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Неверный логин или пароль');
      }
      const data = await res.json();
      localStorage.setItem('belkindesk_use_test_auth', 'true');
      localStorage.setItem('belkindesk_test_auth_token', data.token);
      localStorage.setItem('belkindesk_test_auth_uid', data.user.id);
      localStorage.setItem('belkindesk_test_auth_username', data.user.username);
      localStorage.setItem('belkindesk_test_auth_email', data.user.email);

      onPlaySound?.('success');
      onAuthSuccess?.(data.user.id);
      setIsSubmitting(false);
      return;
    } catch (err: any) {
      setLoginError(err.message || 'Ошибка входа');
      setIsSubmitting(false);
      return;
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);
    setIsSubmitting(true);
    
    const cleanLogin = regUsername.trim();
    if (!cleanLogin) {
      setRegError('Укажите никнейм или email');
      setIsSubmitting(false);
      return;
    }

    if (!regPassword || regPassword.trim() === '') {
      setRegError('Пароль не может быть пустым');
      setIsSubmitting(false);
      return;
    }

    if (regPassword.length < 4) {
      setRegError('Пароль должен содержать минимум 4 символа');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/test-auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanLogin, password: regPassword })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Ошибка при регистрации');
      }
      
      // Log in immediately
      const loginRes = await fetch('/api/test-auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanLogin, password: regPassword })
      });
      if (!loginRes.ok) {
        setRegError('Регистрация успешна! Войдите во вкладке "Вход".');
        setIsSubmitting(false);
        return;
      }
      const loginData = await loginRes.json();
      localStorage.setItem('belkindesk_use_test_auth', 'true');
      localStorage.setItem('belkindesk_test_auth_token', loginData.token);
      localStorage.setItem('belkindesk_test_auth_uid', loginData.user.id);
      localStorage.setItem('belkindesk_test_auth_username', loginData.user.username);
      localStorage.setItem('belkindesk_test_auth_email', loginData.user.email);

      onPlaySound?.('success');
      onAuthSuccess?.(loginData.user.id);
      setIsSubmitting(false);
      return;
    } catch (err: any) {
      setRegError(err.message || 'Ошибка регистрации');
      setIsSubmitting(false);
      return;
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
          <div className="p-6 sm:p-7 pb-4 bg-[#0c0f15] border-b border-[#232a3b]/80">
            <div className="grid grid-cols-2 bg-[#090c10] border border-[#232a3b] rounded-lg p-1 gap-1">
              <button
                id="tab-login-btn"
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError(null);
                  onPlaySound?.('click');
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md transition ${
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
                className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-md transition ${
                  mode === 'register'
                    ? 'bg-[#1a2130] text-[#ffcc00] shadow-sm border border-[#ffcc00]/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#121620]'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Регистрация
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-7 pt-4">
            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {loginError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-rose-300 text-xs leading-relaxed">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{loginError}</span>
                    </div>
                    {loginError.includes('Google') && (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full mt-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <span>Войти через Google в 1 клик</span>
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Никнейм или Email</label>
                  <div className="relative">
                    <input
                      id="login-username-input"
                      type="text"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      placeholder="belkin или email@gmail.com"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      disabled={isSubmitting}
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Пароль</label>
                  <div className="relative">
                    <input
                      id="login-password-input"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  id="submit-login-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#ffcc00]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span>Войти в систему</span>
                </button>
              </form>
            )}

            {/* REGISTRATION FORM */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                {regError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-rose-300 text-xs leading-relaxed">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </div>
                    {regError.includes('Google') && (
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        className="w-full mt-1 py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-900 rounded font-semibold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <span>Войти через Google в 1 клик</span>
                      </button>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Желаемый никнейм или Email</label>
                  <div className="relative">
                    <input
                      id="reg-username-input"
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="Например, belkin или my@email.com"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      disabled={isSubmitting}
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Пароль <span className="text-slate-500 text-[11px]">(минимум 4 символа)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="reg-password-input"
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      minLength={4}
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  id="submit-reg-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Создать аккаунт</span>
                </button>
              </form>
            )}

            {/* EXPLICIT LEGACY MIGRATION FORM */}
            {mode === 'migration' && (
              <form onSubmit={handleMigrationSubmit} className="space-y-4">
                {migrationError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-rose-300 text-xs leading-relaxed">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{migrationError}</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-[#090c10] border border-[#232a3b] rounded-lg text-slate-300 text-xs leading-relaxed">
                  <span className="text-amber-400 font-bold block mb-1">Однократная миграция BelkinDESK 1.x</span>
                  Для переноса учетной записи в Firebase Auth введите свой старый никнейм, старый пароль (для Belkin это 1511) и задайте новый безопасный пароль (минимум 6 символов).
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Старый никнейм</label>
                  <div className="relative">
                    <input
                      id="migration-username-input"
                      type="text"
                      value={migUsername}
                      onChange={(e) => setMigUsername(e.target.value)}
                      placeholder="например, Belkin"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      disabled={isSubmitting}
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Старый пароль</label>
                  <div className="relative">
                    <input
                      id="migration-old-password-input"
                      type="password"
                      value={migOldPassword}
                      onChange={(e) => setMigOldPassword(e.target.value)}
                      placeholder="Старый пароль (например, 1511)"
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Новый пароль <span className="text-slate-500 text-[11px]">(минимум 4 символа)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="migration-new-password"
                      type="password"
                      value={migrationNewPassword}
                      onChange={(e) => setMigrationNewPassword(e.target.value)}
                      placeholder="Введите новый безопасный пароль..."
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      minLength={4}
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Повторите новый пароль</label>
                  <div className="relative">
                    <input
                      id="migration-confirm-password"
                      type="password"
                      value={migrationConfirmPassword}
                      onChange={(e) => setMigrationConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль..."
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      minLength={4}
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <button
                  id="submit-migration-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Мигрировать аккаунт и войти</span>
                </button>
              </form>
            )}

            {/* Dev Mode Quick Demo Sign-In */}
            {isDevMode && (
              <div className="mt-4 pt-3 border-t border-slate-800 text-center">
                <p className="text-[11px] text-amber-400/80 mb-2 font-mono">
                  [Dev Mode] Быстрый вход под тестовыми профилями:
                </p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {profiles.filter(p => p.id === 'user-admin-belkin' || p.id.startsWith('agent-')).map((demo) => (
                    <button
                      key={demo.id}
                      type="button"
                      onClick={() => {
                        onPlaySound?.('click');
                        onAuthSuccess?.(demo.id);
                      }}
                      className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 cursor-pointer transition"
                    >
                      {demo.displayName || demo.username}
                    </button>
                  ))}
                </div>
              </div>
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
              <span className="truncate">Firebase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


