import React, { useState, useEffect } from 'react';
import PracticeSession from './components/PracticeSession';
import InterviewPrep from './components/InterviewPrep';
import { ExamPlan } from './types';
import { BookOpen, Trash2, ArrowUpRight, FolderHeart, PlusCircle, Sparkles, WifiOff, Briefcase, GraduationCap, ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react';
import { 
  cachePlans, 
  getCachedPlans, 
  getOrCreateDeviceId, 
  getDeviceName, 
  setDeviceName, 
  setDeviceId,
  getActiveGeminiModel,
  setActiveGeminiModel
} from './offlineCache';

// The PrepMaster Logo: Fusion of Brain (Mind/AI) and Book (Knowledge) with cyber-futuristic styling
export const AppLogo = () => (
  <div className="flex items-center">
    <div className="relative flex items-center group">
      {/* Background radial highlight glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-sky-500/30 via-indigo-500/20 to-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
      
      <svg
        width="42"
        height="42"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 relative transition-transform duration-700 ease-out group-hover:scale-105"
      >
        <defs>
          <linearGradient id="logoOuterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" /> {/* Sky 400 */}
            <stop offset="50%" stopColor="#6366f1" /> {/* Indigo 500 */}
            <stop offset="100%" stopColor="#10b981" /> {/* Emerald 500 */}
          </linearGradient>
          <linearGradient id="bookWhiteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.95" />
          </linearGradient>
          <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient halo background circle */}
        <circle cx="24" cy="24" r="20" fill="url(#auraGlow)" />

        {/* Outer Orbital Frame - Hexagonal Shield representing passing certifications */}
        <path
          d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
          stroke="url(#logoOuterGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-all duration-500 group-hover:stroke-indigo-400"
        />

        {/* Floating orbital particles / learning checkpoints */}
        <circle cx="24" cy="4" r="2" fill="#38bdf8" className="animate-pulse" />
        <circle cx="41.32" cy="14" r="1.5" fill="#6366f1" />
        <circle cx="41.32" cy="34" r="1.5" fill="#10b981" />
        <circle cx="24" cy="44" r="2" fill="#38bdf8" className="animate-pulse" />
        <circle cx="6.68" cy="34" r="1.5" fill="#10b981" />
        <circle cx="6.68" cy="14" r="1.5" fill="#6366f1" />

        {/* Symmetrical Book Pages forming the base platform of structured knowledge */}
        {/* Left page block */}
        <path
          d="M24 31.5C19.5 31.5 13.5 28 11.5 27V15.5C13.5 16.5 19.5 20 24 20"
          stroke="url(#bookWhiteGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Right page block */}
        <path
          d="M24 31.5C28.5 31.5 34.5 28 36.5 27V15.5C34.5 16.5 28.5 20 24 20"
          stroke="url(#bookWhiteGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Glowing Book Spine */}
        <path d="M24 19.5V33.5" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />

        {/* Intricate Brain Hemisphere Network / AI logic node grid hovering above */}
        {/* Synaptic connector paths */}
        <path
          d="M24 9.5L16.5 13M24 9.5L31.5 13M16.5 13L24 16.5M31.5 13L24 16.5M16.5 13V15.5M31.5 13V15.5"
          stroke="#38bdf8"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />
        
        {/* Individual Intelligence nodes */}
        {/* Apex Core Node */}
        <circle cx="24" cy="9.5" r="3" fill="#ffffff" stroke="#6366f1" strokeWidth="1.5" />
        <circle cx="24" cy="9.5" r="1" fill="#38bdf8" />
        
        {/* Left Hemisphere logic node */}
        <circle cx="16.5" cy="13" r="2" fill="#38bdf8" />
        
        {/* Right Hemisphere reasoning node */}
        <circle cx="31.5" cy="13" r="2" fill="#10b981" />
      </svg>

      {/* Cyberpunk styled little .ai badge representing state of the art models */}
      <span className="ml-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/30 text-[10px] font-black font-mono tracking-wider text-sky-400 select-none uppercase leading-none group-hover:bg-sky-500/20 transition-all">
        .AI
      </span>
    </div>
  </div>
);

export default function App() {
  const [screenMode, setScreenMode] = useState<'home' | 'exam' | 'interview'>('home');
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [plans, setPlans] = useState<ExamPlan[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ persistent: boolean; provider: string } | null>(null);

  // Development phase environment mode state (defaults to 'development' so users can sync other IDs)
  const [envMode, setEnvMode] = useState<'development' | 'production'>(() => {
    return (localStorage.getItem('prepmaster_env_mode') as 'development' | 'production') || 'development';
  });
  const [availableWorkspaces, setAvailableWorkspaces] = useState<string[]>([]);
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
  const [tempIdInput, setTempIdInput] = useState<string>('');
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [workspaceDeletingId, setWorkspaceDeletingId] = useState<string | null>(null);

  // Global theme state persisted across rooms and modules
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('prepmaster_theme');
    if (saved !== null) {
      return saved === 'dark';
    }
    return true; // Default to sleek tech dark mode
  });

  useEffect(() => {
    localStorage.setItem('prepmaster_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('prepmaster_env_mode', envMode);
  }, [envMode]);

  // Device-based Session Workspace State
  const [deviceId, setDeviceIdState] = useState<string>('');
  const [deviceName, setDeviceNameState] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState<boolean>(false);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch('/api/workspaces');
      if (res.ok) {
        const list = await res.json();
        setAvailableWorkspaces(list);
      }
    } catch (err) {
      console.warn('Failed to fetch workspaces list', err);
    }
  };

  useEffect(() => {
    if (showDeviceSettings) {
      fetchWorkspaces();
    }
  }, [showDeviceSettings]);

  const handleSwitchWorkspace = (newId: string) => {
    const trimmed = newId.trim().toUpperCase();
    if (!trimmed) return;
    setDeviceId(trimmed);
    setDeviceIdState(trimmed);
    setTempIdInput(trimmed);
    setWorkspaceMessage(`Successfully switched workspace to ${trimmed}`);
    setTimeout(() => {
      setWorkspaceMessage(null);
    }, 4000);
    setTimeout(() => {
      fetchPlans();
      fetchWorkspaces();
    }, 50);
  };

  const fetchPlans = async () => {
    try {
      const currentId = getOrCreateDeviceId();
      const res = await fetch('/api/plans', {
        headers: {
          'x-device-id': currentId
        }
      });
      if (res.ok) {
        const list = await res.json();
        setPlans(list);
        cachePlans(list);
        setUsingCache(false);
      } else {
        throw new Error('Server returned error response');
      }
    } catch (err) {
      console.warn('Failed to load study plans, loading from offline cache:', err);
      const cached = getCachedPlans();
      setPlans(cached);
      setUsingCache(true);
    }
  };

  useEffect(() => {
    const activeId = getOrCreateDeviceId();
    setDeviceIdState(activeId);
    setTempIdInput(activeId);
    setDeviceNameState(getDeviceName());
    fetchPlans();
    fetchWorkspaces();
    
    // Check dynamic Firestore connection status
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(() => setDbStatus({ persistent: false, provider: 'Local Storage Fallback' }));
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setUploadError(null);

    const formElement = e.currentTarget;

    if (usingCache) {
      setUploadError('Uploading or creating new study rooms is not supported while working offline.');
      return;
    }

    const formData = new FormData(formElement);
    const planTitle = formData.get('plan_title') as string;
    const fileInput = (formElement.elements.namedItem('question_bank') as HTMLInputElement)?.files?.[0];

    if (!planTitle || !fileInput) {
      setUploadError('Please specify a title and select a files source.');
      return;
    }

    setIsUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'x-device-id': getOrCreateDeviceId(),
          'x-gemini-model': getActiveGeminiModel()
        },
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Server returned invalid response structure: ${response.status} ${response.statusText}`);
      }

      if (response.ok && data.exam_plan_id) {
        await fetchPlans();
        setActivePlanId(data.exam_plan_id);
        // Reset form safely
        formElement.reset();
      } else {
        setUploadError(data.detail || 'The question bank processing failed. Please check the file contents.');
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Network error communicating with file extraction service.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (usingCache) {
      alert('Deleting study rooms is not supported while working offline.');
      return;
    }

    if (!window.confirm('This will permanently delete this certification study workspace. Proceed?')) {
      return;
    }

    try {
      const res = await fetch(`/api/plans/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-device-id': getOrCreateDeviceId()
        }
      });
      if (res.ok) {
        fetchPlans();
        if (activePlanId === id) {
          setActivePlanId(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete study plan:', err);
    }
  };

  if (screenMode === 'interview') {
    return (
      <InterviewPrep
        onBackToHome={() => setScreenMode('home')}
        isDark={isDark}
        setIsDark={setIsDark}
      />
    );
  }

  if (screenMode === 'home') {
    return (
      <div className={`min-h-screen flex flex-col font-sans select-none items-center justify-center p-6 relative overflow-hidden transition-all duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        {/* Soft atmospheric background lights */}
        <div className={`absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500 ${isDark ? 'bg-sky-500/10' : 'bg-sky-500/5'}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none transition-opacity duration-500 ${isDark ? 'bg-indigo-500/10' : 'bg-indigo-500/5'}`}></div>
        
        {/* TOP FLOATING TOGGLE ROW */}
        <div className="absolute top-6 right-6 z-20 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-center shadow-md ${isDark ? 'border-slate-850 bg-slate-900 text-amber-400 hover:bg-slate-800' : 'border-slate-200 bg-white text-indigo-600 hover:bg-slate-100'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="max-w-4xl w-full flex flex-col items-center gap-10 z-10">
          {/* Logo element header space */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-650 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-8 h-8 text-white animate-pulse" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-5xl font-black tracking-widest uppercase flex items-center justify-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                PrepMaster
                <span className={`text-xs px-2 py-1 rounded font-mono tracking-widest uppercase ${isDark ? 'bg-sky-500/10 border-sky-500/30 text-sky-400' : 'bg-sky-100 border-sky-200 text-sky-700'}`}>V2.0</span>
              </h1>
              <p className={`text-xs md:text-sm font-semibold max-w-md mx-auto mt-3 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Adaptive preparation environments tailored for enterprise certification exams and professional placements.
              </p>
            </div>
          </div>

          {/* DUAL OPTION SELECTION CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            {/* OPTION A: EXAM CERTIFICATION SUITE */}
            <button
              onClick={() => {
                setScreenMode('exam');
                fetchPlans(); // Refresh lists.
              }}
              className={`group p-8 rounded-3xl text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden border-2 ${isDark ? 'bg-slate-900/65 border-slate-850 hover:border-sky-400 hover:shadow-sky-500/5' : 'bg-white border-slate-200 hover:border-sky-400 hover:shadow-sky-500/10'}`}
            >
              <div className={`absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[40px] pointer-events-none transition-all ${isDark ? 'bg-sky-500/5 group-hover:bg-sky-500/10' : 'bg-sky-500/2 group-hover:bg-sky-500/5'}`}></div>
              
              <div className="flex flex-col gap-5">
                <div className={`p-4 rounded-2xl w-fit transition-all duration-300 ${isDark ? 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white' : 'bg-sky-50 text-sky-600 group-hover:bg-sky-500 group-hover:text-white'}`}>
                  <GraduationCap className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-xl md:text-2xl font-black group-hover:text-sky-500 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Exam Certification Suite
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed mt-2.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Upload practice banks or syllabus notes to formulate adaptive classrooms. Supports single/multi-select option routing, feedback logs, and review rooms.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-sky-500 group-hover:text-sky-400 pt-6">
                <span>Configure & Begin Prep Rooms</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>

            {/* OPTION B: AI INTERVIEW SUITE */}
            <button
              onClick={() => {
                setScreenMode('interview');
              }}
              className={`group p-8 rounded-3xl text-left transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-2xl cursor-pointer flex flex-col justify-between min-h-[300px] relative overflow-hidden border-2 ${isDark ? 'bg-slate-900/65 border-slate-850 hover:border-indigo-400 hover:shadow-indigo-500/5' : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-indigo-500/10'}`}
            >
              <div className={`absolute top-0 right-0 w-[120px] h-[120px] rounded-full blur-[40px] pointer-events-none transition-all ${isDark ? 'bg-indigo-500/5 group-hover:bg-indigo-500/10' : 'bg-indigo-500/2 group-hover:bg-indigo-500/5'}`}></div>
              
              <div className="flex flex-col gap-5">
                <div className={`p-4 rounded-2xl w-fit transition-all duration-300 ${isDark ? 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                  <Briefcase className="w-8 h-8" />
                </div>
                <div>
                  <h3 className={`text-xl md:text-2xl font-black group-hover:text-indigo-500 transition-colors ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    AI Interview Prep Suite
                  </h3>
                  <p className={`text-xs sm:text-sm leading-relaxed mt-2.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Consult with an AI executive prepper coach. Map dynamically configured Bento roadmaps, manage companion notes, and evaluate with adaptive flash quizzes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-indigo-500 group-hover:text-indigo-400 pt-6">
                <span>Open Placement Chamber</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
              </div>
            </button>
          </div>

          {/* No Sync Status */}
        </div>
      </div>
    );
  }

  if (activePlanId) {
    return (
      <PracticeSession
        planId={activePlanId}
        plans={plans}
        onSwitch={(id) => setActivePlanId(id)}
        onBack={() => setActivePlanId(null)}
        isDark={isDark}
        setIsDark={setIsDark}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* RESPONSIVE HEADER BAR */}
      <nav className={`border-b py-4 px-4 sm:px-8 flex items-center justify-between shadow-lg transition-colors ${isDark ? 'bg-slate-900 border-slate-850 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className={`text-lg sm:text-xl font-black tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>
              PrepMaster
            </h1>
            <span className="text-[9px] font-bold text-sky-400 tracking-widest uppercase">
              Mastery Engine
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${showDeviceSettings ? 'ring-2 ring-sky-500' : ''} ${isDark ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-200 hover:text-white' : 'bg-slate-100 hover:bg-slate-150 border-slate-200 text-slate-700'}`}
            title="Manage device workspace settings"
          >
            <div className={`w-2 h-2 rounded-full ${envMode === 'development' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`}></div>
            <span className="hidden md:inline">
              Workspace: <strong className="font-mono">{deviceId}</strong> ({envMode === 'development' ? 'Dev 🔓' : 'Prod 🔒'})
            </span>
            <span className="inline md:hidden">Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400' : 'border-slate-250 bg-slate-100 hover:bg-slate-200 text-indigo-600'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          
          <div className="text-right hidden sm:block">
            <span className="inline-block bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
              AI Tutor Companion
            </span>
          </div>
        </div>
      </nav>

      {/* DEVICE WORKSPACE MANAGER DRAWER / BAR */}
      {showDeviceSettings && (
        <div className={`border-b p-6 shadow-inner animate-fade-in transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-slate-100 border-slate-200 text-slate-800'}`}>
          <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
            
            {/* Top Row: Info & Environment Mode Flag Toggle */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 border-slate-200/50 dark:border-slate-800/50">
              <div className="max-w-xl">
                <h4 className={`font-black text-sm mb-1 flex items-center gap-2 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  <span>⚙️ Workspace Isolation & Session Environment</span>
                </h4>
                <p className={`text-[11px] leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  PrepMaster uses a Workspace ID to isolate study plans, notes, and quiz metrics. Change or sync with other Workspace IDs to run side-by-side on other browsers/mobile devices.
                </p>
              </div>

              {/* Environment Selector Segmented Control */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Session Phase</span>
                <div className={`p-1 flex rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-200/50 border-slate-300'}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setEnvMode('development');
                      fetchWorkspaces();
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                      envMode === 'development'
                        ? 'bg-emerald-500 text-white shadow'
                        : `${isDark ? 'bg-transparent text-slate-400 hover:text-slate-200' : 'bg-transparent text-slate-600 hover:text-slate-800'}`
                    }`}
                  >
                    <span>🔓 Development Phase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEnvMode('production');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 border-none ${
                      envMode === 'production'
                        ? 'bg-indigo-600 text-white shadow'
                        : `${isDark ? 'bg-transparent text-slate-400 hover:text-slate-200' : 'bg-transparent text-slate-600 hover:text-slate-800'}`
                    }`}
                  >
                    <span>🔒 Production Phase</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Middle Row: Workspace inputs */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              
              {/* Left description corresponding to Active EnvMode */}
              <div className="max-w-md w-full">
                {envMode === 'development' ? (
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      Sync Status: Unlocked (Dev Mode)
                    </p>
                    <p className="text-[10px] mt-1.5 font-medium leading-relaxed opacity-90">
                      You can manually type or copy-paste any custom Workspace ID, or switch between other detected workspace instances. All data will immediately hot-swap and sync.
                    </p>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-indigo-950/10 border-indigo-900/30 text-indigo-400' : 'bg-indigo-50 border-indigo-150 text-indigo-800'}`}>
                    <p className="text-xs font-bold flex items-center gap-1.5">
                      <span>🔒 Workspace Locked (Production Mode)</span>
                    </p>
                    <p className="text-[10px] mt-1.5 font-medium leading-relaxed opacity-90">
                      For maximum data isolation and to prevent accidental sync overrides, Workspace IDs are strictly locked. Toggle back to Development Phase to enable sync or swap controls.
                    </p>
                  </div>
                )}
              </div>

              {/* Input Forms */}
              <div className="flex flex-wrap items-start gap-5">
                
                {/* Manual Workspace Entry */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Manual Workspace Entry</span>
                  {envMode === 'development' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempIdInput}
                        onChange={(e) => setTempIdInput(e.target.value)}
                        placeholder="e.g. DEV_XYZ"
                        className={`border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-emerald-500 w-40 uppercase ${isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-white border-slate-200 text-emerald-700'}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSwitchWorkspace(tempIdInput);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSwitchWorkspace(tempIdInput)}
                        className="text-[11px] bg-emerald-600 hover:bg-emerald-500 hover:scale-[1.02] active:scale-[0.98] text-white font-extrabold px-3 py-2 rounded-xl transition-all border-none cursor-pointer shadow-md"
                      >
                        Apply / Sync
                      </button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 border px-3 py-2 rounded-xl w-40 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-xs font-mono font-bold text-slate-400">🔒 {deviceId}</span>
                      <span className="text-[9px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-wider ml-auto">Locked</span>
                    </div>
                  )}
                </div>

                {/* Dropdown Selector & Pop-up List */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Discovered Workspace Profiles</span>
                  {envMode === 'development' ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={deviceId}
                        onChange={(e) => handleSwitchWorkspace(e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:border-emerald-500 w-52 cursor-pointer ${
                          isDark ? 'bg-slate-950 border-slate-800 text-sky-400' : 'bg-white border-slate-200 text-sky-700'
                        }`}
                      >
                        <option value={deviceId}>⭐ Current: {deviceId}</option>
                        {availableWorkspaces
                          .filter(id => id !== deviceId)
                          .map(id => (
                            <option key={id} value={id}>
                              🔗 ID: {id}
                            </option>
                          ))}
                      </select>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowSearchModal(true);
                          setSearchQuery('');
                        }}
                        className={`px-3 py-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center font-bold text-xs ${
                          isDark ? 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-sky-400' : 'bg-slate-100 hover:bg-slate-150 border-slate-250 text-sky-600'
                        }`}
                        title="Search and select from previous Workspaces"
                      >
                        🔍 Browse All
                      </button>
                    </div>
                  ) : (
                    <div className={`flex items-center gap-2 border px-3 py-2 rounded-xl w-52 ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <span className="text-xs font-mono font-bold text-slate-400">🔒 Current Workspace Locked</span>
                    </div>
                  )}
                </div>

                {/* Device Custom Name Label */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Local Device Custom Label</span>
                  <input
                    type="text"
                    value={deviceName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDeviceNameState(val);
                      setDeviceName(val);
                    }}
                    className={`border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 w-36 ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-805'}`}
                    placeholder="e.g. My Laptop"
                  />
                </div>

              </div>
            </div>

            {/* Workspace Switch Toast Message */}
            {workspaceMessage && (
              <div className={`p-3 rounded-xl border text-xs font-bold animate-pulse flex items-center gap-2 ${isDark ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>{workspaceMessage}</span>
              </div>
            )}

            {/* Bottom Row: Discovered / Available Workspace Profiles in Development Mode */}
            {envMode === 'development' && (
              <div className={`border-t pt-4 flex flex-col gap-2 ${isDark ? 'border-slate-800/60' : 'border-slate-200/60'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Discovered Active Workspace Profiles in Network</span>
                
                {availableWorkspaces.filter(id => id !== deviceId).length === 0 ? (
                  <p className="text-[10px] font-medium text-slate-500">
                    No other active workspace profiles discovered yet in Cloud Firestore. Once you upload files from other devices or change Workspace IDs, they will appear here as quick-swap profiles.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 items-center">
                    {availableWorkspaces
                      .filter(id => id !== deviceId)
                      .map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => handleSwitchWorkspace(id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                            isDark 
                              ? 'bg-slate-950 border-slate-800 text-sky-400 hover:text-white hover:border-sky-500 hover:bg-slate-800/40' 
                              : 'bg-white border-slate-200 text-sky-600 hover:text-sky-800 hover:border-sky-400 hover:bg-slate-50'
                          }`}
                          title={`Instantly sync with workspace ID ${id}`}
                        >
                          🔗 Profile: {id}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* DASHBOARD HERO CONTAINER */}
      <div className="flex-grow max-w-5xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-10">
        
        {/* SUITE SUB-HEADER & BACK TRIGGER */}
        <div className={`flex items-center justify-between border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setScreenMode('home')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-black rounded-xl border border-solid transition-all cursor-pointer group ${isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 border-slate-300/80'}`}
            >
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>Back to Selection Portal</span>
            </button>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Current Suite</span>
            <span className="text-xs font-extrabold text-sky-500 bg-sky-500/10 px-2.5 py-1 rounded-md uppercase tracking-wide">Exam Certifications</span>
          </div>
        </div>

        {/* WORKSPACES SECTION */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <FolderHeart className="w-6 h-6 text-sky-500" /> Active study rooms
              </h2>
              <p className={`text-xs sm:text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Continue your structured certification revision paths.</p>
            </div>
            <span className={`font-bold text-xs px-3 py-1 rounded-full uppercase leading-none mt-1 ${isDark ? 'bg-slate-900 text-slate-300' : 'bg-slate-200 text-slate-700'}`}>
              {plans.length} workspaces
            </span>
          </div>

          {dbStatus && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 border transition-colors ${dbStatus.persistent ? (isDark ? 'bg-emerald-950/10 border-emerald-900/30 text-emerald-300' : 'bg-emerald-50/65 border-emerald-150/80 text-emerald-900') : (isDark ? 'bg-amber-950/10 border-amber-900/30 text-amber-300' : 'bg-amber-50 border-amber-150/80 text-amber-900')}`}>
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dbStatus.persistent ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></div>
              <div className="text-xs sm:text-sm">
                <p className="font-extrabold flex flex-wrap items-center gap-1.5 leading-none">
                  <span>{dbStatus.persistent ? 'Durable Cloud Backup Sync' : 'Ephemeral Local Storage'}</span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wide ${dbStatus.persistent ? (isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-emerald-100 border border-emerald-200 text-emerald-700') : (isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400' : 'bg-amber-100 border border-amber-200 text-amber-700')}`}>
                    {dbStatus.provider}
                  </span>
                </p>
                <p className={`font-medium mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {dbStatus.persistent 
                    ? `Your learning rooms, notes, and interactive quiz history are saved securely in Google Cloud Firestore. Your progress is isolated to your Workspace ID (${deviceId}) and is 100% durable across multiple devices or server restarts.`
                    : 'The server is running in stateless file fallback. Changes could be reset when the cloud server sleeps. Setup your Firestore credentials in AI Studio settings to unlock permanent cloud backups.'}
                </p>
              </div>
            </div>
          )}

          {usingCache && (
            <div className={`rounded-2xl p-4 flex items-start gap-3 border ${isDark ? 'bg-amber-950/20 border-amber-950/40 text-amber-300' : 'bg-amber-50 border-amber-200/80 text-amber-905'}`}>
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm">
                <p className="font-bold">Offline Review Mode Enabled</p>
                <p className={`font-medium mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-655'}`}>
                  You are viewing your locally cached study rooms. You can fully review existing question patterns, practice with flashcards, and browse correct answer keys. Uploading new documents or utilizing real-time AI tutor interactions requires internet access.
                </p>
              </div>
            </div>
          )}

          {plans.length === 0 ? (
            <div className={`p-10 sm:p-16 rounded-2xl border-2 border-dashed text-center flex flex-col items-center justify-center gap-3 ${isDark ? 'bg-slate-900/20 border-slate-800 text-slate-400' : 'bg-white border-slate-200/80 text-slate-500'}`}>
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <BookOpen className="w-6 h-6" />
              </div>
              <p className={`font-semibold text-sm sm:text-base leading-relaxed max-w-md antialiased ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                No active exam rooms. Upload a practice document below to spawn your personalized AI classroom space!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setActivePlanId(plan.id)}
                  className={`p-6 rounded-2xl border cursor-pointer shadow-sm hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-5 group ${isDark ? 'bg-slate-900 border-slate-850 hover:border-sky-500' : 'bg-white border-slate-200/60 hover:border-sky-300'}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h3 className={`font-black text-sm sm:text-base leading-snug group-hover:text-sky-500 transition-colors line-clamp-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        {plan.title}
                      </h3>
                      <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Uploaded {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, plan.id)}
                      className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all border-none cursor-pointer shrink-0"
                      title="Delete study workspace"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className={`flex items-center justify-between border-t pt-4 mt-auto ${isDark ? 'border-slate-850' : 'border-slate-100'}`}>
                    <span className="text-xs font-bold text-sky-500 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Open Room <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* STUDY PLAN FILE INITIALIZER FORM */}
        <section className={`border p-6 sm:p-10 rounded-3xl shadow-xl flex flex-col gap-6 transition-all ${isDark ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-slate-950/40' : 'bg-white border-slate-200/60 text-slate-850 shadow-slate-200/50'}`}>
          <div className={`border-b pb-5 ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <h2 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <PlusCircle className="w-6 h-6 text-sky-500 animate-pulse" /> Initialize study room
            </h2>
            <p className={`text-xs sm:text-sm font-medium leading-relaxed mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Add custom exam question papers in PDF or TXT. Our parser extracts syllabus patterns, configures interactive study lists, and builds automated flashcard decks.
            </p>
          </div>

          <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className={`text-[11px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Exam Workspace Title
              </label>
              <input
                name="plan_title"
                placeholder="e.g. AWS Solutions Architect (SAA-C03)"
                required
                className={`w-full p-3.5 rounded-xl border outline-none font-semibold text-xs sm:text-sm transition-all shadow-inner ${isDark ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-sky-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:border-sky-400 focus:bg-white'}`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={`text-[11px] font-black uppercase tracking-widest leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Exam Question Source File
              </label>
              <input
                type="file"
                name="question_bank"
                accept=".pdf,.txt,.text"
                required
                className={`w-full text-xs file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[11px] file:font-extrabold file:uppercase file:tracking-wider file:bg-sky-500/10 file:text-sky-400 hover:file:bg-sky-500/25 cursor-pointer border p-2 rounded-xl ${isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              />
            </div>

            {uploadError && (
              <div className="sm:col-span-2 p-4 bg-rose-50 border border-solid border-rose-100 rounded-xl text-rose-500 text-xs font-bold leading-normal flex items-start gap-2">
                <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading}
              className={`sm:col-span-2 py-4 rounded-2xl text-white font-black text-sm sm:text-base border-none transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2
                ${isUploading ? 'bg-slate-800 text-slate-500 cursor-wait pointer-events-none shadow-none' : 'bg-slate-900 hover:bg-slate-800 shadow-slate-950/20'}
              `}
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-slate-450 border-t-transparent rounded-full animate-spin"></span>
                  STRUCTURING REVISION PATTERNS...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400 shrink-0" /> BOOT STUDY DESK
                </span>
              )}
            </button>
          </form>
        </section>
      </div>

      {/* SEARCHABLE WORKSPACE POPUP MODAL */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={() => setShowSearchModal(false)}
          ></div>
          
          {/* Modal Card */}
          <div className={`relative w-full max-w-lg p-6 rounded-3xl shadow-2xl border transition-all transform ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200/50 dark:border-slate-800/50">
              <h3 className="text-sm sm:text-base font-black flex items-center gap-2">
                <span>🔍 Search Registered Workspace Profiles</span>
              </h3>
              <button 
                type="button"
                onClick={() => setShowSearchModal(false)}
                className={`p-1.5 rounded-lg transition-all border-none cursor-pointer text-xs font-bold ${
                  isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
                }`}
              >
                ✕ Close
              </button>
            </div>

            <p className={`text-[11px] mb-4 font-medium leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Search across all historical workspaces discovered in Cloud Firestore. Select a workspace to instantly hot-swap and load all associated exam plans, quiz answers, and metrics.
            </p>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by Workspace ID (e.g. DEV_XYZ)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold outline-none ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800 text-emerald-400 placeholder-slate-600 focus:border-sky-500' 
                    : 'bg-slate-50 border-slate-200 text-emerald-700 placeholder-slate-400 focus:border-sky-400 focus:bg-white'
                }`}
              />
            </div>

            {/* Workspace ID List */}
            <div className="max-h-60 overflow-y-auto flex flex-col gap-2 pr-1">
              {availableWorkspaces.filter(id => id.toUpperCase().includes(searchQuery.toUpperCase())).length === 0 ? (
                <p className="text-[11px] font-medium text-slate-500 text-center py-6">
                  No matching workspace profiles found. Try a different search query.
                </p>
              ) : (
                availableWorkspaces
                  .filter(id => id.toUpperCase().includes(searchQuery.toUpperCase()))
                  .map((id) => {
                    const isActive = id === deviceId;
                    const isConfirmingDelete = workspaceDeletingId === id;
                    return (
                      <div
                        key={id}
                        className={`w-full px-4 py-2.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                          isActive 
                            ? (isDark ? 'bg-emerald-950/20 border-emerald-800/80' : 'bg-emerald-50 border-emerald-200')
                            : (isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-150')
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isConfirmingDelete) return;
                            handleSwitchWorkspace(id);
                            setShowSearchModal(false);
                          }}
                          disabled={isConfirmingDelete}
                          className={`flex-1 text-left flex items-center justify-between cursor-pointer border-none bg-transparent outline-none p-0 transition-all ${
                            isActive 
                              ? (isDark ? 'text-emerald-400 font-extrabold' : 'text-emerald-800 font-extrabold')
                              : (isDark ? 'text-slate-300 hover:text-white' : 'text-slate-700 hover:text-slate-950')
                          } ${isConfirmingDelete ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                            <span className="text-xs font-mono font-bold">{id}</span>
                          </div>
                          {isActive ? (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Active</span>
                          ) : !isConfirmingDelete ? (
                            <span className="text-[10px] text-sky-400 hover:underline font-bold">Select & Sync →</span>
                          ) : null}
                        </button>

                        {!isActive && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isConfirmingDelete ? (
                              <>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const res = await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
                                      if (res.ok) {
                                        setWorkspaceMessage(`Successfully deleted workspace ${id}`);
                                        setTimeout(() => setWorkspaceMessage(null), 4000);
                                        setWorkspaceDeletingId(null);
                                        fetchWorkspaces();
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-black border-none bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-all shadow"
                                >
                                  ⚠️ Confirm Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkspaceDeletingId(null);
                                  }}
                                  className={`px-2 py-1.5 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-800'
                                  }`}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setWorkspaceDeletingId(id);
                                }}
                                className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all border cursor-pointer ${
                                  isDark 
                                    ? 'bg-red-950/30 border-red-900/40 text-red-400 hover:bg-red-900/40 hover:text-red-300' 
                                    : 'bg-red-50 border-red-150 text-red-600 hover:bg-red-100 hover:text-red-800'
                                }`}
                                title="Permanently delete workspace and its data"
                              >
                                🗑️ Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSearchModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border-none' : 'bg-slate-150 hover:bg-slate-200 text-slate-700 border-none'
                }`}
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`text-center py-6 border-t text-[11px] font-bold select-none transition-colors ${isDark ? 'bg-slate-900 border-slate-850 text-slate-500' : 'bg-white border-slate-200 text-slate-400'}`}>
        © 2026 PrepMaster .ai — Premium Certification Study Rooms
      </footer>
    </div>
  );
}
