import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  BarChart3, 
  Layers, 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  MessageSquare, 
  Menu, 
  X, 
  Sparkles,
  HelpCircle,
  TrendingUp,
  ListFilter,
  WifiOff,
  Sun,
  Moon
} from 'lucide-react';
import { ExamPlan, Question, ProgressItem, ChatMessage } from '../types';
import { AppLogo } from '../App';
import { 
  cacheQuestions, 
  getCachedQuestions, 
  cacheProgress, 
  getCachedProgress,
  getOrCreateDeviceId,
  getActiveGeminiModel,
  setActiveGeminiModel
} from '../offlineCache';

const MarkdownComponents = {
  h1: ({ ...props }: any) => (
    <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 mt-6 mb-3" {...props} />
  ),
  h2: ({ ...props }: any) => (
    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2 border-b border-slate-200 dark:border-slate-800 pb-1.5" {...props} />
  ),
  h3: ({ ...props }: any) => (
    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mt-4 mb-2" {...props} />
  ),
  p: ({ ...props }: any) => (
    <p className="text-sm md:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-3" {...props} />
  ),
  strong: ({ ...props }: any) => (
    <strong className="text-sky-500 font-semibold" {...props} />
  ),
  ul: ({ ...props }: any) => (
    <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 mb-3 space-y-1 text-sm md:text-base" {...props} />
  ),
  code: ({ children, className, ...props }: any) => {
    const isInline = !className || !className.startsWith('language-');
    return isInline ? (
      <code className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400 text-xs md:text-sm font-mono" {...props}>
        {children}
      </code>
    ) : (
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-3 text-xs md:text-sm">
        <code className="font-mono" {...props}>
          {children}
        </code>
      </pre>
    );
  }
};

const LS_KEY = (planId: string) => `promptpass_state_${planId}`;

interface SavedState {
  answers?: Record<string, string>;
  explanations?: Record<string, string>;
  chats?: Record<string, ChatMessage[]>;
}

function loadFromStorage(planId: string): SavedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY(planId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(planId: string, data: SavedState) {
  try {
    localStorage.setItem(LS_KEY(planId), JSON.stringify(data));
  } catch {}
}

interface ReviewModalProps {
  questions: Question[];
  progress: ProgressItem[];
  filter: 'green' | 'red';
  onClose: () => void;
  onNavigate: (index: number) => void;
}

function ReviewModal({ questions, progress, filter, onClose, onNavigate }: ReviewModalProps) {
  const filtered = progress.filter((p) => p.status === filter);
  const label = filter === 'green' ? 'Correct' : 'Incorrect';
  const accentClass = filter === 'green' ? 'text-emerald-500 border-emerald-200 bg-emerald-50' : 'text-rose-500 border-rose-200 bg-rose-50';
  const iconClass = filter === 'green' ? 'text-emerald-500' : 'text-rose-500';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {filter === 'green' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <XCircle className="w-5 h-5 text-rose-500" />}
            <h3 className="font-bold text-slate-800 text-base md:text-lg">
              {label} Questions ({filtered.length})
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filtered.length === 0 ? (
            <p className="text-slate-500 text-center py-8 text-sm">
              No {label.toLowerCase()} questions yet. Keep practicing!
            </p>
          ) : (
            filtered.map((item) => {
              const q = questions.find((ques) => ques.id === item.question_id);
              if (!q) return null;
              return (
                <button
                  key={item.question_id}
                  onClick={() => {
                    const idx = questions.findIndex((ques) => ques.id === item.question_id);
                    onNavigate(idx);
                    onClose();
                  }}
                  className={`w-full text-left p-4 rounded-xl border border-solid hover:scale-[1.01] transition-all flex flex-col gap-1.5 ${accentClass}`}
                >
                  <span className="text-xs font-bold tracking-wider">
                    QUESTION #{q.question_number}
                  </span>
                  <p className="text-sm font-medium text-slate-800 line-clamp-3 leading-relaxed">
                    {q.text}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface PracticeSessionProps {
  planId: string;
  plans: ExamPlan[];
  onSwitch: (id: string) => void;
  onBack: () => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

export default function PracticeSession({ planId, plans, onSwitch, onBack, isDark, setIsDark }: PracticeSessionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeModel, setActiveModel] = useState<string>(() => getActiveGeminiModel());
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [offlineActive, setOfflineActive] = useState(false);

  // Tab State: practice, flashcard, dashboard
  const [activeTab, setActiveTab] = useState<'practice' | 'flashcard' | 'dashboard'>('practice');

  // Flashcard flipping state
  const [isFlipped, setIsFlipped] = useState(false);

  // Mobile Drawer State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Per-question persistent state (keyed by question ID)
  const [questionAnswers, setQuestionAnswers] = useState<Record<string, string>>({});
  const [questionExplanations, setQuestionExplanations] = useState<Record<string, string>>({});
  const [questionChats, setQuestionChats] = useState<Record<string, ChatMessage[]>>({});

  // Derived view state for the currently visible question
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // Review modal
  const [reviewFilter, setReviewFilter] = useState<'green' | 'red' | null>(null);

  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/plans/${planId}/progress`, {
        headers: {
          'x-device-id': getOrCreateDeviceId()
        }
      });
      if (res.ok) {
        const data = await res.json();
        setProgress(data);
        cacheProgress(planId, data);
        
        if (Array.isArray(data)) {
          setQuestionAnswers((prev) => {
            const next = { ...prev };
            data.forEach((item) => {
              if (item.question_id) {
                next[item.question_id] = item.selected_answer;
              }
            });
            return next;
          });
          setQuestionExplanations((prev) => {
            const next = { ...prev };
            data.forEach((item) => {
              if (item.question_id) {
                next[item.question_id] = item.explanation;
              }
            });
            return next;
          });
        }
      } else {
        throw new Error('Progress fetch failed');
      }
    } catch (err) {
      console.warn('[OFFLINE] Fetch progress error, reading from local storage cache:', err);
      const cached = getCachedProgress(planId);
      setProgress(cached);
      setOfflineActive(true);
      
      if (Array.isArray(cached)) {
        setQuestionAnswers((prev) => {
          const next = { ...prev };
          cached.forEach((item) => {
            if (item.question_id) {
              next[item.question_id] = item.selected_answer;
            }
          });
          return next;
        });
        setQuestionExplanations((prev) => {
          const next = { ...prev };
          cached.forEach((item) => {
            if (item.question_id) {
              next[item.question_id] = item.explanation;
            }
          });
          return next;
        });
      }
    }
  }, [planId]);

  // Load questions + progress on plan change
  useEffect(() => {
    setCurrentIndex(0);
    setChatInput('');
    setIsFlipped(false);
    setOfflineActive(false);

    // Restore state from LocalStorage
    const saved = loadFromStorage(planId);
    if (saved) {
      setQuestionAnswers(saved.answers || {});
      setQuestionExplanations(saved.explanations || {});
      setQuestionChats(saved.chats || {});
    } else {
      setQuestionAnswers({});
      setQuestionExplanations({});
      setQuestionChats({});
    }

    const loadQuestionsAndProgress = async () => {
      try {
        const res = await fetch(`/api/plans/${planId}/questions`, {
          headers: {
            'x-device-id': getOrCreateDeviceId()
          }
        });
        if (res.ok) {
          const qs = await res.json();
          setQuestions(qs);
          cacheQuestions(planId, qs);
        } else {
          throw new Error('Questions fetch failed');
        }
      } catch (err) {
        console.warn('[OFFLINE] Fetch questions error, reading from cache:', err);
        const cached = getCachedQuestions(planId);
        setQuestions(cached);
        setOfflineActive(true);
      }
      fetchProgress();
    };

    loadQuestionsAndProgress();
  }, [planId, fetchProgress]);

  // Save changes to localStorage on any state modification
  useEffect(() => {
    if (!planId) return;
    saveToStorage(planId, {
      answers: questionAnswers,
      explanations: questionExplanations,
      chats: questionChats,
    });
  }, [planId, questionAnswers, questionExplanations, questionChats]);

  // Sync current selection when navigating
  useEffect(() => {
    const q = questions[currentIndex];
    if (!q) return;
    setSelectedAnswer(questionAnswers[q.id] || '');
    setExplanation(questionExplanations[q.id] || '');
    setChatLog(questionChats[q.id] || []);
    setChatInput('');
    setIsFlipped(false); // Reset flip on navigation
  }, [currentIndex, questions, questionAnswers, questionExplanations, questionChats]);

  const processStream = async (response: Response, stateUpdater: (text: string) => void) => {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const rawJson = line.substring(6).trim();
            if (rawJson) {
              const data = JSON.parse(rawJson);
              if (data && data.text) {
                stateUpdater(data.text);
              }
            }
          } catch {}
        }
      }
    }
  };

  const handleCheckAnswer = async () => {
    if (!selectedAnswer) return;
    const q = questions[currentIndex];
    if (!q) return;

    // Optimistically clear explanation & chats
    setExplanation('');
    setExplanation('');
    setQuestionExplanations((prev) => ({ ...prev, [q.id]: '' }));
    setChatLog([]);
    setQuestionChats((prev) => ({ ...prev, [q.id]: [] }));
    setIsStreaming(true);

    try {
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': getOrCreateDeviceId(),
          'x-gemini-model': activeModel
        },
        body: JSON.stringify({ question_id: q.id, selected_answer: selectedAnswer }),
      });

      if (!response.ok) {
        throw new Error('Evaluation request failed');
      }

      await processStream(response, (text) => {
        setExplanation((prev) => {
          const next = prev + text;
          setQuestionExplanations((e) => ({ ...e, [q.id]: next }));
          return next;
        });
      });

      fetchProgress();
    } catch (err) {
      console.error(err);
      const offlineMsg = "⚠️ **TUTOR CONNECTION OFFLINE**\n\nUnable to reach the AI instructor server. Deep evaluation and interactive grading require an active internet connection.\n\nHowever, you can still answer questions and review correct selections offline.";
      setExplanation(offlineMsg);
      setQuestionExplanations((prev) => ({ ...prev, [q.id]: offlineMsg }));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAskFollowUp = async () => {
    const query = chatInput.trim();
    if (!query) return;
    const q = questions[currentIndex];
    if (!q) return;

    const newEntry: ChatMessage[] = [
      { role: 'user', content: query },
      { role: 'ai', content: '' },
    ];
    const updatedLog = [...chatLog, ...newEntry];

    setChatLog(updatedLog);
    setQuestionChats((prev) => ({ ...prev, [q.id]: updatedLog }));
    setChatInput('');
    setIsChatting(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-device-id': getOrCreateDeviceId(),
          'x-gemini-model': activeModel
        },
        body: JSON.stringify({
          question_text: q.text,
          ai_explanation: explanation,
          user_message: query,
        }),
      });

      if (!response.ok) {
        throw new Error('Chat request failed');
      }

      await processStream(response, (text) => {
        setChatLog((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last) {
            updated[updated.length - 1] = {
              ...last,
              content: last.content + text,
            };
          }
          setQuestionChats((c) => ({ ...c, [q.id]: updated }));
          return updated;
        });
      });
    } catch (err) {
      console.error(err);
      setChatLog((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last) {
          updated[updated.length - 1] = {
            ...last,
            content: "⚠️ **CONNECTION OFFLINE**\n\nYour message could not be sent to the AI instructor. Please check your internet connection.",
          };
        }
        setQuestionChats((c) => ({ ...c, [q.id]: updated }));
        return updated;
      });
    } finally {
      setIsChatting(false);
    }
  };

  const handleSelectAnswer = (key: string) => {
    const q = questions[currentIndex];
    if (!q) return;
    
    const optionKeysCount = Object.keys(q.options).length;
    if (optionKeysCount > 4) {
      // Multi-select behavior for questions with more than 4 options (e.g. checkbox state)
      const currentSelection = selectedAnswer ? selectedAnswer.split(',').map(s => s.trim()).filter(Boolean) : [];
      let nextSelection: string[];
      if (currentSelection.includes(key)) {
        nextSelection = currentSelection.filter(item => item !== key);
      } else {
        nextSelection = [...currentSelection, key];
      }
      const sortedResult = nextSelection.sort().join(', ');
      setSelectedAnswer(sortedResult);
      setQuestionAnswers((prev) => ({ ...prev, [q.id]: sortedResult }));
    } else {
      // Standard single-select
      setSelectedAnswer(key);
      setQuestionAnswers((prev) => ({ ...prev, [q.id]: key }));
    }
  };

  const navigate = useCallback(
    (delta: number) => {
      setCurrentIndex((i) => Math.max(0, Math.min(questions.length - 1, i + delta)));
    },
    [questions.length]
  );

  // Keyboard navigation hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);

      const optionKeys: Record<string, string> = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E', '6': 'F' };
      if (optionKeys[e.key] && questions[currentIndex] && activeTab === 'practice') {
        const opts = questions[currentIndex].options;
        if (opts[optionKeys[e.key]]) {
          handleSelectAnswer(optionKeys[e.key]);
        }
      }

      if (e.key === 'Enter' && !isStreaming && !isChatting && activeTab === 'practice') {
        handleCheckAnswer();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, currentIndex, questions, isStreaming, isChatting, selectedAnswer, activeTab]);

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAskFollowUp();
    }
  };

  if (!questions.length) {
    return (
      <div className="h-screen w-screen flex flex-col gap-3 items-center justify-center font-sans text-slate-500 bg-slate-50">
        <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-semibold text-sm antialiased text-slate-600">Structuring Study Rooms...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const total = questions.length;
  const progressByQuestion = progress.reduce<Record<string, string>>((acc, curr) => {
    acc[curr.question_id] = curr.status;
    return acc;
  }, {});

  const attempted = progress.filter((p) => p.status !== 'gray').length;
  const correct = progress.filter((p) => p.status === 'green').length;
  const wrong = progress.filter((p) => p.status === 'red').length;
  const progressPct = total > 0 ? Math.round((attempted / total) * 100) : 0;
  const accuracyPct = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const currentStatus = progressByQuestion[currentQuestion.id] || 'gray';
  const activeMode = activeTab;

  const thBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900';
  const thNavbar = isDark ? 'bg-slate-900 border-b border-slate-800 text-white' : 'bg-white border-b border-slate-200 text-slate-900 shadow-sm';
  const thPanel = isDark ? 'bg-slate-900 border border-slate-850' : 'bg-white border border-slate-200/80 shadow-md';
  const thCard = isDark ? 'bg-slate-950 border border-slate-850' : 'bg-slate-100 border border-slate-200';
  const thHeading = isDark ? 'text-white' : 'text-slate-900';
  const thTextMuted = isDark ? 'text-slate-400' : 'text-slate-500';
  const thInnerBar = isDark ? 'bg-slate-950 border-slate-850 text-slate-300' : 'bg-slate-50 border-slate-100 text-slate-600';

  return (
    <div className={`flex h-screen w-screen font-sans overflow-hidden select-none transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-905'}`}>
      
      {/* MOBILE HEADER BAR */}
      <div className={`lg:hidden fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4 z-40 shadow-md transition-colors ${isDark ? 'bg-slate-900 text-white border-b border-slate-850' : 'bg-white text-slate-800 border-b border-slate-200'}`}>
        <button onClick={() => setSidebarOpen(true)} className={`p-2 -ml-2 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'}`}>
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-1.5">
          <AppLogo />
          <span className={`font-extrabold text-base tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>PrepMaster</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${isDark ? 'border-slate-700 bg-slate-800 text-amber-400' : 'border-slate-250 bg-slate-100 text-indigo-600'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => setDirectoryOpen(true)} className="p-2 -mr-2 rounded-lg text-sky-500 hover:scale-105 transition-all">
            <Layers className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* DETAILED SIDEBAR DESKTOP VIEW */}
      <div className={`
        fixed inset-y-0 left-0 w-[280px] bg-slate-900 text-white flex flex-col z-50 p-6 overflow-y-auto transition-transform duration-300 lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <AppLogo />
            <h1 className="text-xl font-black text-white tracking-tight">PrepMaster</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <button
          onClick={onBack}
          className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold text-sm transition-all mb-4 text-left flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Exit Room
        </button>

        <select
          value={planId}
          onChange={(e) => onSwitch(e.target.value)}
          className="w-full py-2.5 px-3 bg-slate-800 text-white rounded-xl text-xs font-semibold border border-slate-700 focus:outline-none mb-6"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        {/* STUDY MODEL CONFIG SELECTOR */}
        <div className="mb-6 bg-slate-800/20 hover:bg-slate-800/30 border border-slate-800/40 p-4 rounded-xl transition-all">
          <label className="block text-[9px] tracking-wider text-slate-400 font-extrabold uppercase mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" /> ACTIVE GEMINI MODEL
          </label>
          <select
            value={activeModel}
            onChange={(e) => {
              const val = e.target.value;
              setActiveModel(val);
              setActiveGeminiModel(val);
            }}
            className="w-full py-2 px-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Lite/Eco)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Expert/Heavy)</option>
          </select>
          <div className="mt-2 flex flex-col gap-1 text-[9px] text-slate-500 font-medium leading-tight select-none">
            {activeModel === 'gemini-3.1-flash-lite' ? (
              <span className="text-emerald-400/90 font-bold">✓ Best for 200-300+ daily evaluations. Highly optimized.</span>
            ) : activeModel === 'gemini-3.1-pro-preview' ? (
              <span className="text-amber-400/95 font-bold">★ Highest accuracy reasoning. Powered by Gemini Pro.</span>
            ) : (
              <span>⚡ Fast interactive responses and smart tutoring.</span>
            )}
          </div>
        </div>

        {/* PROGRESS METRIC BAR */}
        <div className="mb-6 bg-slate-800/40 p-4 rounded-xl border border-slate-800/60">
          <div className="flex justify-between text-xs text-slate-400 font-bold mb-1.5">
            <span>Syllabus Progress</span>
            <span className="text-sky-400">{progressPct}%</span>
          </div>
          <div className="bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium mt-2">
            {attempted} of {total} patterns completed
          </p>
        </div>

        {/* WORKSPACE MODE TABS (Practice, Flashcards, Progress) */}
        <div className="flex flex-col gap-2 mb-6">
          <p className="text-[10px] tracking-wider text-slate-500 font-black uppercase mb-1">Room Activities</p>
          
          <button
            onClick={() => { setActiveTab('practice'); setSidebarOpen(false); }}
            className={`py-3 px-3.5 rounded-xl font-bold text-sm text-left flex items-center gap-2.5 transition-all
              ${activeTab === 'practice' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            `}
          >
            <BookOpen className="w-4 h-4" /> Active Tutor Exam
          </button>

          <button
            onClick={() => { setActiveTab('flashcard'); setSidebarOpen(false); }}
            className={`py-3 px-3.5 rounded-xl font-bold text-sm text-left flex items-center gap-2.5 transition-all
              ${activeTab === 'flashcard' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            `}
          >
            <Layers className="w-4 h-4" /> Concept Flashcards
          </button>

          <button
            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
            className={`py-3 px-3.5 rounded-xl font-bold text-sm text-left flex items-center gap-2.5 transition-all
              ${activeTab === 'dashboard' ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/10' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
            `}
          >
            <BarChart3 className="w-4 h-4" /> Stats & Review Panel
          </button>
        </div>

        {/* MINI SUMMARY ACCORDION */}
        <div className="mt-auto pt-6 border-t border-slate-800/80">
          <div className="grid grid-cols-2 gap-2 text-center text-xs font-semibold text-slate-400">
            <button onClick={() => { setReviewFilter('green'); setSidebarOpen(false); }} className="bg-slate-800/60 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
              <span className="block text-emerald-400 text-base font-black">{correct}</span>
              Correct
            </button>
            <button onClick={() => { setReviewFilter('red'); setSidebarOpen(false); }} className="bg-slate-800/60 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
              <span className="block text-rose-400 text-base font-black">{wrong}</span>
              Incorrect
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT SCREEN AREA */}
      <div className={`flex-1 flex flex-col h-full overflow-y-auto pt-16 lg:pt-0 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        
        {/* DESKTOP HEADER ACTION CONTROL ROW */}
        <div className={`hidden lg:flex h-14 border-b items-center justify-between px-8 transition-colors ${isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
          <div className={`flex items-center gap-4 text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <span>Workspace: <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{currentQuestion.text ? `Quiz Pattern #${currentQuestion.question_number}` : ""}</strong></span>
            <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`}></span>
            <span>Target: <strong className="text-sky-500 uppercase tracking-widest">{plans.find(p => p.id === planId)?.title || "AWS Exam"}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 p-1 rounded-lg ${isDark ? 'bg-slate-950/60' : 'bg-slate-100'}`}>
              <button 
                onClick={() => setActiveTab('practice')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${activeTab === 'practice' ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Quiz Active
              </button>
              <button 
                onClick={() => setActiveTab('flashcard')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${activeTab === 'flashcard' ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Flashcards
              </button>
              <button 
                onClick={() => setActiveTab('dashboard')} 
                className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors ${activeTab === 'dashboard' ? (isDark ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-800 shadow-sm') : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'}`}
              >
                Metrics Room
              </button>
            </div>

            {/* THEME SWITCH TOGGLE BUTTON */}
            <button
              type="button"
              onClick={() => setIsDark(!isDark)}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${isDark ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-amber-400' : 'border-slate-250 bg-slate-100 hover:bg-slate-200 text-indigo-600'}`}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* CONTAINER CONTENT ROUTING BY TABS */}
        <div className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 flex flex-col gap-6">

          {offlineActive && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-805 shadow-sm animate-fade-in">
              <WifiOff className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-amber-900">
                <p className="font-bold">Offline Review Mode Enabled</p>
                <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                  Working offline with loaded caches. You can browse questions, solve pattern options, examine active recall flashcards, and navigate the syllabus freely. AI evaluation and teacher chatbots are disabled until connection restores.
                </p>
              </div>
            </div>
          )}

          {/* TAB 1: PRACTICE MODE PANEL */}
          {activeMode === 'practice' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              <div className={`${thPanel} rounded-2xl p-5 md:p-8 flex flex-col gap-5`}>
                
                {/* ID & NAVIGATION */}
                <div className={`${thInnerBar} flex justify-between items-center px-4 py-2.5 rounded-xl border`}>
                  <span className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 font-extrabold text-xs tracking-wider px-2.5 py-1 rounded-full uppercase">
                    Question {currentIndex + 1} of {total}
                  </span>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(-1)}
                      disabled={currentIndex === 0}
                      className={`px-3.5 py-2 text-xs font-bold border rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Previous
                    </button>
                    <button
                      onClick={() => navigate(1)}
                      disabled={currentIndex === total - 1}
                      className={`px-3.5 py-2 text-xs font-bold border rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-900' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      Next <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* QUESTION WORDING TEXT */}
                <p className={`text-base md:text-lg font-medium leading-relaxed mt-2 select-text ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
                  {currentQuestion.text}
                </p>

                {/* OPTIONS SELECTION GRID - 100% MOBILE & ACCESSIBILITY READY */}
                <div className="flex flex-col gap-3 mt-2">
                  {Object.entries(currentQuestion.options).map(([key, val]) => {
                    const isMulti = Object.keys(currentQuestion.options).length > 4;
                    const isSelected = selectedAnswer ? selectedAnswer.split(',').map(s => s.trim()).includes(key) : false;
                    const choiceColors = isSelected 
                      ? (isDark ? 'border-sky-500 bg-sky-950/40 text-sky-200 ring-2 ring-sky-950/60' : 'border-sky-400 bg-sky-50 text-slate-900 ring-2 ring-sky-100') 
                      : (isDark ? 'border-slate-800 bg-slate-900 hover:border-slate-700 text-slate-205 hover:bg-slate-850' : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50');

                    return (
                      <button
                        key={key}
                        onClick={() => handleSelectAnswer(key)}
                        className={`w-full p-4 rounded-xl border-2 border-solid text-left transition-all duration-150 flex items-start gap-3 cursor-pointer min-h-[52px] ${choiceColors}`}
                      >
                        <span className={`w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 border border-solid ${isMulti ? 'rounded-md' : 'rounded-full'} ${isSelected ? 'bg-sky-500 border-sky-500 text-white' : (isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')}`}>
                          {key}
                        </span>
                        <span className="text-sm md:text-base font-medium leading-normal pt-0.5 select-text flex-1">
                          {val}
                        </span>
                        {isMulti && (
                          <span className="text-[10px] font-black uppercase text-sky-500 bg-sky-500/10 px-2 py-0.5 rounded ml-auto">
                            Multi-select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* ACTION TRIGGER CHECK ANSWER */}
                <button
                  onClick={handleCheckAnswer}
                  disabled={isStreaming || !selectedAnswer}
                  className={`w-full py-4 text-center rounded-xl font-extrabold text-sm md:text-base text-white border-none transition-all cursor-pointer shadow-lg mt-2
                    ${isStreaming || !selectedAnswer 
                      ? (isDark ? 'bg-slate-800 text-slate-600 shadow-none pointer-events-none' : 'bg-slate-300 text-slate-500 shadow-none pointer-events-none') 
                      : (isDark ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30' : 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/10')}
                  `}
                >
                  {isStreaming ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      AI Evaluating Choices...
                    </span>
                  ) : (
                    'Submit & Fetch AI Tutoring  (Enter)'
                  )}
                </button>
              </div>

              {/* FLOATING TEXT AI EXPLANATIONS ROOM */}
              {explanation && (
                <div className={`${thPanel} rounded-2xl p-6 md:p-8 flex flex-col gap-6 transition-all duration-300 animate-slide-up`}>
                  <div className="flex items-center gap-2 text-sky-500 font-extrabold tracking-wider text-xs border-b border-slate-100 dark:border-slate-800 pb-4">
                    <Sparkles className="w-5 h-5 animate-pulse text-sky-400" />
                    AI TUTOR CRITIQUE & GRADE
                  </div>

                  <div className="select-text">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                      {explanation}
                    </ReactMarkdown>
                  </div>

                  {/* ACTIVE TUTOR CHAT INPUT FOR CHAT BOT DIALOGUES */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                    <h4 className={`font-extrabold text-xs tracking-wider uppercase mb-3 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      <MessageSquare className="w-4 h-4 text-sky-400" /> Continuous Classroom Discussion
                    </h4>

                    <div className="flex flex-col gap-2.5">
                      {chatLog.map((msg, i) => (
                        <div
                          key={i}
                          className={`p-4 rounded-xl text-sm leading-relaxed border border-solid select-text ${
                            msg.role === 'user' 
                              ? (isDark ? 'bg-slate-950 border-slate-850 text-slate-300 ml-4 md:ml-8' : 'bg-slate-50 border-slate-200/80 text-slate-700 ml-4 md:ml-8') 
                              : (isDark ? 'bg-sky-950/20 border-sky-950/40 text-slate-200 mr-4 md:mr-8' : 'bg-sky-50/50 border-sky-100 text-slate-800 mr-4 md:mr-8')
                          }`}
                        >
                          <span className={`block text-[10px] tracking-widest font-black uppercase mb-1.5 ${msg.role === 'user' ? 'text-slate-400' : 'text-sky-500'}`}>
                            {msg.role === 'user' ? 'Student Inquiry' : 'AI Instructor'}
                          </span>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                            {msg.content || '...'}
                          </ReactMarkdown>
                        </div>
                      ))}
                    </div>

                    <div className={`flex gap-2 mt-4 p-2 rounded-xl border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100/80 border-slate-200/60'}`}>
                      <textarea
                        ref={chatInputRef}
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={handleChatKeyDown}
                        placeholder="Request direct topic advice or test-taking tips... (⌘ + Enter)"
                        rows={2}
                        className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium focus:outline-none focus:border-sky-450 resize-none font-sans ${isDark ? 'bg-slate-900 border-slate-800 text-white focus:border-sky-500' : 'bg-white border-slate-200 text-slate-800 focus:border-sky-400'}`}
                      />
                      <button
                        onClick={handleAskFollowUp}
                        disabled={isChatting || !chatInput.trim()}
                        className={`w-14 items-center justify-center rounded-lg border-none text-white font-bold text-xs tracking-wide cursor-pointer transition-colors shrink-0 flex
                          ${isChatting || !chatInput.trim() ? 'bg-slate-350 dark:bg-slate-800 text-slate-500' : 'bg-sky-500 hover:bg-sky-600'}
                        `}
                      >
                        {isChatting ? '...' : 'Ask'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FLASHCARD STUDY MODE PANEL */}
          {activeMode === 'flashcard' && (
            <div className="flex flex-col gap-6 items-center animate-fade-in">
              <div className="text-center max-w-lg mb-2">
                <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>Concept Active Recall Deck</h3>
                <p className={`text-xs leading-normal mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Read the pattern description below. Formulate your reasoning, then click to flip the card and check the optimal answer and full critique.
                </p>
              </div>

              {/* CARD CONTAINER FLIP MODULE */}
              <div 
                className="w-full max-w-xl h-[420px] cursor-pointer group focus:outline-none"
                style={{ perspective: '1000px' }}
                onClick={() => setIsFlipped(!isFlipped)}
                tabIndex={0}
                onKeyDown={(e) => { if(e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
              >
                <div 
                  className="relative w-full h-full text-center transition-transform duration-500 transform-style-3d select-none"
                  style={{ 
                    transform: isFlipped ? 'rotateY(180deg)' : 'none',
                    transformStyle: 'preserve-3d'
                  }}
                >
                  
                  {/* FRONT SIDE */}
                  <div 
                    className={`absolute inset-0 rounded-2xl border-2 border-solid p-6 md:p-8 flex flex-col justify-between ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80 shadow-md'}`}
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                      <span>FLASHCARD #{currentQuestion.question_number}</span>
                      <span className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 px-2 py-0.5 rounded uppercase tracking-wider text-[10px]">Active Recall</span>
                    </div>

                    <div className="my-auto py-4 overflow-y-auto max-h-[220px]">
                      <p className={`text-sm md:text-base font-semibold leading-relaxed text-left select-text ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {currentQuestion.text}
                      </p>
                    </div>

                    <div className="text-center font-bold text-sky-500 hover:text-sky-600 text-xs shrink-0 flex items-center justify-center gap-1 animate-pulse">
                      <span>Click card or press Space to FLIP</span> <TrendingUp className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* BACK SIDE */}
                  <div 
                    className="absolute inset-0 bg-slate-900 rounded-2xl text-white shadow-xl p-6 md:p-8 flex flex-col justify-between overflow-y-auto"
                    style={{ 
                      backfaceVisibility: 'hidden', 
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)' 
                    }}
                    onClick={(e) => e.stopPropagation()} // stop parent toggle
                  >
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 border-b border-slate-800 pb-3">
                      <span>ANSWER KEY & KEY TAKEAWAYS</span>
                      <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded uppercase tracking-widest text-[9px] font-bold">Solutions Room</span>
                    </div>

                    {/* CORRECT ANSWER SUMMARY */}
                    <div className="my-auto py-4 flex flex-col gap-3 text-left overflow-y-auto scrollbar-thin">
                      <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Target Choices Reference</p>
                      
                      {Object.entries(currentQuestion.options).map(([key, val]) => (
                        <div key={key} className="p-3 rounded-lg bg-slate-800/80 border border-slate-800 text-slate-300 text-xs leading-normal">
                          <strong className="text-sky-400 mr-1.5">{key}.</strong> {val}
                        </div>
                      ))}

                      {/* TUTOR TAKEAWAY */}
                      {explanation ? (
                        <div className="mt-4 p-4 rounded-xl bg-slate-800 border-l-4 border-sky-400 text-xs leading-relaxed select-text">
                          <strong className="text-sky-400 block mb-1">AI Explanation Note:</strong>
                          <div className="text-slate-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                              {explanation}
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleCheckAnswer(); }}
                          disabled={isStreaming || !selectedAnswer}
                          className="mt-4 w-full p-2.5 bg-sky-500 text-xs hover:bg-sky-600 rounded-lg text-white font-bold border-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Explain Concept of this Card
                        </button>
                      )}
                    </div>

                    <button 
                      onClick={() => setIsFlipped(false)}
                      className="text-center font-bold text-sky-400 hover:text-sky-300 text-xs transition-colors shrink-0 pt-3 border-t border-slate-800 flex items-center justify-center gap-1 cursor-pointer bg-none border-none bg-transparent"
                    >
                      Return to question front
                    </button>
                  </div>

                </div>
              </div>

              {/* CARD SELECTORS */}
              <div className={`flex gap-4 items-center mt-2.5 p-2.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'}`}>
                <button
                  onClick={() => navigate(-1)}
                  disabled={currentIndex === 0}
                  className={`p-2.5 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all border-none cursor-pointer ${isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-905'}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="text-xs font-extrabold uppercase tracking-widest px-4">
                  Card {currentIndex + 1} of {total}
                </span>
                <button
                  onClick={() => navigate(1)}
                  disabled={currentIndex === total - 1}
                  className={`p-2.5 rounded-xl disabled:opacity-30 disabled:pointer-events-none transition-all border-none cursor-pointer ${isDark ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-905'}`}
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: WORKSPACE PROGRESS DASHBOARD */}
          {activeMode === 'dashboard' && (
            <div className={`flex flex-col gap-6 animate-fade-in ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
              
              {/* PRIMARY VISUAL GAUGE GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* SVG CIRCULAR ACCURACIES */}
                <div className={`${thPanel} p-6 rounded-2xl text-center flex flex-col items-center justify-center gap-3`}>
                  <span className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Tackle Accuracy</span>
                  <div className="relative w-28 h-28 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="56" cy="56" r="44" stroke={isDark ? "#1e293b" : "#f1f5f9"} strokeWidth="10" fill="transparent" />
                      <circle 
                        cx="56" 
                        cy="56" 
                        r="44" 
                        stroke="url(#accGrad)" 
                        strokeWidth="10" 
                        fill="transparent" 
                        strokeDasharray={276.4}
                        strokeDashoffset={276.4 - (276.4 * accuracyPct) / 100}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                      <defs>
                        <linearGradient id="accGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#38bdf8" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute flex flex-col leading-none">
                      <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{accuracyPct}%</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Of attempted question patterns</p>
                </div>

                {/* ATTEMPT RATIOS */}
                <div className={`${thPanel} p-6 rounded-2xl flex flex-col justify-between gap-4`}>
                  <div>
                    <span className="font-extrabold text-xs text-slate-400 uppercase tracking-wider block mb-2">Pacing Log</span>
                    <div className="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <span className="text-xs text-slate-500 font-medium">Correct solutions</span>
                      <span className="text-base font-extrabold text-emerald-500">{correct}</span>
                    </div>
                    <div className="flex justify-between items-baseline border-b border-slate-100 dark:border-slate-800 py-2.5">
                      <span className="text-xs text-slate-500 font-medium">Wrong attempts</span>
                      <span className="text-base font-extrabold text-rose-500">{wrong}</span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2.5">
                      <span className="text-xs text-slate-500 font-medium">Unattempted bank</span>
                      <span className="text-base font-extrabold text-slate-400">{total - attempted}</span>
                    </div>
                  </div>
                </div>

                {/* ACTIVE RECOMMENDATIONS BOX */}
                <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-sky-400 tracking-widest block mb-1">AI Recommendation</span>
                    <h4 className="text-sm font-bold text-white mb-2 leading-snug">Personalized Revision Focus</h4>
                    <p className="text-xs text-slate-300 leading-normal font-medium">
                      {wrong > 0 
                        ? `You currently have ${wrong} incorrect question targets. We highly recommend reviewing them with follow-up chats before submitting more tests.`
                        : "Outstanding work! All of your attempts are 100% correct. Select any unattempted questions from the list below to build your streak!"
                      }
                    </p>
                  </div>

                  {wrong > 0 && (
                    <button 
                      onClick={() => setReviewFilter('red')}
                      className="py-2 text-center bg-rose-500 hover:bg-rose-600 rounded-lg text-white font-extrabold text-xs transition-all border-none cursor-pointer"
                    >
                      Audit {wrong} Errors Now
                    </button>
                  )}
                </div>

              </div>

              {/* LIST DIRECTORIES INTEGRATION INSIDE DASHBOARD (ACTIVE RECALL LISTS) */}
              <div className={`${thPanel} p-6 rounded-2xl flex flex-col gap-4`}>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className={`font-extrabold text-sm tracking-wider uppercase flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    <ListFilter className="w-4 h-4 text-sky-400" /> Syllabus Question Hub
                  </h3>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded leading-none ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                    Select list item to jump to quiz
                  </span>
                </div>

                <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                  {progress.map((item, idx) => {
                    const qDetails = questions[idx];
                    if(!qDetails) return null;

                    const statusLabelsProps = {
                      green: { text: "Optimal", textClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40", dot: "bg-emerald-400" },
                      red: { text: "Error Out", textClass: "text-rose-500 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40", dot: "bg-rose-400" },
                      gray: { text: "Unsolved", textClass: "text-slate-400 bg-slate-50 dark:bg-slate-950/20 border-slate-200/60 dark:border-slate-850", dot: "bg-slate-300" },
                    };

                    const sl = statusLabelsProps[item.status] || statusLabelsProps.gray;

                    return (
                      <div 
                        key={item.question_id}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setActiveTab('practice');
                        }}
                        className={`p-3 border rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${isDark ? 'border-slate-850 hover:border-sky-500 hover:bg-slate-900/50' : 'border-slate-100 hover:border-sky-300 hover:bg-slate-50/50'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-6 h-6 rounded-lg font-extrabold text-xs flex items-center justify-center shrink-0 ${isDark ? 'bg-sky-950/40 text-sky-400' : 'bg-sky-50 text-sky-600'}`}>
                            {idx + 1}
                          </span>
                          <p className={`text-xs font-medium truncate min-w-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {qDetails.text}
                          </p>
                        </div>

                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border border-solid flex items-center gap-1 uppercase shrink-0 ${sl.textClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${sl.dot}`}></span>
                          {sl.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* DESKTOP EXCLUSIVE RIGHT RAIL DIRECTORY SHEET */}
      <div className={`
        fixed inset-y-0 right-0 w-[280px] p-6 flex flex-col z-50 overflow-y-auto transition-transform duration-300 lg:relative lg:translate-x-0 shrink-0
        ${isDark ? 'bg-slate-900 border-l border-slate-850 text-white' : 'bg-white border-l border-slate-200 text-slate-800'}
        ${directoryOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-extrabold text-sm tracking-wider uppercase">Exam Navigation</h3>
          <button onClick={() => setDirectoryOpen(false)} className={`lg:hidden p-1 rounded-lg ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4">
          {Array.from({ length: Math.ceil(progress.length / 50) }).map((_, batchIdx) => (
            <details key={batchIdx} className={`group border rounded-xl overflow-hidden ${isDark ? 'border-slate-800' : 'border-slate-200/50'}`} open={batchIdx === 0}>
              <summary className={`cursor-pointer font-bold text-xs p-3 transition-colors flex justify-between items-center border-b select-none ${isDark ? 'text-slate-400 border-slate-800 hover:bg-slate-950/80' : 'text-slate-500 border-slate-100 hover:bg-slate-50/80'}`}>
                <span>Quiz Q {batchIdx * 50 + 1} – {Math.min((batchIdx + 1) * 50, progress.length)}</span>
                <span className={`w-4 h-4 rounded text-[10px] text-center font-bold items-center justify-center hidden lg:flex shrink-0 ${isDark ? 'bg-slate-950 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  {progress.slice(batchIdx * 50, (batchIdx + 1) * 50).length}
                </span>
              </summary>
              <div className={`p-3 flex flex-wrap gap-1.5 ${isDark ? 'bg-slate-950/30' : 'bg-slate-50/20'}`}>
                {progress.slice(batchIdx * 50, (batchIdx + 1) * 50).map((item, idx) => {
                  const globalIdx = batchIdx * 50 + idx;
                  const isActive = currentIndex === globalIdx;

                  const colors = isDark ? {
                    green: { border: 'border-emerald-900/60', bg: 'bg-emerald-950/30 hover:bg-emerald-900/45', text: 'text-emerald-400' },
                    red: { border: 'border-rose-900/60', bg: 'bg-rose-950/30 hover:bg-rose-900/45', text: 'text-rose-400' },
                    gray: { border: 'border-slate-800', bg: 'bg-slate-950 hover:bg-slate-850', text: 'text-slate-400' },
                  } : {
                    green: { border: 'border-emerald-200', bg: 'bg-emerald-50 hover:bg-emerald-100/50', text: 'text-emerald-700' },
                    red: { border: 'border-rose-200', bg: 'bg-rose-50 hover:bg-rose-100/50', text: 'text-rose-700' },
                    gray: { border: 'border-slate-200', bg: 'bg-white hover:bg-slate-50', text: 'text-slate-700' },
                  };

                  const sc = isActive 
                    ? (isDark ? { border: 'border-slate-850', bg: 'bg-sky-600', text: 'text-white' } : { border: 'border-slate-800', bg: 'bg-slate-800', text: 'text-white' })
                    : colors[item.status] || colors.gray;

                  return (
                    <button
                      key={item.question_id}
                      onClick={() => {
                        setCurrentIndex(globalIdx);
                        setDirectoryOpen(false);
                      }}
                      className={`w-9 h-9 text-xs font-bold rounded-lg border border-solid transition-all cursor-pointer flex items-center justify-center shadow-sm shrink-0 ${sc.border} ${sc.bg} ${sc.text}`}
                      title={`Q ${item.question_number} — ${item.status}`}
                    >
                      {item.question_number}
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* FILTER Popups */}
      {reviewFilter && (
        <ReviewModal
          questions={questions}
          progress={progress}
          filter={reviewFilter}
          onClose={() => setReviewFilter(null)}
          onNavigate={(idx) => setCurrentIndex(idx)}
        />
      )}

    </div>
  );
}
