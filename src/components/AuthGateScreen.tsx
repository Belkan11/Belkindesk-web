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
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Login form state
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState<string | null>(null);

  // Migration state for legacy profile passwords < 6 characters
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
    if (!migrationProfile) return;
    setMigrationError(null);
    setIsSubmitting(true);

    if (migrationNewPassword.length < 6) {
      setMigrationError('Пароль должен содержать минимум 6 символов');
      setIsSubmitting(false);
      return;
    }

    if (migrationNewPassword !== migrationConfirmPassword) {
      setMigrationError('Пароли не совпадают. Пожалуйста, проверьте ввод');
      setIsSubmitting(false);
      return;
    }

    const cleanLogin = (migrationProfile.username || migrationProfile.login || 'user').trim().toLowerCase();
    const emailToRegister = migrationProfile.email || `${cleanLogin}@pulsedesk.local`;

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

      const migratedProfile: UserProfile = {
        ...migrationProfile,
        id: uid,
        email: emailToRegister,
        updatedAt: new Date().toISOString()
      };
      delete migratedProfile.password;

      await saveUserProfileToFirestore(migratedProfile);

      const nextProfiles = profiles.map(p => p.id === migrationProfile.id ? migratedProfile : p);
      onSetProfiles(nextProfiles);

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (err: any) {
      console.error('Legacy migration with new password failed:', err);
      if (err.code === 'auth/weak-password') {
        setMigrationError('Пароль должен содержать минимум 6 символов');
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMigrationError('Учетная запись с таким email уже существует с другим паролем.');
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
    
    const cleanLogin = loginUsername.trim().toLowerCase();
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

    const candidateEmails = resolveCandidateEmails(cleanLogin);
    let lastError: any = null;
    let authSucceeded = false;

    // Try candidate emails in Firebase Auth
    for (const email of candidateEmails) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, loginPassword);
        const uid = userCredential.user.uid;
        authSucceeded = true;
        onPlaySound?.('success');
        onAuthSuccess?.(uid);
        break;
      } catch (err: any) {
        lastError = err;
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          // If password error, no need to retry another domain unless it's user-not-found
          break;
        }
      }
    }

    if (authSucceeded) {
      setIsSubmitting(false);
      return;
    }

    console.warn('Firebase login attempt failed:', lastError);

    // 1. Check for legacy profile migration
    const legacyProfile = profiles.find(
      (p) => ((p.username && p.username.toLowerCase() === cleanLogin) || 
             (p.login && p.login.toLowerCase() === cleanLogin) ||
             (p.email && p.email.toLowerCase() === cleanLogin)) &&
             p.password && p.password === loginPassword
    );

    if (legacyProfile) {
      if (loginPassword.length >= 6) {
        try {
          const emailToRegister = legacyProfile.email || `${cleanLogin}@pulsedesk.local`;
          const userCredential = await createUserWithEmailAndPassword(auth, emailToRegister, loginPassword);
          const uid = userCredential.user.uid;

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
          setIsSubmitting(false);
          return;
        } catch (migrationErr: any) {
          if (migrationErr.code === 'auth/email-already-in-use') {
            try {
              const userCredential = await signInWithEmailAndPassword(auth, legacyProfile.email || `${cleanLogin}@pulsedesk.local`, loginPassword);
              onPlaySound?.('success');
              onAuthSuccess?.(userCredential.user.uid);
              setIsSubmitting(false);
              return;
            } catch (signInErr) {
              console.warn('Sign-in after email already in use note:', signInErr);
            }
          } else {
            console.warn('Legacy migration to Firebase Auth failed:', migrationErr);
          }
        }
      } else {
        // Password < 6 chars cannot be used in Firebase Auth.
        // Prompt the user to set a valid new password for migration (NO local login in production!)
        setMigrationProfile(legacyProfile);
        setMigrationNewPassword('');
        setMigrationConfirmPassword('');
        setMigrationError('Старый пароль слишком короткий для миграции. Установите новый пароль минимум 6 символов');
        onPlaySound?.('alert');
        setIsSubmitting(false);
        return;
      }
    }

    // 2. Dev mode demo fallback only
    if (isDevMode) {
      const demoProfile = profiles.find(
        (p) => (p.id === 'user-admin-belkin' || p.id.startsWith('agent-') || p.id.startsWith('demo-')) &&
               ((p.username && p.username.toLowerCase() === cleanLogin) || 
                (p.login && p.login.toLowerCase() === cleanLogin) ||
                (p.email && p.email.toLowerCase() === cleanLogin)) &&
               p.password && p.password === loginPassword
      );
      if (demoProfile) {
        console.log('[Dev Mode] Logging in using demo profile');
        onPlaySound?.('success');
        onAuthSuccess?.(demoProfile.id);
        setIsSubmitting(false);
        return;
      }
    }

    // Map error code to human readable Russian message
    if (lastError?.code === 'auth/wrong-password' || lastError?.code === 'auth/invalid-credential') {
      setLoginError('Неверный пароль или логин');
    } else if (lastError?.code === 'auth/user-not-found') {
      setLoginError('Пользователь не найден. Зарегистрируйтесь или войдите через Google.');
    } else if (lastError?.code === 'auth/operation-not-allowed') {
      setLoginError('Вход по email/паролю отключен в Firebase. Воспользуйтесь кнопкой "Войти через Google".');
    } else if (lastError?.code === 'auth/network-request-failed') {
      setLoginError('Ошибка сети. Проверьте интернет-соединение.');
    } else if (lastError?.code === 'auth/too-many-requests') {
      setLoginError('Слишком много попыток входа. Пожалуйста, подождите несколько минут.');
    } else {
      setLoginError('Неверный логин/email или пароль. Воспользуйтесь кнопкой "Войти через Google".');
    }

    setIsSubmitting(false);
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

    if (regPassword.length < 6) {
      setRegError('Пароль должен содержать минимум 6 символов');
      setIsSubmitting(false);
      return;
    }

    const email = cleanLogin.includes('@') ? cleanLogin.toLowerCase() : `${cleanLogin.toLowerCase()}@pulsedesk.local`;

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, regPassword);
      const uid = userCredential.user.uid;

      const newProfile: UserProfile = {
        id: uid,
        username: cleanLogin,
        login: cleanLogin,
        email: email,
        displayName: cleanLogin,
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

      // Save user profile to Firestore
      await saveUserProfileToFirestore(newProfile);

      const nextProfiles = [...profiles.filter(p => p.id !== uid), newProfile];
      onSetProfiles(nextProfiles);

      onPlaySound?.('success');
      onAuthSuccess?.(uid);
    } catch (error: any) {
      console.error('Firebase Auth registration failed:', error);

      if (error.code === 'auth/email-already-in-use') {
        setRegError('Этот никнейм или email уже зарегистрирован. Перейдите во вкладку "Вход".');
        setIsSubmitting(false);
        return;
      } else if (error.code === 'auth/weak-password') {
        setRegError('Пароль должен содержать минимум 6 символов');
        setIsSubmitting(false);
        return;
      } else if (error.code === 'auth/invalid-email') {
        setRegError('Некорректный формат никнейма или email');
        setIsSubmitting(false);
        return;
      }

      if (isDevMode) {
        // Fallback to local profile registration only in dev mode
        const localUid = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const newProfile: UserProfile = {
          id: localUid,
          username: cleanLogin,
          login: cleanLogin,
          email: email,
          password: regPassword,
          displayName: cleanLogin,
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

        try {
          await saveUserProfileToFirestore(newProfile);
        } catch (fErr) {
          console.warn('Could not save new local profile to Firestore in dev mode:', fErr);
        }

        const nextProfiles = [...profiles, newProfile];
        onSetProfiles(nextProfiles);

        onPlaySound?.('success');
        onAuthSuccess?.(localUid);
        setIsSubmitting(false);
        return;
      }

      setRegError(`Ошибка регистрации в Firebase Auth: ${error.message || error}`);
    } finally {
      setIsSubmitting(false);
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
          {migrationProfile ? (
            /* LEGACY PASSWORD MIGRATION FORM */
            <div className="p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm border-b border-[#232a3b] pb-3">
                <KeyRound className="w-5 h-5 text-amber-400 shrink-0" />
                <span>Миграция учетной записи в Firebase Auth</span>
              </div>

              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2.5 text-amber-200 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {migrationError || 'Старый пароль слишком короткий для миграции. Установите новый пароль минимум 6 символов'}
                </span>
              </div>

              <div className="p-3 bg-[#090c10] border border-[#232a3b] rounded-lg">
                <span className="text-slate-400 text-xs block mb-1">Профиль для миграции:</span>
                <span className="text-slate-200 font-mono font-bold text-sm">
                  {migrationProfile.displayName || migrationProfile.username || migrationProfile.login}
                </span>
                <span className="text-slate-500 text-xs block mt-0.5">
                  ({migrationProfile.email || `${(migrationProfile.username || migrationProfile.login || 'user').toLowerCase()}@pulsedesk.local`})
                </span>
              </div>

              <form onSubmit={handleMigrationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Новый пароль <span className="text-amber-400 text-[11px]">(минимум 6 символов)</span>
                  </label>
                  <div className="relative">
                    <input
                      id="migration-new-password"
                      type="password"
                      value={migrationNewPassword}
                      onChange={(e) => setMigrationNewPassword(e.target.value)}
                      placeholder="Введите новый пароль..."
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Повторите новый пароль
                  </label>
                  <div className="relative">
                    <input
                      id="migration-confirm-password"
                      type="password"
                      value={migrationConfirmPassword}
                      onChange={(e) => setMigrationConfirmPassword(e.target.value)}
                      placeholder="Повторите новый пароль..."
                      className="w-full bg-[#141824] border border-[#262f42] rounded-lg px-3.5 py-2.5 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]"
                      required
                      minLength={6}
                      disabled={isSubmitting}
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <button
                    id="submit-migration-btn"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-lg bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-[#ffcc00]/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Установить новый пароль и войти</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      setMigrationProfile(null);
                      setMigrationError(null);
                      onPlaySound?.('click');
                    }}
                    className="w-full py-2.5 px-4 rounded-lg bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Отмена и возврат ко входу</span>
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <>
              {/* Quick Google Sign In */}
              <div className="p-6 sm:p-7 pb-4 border-b border-[#232a3b]/80 bg-[#0c0f15]">
                <button
                  id="google-signin-btn"
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleGoogleSignIn}
                  className="w-full py-3 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin text-slate-700" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Войти через Google</span>
                </button>

                <div className="relative flex py-4 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-3 text-xs text-slate-500 uppercase tracking-wider font-mono">или по логину</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                {/* Mode Switch Tabs */}
                <div className="grid grid-cols-2 bg-[#090c10] border border-[#232a3b] rounded-lg p-1 gap-1">
                  <button
                    id="tab-login-btn"
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setLoginError(null);
                      onPlaySound?.('click');
                    }}
                    className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-md transition ${
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
                    className={`flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-bold rounded-md transition ${
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
                {mode === 'login' ? (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    {loginError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{loginError}</span>
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
                ) : (
                  /* REGISTRATION FORM */
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {regError && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2 text-rose-300 text-xs">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{regError}</span>
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
                        Пароль <span className="text-slate-500 text-[11px]">(минимум 6 символов)</span>
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
                          minLength={6}
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
            </>
          )}
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


