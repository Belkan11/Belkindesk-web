import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  User, 
  UserPlus, 
  Check, 
  Trash2, 
  FolderPlus, 
  Download, 
  Upload, 
  Sparkles, 
  ShieldCheck, 
  Laptop,
  Key,
  Eye,
  EyeOff,
  Briefcase,
  FileText,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Mail,
  UserCheck,
  Database,
  RefreshCw,
  Cpu
} from 'lucide-react';
import { UserProfile, AppArchetypeStyle } from '../types';
import { DEFAULT_WORKSPACE_CONFIG, saveAISettings } from '../utils/storage';
import { DEFAULT_INITIAL_FEEDS } from '../data/curatedFeeds';

interface UserCabinetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  allProfiles: UserProfile[];
  onSelectUser: (id: string) => void;
  onSaveProfile: (profile: UserProfile) => void;
  onCreateUser: (name: string, email: string, avatar: string, login?: string, password?: string, profession?: string, about?: string) => void;
  onDeleteProfile: (id: string) => void;
  appStyle?: AppArchetypeStyle;
  onPlaySound?: (type: 'click' | 'success' | 'star') => void;
}

const PRESET_AVATARS = [
  { label: 'Кардиолог / Врач', url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=180&auto=format&fit=crop&q=80' },
  { label: 'Врач женский', url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=180&auto=format&fit=crop&q=80' },
  { label: 'Хирург', url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=180&auto=format&fit=crop&q=80' },
  { label: 'Инженер / Техник', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=180&auto=format&fit=crop&q=80' },
  { label: 'Диагност', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=180&auto=format&fit=crop&q=80' },
  { label: 'Специалист', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=180&auto=format&fit=crop&q=80' },
  { label: 'Аналитик', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=180&auto=format&fit=crop&q=80' },
  { label: 'Кибер-профиль', url: 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?w=180&auto=format&fit=crop&q=80' },
];

const PROFESSION_PRESETS = [
  'Врач-кардиолог',
  'Анестезиолог-реаниматолог',
  'Врач скорой помощи',
  'Врач-терапевт',
  'Сервисный инженер',
  'Инженер-электроник',
  'Программист / Разработчик',
  'Главный специалист',
];

export const UserCabinetModal: React.FC<UserCabinetModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allProfiles,
  onSelectUser,
  onSaveProfile,
  onCreateUser,
  onDeleteProfile,
  appStyle = 'classic',
  onPlaySound,
}) => {
  const isModern = appStyle === 'modern';
  const [activeTab, setActiveTab] = useState<'profile' | 'switch' | 'categories' | 'new' | 'backup'>('profile');

  // Backup and Restore states
  const [dragActive, setDragActive] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean>(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);


  const [saveBanner, setSaveBanner] = useState<string | null>(null);
  const [username, setUsername] = useState(currentUser.username || '');
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0].url);
  const [categoriesList, setCategoriesList] = useState<string[]>(currentUser.customCategories || []);
  const [categoriesInput, setCategoriesInput] = useState('');
  const [newCatName, setNewCatName] = useState('');
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserProfession, setNewUserProfession] = useState('');
  const [newUserAbout, setNewUserAbout] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState(PRESET_AVATARS[0].url);
  
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [profession, setProfession] = useState(currentUser?.profession || currentUser?.specialization || '');
  const [about, setAbout] = useState(currentUser?.about || currentUser?.bio || '');
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai' | 'openrouter' | 'custom'>(currentUser?.aiProvider || 'gemini');
  const [aiApiKey, setAiApiKey] = useState(currentUser?.aiApiKey || '');
  const [aiModel, setAiModel] = useState(currentUser?.aiModel || 'gemini-3.1-flash-lite');
  const [aiUrl, setAiUrl] = useState(currentUser?.aiUrl || '');
  const [showApiKey, setShowApiKey] = useState(false);


  const handleExportData = () => {
    const data = {
      profiles: allProfiles,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `belkindesk_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveCurrentProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cats = categoriesInput.split(',').map(c => c.trim()).filter(Boolean);
    saveAISettings(aiProvider, aiApiKey, aiModel, aiUrl, currentUser, (updatedProfile) => {
      onSaveProfile({
        ...updatedProfile,
        username: username.trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        avatar,
        profession: profession.trim(),
        specialization: profession.trim(),
        about: about.trim(),
        bio: about.trim(),
        customCategories: cats.length > 0 ? cats : categoriesList,
      });
    });
    setSaveBanner('Профиль и настройки ИИ успешно сохранены!');
    onPlaySound?.('success');
    setTimeout(() => setSaveBanner(null), 2500);
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };
  
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };
  
  const handleFileUpload = (file: File) => {
    // mock implementation
    const url = URL.createObjectURL(file);
    setAvatar(url);
    setCustomAvatarUrl(url);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (!categoriesList.includes(newCatName.trim())) {
      const updated = [...categoriesList, newCatName.trim()];
      setCategoriesList(updated);
      onSaveProfile({
        ...currentUser,
        customCategories: updated,
      });
      setNewCatName('');
      onPlaySound?.('click');
    }
  };

  const handleDeleteCategory = (cat: string) => {
    const updated = categoriesList.filter((c) => c !== cat);
    setCategoriesList(updated);
    onSaveProfile({
      ...currentUser,
      customCategories: updated,
    });
    onPlaySound?.('click');
  };

  const handleCreateNewCabinet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    onCreateUser(
      newUserName.trim(),
      newUserEmail.trim() || `${(newUserLogin || newUserName).toLowerCase()}@belkindesk.local`,
      newUserAvatar,
      newUserLogin.trim() || newUserName.trim(),
      newUserPassword.trim() || '1234',
      newUserProfession.trim(),
      newUserAbout.trim()
    );

    setNewUserName('');
    setNewUserLogin('');
    setNewUserEmail('');
    setNewUserProfession('');
    setNewUserAbout('');
    setActiveTab('switch');
    onPlaySound?.('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none font-sans text-xs">
      <div className={`w-full max-w-2xl h-[660px] max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all ${
        isModern
          ? 'bg-[#0a1020]/90 backdrop-blur-xl border border-cyan-500/40 shadow-[0_0_30px_rgba(34,211,238,0.2)]'
          : 'bg-[#0f1217] border border-[#ffcc00]/50'
      }`}>
        
        {/* Header */}
        <div className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
          isModern ? 'bg-[#0d172a]/90 border-cyan-500/30 text-cyan-300' : 'bg-[#141820] border-[#2b2518]'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm ${
              isModern
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(56,189,248,0.4)]'
                : 'bg-[#ffcc00]/15 text-[#ffcc00] border border-[#ffcc00]/40'
            }`}>
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono flex items-center gap-2">
                <span>Личный кабинет & Профиль</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-sans ${
                  isModern ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50' : 'bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/30'
                }`}>
                  {currentUser?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Редактирование профиля, смена аватара, профессии, логина, пароля и управление аккаунтами
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

        {/* Success Banner */}
        {saveBanner && (
          <div className="bg-[#15803d]/20 border-b border-[#22c55e]/50 px-4 py-2 text-[#22c55e] text-xs font-bold flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
            <span>{saveBanner}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex border-b border-[#2b2518] bg-[#0a0d11] px-2 shrink-0 text-xs font-mono overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              onPlaySound?.('click');
            }}
            className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Редактирование профиля</span>
          </button>

          {(currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'belkin') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('switch');
                onPlaySound?.('click');
              }}
              className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'switch'
                  ? 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Все профили ({allProfiles.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              onPlaySound?.('click');
            }}
            className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'categories'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Категории</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('backup');
              onPlaySound?.('click');
            }}
            className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backup'
                ? 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Экспорт / Импорт</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai');
              onPlaySound?.('click');
            }}
            className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ai'
                ? (isModern ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10' : 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10')
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
            <span>Персональный ИИ (BYOK)</span>
          </button>

          {(currentUser?.role === 'admin' || currentUser?.username?.toLowerCase() === 'belkin') && (
            <button
              type="button"
              onClick={() => {
                setActiveTab('new');
                onPlaySound?.('click');
              }}
              className={`px-3.5 py-2 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'new'
                  ? 'border-[#ffcc00] text-[#ffcc00] bg-[#ffcc00]/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Новый профиль</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-slate-200">
          
          {/* TAB 1: EDIT PROFILE */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveCurrentProfile} className="space-y-4 max-w-xl mx-auto">
              
              {/* Profile Card Header with Avatar Preview */}
              <div className="p-3 bg-[#0a0d11] rounded-xl border border-[#2b2518] flex flex-col sm:flex-row items-center gap-3.5">
                <div className="relative group">
                  <img
                    src={avatar}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover ring-2 ring-[#ffcc00] shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition cursor-pointer"
                    title="Загрузить новое фото"
                  >
                    <Camera className="w-4 h-4 text-[#ffcc00]" />
                    <span className="text-[8px] font-bold">Сменить</span>
                  </button>
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="font-bold text-sm text-slate-100 font-mono truncate">
                    {displayName || username}
                  </div>
                  <div className="text-[11px] text-[#ffcc00] font-sans">
                    {profession || 'Профессия не указана'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Логин: <span className="text-slate-200 font-bold">{username}</span> | Email: {email || 'не указан'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 rounded bg-[#1c222b] hover:bg-[#283240] border border-[#3b3220] text-slate-200 text-[11px] font-mono transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Upload className="w-3.5 h-3.5 text-[#ffcc00]" />
                  <span>Загрузить фото</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {/* Avatar Presets Selector */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Смена аватарки (выберите готовую или укажите URL)
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-2">
                  {PRESET_AVATARS.map((av, idx) => {
                    const isSelected = avatar === av.url;
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setAvatar(av.url);
                          onPlaySound?.('click');
                        }}
                        className={`p-1 rounded-lg border text-center transition cursor-pointer flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-[#292015] border-[#ffcc00] ring-1 ring-[#ffcc00]'
                            : 'bg-[#0a0d11] border-[#2b2518] hover:border-slate-600'
                        }`}
                        title={av.label}
                      >
                        <img
                          src={av.url}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span className="text-[8px] text-slate-400 truncate w-full">
                          {av.label.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Avatar URL */}
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    placeholder="Или вставьте прямую ссылку на аватарку (https://...)"
                    className="flex-1 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-2.5 py-1.5 text-[11px] text-slate-100 font-mono focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        setAvatar(customAvatarUrl.trim());
                        setCustomAvatarUrl('');
                        onPlaySound?.('star');
                      }
                    }}
                    className="px-3 py-1.5 bg-[#1c222b] hover:bg-[#283240] border border-[#3b3220] text-slate-200 text-[11px] font-mono rounded-lg transition cursor-pointer"
                  >
                    Применить URL
                  </button>
                </div>
              </div>

              {/* Login & Password Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Username / Login */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Логин (имя для входа) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Belkin"
                    className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-mono focus:outline-hidden"
                  />
                </div>

                {/* 2. Password */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono flex items-center justify-between">
                    <span>Пароль</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[10px] text-slate-400 hover:text-[#ffcc00] flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Скрыть' : 'Показать'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Пароль учетной записи..."
                      className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-mono focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Display Name & Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Отображаемое имя
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Например: Д-р Белкин В.А."
                    className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-sans focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Электронная почта (Email)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.ru"
                    className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-mono focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Profession (Optional) */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono flex items-center justify-between">
                  <span>Указание профессии (по желанию)</span>
                  <span className="text-[10px] text-slate-500 font-sans">Отображается в профиле и сводках</span>
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Например: Врач-кардиолог, Анестезиолог-реаниматолог, Инженер..."
                  className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-sans focus:outline-hidden mb-1.5"
                />

                {/* Quick Profession Chips */}
                <div className="flex flex-wrap gap-1">
                  {PROFESSION_PRESETS.map((p, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => {
                        setProfession(p);
                        onPlaySound?.('click');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-sans transition cursor-pointer border ${
                        profession === p
                          ? 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]'
                          : 'bg-[#12161c] text-slate-400 border-[#2b2518] hover:text-slate-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* About Me / Information about oneself */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Информация о себе (биография, отделение, примечания)
                </label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Укажите клиническое отделение, квалификацию, научные интересы или персональные заметки к рабочему месту..."
                  className="w-full bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg px-3 py-2 text-slate-100 text-xs font-sans focus:outline-hidden leading-relaxed"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold font-mono rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-2 shadow-lg active:scale-[0.99]"
                >
                  <Check className="w-4 h-4" />
                  <span>Сохранить изменения профиля</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: SWITCH & MANAGE ACCOUNTS */}
          {activeTab === 'switch' && (
            <div className="space-y-3 max-w-xl mx-auto">
              <div className="text-slate-400 text-[11px] mb-2 font-mono">
                Каждый профиль сохраняет индивидуальные заметки, расписание таймеров, источники новостей и персональные настройки:
              </div>

              {allProfiles.map((p) => {
                const isActive = p.id === currentUser.id;
                const isAdmin = p.role === 'admin' || (p.username && p.username.toLowerCase() === 'belkin');
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition ${
                      isActive
                        ? 'bg-[#1e2530] border-[#ffcc00] ring-1 ring-[#ffcc00]/40'
                        : 'bg-[#0a0d11] border-[#2b2518] hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={p.avatar || PRESET_AVATARS[0].url}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-[#ffcc00]/50 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span className="truncate font-mono">{p.displayName || p.username}</span>
                          {isActive && (
                            <span className="text-[9px] bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/50 px-1.5 py-0.2 rounded font-bold">
                              Активен
                            </span>
                          )}
                          {isAdmin && (
                            <span className="text-[9px] bg-[#ffcc00]/20 text-[#ffcc00] border border-[#ffcc00]/50 px-1.5 py-0.2 rounded font-bold font-mono">
                              Администратор
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#ffcc00] truncate">
                          {p.profession || p.specialization || 'Профессия не указана'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          Логин: <strong className="text-slate-300">{p.username || p.login}</strong> | Пароль: ••••
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {!isActive && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectUser(p.id);
                              onPlaySound?.('success');
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-[#1c222b] hover:bg-[#ffcc00] hover:text-black text-slate-200 font-bold font-mono rounded-lg transition cursor-pointer text-xs"
                          >
                            Переключить
                          </button>
                          {allProfiles.length > 1 && !isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Удалить профиль «${p.displayName || p.username}»?`)) {
                                  onDeleteProfile(p.id);
                                  onPlaySound?.('click');
                                }
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 transition cursor-pointer rounded"
                              title="Удалить профиль"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: CUSTOM CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Название новой категории (например: Кардиология, ЭКГ, ОРИТ)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-sans"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  className="px-4 py-2 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold font-mono rounded-lg transition cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Добавить</span>
                </button>
              </div>

              <div className="space-y-1.5 border border-[#2b2518] rounded-xl p-2 bg-[#0a0d11]">
                {categoriesList.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center justify-between p-2 rounded-lg bg-[#14181f] border border-[#2b2518] text-xs font-mono"
                  >
                    <span className="font-medium text-slate-200">{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      title="Удалить категорию"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {categoriesList.length === 0 && (
                  <div className="text-center py-4 text-slate-500 text-xs font-mono">
                    Нет пользовательских категорий
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB AI BYOK */}
          {activeTab === 'ai' && (
            <div className="space-y-4 max-w-xl mx-auto py-2">
              <div className={`p-4 rounded-xl border ${isModern ? 'bg-[#0a1020] border-cyan-500/30' : 'bg-[#0f141c] border-[#2b2518]'}`}>
                <h3 className={`text-sm font-bold font-mono mb-1 flex items-center gap-2 ${isModern ? 'text-cyan-200' : 'text-[#ffcc00]'}`}>
                  <Sparkles className="w-4 h-4" /> Подключение персонального API ключа ИИ (BYOK)
                </h3>
                <p className="text-[11px] text-slate-400 leading-normal mb-4">
                  Чтобы избежать ограничений общих системных квот Gemini, каждый пользователь может подключить собственный API ключ. Ключ сохраняется локально в профиле и используется исключительно для ваших запросов суммаризации и формирования карточек.
                </p>

                <div className="space-y-3 font-sans">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                      Провайдер ИИ
                    </label>
                    <select
                      value={aiProvider}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setAiProvider(val);
                        if (val === 'openrouter') setAiUrl('https://openrouter.ai/api/v1');
                        else if (val === 'openai') setAiUrl('https://api.openai.com/v1');
                        else setAiUrl('');
                      }}
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono outline-none border ${
                        isModern
                          ? 'bg-[#070b13] border-cyan-500/40 text-cyan-200 focus:border-cyan-400'
                          : 'bg-[#0a0d11] border-[#3b3220] text-slate-200 focus:border-[#ffcc00]'
                      }`}
                    >
                      <option value="gemini">Google Gemini API (Google AI Studio)</option>
                      <option value="openrouter">OpenRouter (Бесплатные и открытые модели: Llama 3, DeepSeek)</option>
                      <option value="openai">OpenAI (ChatGPT / GPT-4o)</option>
                      <option value="custom">Другой совместимый API</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                      Персональный API Ключ (API Key)
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? "text" : "password"}
                        value={aiApiKey}
                        onChange={(e) => setAiApiKey(e.target.value)}
                        placeholder="AIzaSy... или sk-or-v1-..."
                        className={`w-full rounded-lg px-3 py-2 pr-10 text-xs font-mono outline-none border ${
                          isModern
                            ? 'bg-[#070b13] border-cyan-500/40 text-cyan-200 focus:border-cyan-400'
                            : 'bg-[#0a0d11] border-[#3b3220] text-slate-200 focus:border-[#ffcc00]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                      Модель ИИ
                    </label>
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="gemini-2.5-flash или deepseek/deepseek-chat"
                      className={`w-full rounded-lg px-3 py-2 text-xs font-mono outline-none border ${
                        isModern
                          ? 'bg-[#070b13] border-cyan-500/40 text-cyan-200 focus:border-cyan-400'
                          : 'bg-[#0a0d11] border-[#3b3220] text-slate-200 focus:border-[#ffcc00]'
                      }`}
                    />
                  </div>

                  {/* Free API Keys & Setup Instructions Guide */}
                  <div className={`p-3.5 rounded-lg border text-[11px] space-y-2 ${
                    isModern ? 'bg-[#070d18] border-cyan-500/30 text-slate-300' : 'bg-[#12161f] border-[#2b2518] text-slate-300'
                  }`}>
                    <div className="font-bold font-mono text-xs text-amber-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Инструкция по получению бесплатных API ключей:
                    </div>
                    <ul className="list-disc pl-4 space-y-1 text-[10.5px] text-slate-300">
                      <li>
                        <strong className="text-white">OpenRouter (openrouter.ai):</strong> Дает доступ к десяткам бесплатных открытых моделей (Llama 3, DeepSeek Chat, Mistral). Зарегистрируйтесь, перейдите в <em>API Keys</em>, создайте ключ и вставьте сюда. В поле модели укажите <code className="text-cyan-300">deepseek/deepseek-chat</code> или <code className="text-cyan-300">meta-llama/llama-3-8b-instruct:free</code>.
                      </li>
                      <li>
                        <strong className="text-white">Google AI Studio (aistudio.google.com):</strong> Официальные бесплатные ключи для моделей Gemini. Войдите с аккаунтом Google, нажмите <em>Get API Key</em> и скопируйте ключ (<code className="text-cyan-300">AIzaSy...</code>). Модель: <code className="text-cyan-300">gemini-2.5-flash</code>.
                      </li>
                      <li>
                        <strong className="text-white">Groq Console (console.groq.com):</strong> Сверхбыстрый бесплатный инференс. Создайте ключ и используйте модель <code className="text-cyan-300">llama-3.3-70b-versatile</code>.
                      </li>
                    </ul>
                  </div>

                  <div className={`p-3 rounded-lg border text-[11px] leading-relaxed ${
                    isModern ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-[#151922] border-[#2b2518] text-slate-300'
                  }`}>
                    <div className="font-bold mb-1 flex items-center gap-1.5 font-mono">
                      <Cpu className="w-3.5 h-3.5" /> Автономный режим карточек
                    </div>
                    По умолчанию карточки формируются без ИИ (быстрый парсинг и перевод на русский). ИИ используется только при наличии вашего личного API ключа для глубокой аналитики.
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSaveCurrentProfile}
                    className={`px-4 py-2 rounded font-bold text-xs font-mono transition cursor-pointer flex items-center gap-1.5 shadow-md ${
                      isModern
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:opacity-90'
                        : 'bg-[#ffcc00] hover:bg-[#e6b800] text-black'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Сохранить настройки ИИ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: NEW CABINET / PROFILE */}
          {activeTab === 'new' && (
            <form onSubmit={handleCreateNewCabinet} className="space-y-4 max-w-md mx-auto py-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Отображаемое имя <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Д-р Иванов И.И. / Ремонтный отдел"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Логин для входа
                  </label>
                  <input
                    type="text"
                    placeholder="ivanov"
                    value={newUserLogin}
                    onChange={(e) => setNewUserLogin(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                    Пароль
                  </label>
                  <input
                    type="text"
                    placeholder="1234"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Профессия (по желанию)
                </label>
                <input
                  type="text"
                  placeholder="Врач-кардиолог / Сервисный инженер"
                  value={newUserProfession}
                  onChange={(e) => setNewUserProfession(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1 font-mono">
                  Электронная почта (Email)
                </label>
                <input
                  type="email"
                  placeholder="user@belkindesk.local"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d11] border border-[#3b3220] focus:border-[#ffcc00] rounded-lg text-xs text-slate-100 focus:outline-hidden font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#ffcc00] hover:bg-[#e6b800] text-black font-bold font-mono rounded-xl transition cursor-pointer text-xs"
                >
                  Создать новый профиль
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: BACKUP & RESTORE */}
          {activeTab === 'backup' && (
            <div className="space-y-5 max-w-xl mx-auto py-2">
              <div className="p-4 bg-[#ffcc00]/5 border border-[#ffcc00]/20 rounded-xl space-y-2">
                <h3 className="text-xs font-bold font-mono text-[#ffcc00] uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#ffcc00]" />
                  <span>Резервное копирование и синхронизация</span>
                </h3>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Экспортируйте ваши личные настройки рабочего стола, подписки на новостные ленты, запланированные дела в календаре, заметки, рабочие таймеры, иконки быстрого доступа и параметры доступности в один компактный JSON-файл. Вы всегда сможете восстановить его на любом устройстве.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export Card */}
                <div className="p-4 rounded-xl border border-[#2b2518] bg-[#0a0d11] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
                      <Download className="w-4 h-4 text-[#ffcc00]" />
                      <span>Экспорт моих данных</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Скачать файл полной резервной копии вашего текущего рабочего профиля <strong>({currentUser.displayName || currentUser.username})</strong> на компьютер.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="w-full py-2 bg-[#ffcc00]/10 hover:bg-[#ffcc00] border border-[#ffcc00]/40 text-[#ffcc00] hover:text-black font-bold font-mono rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-xs active:scale-[0.99]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать резервную копию</span>
                  </button>
                </div>

                {/* Import Card */}
                <div className="p-4 rounded-xl border border-[#2b2518] bg-[#0a0d11] flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-bold text-slate-100 font-mono flex items-center gap-2">
                      <Upload className="w-4 h-4 text-[#ffcc00]" />
                      <span>Импорт моих данных</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Загрузить файл резервной копии <code>.json</code>. Это действие обновит ваши подписки, календари, таймеры и заметки.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => backupFileInputRef.current?.click()}
                    className="w-full py-2 bg-[#1c222b] hover:bg-[#283240] border border-[#3b3220] text-slate-200 font-bold font-mono rounded-lg transition cursor-pointer flex items-center justify-center gap-2 text-xs active:scale-[0.99]"
                  >
                    <Upload className="w-3.5 h-3.5 text-[#ffcc00]" />
                    <span>Выбрать JSON-файл</span>
                  </button>
                  <input
                    ref={backupFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-2.5 ${
                  dragActive
                    ? 'border-[#ffcc00] bg-[#ffcc00]/5 text-[#ffcc00]'
                    : 'border-slate-800 bg-slate-950/20 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-[#1c222b] border border-[#2b2518] flex items-center justify-center text-slate-300">
                  <Upload className="w-5 h-5 text-[#ffcc00]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-slate-200">Перетащите файл резервной копии сюда</p>
                  <p className="text-[11px] text-slate-500 font-mono">Поддерживается только формат .json</p>
                </div>
              </div>

              {/* Messages */}
              {importSuccess && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0"></span>
                  <span>Данные успешно импортированы и синхронизированы с вашим профилем!</span>
                </div>
              )}

              {importError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-lg text-rose-400 text-xs font-mono flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
                  <span>Ошибка: {importError}</span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
