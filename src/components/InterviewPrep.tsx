import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Briefcase, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  X, 
  StickyNote, 
  BookOpen, 
  HelpCircle, 
  Trophy, 
  TrendingUp, 
  RefreshCw, 
  FileText, 
  Layout, 
  MessageSquare, 
  ChevronRight,
  Database,
  Info,
  ChevronLeft,
  GraduationCap,
  Sun,
  Moon,
  MessageCircle,
  User,
  FileUp,
  UploadCloud,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronDown,
  ChevronUp,
  Menu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { InterviewPlan, InterviewTopicDetails, InterviewQuizScore, ChatMessage } from '../types';
import { getOrCreateDeviceId, getActiveGeminiModel } from '../offlineCache';

interface InterviewPrepProps {
  onBackToHome: () => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
}

export default function InterviewPrep({ onBackToHome, isDark, setIsDark }: InterviewPrepProps) {
  // Metadata states
  const [deviceId] = useState<string>(getOrCreateDeviceId());
  const [plans, setPlans] = useState<InterviewPlan[]>([]);
  const [activePlan, setActivePlan] = useState<InterviewPlan | null>(null);

  // Target active screen page
  const [interviewScreen, setInterviewScreen] = useState<'plan' | 'bento' | 'topic'>('plan');
  
  // New Interactive Multi-Step Setup Wizard states
  const [setupStep, setSetupStep] = useState<1 | 2 | 3 | 4>(1);
  const [resumeText, setResumeText] = useState('');
  const [isSuggestingRoles, setIsSuggestingRoles] = useState(false);
  const [suggestedRoles, setSuggestedRoles] = useState<Array<{
    roleName: string;
    experienceTier: string;
    fitReasoning: string;
    keySkillsHighlight: string[];
  }>>([]);
  const [targetKeywords, setTargetKeywords] = useState('Google GenAI SDK, Vector Search, LLM Fine-Tuning, Pandas Pipelines');
  const [draftTopics, setDraftTopics] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [isDraftLoading, setIsDraftLoading] = useState(false);
  const [successPlanId, setSuccessPlanId] = useState<string | null>(null);

  // Creation form states
  const [targetRole, setTargetRole] = useState('Generative AI Engineer');
  const [experienceLevel, setExperienceLevel] = useState('Senior');
  const [profileBackground, setProfileBackground] = useState('');
  const [customPlanText, setCustomPlanText] = useState('');
  
  // Custom plan source modes
  const [planSource, setPlanSource] = useState<'ai_chat' | 'paste_or_upload'>('ai_chat');
  const [pastedPlanText, setPastedPlanText] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  
  // UI states
  const [navTab, setNavTab] = useState<'build' | 'plans'>('build');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConsulting, setIsConsulting] = useState(false);
  const [chatMessageInput, setChatMessageInput] = useState('');
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  
  // Selected visual topic details
  const [selectedTopic, setSelectedTopic] = useState<InterviewTopicDetails | null>(null);
  const [topicNotes, setTopicNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [topicTab, setTopicTab] = useState<'chat' | 'notes' | 'quiz'>('chat');
  
  // Topic-specific Chat states
  const [topicChatInput, setTopicChatInput] = useState('');
  const [isTopicChatting, setIsTopicChatting] = useState(false);

  // Progressive saved Topic-Quiz state
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]); 
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<string | null>(null);
  const [isQuizAnswerSubmitted, setIsQuizAnswerSubmitted] = useState(false);
  const [quizScoreCounter, setQuizScoreCounter] = useState(0);
  const [scoreHistory, setScoreHistory] = useState<InterviewQuizScore[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [companionWide, setCompanionWide] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [isExpandingTopic, setIsExpandingTopic] = useState(false);
  const [expandInstructions, setExpandInstructions] = useState('');

  // Refs for Chat scrolls
  const chatEndRef = useRef<HTMLDivElement>(null);
  const topicChatEndRef = useRef<HTMLDivElement>(null);

  // Sync theme to local storage
  useEffect(() => {
    localStorage.setItem('interview_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  // Load plans on mount
  useEffect(() => {
    fetchInterviewPlans();
  }, [deviceId]);

  // Scroll controls
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
    topicChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedTopic?.chatHistory, isTopicChatting]);

  useEffect(() => {
    if (activePlan && activePlan.topics && activePlan.topics.length > 0 && !selectedTopic) {
      const firstTopic = activePlan.topics[0];
      setSelectedTopic(firstTopic);
      setTopicNotes(firstTopic.notes || '');
      setQuizQuestions(firstTopic.quizQuestions || []);
      setCurrentQuizIndex(firstTopic.quizCurrentIndex || 0);
      setSelectedQuizAnswer(firstTopic.quizSelectedAnswer !== undefined ? firstTopic.quizSelectedAnswer : null);
      setIsQuizAnswerSubmitted(!!firstTopic.quizIsAnswerSubmitted);
      setQuizScoreCounter(firstTopic.quizScoreCounter || 0);
      setShowQuizResult(!!firstTopic.quizCompleted);
      setTopicTab('chat');
    }
  }, [activePlan, selectedTopic]);

  // Color schemas defined contextually
  const thBg = isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-850';
  const thNavbar = isDark ? 'bg-slate-900 border-b border-slate-800 text-white' : 'bg-white border-b border-slate-200 text-slate-900 shadow-sm';
  const thPanel = isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200 shadow-sm';
  const thCard = isDark ? 'bg-slate-950 border border-slate-850' : 'bg-slate-100 border border-slate-200';
  const thInput = isDark ? 'bg-slate-950 border border-slate-800 text-slate-250 focus:border-sky-500' : 'bg-stone-50 border border-slate-350 text-slate-800 focus:border-blue-500';
  const thTextMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const thHeading = isDark ? 'text-white' : 'text-slate-900';
  const thSubHeading = isDark ? 'text-slate-300' : 'text-slate-700';

  const fetchInterviewPlans = async () => {
    try {
      const res = await fetch('/api/interview/plans', {
        headers: { 'x-device-id': deviceId }
      });
      if (res.ok) {
        const list = await res.json();
        setPlans(list);
        if (list.length > 0 && !activePlan) {
          // Select latest plan by default
          const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setActivePlan(sorted[0]);
          setChatLog(sorted[0].chat_history || []);
          setScoreHistory(sorted[0].scores || []);
        }
      }
    } catch (err) {
      console.error('Failed to load interview plans:', err);
    }
  };

  const handleCreateNewSyllabus = () => {
    setActivePlan(null);
    setChatLog([]);
    setScoreHistory([]);
    setCustomPlanText('');
    setSelectedTopic(null);
    setQuizQuestions([]);
    setNavTab('build');
    setInterviewScreen('plan');
    setSetupStep(1);
    setResumeText('');
    setSuggestedRoles([]);
    setTargetRole('Generative AI Engineer');
    setExperienceLevel('Senior');
    setTargetKeywords('Google GenAI SDK, Vector Search, LLM Fine-Tuning, Pandas Pipelines');
    setProfileBackground('');
    setDraftTopics([]);
    setSuccessPlanId(null);
  };

  const handleSuggestRoles = async (manualBioText?: string) => {
    const textToAnalyze = manualBioText || resumeText || profileBackground;
    if (!textToAnalyze.trim()) {
      alert("Please provide some background context, bio, or upload/paste a resume first so the Coach can suggest targeted positions.");
      return;
    }
    setIsSuggestingRoles(true);
    try {
      const res = await fetch('/api/interview/suggest-roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({ resume_text: textToAnalyze })
      });
      if (res.ok) {
        const roles = await res.json();
        setSuggestedRoles(roles);
        setSetupStep(2); // Jump to step 2 selection screen
      } else {
        throw new Error('Failure contacting recruiter suggestion system');
      }
    } catch (err: any) {
      console.error(err);
      // Fallback templates as requested to ensure zero down-time
      setSuggestedRoles([
        {
          roleName: "Generative AI Engineer",
          experienceTier: "Senior",
          fitReasoning: "Excellent fit for developing modern RAG architectures, prompt templates, agentic tool workflows, and semantic search configurations.",
          keySkillsHighlight: ["Google @google/genai SDK", "Semantic Vector Indexes", "LangChain/LlamaIndex", "Context Window Management"]
        },
        {
          roleName: "Lead Data Scientist",
          experienceTier: "Lead",
          fitReasoning: "Strong match for statistical validation, predictive models, pipeline architecture, and pandas analysis dashboards.",
          keySkillsHighlight: ["Pandas & NumPy Pipelines", "Scikit-Learn Classifiers", "Deep Learning Architectures", "Statistical Hypothesis Testing"]
        },
        {
          roleName: "AI Solutions Architect",
          experienceTier: "Principal",
          fitReasoning: "Perfect for production scaling of multi-modal AI models, failover model orchestration, prompt safety guardrails, and caching strategies.",
          keySkillsHighlight: ["Enterprise RAG Patterns", "Model Safety/Guardrails", "Token Cost Optimization", "Hybrid Semantic Caching"]
        }
      ]);
      setSetupStep(2);
    } finally {
      setIsSuggestingRoles(false);
    }
  };

  const handleSavePlanToDb = async (updatedPlan: InterviewPlan) => {
    try {
      const res = await fetch('/api/interview/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify(updatedPlan)
      });
      if (res.ok) {
        const saved = await res.json();
        setPlans(prev => prev.map(p => p.id === saved.id ? saved : p));
        setActivePlan(saved);
      }
    } catch (err) {
      console.error('Failed to save plan to database:', err);
    }
  };

  const handleTriggerConsultWithMessage = async (suggestMsg: string, roleInput: string, levelInput: string) => {
    setIsConsulting(true);
    const updatedLog: ChatMessage[] = [...chatLog, { role: 'user', content: suggestMsg }];
    setChatLog(updatedLog);

    try {
      const res = await fetch('/api/interview/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          chat_history: chatLog,
          user_message: suggestMsg,
          role: roleInput,
          experience_level: levelInput
        })
      });

      if (!res.ok) throw new Error('Streaming connection failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      setChatLog(prev => [...prev, { role: 'ai', content: '' }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                aiResponseText += data.text;
                setChatLog(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'ai') {
                    last.content = aiResponseText;
                  }
                  return copy;
                });
              }
            } catch {}
          }
        }
      }

      if (activePlan) {
        const finalPlan: InterviewPlan = {
          ...activePlan,
          chat_history: [...updatedLog, { role: 'ai' as const, content: aiResponseText }]
        };
        await handleSavePlanToDb(finalPlan);
      }

    } catch (err: any) {
      console.error('Chat consult failed:', err);
      setChatLog(prev => [...prev, { role: 'ai', content: `Sorry, there was an issue contacting the virtual coach: ${err.message || err}` }]);
    } finally {
      setIsConsulting(false);
    }
  };

  const handleApplySuggestion = async (sug: { role: string; level: string; desc: string; extra: string }) => {
    setTargetRole(sug.role);
    setExperienceLevel(sug.level);
    setCustomPlanText(sug.extra);
    
    const msg = `Let's craft a structured roadmap for a ${sug.level} tier ${sug.role} role. Focus primarily on: ${sug.extra}`;
    await handleTriggerConsultWithMessage(msg, sug.role, sug.level);
  };

  // Conversational consultant handle
  const handleConsultChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessageInput.trim() || isConsulting) return;

    const userMsg = chatMessageInput.trim();
    setChatMessageInput('');
    setIsConsulting(true);

    const updatedLog: ChatMessage[] = [...chatLog, { role: 'user', content: userMsg }];
    setChatLog(updatedLog);

    try {
      const res = await fetch('/api/interview/consult', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          chat_history: updatedLog.slice(0, -1),
          user_message: userMsg,
          role: targetRole,
          experience_level: experienceLevel
        })
      });

      if (!res.ok) throw new Error('Streaming connection failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      setChatLog(prev => [...prev, { role: 'ai', content: '' }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                aiResponseText += data.text;
                setChatLog(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'ai') {
                    last.content = aiResponseText;
                  }
                  return copy;
                });
              }
            } catch {}
          }
        }
      }

      if (activePlan) {
        const finalPlan: InterviewPlan = {
          ...activePlan,
          chat_history: [...updatedLog, { role: 'ai' as const, content: aiResponseText }]
        };
        await handleSavePlanToDb(finalPlan);
      }

    } catch (err: any) {
      console.error('Chat consult failed:', err);
      setChatLog(prev => [...prev, { role: 'ai', content: `Sorry, there was an issue contacting the virtual coach: ${err.message || err}` }]);
    } finally {
      setIsConsulting(false);
    }
  };

  // Build / Finalize Topics Bento grid
  const handleFinalizeSyllabusSchedules = async (pastedText?: string) => {
    setIsGenerating(true);
    setSelectedTopic(null);
    setQuizQuestions([]);

    let customInstructionSet = "";
    if (pastedText) {
      customInstructionSet = `Candidate uploaded/pasted an existing study plan to import, conforming to: \n"""\n${pastedText}\n"""\n\nEnsure you parse this carefully and structure it inside the topics list. Maintain focus on Candidate Profile Details:\nRole: ${targetRole}\nExperience: ${experienceLevel}\nBackground Profile: ${profileBackground}`;
    } else {
      const chatInstructions = chatLog.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      customInstructionSet = `Candidate Profile details:\n${profileBackground}\n\nCoaching Directives & Chat history summary:\n${chatInstructions}\n\nCustom Directives: ${customPlanText}`;
    }

    try {
      const res = await fetch('/api/interview/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          role: targetRole,
          experience_level: experienceLevel,
          custom_notes: customInstructionSet
        })
      });

      if (!res.ok) throw new Error('Topic generation request failed.');

      const topics = await res.json();
      
      const newPlan: InterviewPlan = {
        id: crypto.randomUUID(),
        device_id: deviceId,
        role: targetRole,
        experience_level: experienceLevel,
        created_at: new Date().toISOString(),
        finalized: true,
        chat_history: chatLog, // Saved in backend/JSON state securely
        topics: topics,
        scores: []
      };

      await handleSavePlanToDb(newPlan);
      setSuccessPlanId(newPlan.id);
      await fetchInterviewPlans();
      
      // RESET ALL CREATION SELECTIONS & CHAT AS REQUESTED BY THE USER:
      setChatLog([]);
      setTargetRole('Generative AI Engineer');
      setExperienceLevel('Senior');
      setProfileBackground('');
      setCustomPlanText('');
      setPastedPlanText('');
      setResumeText('');
      setUploadedFileName('');
      setSuggestedRoles([]);
      setTargetKeywords('Google GenAI SDK, Vector Search, LLM Fine-Tuning, Pandas Pipelines');
      setDraftTopics([]);
      setPlanSource('ai_chat');

      // Set to step 4 (locked syllabus completion page)
      setSetupStep(4);

    } catch (err) {
      console.error('Failed to finalize interview schedule bento:', err);
      alert('Failed to generate customized syllabus. Using robust default topics mapping');
    } finally {
      setIsGenerating(false);
    }
  };

  // Edit existing study plan topics using AI
  const handleEditPlanWithAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlan || !aiEditPrompt.trim() || isEditingPlan) return;

    setIsEditingPlan(true);
    const modification = aiEditPrompt.trim();
    setAiEditPrompt('');

    try {
      const res = await fetch('/api/interview/edit-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          current_topics: activePlan.topics,
          modification_prompt: modification,
          role: activePlan.role,
          experience_level: activePlan.experience_level
        })
      });

      if (!res.ok) throw new Error('Editing plan request failed');

      const updatedTopics = await res.json();
      
      const updatedPlan: InterviewPlan = {
        ...activePlan,
        topics: updatedTopics
      };

      await handleSavePlanToDb(updatedPlan);
      setActivePlan(updatedPlan);
      await fetchInterviewPlans();

      // Sync selectedTopic with newly updated topics list to prevent stale references
      if (selectedTopic) {
        const matching = updatedTopics.find((t: any) => t.id === selectedTopic.id || t.name.toLowerCase() === selectedTopic.name.toLowerCase());
        if (matching) {
          setSelectedTopic(matching);
          setTopicNotes(matching.notes || '');
          setQuizQuestions(matching.quizQuestions || []);
          setCurrentQuizIndex(matching.quizCurrentIndex || 0);
          setSelectedQuizAnswer(matching.quizSelectedAnswer !== undefined ? matching.quizSelectedAnswer : null);
          setIsQuizAnswerSubmitted(!!matching.quizIsAnswerSubmitted);
          setTopicNotes(matching.notes || '');
          setQuizScoreCounter(matching.quizScoreCounter || 0);
          setShowQuizResult(!!matching.quizCompleted);
        } else if (updatedTopics.length > 0) {
          const first = updatedTopics[0];
          setSelectedTopic(first);
          setTopicNotes(first.notes || '');
          setQuizQuestions(first.quizQuestions || []);
          setCurrentQuizIndex(first.quizCurrentIndex || 0);
          setSelectedQuizAnswer(first.quizSelectedAnswer !== undefined ? first.quizSelectedAnswer : null);
          setIsQuizAnswerSubmitted(!!first.quizIsAnswerSubmitted);
          setQuizScoreCounter(first.quizScoreCounter || 0);
          setShowQuizResult(!!first.quizCompleted);
        }
      }
      setActiveCardIndex(0);
      
      alert('Syllabus updated successfully using AI!');
    } catch (err: any) {
      console.error('Failed to edit plan with AI:', err);
      alert('Failed to modify study roadmap: ' + (err.message || err));
    } finally {
      setIsEditingPlan(false);
    }
  };

  // Save Topic Notes (Notes memory / Structured semantic memory)
  const handleSaveNotesMemory = async () => {
    if (!activePlan || !selectedTopic) return;
    setIsSavingNotes(true);

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === selectedTopic.id) {
        return { ...t, notes: topicNotes };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    setSelectedTopic(prev => prev ? { ...prev, notes: topicNotes } : null);
    setIsSavingNotes(false);
  };

  // Toggle Topic Completed State
  const handleToggleTopicCompleted = async (topicId: string) => {
    if (!activePlan) return;

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === topicId) {
        return { ...t, completed: !t.completed };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    if (selectedTopic && selectedTopic.id === topicId) {
      setSelectedTopic(prev => prev ? { ...prev, completed: !prev.completed } : null);
    }
  };

  // Toggle Card Completed State
  const handleToggleCardCompleted = async (topicId: string, cardIndex: number) => {
    if (!activePlan) return;

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === topicId) {
        const updatedCards = (t.cards || []).map((card, idx) => {
          if (idx === cardIndex) {
            return { ...card, completed: !card.completed };
          }
          return card;
        });

        // Dynamically compute topic completion: if ALL cards are completed, mark topic completed!
        const allCompleted = updatedCards.length > 0 && updatedCards.every(c => c.completed);
        return { ...t, cards: updatedCards, completed: allCompleted };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    if (selectedTopic && selectedTopic.id === topicId) {
      const updatedTopic = updatedTopics.find(t => t.id === topicId);
      if (updatedTopic) {
        setSelectedTopic(updatedTopic);
      }
    }
  };

  // Helper to safely resolve a dynamic search URL and replace template strings with valid terms
  const resolveLinkUrl = (rawUrl: string, topicName: string, cardTitle?: string): string => {
    if (!rawUrl) return '';
    if (rawUrl.includes('${') || rawUrl.includes('encodeURIComponent')) {
      const term = cardTitle ? `${topicName} - ${cardTitle}` : topicName;
      return `https://www.google.com/search?q=${encodeURIComponent(term + " technical documentation guide")}`;
    }
    return rawUrl;
  };

  // Helper: saving active quiz state to DB
  const saveQuizStateToPlan = async (
    questions: any[],
    index: number,
    ans: string | null,
    submitted: boolean,
    score: number,
    done: boolean
  ) => {
    if (!activePlan || !selectedTopic) return;
    
    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === selectedTopic.id) {
        return {
          ...t,
          quizQuestions: questions,
          quizCurrentIndex: index,
          quizSelectedAnswer: ans,
          quizIsAnswerSubmitted: submitted,
          quizScoreCounter: score,
          quizCompleted: done
        };
      }
      return t;
    });

    const updatedPlan = {
      ...activePlan,
      topics: updatedTopics
    };

    await handleSavePlanToDb(updatedPlan);
    setSelectedTopic(prev => prev ? {
      ...prev,
      quizQuestions: questions,
      quizCurrentIndex: index,
      quizSelectedAnswer: ans,
      quizIsAnswerSubmitted: submitted,
      quizScoreCounter: score,
      quizCompleted: done
    } : null);
  };

  // Quiz initiation
  const handleStartTopicQuiz = async (topic: InterviewTopicDetails) => {
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setCurrentQuizIndex(0);
    setSelectedQuizAnswer(null);
    setIsQuizAnswerSubmitted(false);
    setQuizScoreCounter(0);
    setShowQuizResult(false);

    try {
      const res = await fetch('/api/interview/generate-quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          role: activePlan?.role || targetRole,
          topic_name: topic.name
        })
      });

      if (res.ok) {
        const questions = await res.json();
        setQuizQuestions(questions);
        await saveQuizStateToPlan(questions, 0, null, false, 0, false);
      } else {
        throw new Error('Failed to fetch customized quiz questions');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching quiz.');
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleSelectQuizAnswer = (letter: string) => {
    if (isQuizAnswerSubmitted) return;
    setSelectedQuizAnswer(letter);
  };

  const handleSubmitQuizAnswer = async () => {
    if (!selectedQuizAnswer || isQuizAnswerSubmitted) return;
    
    let isCorrect = false;
    const currentQuestion = quizQuestions[currentQuizIndex];
    if (selectedQuizAnswer === currentQuestion.correct_answer) {
      isCorrect = true;
    }
    const newScore = isCorrect ? quizScoreCounter + 1 : quizScoreCounter;
    
    setIsQuizAnswerSubmitted(true);
    setQuizScoreCounter(newScore);

    await saveQuizStateToPlan(quizQuestions, currentQuizIndex, selectedQuizAnswer, true, newScore, false);
  };

  const handleNextQuizQuestion = async () => {
    if (currentQuizIndex < quizQuestions.length - 1) {
      const nextIdx = currentQuizIndex + 1;
      setCurrentQuizIndex(nextIdx);
      setSelectedQuizAnswer(null);
      setIsQuizAnswerSubmitted(false);
      await saveQuizStateToPlan(quizQuestions, nextIdx, null, false, quizScoreCounter, false);
    } else {
      setShowQuizResult(true);
      await saveQuizStateToPlan(quizQuestions, currentQuizIndex, selectedQuizAnswer, true, quizScoreCounter, true);
      recordQuizScoreToMemory();
    }
  };

  const recordQuizScoreToMemory = async () => {
    if (!activePlan || !selectedTopic) return;

    const newScore: InterviewQuizScore = {
      topic_id: selectedTopic.id,
      score: quizScoreCounter,
      total: quizQuestions.length,
      date: new Date().toISOString()
    };

    const updatedScores = [...(activePlan.scores || []), newScore];
    setScoreHistory(updatedScores);

    const updatedPlan = {
      ...activePlan,
      scores: updatedScores
    };

    await handleSavePlanToDb(updatedPlan);
  };

  const selectTopicAndResetStates = (topic: any) => {
    setSelectedTopic(topic);
    setActiveCardIndex(0);
    setTopicNotes(topic.notes || '');
    setQuizQuestions(topic.quizQuestions || []);
    setCurrentQuizIndex(topic.quizCurrentIndex || 0);
    setSelectedQuizAnswer(topic.quizSelectedAnswer !== undefined ? topic.quizSelectedAnswer : null);
    setIsQuizAnswerSubmitted(!!topic.quizIsAnswerSubmitted);
    setQuizScoreCounter(topic.quizScoreCounter || 0);
    setShowQuizResult(!!topic.quizCompleted);
    setTopicChatInput('');
    setTopicTab('chat');
    setLeftDrawerOpen(false);
    setRightDrawerOpen(false);
  };

  const handleSelectPlan = (plan: InterviewPlan) => {
    setActivePlan(plan);
    setChatLog(plan.chat_history || []);
    setScoreHistory(plan.scores || []);
    setQuizQuestions([]);
    setNavTab('plans');
    setInterviewScreen('bento');
    if (plan.topics && plan.topics.length > 0) {
      selectTopicAndResetStates(plan.topics[0]);
    } else {
      setSelectedTopic(null);
    }
  };

  // Conversational Topic Coach Stream handles
  const handleTopicChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicChatInput.trim() || isTopicChatting || !activePlan || !selectedTopic) return;

    const userMsg = topicChatInput.trim();
    setTopicChatInput('');
    setIsTopicChatting(true);

    const currentHistory = selectedTopic.chatHistory || [];
    const updatedHistory = [...currentHistory, { role: 'user' as const, content: userMsg }];

    // Temporarily update UI chat history so the user sees their query instantly
    const updatedSelectedTopic = {
      ...selectedTopic,
      chatHistory: updatedHistory
    };
    setSelectedTopic(updatedSelectedTopic);

    const updatedTopics = activePlan.topics.map(t => {
      if (t.id === selectedTopic.id) {
        return updatedSelectedTopic;
      }
      return t;
    });
    const tempPlan = { ...activePlan, topics: updatedTopics };
    setActivePlan(tempPlan);

    try {
      const res = await fetch('/api/interview/topic-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-model': getActiveGeminiModel()
        },
        body: JSON.stringify({
          topic_name: selectedTopic.name,
          topic_description: selectedTopic.description,
          chat_history: currentHistory,
          user_message: userMsg
        })
      });

      if (!res.ok) throw new Error('Streaming connection failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';

      // Initialize AI bubble in history
      const withAiBubble = [...updatedHistory, { role: 'ai' as const, content: '' }];
      setSelectedTopic(prev => prev ? { ...prev, chatHistory: withAiBubble } : null);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                aiResponseText += data.text;
                setSelectedTopic(prev => {
                  if (!prev) return null;
                  const copy = [...(prev.chatHistory || [])];
                  const last = copy[copy.length - 1];
                  if (last && last.role === 'ai') {
                    last.content = aiResponseText;
                  }
                  return { ...prev, chatHistory: copy };
                });
              }
            } catch {}
          }
        }
      }

      // Save finalized chat history to database
      const finalHistory = [...updatedHistory, { role: 'ai' as const, content: aiResponseText }];
      
      const savedTopics = activePlan.topics.map(t => {
        if (t.id === selectedTopic.id) {
          return {
            ...t,
            chatHistory: finalHistory
          };
        }
        return t;
      });

      const finalPlan = {
        ...activePlan,
        topics: savedTopics
      };

      await handleSavePlanToDb(finalPlan);
      setSelectedTopic(prev => prev ? { ...prev, chatHistory: finalHistory } : null);

    } catch (err: any) {
      console.error('Topic chat failed:', err);
      setSelectedTopic(prev => {
        if (!prev) return null;
        return {
          ...prev,
          chatHistory: [...updatedHistory, { role: 'ai' as const, content: `Error communicating with AI Tutor: ${err.message || err}` }]
        };
      });
    } finally {
      setIsTopicChatting(false);
    }
  };

  // PAGE 1: PREPARE AND CONSULT A NEW PLAN OR LOAD AN EXISTING COHERENT PLAN
  const renderPlanScreen = () => {
    // 3 Default starting templates in case user is in a hurry
    const baseTemplates = [
      {
        role: "Generative AI Engineer",
        level: "Senior",
        desc: "LLM fine-tuning, RAG systems, agent orchestration, and Google GenAI SDK",
        extra: "Hands-on expertise in @google/genai, semantic searching, vector databases (Pinecone/Chroma), token rate management, and agentic workflows.",
        keywords: "Google GenAI SDK, Vector Search, LLM Fine-Tuning, Pandas Pipelines"
      },
      {
        role: "Lead Data Scientist",
        level: "Lead",
        desc: "Statistical modeling, pandas data pipelines, predictive ML, and scikit-learn",
        extra: "Advanced machine learning pipelines, scikit-learn classifiers, deep neural net hyperparameter tuning, and high-fidelity statistical validation.",
        keywords: "Pandas & NumPy Pipelines, Scikit-Learn Classifiers, Deep Learning Architectures, Statistical Hypothesis Testing"
      },
      {
        role: "AI Solutions Architect",
        level: "Principal",
        desc: "Enterprise RAG architectures, model selection, scaling inference, and guardrails",
        extra: "Integrating multi-modal LLM providers, designing fallback strategies, safety filtering, cost-optimization, and offline semantic caches.",
        keywords: "Enterprise RAG, Model Selection, Inference Optimization, Guardrails & Safety Filters"
      }
    ];

    const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setResumeText(text);
          setProfileBackground(text.substring(0, 300) + "...");
          // Trigger recruiter recommendation instantly
          handleSuggestRoles(text);
        }
      };
      reader.readAsText(file);
    };

    return (
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 py-8 sm:py-12 flex flex-col gap-8">
        
        {/* PROGRESSIVE STEPS TRACKER BAR */}
        <div className={`p-5 rounded-2xl ${thPanel} flex flex-col sm:flex-row items-center justify-between gap-4`}>
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] bg-sky-500/10 text-sky-400 p-1 px-2.5 rounded font-black uppercase tracking-wider font-mono self-start">
              Roadmap Architect
            </span>
            <h2 className={`text-base font-black uppercase tracking-tight mt-1 ${thHeading}`}>
              Configure Career Roadmap Syllabus
            </h2>
          </div>

          {/* Stepper bubbles */}
          <div className="flex items-center gap-2 sm:gap-4 font-mono text-[10px] font-black uppercase">
            <div className={`flex items-center gap-1.5 transition-all ${setupStep === 1 ? 'text-sky-450 border-b-2 border-sky-400 pb-0.5' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${setupStep === 1 ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>1</span>
              <span>Context &amp; CV</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1.5 transition-all ${setupStep === 2 ? 'text-sky-450 border-b-2 border-sky-400 pb-0.5' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${setupStep === 2 ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>2</span>
              <span>Matched Roles</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1.5 transition-all ${setupStep === 3 ? 'text-sky-450 border-b-2 border-sky-400 pb-0.5' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${setupStep === 3 ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>3</span>
              <span>Co-pilot Prep</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
            <div className={`flex items-center gap-1.5 transition-all ${setupStep === 4 ? 'text-emerald-400 border-b-2 border-emerald-400 pb-0.5' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] ${setupStep === 4 ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>4</span>
              <span>Ready</span>
            </div>
          </div>
        </div>

        {/* STEP 1 PANEL: CONTEXT PROFILE & CV INTAKE */}
        {setupStep === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className={`${thPanel} p-6 sm:p-8 rounded-3xl flex flex-col gap-4 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
                
                <div>
                  <h3 className={`text-lg font-black uppercase tracking-tight ${thHeading}`}>
                    Step 1: Introduce Your Experience or Drag Resume
                  </h3>
                  <p className={`text-xs ${thTextMuted} font-semibold mt-1 leading-relaxed`}>
                    Provide details about your developer experience, tech stacks, or outstanding goals. Or simply drag/paste your plain-text Resume (CSV/MD/TXT) to instantly trigger recruiter analysis!
                  </p>
                </div>

                {/* Resume Upload Box */}
                <div className="border-2 border-dashed border-slate-700/50 hover:border-sky-500/50 rounded-2xl p-6 text-center bg-slate-950/20 relative group transition-colors flex flex-col items-center justify-center h-44">
                  <input
                    type="file"
                    accept=".txt,.text,.md,.string"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="w-9 h-9 text-slate-500 group-hover:text-sky-400 group-hover:scale-110 transition-all duration-300" />
                  <p className={`text-xs font-black ${thHeading} mt-3`}>
                    {uploadedFileName ? `Loaded: ${uploadedFileName}` : "Drag & Drop Resume plain-text file here"}
                  </p>
                  <p className="text-[10px] text-slate-550 font-semibold mt-1">
                    Or click here to browse files on your computer (.txt, .text, .md)
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
                    Or describe your candidate profile yourself (Skills, background, experience level...)
                  </label>
                  <textarea
                    value={profileBackground}
                    onChange={(e) => setProfileBackground(e.target.value)}
                    placeholder="e.g. 3+ years of experience in Data Science and GenAI. Built multiple semantic search engines, integrated RAG pipelines with Pinecone, fine-tuned Llama models, and optimized data workflows with Pandas and NumPy."
                    className={`${thInput} focus:outline-none p-3.5 rounded-2xl text-xs font-semibold h-32 leading-relaxed resize-none`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSuggestRoles()}
                  disabled={isSuggestingRoles || (!profileBackground.trim() && !resumeText.trim())}
                  className={`py-3 px-6 rounded-xl font-mono text-[11px] uppercase tracking-wide font-black flex items-center justify-center gap-2 self-start
                    ${isSuggestingRoles 
                      ? 'bg-slate-800 text-slate-500 cursor-wait' 
                      : 'bg-sky-500 hover:bg-sky-450 text-slate-950 cursor-pointer shadow shadow-sky-500/25'
                    }
                  `}
                >
                  {isSuggestingRoles ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-455" />
                      Counselor analyzing profile...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                      Suggest Targeted Roles 🔮
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step 1 right sidebar: Load archive or pick base templates */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* STUDY ARCHIVE */}
              <div className={`${thPanel} p-5 rounded-2xl`}>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 p-0.5 px-2 rounded font-mono font-black uppercase tracking-wider">
                  Archive Repository
                </span>
                <h4 className={`text-xs font-black uppercase tracking-tight mt-2 ${thHeading}`}>
                  📂 Resume Study Track
                </h4>
                <div className="mt-3 flex flex-col gap-1.5">
                  {plans.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-950/20 text-center text-[10px] text-slate-500 italic font-semibold">
                      No cached paths found. Generate a profile to catalog archive.
                    </div>
                  ) : (
                    plans.slice(0, 4).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPlan(p)}
                        className={`w-full p-2 rounded-lg border text-left flex items-center justify-between text-[10px] font-semibold cursor-pointer hover:bg-sky-500/10 hover:text-sky-400 ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-stone-50 border-slate-200'}`}
                      >
                        <span className="truncate uppercase max-w-[70%]">{p.role}</span>
                        <span className="opacity-60 text-[8px] font-mono shrink-0">{p.experience_level}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* JUMP START TEMPLATES */}
              <div className={`${thPanel} p-5 rounded-2xl flex flex-col gap-2`}>
                <h4 className={`text-xs font-black uppercase tracking-tight ${thHeading}`}>
                  ⚡ Jump-Start Templates
                </h4>
                <p className="text-[9px] text-slate-500 font-semibold leading-tight">
                  No resume on hand? Select an executive template profile instantly:
                </p>
                <div className="flex flex-col gap-2 mt-1">
                  {baseTemplates.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setTargetRole(item.role);
                        setExperienceLevel(item.level);
                        setProfileBackground(item.extra);
                        setTargetKeywords(item.keywords || '');
                        setSetupStep(2);
                      }}
                      className={`p-2.5 rounded-xl text-left text-[10px] cursor-pointer transition-all hover:scale-102 border ${isDark ? 'bg-slate-950 border-slate-850 hover:bg-slate-900' : 'bg-stone-50 border-slate-205 hover:bg-stone-100'}`}
                    >
                      <div className="font-extrabold uppercase text-sky-450">{item.role}</div>
                      <div className="text-[8px] text-slate-500 font-mono mt-0.5">{item.level} Tier</div>
                      <div className="text-[9px] opacity-70 line-clamp-1 italic mt-1 font-semibold">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 PANEL: SUGGESTIONS CARDS & PRECISE LOCKED ROLE */}
        {setupStep === 2 && (
          <div className="flex flex-col gap-6 animate-fade-in">
            <div className={`${thPanel} p-6 rounded-3xl relative overflow-hidden flex flex-col gap-6`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight ${thHeading}`}>
                  Step 2: Review Suggested Targeted Roles
                </h3>
                <p className={`text-xs ${thTextMuted} font-semibold leading-relaxed mt-1`}>
                  Gemini Careerrecruiter simulated candidate matches from your profile credentials. Review the fit suggestions, select a matching targeted title, and customize details manually below.
                </p>
              </div>

              {/* RECOMMENDED RECRUITER TILES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {suggestedRoles.map((sug, idx) => {
                  const isSelected = targetRole === sug.roleName;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTargetRole(sug.roleName);
                        setExperienceLevel(sug.experienceTier);
                        setTargetKeywords(sug.keySkillsHighlight.join(", "));
                      }}
                      className={`p-5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer min-h-[160px] group hover:scale-[1.01]
                        ${isSelected 
                          ? 'bg-sky-500/10 border-sky-400 text-sky-450 ring-2 ring-sky-400/20' 
                          : `${isDark ? 'bg-slate-955 border-slate-850 hover:bg-slate-900 border-slate-705' : 'bg-stone-50 border-slate-200 hover:bg-stone-100'}`
                        }
                      `}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className={`text-[8px] font-mono font-black uppercase p-0.5 px-2 rounded ${isSelected ? 'bg-sky-500 text-slate-955 font-black' : 'bg-slate-800 text-slate-400'}`}>
                          Suggestion #{idx + 1}
                        </span>
                        <span className="text-[8px] opacity-75 font-mono uppercase font-black tracking-widest">{sug.experienceTier} level</span>
                      </div>

                      <h4 className={`text-sm font-black mt-2 leading-tight uppercase group-hover:text-sky-400 transition-colors ${isSelected ? 'text-sky-400' : thHeading}`}>
                        {sug.roleName}
                      </h4>

                      <p className={`text-[10px] leading-relaxed mt-2 font-semibold flex-grow mr-2 line-clamp-2 italic opacity-80 ${thTextMuted}`}>
                        "{sug.fitReasoning}"
                      </p>

                      <div className="flex flex-wrap gap-1 mt-3">
                        {sug.keySkillsHighlight.map((skill, sIdx) => (
                          <span key={sIdx} className="text-[8px] font-mono bg-slate-800/80 text-sky-300 px-1.5 py-0.5 rounded border border-slate-700/50">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* REFINEMENT BOX FOR LOCKED CRITERIA */}
              <div className="border-t border-light-dim dark:border-slate-800 pt-5 mt-2 flex flex-col gap-4">
                <h4 className={`text-xs font-black uppercase tracking-wider ${thHeading}`}>
                  ⚙️ Fine-Tune Targets Manually:
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-black uppercase text-slate-400">Locked Targeted Role Name</label>
                    <input
                      type="text"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      className={`${thInput} p-3 rounded-xl text-xs font-black uppercase tracking-wide`}
                      placeholder="Target Position Name"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-black uppercase text-slate-400">Experience Tier</label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className={`${thInput} p-3 rounded-xl text-xs font-bold cursor-pointer`}
                    >
                      <option value="Junior">Junior (0-2 YOE)</option>
                      <option value="Mid-Level">Mid-Level (2-5 YOE)</option>
                      <option value="Senior">Senior (5-8 YOE)</option>
                      <option value="Principal/Lead">Principal/Lead (8+ YOE)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono font-black uppercase text-slate-400">Key Mastery Skills &amp; Keywords</label>
                    <input
                      type="text"
                      value={targetKeywords}
                      onChange={(e) => setTargetKeywords(e.target.value)}
                      className={`${thInput} p-3 rounded-xl text-xs font-bold`}
                      placeholder="e.g. React 19, TypeScript, Express, Vitest"
                    />
                  </div>
                </div>
              </div>

              {/* NAVIGATION CONTROLS */}
              <div className="flex items-center gap-3 mt-2 pr-2">
                <button
                  type="button"
                  onClick={() => setSetupStep(1)}
                  className="p-3 px-6 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-mono uppercase font-black rounded-lg cursor-pointer"
                >
                  ← Back to Step 1
                </button>
                <button
                  type="button"
                  onClick={() => setSetupStep(3)}
                  className="p-3 px-6 bg-sky-500 hover:bg-sky-450 text-slate-950 text-xs font-mono uppercase font-black rounded-lg cursor-pointer ml-auto flex items-center gap-1.5"
                >
                  Continue to Step 3 ➜
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 PANEL: COPILOT FORMULATION & PRE-DRAFT OPTIMIZATION */}
        {setupStep === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            
            {/* LEFT 7 PANELS: CONSTRUCT STREAMING ROADMAP */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* SUB ROUTING TABS FOR SETUP SOURCE */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPlanSource('ai_chat')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2 border leading-none ${
                    planSource === 'ai_chat'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-sky-455" />
                  Chat with Coach Companion to Outline
                </button>
                <button
                  type="button"
                  onClick={() => setPlanSource('paste_or_upload')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2 border leading-none ${
                    planSource === 'paste_or_upload'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-400'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-slate-350'
                  }`}
                >
                  <FileUp className="w-4 h-4 text-sky-455" />
                  Upload Preplanned custom syllabus
                </button>
              </div>

              {planSource === 'ai_chat' ? (
                /* CHAT CONTAINER WITH DYNAMIC HEIGHT RESIZING */
                <div 
                  className={`p-6 rounded-3xl flex flex-col gap-4 relative overflow-hidden transition-all duration-300 shadow-xl ${thPanel}
                    ${chatLog.length > 3 ? 'min-h-[580px]' : 'min-h-[460px]'}
                  `}
                >
                  <div>
                    <h4 className={`text-sm font-black flex items-center gap-1.5 tracking-tight ${thHeading}`}>
                      <Sparkles className="w-4 h-4 text-sky-450 animate-pulse" /> Finalize Outline Conversationally
                    </h4>
                    <p className={`text-[10px] leading-snug mt-0.5 ${thTextMuted} font-semibold`}>
                      Your chatbot acts as a path builder. Tell it your career story or any special modules you want involved, so we lock in outstanding topics.
                    </p>
                  </div>

                  {/* ACTIVE SCROLL WORKSPACE */}
                  <div className={`flex-grow border rounded-xl p-4 overflow-y-auto flex flex-col gap-3 leading-relaxed text-xs h-[280px] ${isDark ? 'bg-slate-950/70 border-slate-850' : 'bg-slate-100 border-slate-205'}`}>
                    {chatLog.length === 0 ? (
                      <div className="text-center my-auto p-4 flex flex-col items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-sky-500/10 flex items-center justify-center font-bold text-sky-455 text-xs">AI</div>
                        <p className="font-extrabold text-xs text-sky-450 tracking-wider">CAREER PATH ARCHITECT</p>
                        <p className="text-[11px] text-slate-500 italic max-w-sm mt-0.5 font-semibold leading-relaxed">
                          "I am ready! I have your matches for <strong>{targetRole}</strong> of <strong>{experienceLevel}</strong> skill tier. Write below if you have specific frameworks, microservices, database schemas, or STAR resolution techniques you want covered first."
                        </p>
                      </div>
                    ) : (
                      chatLog.map((chat, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl max-w-[85%] font-medium ${
                            chat.role === 'user'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-400/20 self-end'
                              : `${isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-800 shadow-sm'} self-start`
                          }`}
                        >
                          <span className="text-[8px] font-mono leading-none block opacity-50 mb-1 font-black">
                            {chat.role === 'user' ? 'STUDENT SPEC' : 'COACH ARCHITECT'}
                          </span>
                          <div className="markdown-body">
                            <ReactMarkdown>{chat.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                    {isConsulting && (
                      <div className="self-start p-2 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-sky-400 font-extrabold flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Stream compiling roadmap notes...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* FORM TRIGGER */}
                  <form onSubmit={handleConsultChat} className="flex gap-2 leading-none mt-auto">
                    <input
                      type="text"
                      value={chatMessageInput}
                      onChange={(e) => setChatMessageInput(e.target.value)}
                      placeholder={`e.g. Focus on STAR behavioral answers for ${targetRole} and ${targetKeywords.split(',')[0] || 'GenAI'} optimizations...`}
                      className={`flex-grow p-3 rounded-xl text-xs font-semibold focus:outline-none ${thInput}`}
                    />
                    <button
                      type="submit"
                      disabled={isConsulting || !chatMessageInput.trim()}
                      className="p-3 px-5 bg-sky-500 hover:bg-sky-450 disabled:bg-slate-850 disabled:text-slate-500 text-slate-950 font-black font-mono text-xs uppercase rounded-xl border-none cursor-pointer tracking-wider"
                    >
                      Consult
                    </button>
                  </form>
                </div>
              ) : (
                /* PASTE STATIC SYLLABUS DIRECTLY */
                <div className={`${thPanel} p-6 rounded-3xl h-[460px] flex flex-col gap-4 relative overflow-hidden`}>
                  <div>
                    <h4 className={`text-sm font-black flex items-center gap-1.5 tracking-tight ${thHeading}`}>
                      <FileUp className="w-4 h-4 text-sky-450" /> Import Static Structured Plan
                    </h4>
                    <p className={`text-[10px] leading-snug mt-0.5 ${thTextMuted} font-semibold`}>
                      Paste preplanned checklists, text syllabi, or timelines below. The AI will parse details and draft study cards automatically.
                    </p>
                  </div>

                  <textarea
                    value={pastedPlanText}
                    onChange={(e) => setPastedPlanText(e.target.value)}
                    placeholder="Paste core learning checklist notes, curriculum parameters or course descriptions here..."
                    className={`flex-grow p-3.5 focus:outline-none text-xs font-semibold leading-relaxed rounded-2xl resize-none ${thInput}`}
                  />
                </div>
              )}
            </div>

            {/* RIGHT 5 PANELS: DRAFT OPTIMIZATION & FINALIZE LOCK */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              
              {/* SPECIAL OPTIMIZER DRAWER */}
              <div className={`${thPanel} p-6 rounded-3xl relative overflow-hidden flex flex-col gap-4`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
                
                <div>
                  <span className="text-[10px] bg-sky-500/10 text-sky-400 p-0.5 px-2 rounded font-mono font-black uppercase tracking-wider">
                    Execution Stage
                  </span>
                  <h4 className={`text-base font-black uppercase mt-2 ${thHeading}`}>
                    Review &amp; Lock Syllabus
                  </h4>
                  <p className={`text-[11px] ${thTextMuted} leading-relaxed font-semibold mt-1`}>
                    This locks in a comprehensive checklist of <strong>curated key topics</strong> tailored specifically to your input configuration structure.
                  </p>
                </div>

                {/* Additional custom specifications input */}
                <div className="flex flex-col gap-1 border-t border-light-dim dark:border-slate-800 pt-3">
                  <label className="text-[8px] font-black uppercase text-slate-550 font-mono">Custom study limitations / Notes</label>
                  <textarea
                    value={customPlanText}
                    onChange={(e) => setCustomPlanText(e.target.value)}
                    placeholder={`e.g. Focus on ${targetKeywords.split(',').slice(0, 2).join(' and ') || 'GenAI'} concepts primarily. Optimize for ${targetRole} tier questions.`}
                    className={`p-2.5 focus:outline-none text-xs font-semibold rounded-xl leading-relaxed resize-none h-20 ${thInput}`}
                  />
                </div>

                {/* DRAFT TOPICS COMPILATION STATUS */}
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 text-[10px] text-slate-400 font-semibold leading-relaxed">
                  📘 Profile Scope Summary:<br />
                  <span className="text-sky-300 uppercase font-bold">{targetRole} ({experienceLevel})</span><br />
                  <span>Configured Skills: {targetKeywords || "General Recruiters Target Standard"}</span>
                </div>

                {/* COMPILE INITIATOR BTN */}
                <button
                  type="button"
                  onClick={() => {
                    if (planSource === 'paste_or_upload' && !pastedPlanText.trim()) {
                      alert('Please paste some study plan checklist to compile.');
                      return;
                    }
                    handleFinalizeSyllabusSchedules(planSource === 'paste_or_upload' ? pastedPlanText : undefined);
                  }}
                  disabled={isGenerating}
                  className={`w-full py-4 text-xs font-mono font-black uppercase tracking-widest rounded-xl transition-all border-none flex items-center justify-center gap-2 shadow-lg
                    ${isGenerating 
                      ? 'bg-slate-800 text-slate-500 font-bold cursor-wait' 
                      : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:sky-450 text-slate-950 shadow-sky-500/25'
                    }
                  `}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400" />
                      GENERATING 8-15 TOPICS ROADMAP...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      Compile Premium Study Syllabus 🚀
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setSetupStep(2)}
                  className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-350 text-[10px] font-mono font-black uppercase rounded-lg cursor-pointer text-center border-none"
                >
                  ← Back to Step 2
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 PANEL: FINAL SUCCESS CONFIRMATION & RESET */}
        {setupStep === 4 && (
          <div className="max-w-xl mx-auto w-full animate-fade-in py-8">
            <div className={`p-8 rounded-3xl ${thPanel} flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden border-2 border-sky-400/35`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/40 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 p-0.5 px-3 rounded uppercase font-black tracking-widest self-center mb-1">
                  Compilation Lock ✓
                </span>
                <h3 className={`text-xl font-black uppercase tracking-tight ${thHeading}`}>
                  Syllabus Architect Complete!
                </h3>
                <p className={`text-xs ${thTextMuted} font-semibold leading-relaxed max-w-sm mx-auto`}>
                  We successfully parsed your candidate profile details, optimized learning requirements conversationally, formatted all sub-topics checklists, and compiled your unique <strong>modular prep chapters</strong>.
                </p>
              </div>

              {/* Memory parameters visualization */}
              <div className="w-full p-4.5 bg-slate-950/50 rounded-2xl border border-slate-850 text-left flex flex-col gap-1.5 font-sans leading-relaxed text-[11px] font-semibold text-slate-400">
                <div className="text-[10px] font-black uppercase text-slate-550 tracking-wider font-mono border-b border-slate-900 pb-1.5 mb-1 flex items-center gap-1">
                  🧠 SECURE CANDIDATE PROFILE MEMORY VAULT
                </div>
                <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded text-slate-300">
                  <span>Profile State:</span>
                  <span className="text-sky-300 font-bold">SAVED IN DB</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded text-slate-300">
                  <span>Consultation Log:</span>
                  <span className="text-sky-300 font-bold font-mono">SNAPSHOT ENCRYPTED</span>
                </div>
                <div className="flex justify-between items-center bg-slate-900/40 p-1 px-2 rounded text-slate-300">
                  <span>Form Status:</span>
                  <span className="text-emerald-400 font-mono font-bold uppercase">RESET &amp; READY FOR NEW PATH</span>
                </div>
              </div>

              {/* MAIN NAVIGATION TRIGGER */}
              <button
                type="button"
                onClick={() => {
                  if (successPlanId) {
                    const savedPlan = plans.find(p => p.id === successPlanId);
                    if (savedPlan) {
                      setActivePlan(savedPlan);
                    }
                  }
                  // Switch screens to study dashboard cockpit
                  setInterviewScreen('bento');
                }}
                className="w-full py-4 bg-gradient-to-r from-sky-400 via-sky-500 to-sky-600 hover:sky-450 text-slate-950 text-xs font-mono font-black uppercase tracking-widest rounded-xl transition-all border-none cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 active:scale-98 animate-pulse"
              >
                <BookOpen className="w-4 h-4 text-slate-950" />
                Launch Active Study Cockpit ➜
              </button>

              <button
                type="button"
                onClick={handleCreateNewSyllabus}
                className="text-[10px] font-mono font-black text-slate-500 hover:text-slate-400 uppercase tracking-wide cursor-pointer bg-transparent border-none mt-1"
              >
                Assemble another Custom Curriculum
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBentoScreen = () => {
    if (!activePlan) return null;
    const totalTopics = activePlan.topics.length;
    const progressPercent = totalTopics > 0 ? Math.round((activePlan.topics.filter(t => t.completed).length / totalTopics) * 100) : 0;

    // Fallback to active/first topic
    const currentTopic = selectedTopic || activePlan.topics[0] || null;

    // Get cards list for the active topic
    const cardsList = currentTopic ? (currentTopic.cards || []) : [];
    const currentCard = currentTopic ? (cardsList[activeCardIndex] || (cardsList[0] || { title: "Topic Summary Overview", content: currentTopic.description })) : null;

    return (
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 py-6 sm:py-8 flex flex-col gap-6 animate-fade-in pt-16 md:pt-8">
        
        {/* MOBILE MINI HEADER CONTROLS (VISIBLE ON MOBILE ONLY) */}
        <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-40 shadow-md">
          <button 
            type="button"
            onClick={() => {
              setLeftPanelCollapsed(false);
              setLeftDrawerOpen(true);
            }} 
            className="p-2 -ml-2 hover:bg-slate-800 rounded-lg text-sky-400 bg-transparent border-none cursor-pointer flex items-center justify-center"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span className="font-extrabold text-white text-xs uppercase tracking-wider font-mono">Interview Prep</span>
          </div>
          <button 
            type="button"
            onClick={() => {
              setRightPanelCollapsed(false);
              setRightDrawerOpen(true);
            }} 
            className="p-2 -mr-2 hover:bg-slate-800 rounded-lg text-sky-400 bg-transparent border-none cursor-pointer flex items-center justify-center"
          >
            <BookOpen className="w-5 h-5" />
          </button>
        </div>

        {/* SUITE STAT BAR & BACK BUTTON */}
        <div className={`${thPanel} p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 shadow-md`}>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => {
                setInterviewScreen('plan');
              }}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-350 bg-transparent border-none cursor-pointer font-bold mb-2.5 self-start group font-mono"
            >
              <ChevronLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform" />
              <span>← RETURN TO RECRUITER WIZARD</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-sky-505/10 border border-sky-505/25 text-sky-450 px-2.5 py-0.5 rounded uppercase font-black font-mono">2. Active Preparation Console</span>
              <span className={`text-[9px] ${isDark ? 'bg-slate-850 text-slate-305' : 'bg-slate-205 text-slate-705'} font-extrabold px-2 py-0.5 rounded uppercase`}>{activePlan.experience_level} Tier</span>
            </div>
            <h3 className={`text-lg sm:text-xl font-black mt-1 uppercase tracking-tight ${thHeading}`}>{activePlan.role}</h3>
            <p className={`${thTextMuted} text-xs font-semibold`}>{totalTopics} modules generated dynamically based on your profile details.</p>
          </div>

          <div className={`flex items-center gap-4 ${isDark ? 'bg-slate-950/60' : 'bg-stone-50'} p-3.5 px-5 rounded-2xl border ${isDark ? 'border-slate-850' : 'border-slate-200'} shrink-0`}>
            <div className="w-12 h-12 rounded-full border-4 border-sky-500/20 flex items-center justify-center relative bg-sky-500/5 text-xs font-black text-sky-455 font-mono shrink-0">
              {progressPercent}%
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-550 tracking-wider font-mono">Overall Progress</span>
              <span className={`text-xs font-black ${thHeading} mt-0.5 block`}>
                {activePlan.topics.filter(t => t.completed).length} of {totalTopics} Mastered
              </span>
            </div>
          </div>
        </div>

        {/* MODIFY DYNAMIC ROADMAP WITH AI COACH */}
        <div className={`${thPanel} p-5 rounded-2xl shadow-sm relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-sky-450 animate-pulse" />
            <h4 className={`text-xs font-black uppercase tracking-wider ${thHeading} font-mono`}>
              Tweak Syllabus &amp; Adapt Roadmap (Live AI Rewriting)
            </h4>
          </div>
          <p className={`text-[11px] ${thTextMuted} font-semibold leading-relaxed mb-3`}>
            Need to adjust, append, or delete competencies? Direct the AI coach (e.g. <em>"Add 2 non-technical segments covering STAR conflict dialogues"</em> or <em>"Add detailed cards for Kafka broker scaling"</em>) and the system rewrites your syllabus in-database!
          </p>
          <form onSubmit={handleEditPlanWithAI} className="flex gap-2 leading-none">
            <input
              id="ai-edit-prompt-input"
              type="text"
              value={aiEditPrompt}
              onChange={(e) => setAiEditPrompt(e.target.value)}
              placeholder={`e.g. Focus more on ${activePlan.role === 'Generative AI Engineer' ? 'LLM fine-tuning parameters' : 'Pandas pipeline optimization'} and performance tuning...`}
              disabled={isEditingPlan}
              className={`flex-grow ${thInput} focus:outline-none p-3 rounded-xl text-xs font-semibold`}
            />
            <button
              id="ai-edit-submit-btn"
              type="submit"
              disabled={isEditingPlan || !aiEditPrompt.trim()}
              className="bg-sky-505 hover:bg-sky-450 disabled:bg-slate-855 disabled:text-slate-500 text-slate-950 px-5 rounded-xl border-none cursor-pointer font-black text-xs transition-colors tracking-wide shrink-0 font-mono"
            >
              {isEditingPlan ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-955" /> REWRITING ROADMAP...
                </span>
              ) : (
                'Tweak Roadmap with AI'
              )}
            </button>
          </form>
        </div>


        {/* MOBILE DRAWER BACKDROPS */}
        {leftDrawerOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden"
            onClick={() => setLeftDrawerOpen(false)}
          />
        )}
        {rightDrawerOpen && (
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 md:hidden"
            onClick={() => setRightDrawerOpen(false)}
          />
        )}

        {/* INTEGRATED THREE PANELS COCKPIT COCOON */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start relative">
          
          {/* COLUMN 1: LEFT HAND ROADMAP LIST OF ALL TOPICS */}
          <div className={`
            fixed inset-y-0 left-0 w-[290px] z-50 p-4 overflow-y-auto transition-transform duration-300 shadow-2xl
            ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-slate-200'}
            md:static md:w-auto md:z-0 md:bg-transparent md:border-none md:p-0 md:translate-x-0 md:shadow-none
            ${leftDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
            ${leftPanelCollapsed ? 'md:col-span-1 md:max-w-16' : 'md:col-span-3'}
            flex flex-col gap-4 w-full
          `}>
            {leftPanelCollapsed ? (
              /* COLLAPSED LEFT PANEL */
              <div 
                onClick={() => setLeftPanelCollapsed(false)}
                className={`hidden md:flex ${thPanel} p-3 rounded-2xl flex flex-col items-center gap-4 min-h-[500px] cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group w-full`}
                title="Expand Syllabus Chapters"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeftPanelCollapsed(false);
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded text-sky-400 cursor-pointer transition-colors"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-500 [writing-mode:vertical-lr] select-none group-hover:text-sky-400 transition-colors">
                    SYLLABUS SECTIONS
                  </span>
                  <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full mt-2 font-mono">
                    {totalTopics}
                  </span>
                </div>
              </div>
            ) : (
              /* EXPANDED LEFT PANEL */
              <div className={`${thPanel} p-4 rounded-xl flex flex-col gap-3 lg:max-h-[750px] lg:overflow-y-auto w-full`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded uppercase font-mono font-black self-start">
                      Syllabus Tracks
                    </span>
                    <h4 className={`text-xs font-black uppercase mt-1.5 ${thHeading} font-mono`}>
                      📘 Study Sections ({totalTopics})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLeftPanelCollapsed(true);
                      setLeftDrawerOpen(false);
                    }}
                    className="p-1.5 hover:bg-slate-850 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Minimize Syllabus Panel"
                  >
                    <PanelLeftClose className="w-4 h-4 hidden md:block" />
                    <ChevronDown className="w-4 h-4 md:hidden" />
                  </button>
                </div>
                <p className={`text-[10px] ${thTextMuted} font-semibold leading-snug`}>
                  Choose any module to populate the study sandbox.
                </p>

                <div className="flex flex-col gap-2 pr-1 max-h-[500px] overflow-y-auto">
                  {activePlan.topics.map((topic, i) => {
                    const idx = i + 1;
                    const isCurSelected = currentTopic?.id === topic.id;
                    const isCompleted = topic.completed;

                    return (
                      <button
                        key={topic.id || idx}
                        type="button"
                        onClick={() => selectTopicAndResetStates(topic)}
                        className={`w-full p-4 rounded-xl border text-left transition-all relative cursor-pointer group flex flex-col justify-between min-h-[95px]
                          ${isCurSelected 
                            ? 'bg-sky-500/10 border-sky-400 text-sky-400 ring-1 ring-sky-400/20' 
                            : `${isDark ? 'bg-slate-950/70 border-slate-850 hover:bg-slate-900/60 font-sans' : 'bg-slate-50 border-slate-205 hover:bg-stone-100 shadow-xs'}`
                          }
                        `}
                      >
                        {isCurSelected && (
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                        )}
                        
                        <div className="flex justify-between items-center w-full leading-none mb-1.5 pl-1.5">
                          <span className="font-mono text-[9px] text-slate-505 group-hover:text-sky-455 font-black uppercase">
                            #{String(idx).padStart(2, '0')}
                          </span>
                          {isCompleted ? (
                            <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 p-0.5 px-1.5 rounded text-[8px] font-black uppercase leading-none font-mono">
                              Mastered ✓
                            </span>
                          ) : (
                            <span className={`p-0.5 px-1.5 rounded text-[8px] font-black uppercase leading-none border font-mono ${isDark ? 'bg-slate-900 text-slate-505 border-slate-850' : 'bg-slate-200 text-slate-550 border-slate-250'}`}>
                              Open
                            </span>
                          )}
                        </div>
                        
                        <h5 className={`font-extrabold text-[12px] pl-1.5 leading-snug line-clamp-2 w-full ${isCurSelected ? 'text-sky-400' : thHeading}`}>
                          {topic.name}
                        </h5>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 2: CENTER ACTIVE TOPIC DETAILED READING PREFACE */}
          <div className={`${
            leftPanelCollapsed && rightPanelCollapsed ? 'md:col-span-10' :
            leftPanelCollapsed ? (companionWide ? 'md:col-span-6' : 'md:col-span-8') :
            rightPanelCollapsed ? 'md:col-span-8' : (companionWide ? 'md:col-span-4' : 'md:col-span-6')
          } flex flex-col gap-4 w-full transition-all duration-300`}>
            {currentTopic ? (
              <div className={`${thPanel} p-5 sm:p-6 rounded-xl flex flex-col gap-5 min-h-[580px]`}>
                
                {/* ACTIVE TOPIC HEADER WITH STATUS */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-light-dim dark:border-slate-800">
                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="font-mono text-[8px] text-sky-400 font-extrabold uppercase">
                      Category Study Screen:
                    </span>
                    <h3 className={`text-base sm:text-lg font-black uppercase tracking-tight truncate w-full ${thHeading}`}>
                      {currentTopic.name}
                    </h3>
                  </div>

                                  <button
                    type="button"
                    onClick={() => handleToggleCardCompleted(currentTopic.id, activeCardIndex)}
                    className={`p-1.5 px-3 text-[10px] font-mono font-black rounded-lg border cursor-pointer transition-all flex items-center gap-1 shrink-0
                      ${(cardsList[activeCardIndex]?.completed) 
                        ? 'bg-emerald-500/15 border-emerald-555 text-emerald-400' 
                        : `${isDark ? 'bg-slate-900 border-slate-855 text-slate-405 hover:text-white' : 'bg-white border-slate-350 text-slate-605 hover:text-slate-900 shadow-sm'}`
                      }
                    `}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-505 shrink-0" />
                    <span>{(cardsList[activeCardIndex]?.completed) ? 'Concept Mastered ✓' : 'Mark Concept Mastered'}</span>
                  </button>
                </div>

                {/* AI PLAYBOOK EXPANSION AND REWRITER SHIELD */}
                <div className={`${isDark ? 'bg-sky-950/20 border-sky-500/10' : 'bg-sky-50/50 border-sky-200'} border p-4 rounded-xl flex flex-col gap-3.5 relative overflow-hidden mt-2`}>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                      <h4 className={`text-xs font-black uppercase tracking-wider ${thHeading} font-mono`}>
                        {cardsList.length <= 2 ? "⚡ LIVE AI PLAYBOOK EXPANSION (10-15 CARDS)" : "⚙️ CUSTOMIZE & APPEND PLAYBOOK CARDS"}
                      </h4>
                    </div>
                    {cardsList.length <= 2 && (
                      <span className="bg-amber-500/10 text-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded border border-amber-500/20 font-mono">
                        Overview Mode
                      </span>
                    )}
                  </div>

                  <p className={`text-[10px] ${thTextMuted} leading-relaxed font-semibold`}>
                    {cardsList.length <= 2 
                      ? "This track currently holds an introductory summary. Expand it instantly to get 10-15 deep, textbook-quality cards custom-tailored for your placement role with advanced technical principles, realistic scenarios, and optimization patterns!"
                      : "Add more textbook concepts, behaviorals, or custom architectures. Provide focus instructions to re-generate or extend the cards in this module."
                    }
                  </p>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={expandInstructions}
                        onChange={(e) => setExpandInstructions(e.target.value)}
                        placeholder={`e.g. Focus on STAR answers, ${activePlan.role === 'Generative AI Engineer' ? 'LLM fine-tuning' : 'Pandas pipelines'}, and production deployment tips...`}
                        className={`flex-grow ${thInput} focus:outline-none p-2 rounded-lg text-xs font-semibold`}
                      />
                      <button
                        type="button"
                        disabled={isExpandingTopic}
                        onClick={async () => {
                          if (!activePlan || !currentTopic) return;
                          setIsExpandingTopic(true);
                          try {
                            const res = await fetch('/api/interview/expand-topic', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'x-device-id': deviceId,
                                'x-gemini-model': getActiveGeminiModel()
                              },
                              body: JSON.stringify({
                                plan_id: activePlan.id,
                                topic_id: currentTopic.id,
                                custom_instructions: expandInstructions
                              })
                            });
                            if (res.ok) {
                              const updatedPlan = await res.json();
                              setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
                              setActivePlan(updatedPlan);
                              
                              // Find the updated topic from the saved plan and set it as active topic
                              const updatedTopic = updatedPlan.topics.find((t: any) => t.id === currentTopic.id);
                              if (updatedTopic) {
                                setSelectedTopic(updatedTopic);
                              }
                              setActiveCardIndex(0);
                              setExpandInstructions('');
                              alert(`Playbook expanded! Successfully compiled ${updatedTopic.cards.length} comprehensive technical study cards for this section.`);
                            } else {
                              alert("AI failed to expand the playbook. Please try again.");
                            }
                          } catch (err) {
                            console.error(err);
                            alert("Network error communicating with the AI module expander.");
                          } finally {
                            setIsExpandingTopic(false);
                          }
                        }}
                        className="bg-sky-505 hover:bg-sky-455 disabled:bg-slate-855 text-slate-950 px-3.5 rounded-lg border-none cursor-pointer font-black text-xs transition-colors shrink-0 font-mono flex items-center justify-center gap-1"
                      >
                        {isExpandingTopic ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-955" />
                            COMPILING PLAYBOOK...
                          </>
                        ) : (
                          cardsList.length <= 2 ? "⚡ Expand Playbook" : "🔄 Re-generate Playbook"
                        )}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-1">
                      {/* MANUAL ADD CARD ACTION */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!activePlan || !currentTopic) return;
                          const title = prompt("Enter a title for your custom concept card:");
                          if (!title || !title.trim()) return;
                          const content = prompt("Enter the explanation content (use Markdown if preferred):");
                          if (!content || !content.trim()) return;
                          const code = prompt("Enter an optional code snippet or ASCII design block (leave empty if none):") || '';

                          const newCard = { title, content, code };
                          const updatedPlan = { ...activePlan };
                          const topicToUpdate = updatedPlan.topics.find(t => t.id === currentTopic.id);
                          if (topicToUpdate) {
                            topicToUpdate.cards = [...topicToUpdate.cards, newCard];
                            handleSavePlanToDb(updatedPlan);
                            setSelectedTopic({ ...topicToUpdate });
                            setActiveCardIndex(topicToUpdate.cards.length - 1);
                          }
                        }}
                        className={`text-[10px] font-bold p-1 px-2 rounded-md border cursor-pointer transition-colors ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-250 text-slate-700 hover:bg-slate-50'}`}
                      >
                        ➕ Add Custom Concept Card
                      </button>
                    </div>
                  </div>
                </div>

                {/* HORIZONTAL BOX SELECTION OF ACTIVE CONCEPT CARDS */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none font-mono">
                    🔑 CONCEPT CARDS ({cardsList.length} checkpoints in this module)
                  </span>

                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {cardsList.map((card, idx) => {
                      const isActive = activeCardIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveCardIndex(idx)}
                          className={`p-1.5 px-3 text-[10px] font-bold rounded-lg border cursor-pointer transition-all flex items-center gap-1.5
                            ${isActive 
                              ? 'bg-sky-500/10 border-sky-400 text-sky-400 font-black' 
                              : `${isDark ? 'bg-slate-950 border-slate-850 text-slate-405 hover:text-slate-205' : 'bg-slate-100 border-slate-250 text-slate-655 hover:bg-slate-205 shadow-sm'}`
                            }
                          `}
                        >
                          {card.completed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-sky-450 animate-pulse' : 'bg-slate-500'}`} />
                          )}
                          <span>Card #{idx + 1}: {card.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CURRENT DETAILED EXPLANATION PANEL */}
                {currentCard && (
                  <div className={`p-5 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'} flex flex-col gap-3.5 flex-grow`}>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-[9px] font-mono font-black uppercase ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>ACTIVE PLAYBOOK CONCEPT: CARD #{activeCardIndex + 1}</span>
                      <h4 className={`text-sm sm:text-base font-black uppercase tracking-tight ${thHeading}`}>{currentCard.title}</h4>
                    </div>

                    <div className={`text-xs leading-relaxed font-semibold font-sans space-y-3.5 opacity-90 ${isDark ? 'text-slate-300' : 'text-slate-800'} markdown-body`}>
                      {/* Explicit markdown support inside card contents */}
                      <ReactMarkdown>{currentCard.content}</ReactMarkdown>
                    </div>

                    {/* ATTACHED ARCHITECTURAL CODE BOX */}
                    {currentCard.code && (
                      <div className="flex flex-col gap-1.5 mt-2">
                        <div className={`flex justify-between items-center p-2 px-4 rounded-t-xl text-[9px] font-black border-b leading-none font-mono ${
                          isDark 
                            ? 'bg-slate-900 text-slate-400 border-slate-950' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span>🛠️ CODE SCHEMA / STAR REFERENCE SHIELD</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentCard.code || '');
                              alert('Copied pattern to clipboard!');
                            }}
                            className={`bg-transparent border-none cursor-pointer text-[9px] font-mono leading-none tracking-wider uppercase pl-2 ${
                              isDark ? 'text-sky-400 hover:text-sky-300' : 'text-sky-600 hover:text-sky-700'
                            }`}
                          >
                            [Copy]
                          </button>
                        </div>
                        <pre className={`p-3.5 rounded-b-xl border font-mono text-[9px] overflow-x-auto select-all max-h-[160px] leading-relaxed ${
                          isDark 
                            ? 'bg-slate-950 text-sky-400 border-slate-900' 
                            : 'bg-slate-50 text-indigo-950 border-slate-200'
                        }`}>
                          <code>{currentCard.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* TOPIC GROUNDING LEARNING LINKS */}
                {currentCard && (
                  <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} pt-3.5 mt-auto`}>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 block mb-2 font-mono">
                      Query Grounding &amp; Learning Reference Cards (Active Card)
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {(currentCard.referenceLinks && currentCard.referenceLinks.length > 0
                        ? currentCard.referenceLinks
                        : [
                            {
                              label: `Docs: ${currentCard.title}`,
                              url: `https://www.google.com/search?q=${encodeURIComponent((currentTopic?.name || '') + " " + currentCard.title + " technical documentation guide")}`
                            },
                            {
                              label: `Search: ${currentCard.title} Optimization`,
                              url: `https://www.google.com/search?q=${encodeURIComponent(currentCard.title + " high performance optimization patterns")}`
                            }
                          ]
                      ).map((link, lIdx) => (
                        <a 
                          key={lIdx}
                          href={resolveLinkUrl(link.url, currentTopic?.name || '', currentCard?.title)}
                          target="_blank"
                          rel="noreferrer"
                          id={`bento-ref-link-${lIdx}`}
                          className={`p-1.5 px-2.5 rounded-lg font-bold text-sky-400 flex items-center gap-1.5 transition-all text-[11px] border ${isDark ? 'bg-slate-950 hover:bg-slate-900 border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm'}`}
                        >
                          <BookOpen className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                          <span>{link.label}</span>
                          <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${thPanel} p-10 rounded-xl text-center flex flex-col items-center justify-center min-h-[580px] text-slate-550 italic`}>
                Select a topic segment from the left-side timeline to display custom learning slides.
              </div>
            )}
          </div>

          {/* COLUMN 3: RIGHT INTERACTION COACH TAB LAB */}
          <div className={`
            fixed inset-y-0 right-0 w-[310px] z-50 p-4 overflow-y-auto transition-transform duration-300 shadow-2xl
            ${isDark ? 'bg-slate-900 border-l border-slate-800' : 'bg-white border-l border-slate-200'}
            md:static md:w-auto md:z-0 md:bg-transparent md:border-none md:p-0 md:translate-x-0 md:shadow-none
            ${rightDrawerOpen ? 'translate-x-0' : 'translate-x-full'}
            ${rightPanelCollapsed ? 'md:col-span-1 md:max-w-16' : (companionWide ? 'md:col-span-5' : 'md:col-span-3')}
            flex flex-col gap-4 w-full
          `}>
            {rightPanelCollapsed ? (
              /* COLLAPSED RIGHT PANEL */
              <div 
                onClick={() => setRightPanelCollapsed(false)}
                className={`hidden md:flex ${thPanel} p-3 rounded-2xl flex flex-col items-center gap-4 min-h-[500px] cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group w-full`}
                title="Expand Companion Labs"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRightPanelCollapsed(false);
                  }}
                  className="p-1.5 hover:bg-slate-800 rounded text-sky-400 cursor-pointer transition-colors"
                >
                  <PanelRightOpen className="w-4 h-4" />
                </button>
                <div className="flex flex-col items-center gap-1.5 mt-2">
                  <span className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-500 [writing-mode:vertical-lr] select-none group-hover:text-sky-400 transition-colors">
                    COMPANION LABS
                  </span>
                  <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full mt-2 font-mono uppercase">
                    {topicTab}
                  </span>
                </div>
              </div>
            ) : (
              /* EXPANDED RIGHT PANEL */
              <div className="flex flex-col gap-4 w-full">
                {currentTopic ? (
                  <div className="flex flex-col gap-4 w-full">
                    {/* Header with close/minimize button */}
                    <div className={`p-4 rounded-xl ${thPanel} flex justify-between items-center w-full`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧪</span>
                        <span className={`text-xs font-black uppercase tracking-wide ${thHeading}`}>Companion Labs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {/* WIDE/EXPAND TOGGLE BUTTON */}
                        <button
                          type="button"
                          onClick={() => setCompanionWide(!companionWide)}
                          className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer hidden md:block ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                          title={companionWide ? "Standard Width" : "Expand Width (Large Screens)"}
                        >
                          {companionWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRightPanelCollapsed(true);
                            setRightDrawerOpen(false);
                          }}
                          className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                          title="Minimize Companion Panel"
                        >
                          <PanelRightClose className="w-4 h-4 hidden md:block" />
                          <ChevronDown className="w-4 h-4 md:hidden" />
                        </button>
                      </div>
                    </div>

                    {/* INTERACTIVE WORKSPACE NAV TABS SELECTOR */}
                    <div className={`p-1 rounded-xl border flex ${thPanel} w-full shadow-sm`}>
                      <button
                        type="button"
                        onClick={() => setTopicTab('chat')}
                        className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1 font-mono
                          ${topicTab === 'chat' 
                            ? 'bg-sky-550 text-slate-950 font-black shadow-md' 
                            : `${isDark ? 'text-slate-450 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                          }
                        `}
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-center shrink-0" />
                        <span>Chat Coach</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTopicTab('quiz')}
                        className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1 font-mono
                          ${topicTab === 'quiz' 
                            ? 'bg-sky-550 text-slate-955 font-black shadow-md' 
                            : `${isDark ? 'text-slate-450 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                          }
                        `}
                      >
                        <Trophy className="w-3.5 h-3.5 text-center shrink-0" />
                        <span>Spot Quiz</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTopicTab('notes')}
                        className={`flex-1 py-1.5 text-[9px] font-extrabold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1 font-mono
                          ${topicTab === 'notes' 
                            ? 'bg-sky-550 text-slate-955 font-black shadow-md' 
                            : `${isDark ? 'text-slate-455 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                          }
                        `}
                      >
                        <StickyNote className="w-3.5 h-3.5 text-center shrink-0" />
                        <span>Notes</span>
                      </button>
                    </div>

                {/* TAB 1: 💬 DYNAMIC TOPIC COACH AI MENTOR */}
                {topicTab === 'chat' && (
                  <div className={`${thPanel} p-4 sm:p-5 rounded-xl flex flex-col gap-4 h-[440px] shadow-sm`}>
                    <div className="border-b border-light-dim pb-2 leading-none dark:border-slate-800">
                      <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading} font-mono`}>
                        <Sparkles className="w-4 h-4 text-sky-400 animate-spin animate-duration-1000" /> Active Tutor Coaching Room
                      </h4>
                      <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                        Ask anything about "{currentCard ? currentCard.title : currentTopic.name}".
                      </p>
                    </div>

                    {/* MESSAGE CONTAINER */}
                    <div className={`flex-grow border rounded-xl p-3 overflow-y-auto flex flex-col gap-3 leading-relaxed text-xs ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-205 shadow-inner'}`}>
                      {(!currentTopic.chatHistory || currentTopic.chatHistory.length === 0) ? (
                        <div className="text-center my-auto flex flex-col items-center gap-1.5 p-4 text-slate-500">
                          <MessageSquare className="w-6 h-6 text-slate-450" />
                          <p className="font-semibold italic text-[9px] leading-relaxed">Ask study tips, ask for an explanation containing scenario-based analysis, mock questions or optimizations corresponding to "{currentTopic.name}" real-time.</p>
                        </div>
                      ) : (
                        currentTopic.chatHistory.map((chat, idx) => (
                          <div 
                            key={idx}
                            className={`p-2.5 rounded-xl max-w-[90%] font-semibold leading-normal ${
                              chat.role === 'user' 
                                ? 'bg-sky-500/10 text-sky-400 self-end border border-sky-400/25 animate-fade-in' 
                                : `${isDark ? 'bg-slate-900 border-slate-805 text-slate-200' : 'bg-white border-slate-202 text-slate-800'} self-start border animate-fade-in`
                            }`}
                          >
                            <span className="text-[8px] block opacity-50 font-black mb-0.5 font-mono">
                              {chat.role === 'user' ? 'STUDENT' : 'AI COACH'}
                            </span>
                            <div className="markdown-body text-[10px]">
                              <ReactMarkdown>{chat.content}</ReactMarkdown>
                            </div>
                          </div>
                        ))
                      )}
                      {isTopicChatting && (
                        <div className="self-start p-2.5 bg-slate-900 border border-slate-805 text-sky-400 rounded-xl flex items-center gap-1.5 font-bold animate-pulse text-[9px] font-mono">
                          <RefreshCw className="w-3 h-3 animate-spin text-sky-400" /> Brainstorming insights...
                        </div>
                      )}
                      <div ref={topicChatEndRef} />
                    </div>

                    {/* INPUT COMPOSER FORM */}
                    <form onSubmit={handleTopicChatSubmit} className="flex gap-1.5 leading-none">
                      <input
                        type="text"
                        value={topicChatInput}
                        onChange={(e) => setTopicChatInput(e.target.value)}
                        placeholder={`Ask regarding ${currentTopic.name}...`}
                        className={`flex-grow h-9 ${thInput} focus:outline-none p-2 rounded-xl text-xs font-semibold`}
                      />
                      <button
                        type="submit"
                        disabled={isTopicChatting || !topicChatInput.trim()}
                        className="bg-sky-505 hover:bg-sky-455 disabled:bg-slate-805 text-slate-950 px-3.5 rounded-xl border-none cursor-pointer flex items-center justify-center font-black h-9"
                      >
                        <Send className="w-3.5 h-3.5 text-slate-950" />
                      </button>
                    </form>
                  </div>
                )}

                {/* TAB 2: MCQ QUIZ ENGINE COCOON */}
                {topicTab === 'quiz' && (
                  <div className={`${thPanel} p-4 sm:p-5 rounded-xl flex flex-col gap-4 h-[440px] overflow-y-auto shadow-sm`}>
                    <div className="border-b border-light-dim pb-2 leading-none dark:border-slate-800">
                      <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading} font-mono`}>
                        <HelpCircle className="w-4 h-4 text-sky-400" /> Topic Assessments &amp; Spot Quiz
                      </h4>
                      <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                        Interactive technical testing suite customized for "{currentTopic.name}".
                      </p>
                    </div>

                    {quizQuestions.length === 0 ? (
                      <div className="my-auto flex flex-col items-center text-center gap-3 p-4">
                        <Trophy className="w-8 h-8 text-sky-400 animate-bounce" />
                        <div>
                          <p className={`text-xs font-black ${thHeading}`}>Create Dynamic Quiz</p>
                          <p className="text-[10px] text-slate-500 font-semibold mt-1 max-w-[200px] leading-normal">Formulate multiple-choice exercises tailored exactly for "{currentTopic.name}".</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleStartTopicQuiz(currentTopic)}
                          disabled={isQuizLoading}
                          className="bg-sky-505 hover:bg-sky-450 text-slate-955 p-2.5 px-4 rounded-xl font-black text-[10px] uppercase cursor-pointer border-none shadow-md tracking-wider flex items-center gap-1.5 mt-1 font-mono"
                        >
                          {isQuizLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-955" />
                              Compiling Diagnostic Quiz...
                            </>
                          ) : (
                            <>
                              <Trophy className="w-3.5 h-3.5" />
                              Launch Spot Quiz
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 leading-snug">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-505 font-mono">
                          <span>Progress: {currentQuizIndex + 1}/{quizQuestions.length}</span>
                          <span>Score: {quizScoreCounter}</span>
                        </div>

                        {showQuizResult ? (
                          <div className="text-center py-6 flex flex-col items-center gap-3 font-sans animate-fade-in text-slate-505 font-semibold">
                            <Trophy className="w-8 h-8 text-sky-405 animate-pulse" />
                            <div>
                              <h6 className={`font-black text-sm ${thHeading}`}>Assessment Saved!</h6>
                              <p className="text-[10px] font-semibold mt-1 leading-relaxed">
                                Score: <strong>{quizScoreCounter} / {quizQuestions.length}</strong> points logged to active preparation database.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartTopicQuiz(currentTopic)}
                              className="bg-slate-850 hover:bg-slate-205 text-sky-400 font-black text-[9px] px-4 py-2.5 rounded-xl cursor-pointer uppercase border border-slate-705 leading-none mt-2 font-mono"
                            >
                              Retake diagnostics
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <p className={`font-extrabold text-[11px] leading-relaxed font-sans ${thHeading}`}>
                              {quizQuestions[currentQuizIndex].text}
                            </p>

                            <div className="flex flex-col gap-2">
                              {Object.entries(quizQuestions[currentQuizIndex].options || {}).map(([key, value]) => {
                                const isSelected = selectedQuizAnswer === key;
                                const isCorrectAnswer = quizQuestions[currentQuizIndex].correct_answer === key;
                                let optionStyle = isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300' : 'bg-white border-slate-250 hover:border-slate-350 text-slate-700';

                                if (isQuizAnswerSubmitted) {
                                  if (isCorrectAnswer) {
                                    optionStyle = 'bg-emerald-500/10 border-emerald-505 text-emerald-600 dark:text-emerald-300';
                                  } else if (isSelected) {
                                    optionStyle = 'bg-rose-500/10 border-rose-505 text-rose-600 dark:text-rose-300';
                                  } else {
                                    optionStyle = 'opacity-40 border-slate-205 text-slate-600 dark:text-slate-550 pointer-events-none';
                                  }
                                } else if (isSelected) {
                                  optionStyle = 'bg-sky-500/5 border-sky-400 text-sky-600 dark:text-sky-400';
                                }

                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    disabled={isQuizAnswerSubmitted}
                                    onClick={() => handleSelectQuizAnswer(key)}
                                    className={`w-full p-2.5 rounded-xl border font-bold text-[11px] text-left cursor-pointer transition-all flex items-center gap-2 leading-snug ${optionStyle}`}
                                  >
                                    <span className={`w-5 h-5 rounded font-mono font-black text-[10px] flex items-center justify-center shrink-0 border
                                      ${isSelected ? 'bg-sky-550 text-slate-950 border-sky-450' : `${isDark ? 'bg-slate-955 border-slate-850' : 'bg-slate-50 border-slate-250'}`}`}>
                                      {key}
                                    </span>
                                    <span>{value as string}</span>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 mt-1 leading-none">
                              <span className="text-[10px]">
                                {isQuizAnswerSubmitted ? (
                                  selectedQuizAnswer === quizQuestions[currentQuizIndex].correct_answer ? (
                                    <span className="text-emerald-505 font-bold">✓ Correct option</span>
                                  ) : (
                                    <span className="text-rose-500 font-bold">✗ Error tracked</span>
                                  )
                                ) : (
                                  <span className="text-[9px] text-slate-505 uppercase tracking-widest font-black font-mono">Ready</span>
                                )}
                              </span>

                              {!isQuizAnswerSubmitted ? (
                                <button
                                  type="button"
                                  onClick={handleSubmitQuizAnswer}
                                  disabled={!selectedQuizAnswer}
                                  className={`p-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider border-none transition-all font-mono
                                    ${selectedQuizAnswer 
                                      ? 'bg-sky-505 hover:bg-sky-455 text-slate-955 cursor-pointer' 
                                      : 'bg-slate-200 text-slate-300 dark:bg-slate-850 dark:text-slate-655 cursor-not-allowed'
                                    }
                                  `}
                                >
                                  Submit
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleNextQuizQuestion}
                                  className="bg-slate-855 hover:bg-slate-800 text-sky-455 p-1 px-3 text-[10px] font-black rounded-lg border border-slate-705 cursor-pointer transition-all flex items-center gap-0.5 font-mono"
                                >
                                  <span>{currentQuizIndex < quizQuestions.length - 1 ? 'Next' : 'End'}</span>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {isQuizAnswerSubmitted && (
                              <div className={`p-3 border rounded-xl mt-1 text-[10px] leading-relaxed ${isDark ? 'border-slate-800 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800 shadow-inner'}`}>
                                <span className="text-[8px] font-black uppercase tracking-widest text-sky-500 block mb-0.5 font-mono">AI Insights &amp; Explanations</span>
                                <div className="opacity-90 font-sans font-medium markdown-body">
                                  <ReactMarkdown>{quizQuestions[currentQuizIndex].explanation}</ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: STUDY COMPANION RECALL NOTES */}
                {topicTab === 'notes' && (
                  <div className={`${thPanel} p-4 sm:p-5 rounded-xl flex flex-col gap-4 h-[440px] shadow-sm`}>
                    <div className="border-b border-light-dim pb-2 leading-none dark:border-slate-800">
                      <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading} font-mono`}>
                        <StickyNote className="w-4 h-4 text-sky-400" /> Topic Recall Notes
                      </h4>
                      <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                        Keep custom architectural outlines/starred methodologies in database permanently.
                      </p>
                    </div>

                    <textarea
                      value={topicNotes}
                      onChange={(e) => setTopicNotes(e.target.value)}
                      placeholder="Write custom recall summaries, STAR narrative steps, structural insights..."
                      className={`flex-grow h-44 p-3 rounded-xl text-xs font-semibold outline-none border resize-none leading-relaxed ${thInput}`}
                    />

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleSaveNotesMemory}
                        disabled={isSavingNotes}
                        className="bg-sky-505 hover:bg-sky-450 text-slate-955 text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer border-none shadow-md flex items-center gap-1 font-mono"
                      >
                        {isSavingNotes && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-955" />}
                        <span>Record Notes</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`${thPanel} p-8 rounded-xl text-center flex flex-col items-center justify-center min-h-[440px] text-slate-550 italic`}>
                Study interactions load once any lesson is actively clicked on.
              </div>
            )}
          </div>
        )}
      </div>

    </div>

        {/* HISTORIC PERFORMANCE LOGS AT THE FOOTER OF COCKPIT */}
        {scoreHistory.length > 0 && (
          <div className={`${thPanel} p-6 rounded-2xl flex flex-col gap-3 mt-4`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 leading-none font-mono">
              <TrendingUp className="w-4 h-4 text-sky-400 animate-pulse" /> Historical Performance Logs
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-550 font-semibold font-sans mt-1">
              {scoreHistory.map((score, sIdx) => {
                const relTopic = activePlan.topics.find(t => t.id === score.topic_id);
                return (
                  <div key={sIdx} className={`p-3 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-205'}`}>
                    <div className="min-w-0 pr-2">
                       <div className={`${thHeading} font-bold truncate`}>{relTopic ? relTopic.name : `Topic #${score.topic_id}`}</div>
                       <div className="text-[10px] opacity-60 font-bold mt-0.5 font-mono">{new Date(score.date).toLocaleDateString()}</div>
                    </div>
                    <span className={`font-mono font-black text-xs p-1.5 px-2 rounded-lg shrink-0 ${isDark ? 'bg-slate-800 text-sky-400' : 'bg-slate-200 text-slate-700'}`}>
                      {score.score}/{score.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    );
  };

  // PAGE 3: SPECIFIC TOPIC PREP AND AI POWERED STUDY ROOM
  const renderTopicScreen = () => {
    if (!activePlan || !selectedTopic) return null;

    const cardsList = selectedTopic.cards || [];
    const currentCard = cardsList[activeCardIndex] || (cardsList[0] || { title: "Topic Summary Overview", content: selectedTopic.description });

    return (
      <div className="flex-grow max-w-7xl mx-auto w-full px-4 py-6 flex flex-col gap-5 animate-fade-in animate-duration-205">
        
        {/* HEADER CLASSROOM NAVIGATION BAR */}
        <div className={`p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${thPanel}`}>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => {
                setInterviewScreen('bento');
              }}
              className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-350 bg-transparent border-none cursor-pointer font-extrabold group h-5"
            >
              <ChevronLeft className="w-3.5 h-3.5 transform group-hover:-translate-x-1 transition-transform animate-pulse text-sky-400" />
              <span>← Back to Bento Roadmap</span>
            </button>
            <h3 className={`text-base font-black uppercase mt-1 tracking-tight ${thHeading}`}>
              {selectedTopic.name} Study Room
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase text-slate-500 font-mono">Concept Status:</span>
            <button
              type="button"
              onClick={() => handleToggleCardCompleted(selectedTopic.id, activeCardIndex)}
              className={`p-1.5 px-3.5 text-xs font-black rounded-lg border cursor-pointer transition-all flex items-center gap-1.5
                ${(cardsList[activeCardIndex]?.completed) 
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                  : `${isDark ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white' : 'bg-white border-slate-350 text-slate-600 hover:text-slate-900 shadow-sm'}`
                }
              `}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{(cardsList[activeCardIndex]?.completed) ? 'Concept Mastered ✓' : 'Mark Concept Mastered'}</span>
            </button>
          </div>
        </div>

        {/* THREE WORKSPACE PANELS COLUMNS */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          
          {/* PANEL 1: LEFT COLUMN CONCEPT NAVIGATOR */}
          <div className={`${leftPanelCollapsed ? 'md:col-span-1 w-full md:max-w-16' : 'md:col-span-3 w-full'} flex flex-col gap-4 transition-all duration-300`}>
            {leftPanelCollapsed ? (
              /* COLLAPSED LEFT PANEL */
              <>
                {/* Desktop vertical tab */}
                <div 
                  onClick={() => setLeftPanelCollapsed(false)}
                  className={`hidden md:flex ${thPanel} p-3 rounded-2xl flex flex-col items-center gap-4 min-h-[400px] cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group w-full`}
                  title="Expand Syllabus Concept Map"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeftPanelCollapsed(false);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-sky-450 cursor-pointer transition-colors"
                  >
                    <PanelLeftOpen className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col items-center gap-1.5 mt-2">
                    <span className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-500 [writing-mode:vertical-lr] select-none group-hover:text-sky-400 transition-colors">
                      SYLLABUS MAP
                    </span>
                    <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full mt-2">
                      {cardsList.length}
                    </span>
                  </div>
                </div>

                {/* Mobile compact header bar */}
                <div 
                  onClick={() => setLeftPanelCollapsed(false)}
                  className={`flex md:hidden ${thPanel} p-3.5 px-4 rounded-2xl items-center justify-between cursor-pointer hover:border-sky-500 transition-all w-full`}
                  title="Expand Syllabus Concept Map"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">📚</span>
                    <div className="flex flex-col text-left">
                      <span className={`text-xs font-black uppercase ${thHeading}`}>Syllabus Concept Map</span>
                      <span className={`text-[10px] ${thTextMuted} font-semibold`}>
                        {activeCardIndex + 1} of {cardsList.length} concepts
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLeftPanelCollapsed(false);
                    }}
                    className="p-1.5 hover:bg-slate-800 rounded text-sky-400 cursor-pointer flex items-center gap-1"
                  >
                    <span className="text-[10px] font-black uppercase font-mono tracking-wider">Expand</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              /* EXPANDED LEFT PANEL */
              <div className={`${thPanel} p-4 rounded-2xl flex flex-col gap-3 min-h-[400px]`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded uppercase font-black font-mono self-start">
                      Lesson syllabus
                    </span>
                    <h4 className={`text-xs font-black uppercase mt-1.5 ${thHeading}`}>
                      📚 Syllabus Concept Map
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLeftPanelCollapsed(true)}
                    className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Minimize Syllabus Panel"
                  >
                    <PanelLeftClose className="w-4 h-4 hidden md:block" />
                    <ChevronDown className="w-4 h-4 md:hidden" />
                  </button>
                </div>
                <p className={`text-[10px] ${thTextMuted} leading-tight font-semibold`}>
                  Choose a technical concept card below to study its fine details, code patterns, and common traps.
                </p>

                {/* ITERATIVE CARDS MAP */}
                <div className="flex flex-col gap-2 overflow-y-auto max-h-[380px] pr-1">
                  {cardsList.length === 0 ? (
                    <p className="text-[11px] text-slate-550 italic font-semibold text-center my-auto">Syllabus details compiling...</p>
                  ) : (
                    cardsList.map((card, idx) => {
                      const isActive = activeCardIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveCardIndex(idx)}
                          className={`w-full p-3 rounded-xl border text-left transition-all relative cursor-pointer group flex flex-col gap-1
                            ${isActive 
                              ? 'bg-sky-500/10 border-sky-400 text-sky-450' 
                              : `${isDark ? 'bg-slate-955 border-slate-850 hover:bg-slate-900' : 'bg-slate-50 border-slate-205 hover:bg-slate-100'}`
                            }
                          `}
                        >
                          {isActive && (
                            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
                          )}
                          <div className="flex justify-between items-center w-full leading-none pl-1">
                            <span className="font-mono text-[9px] text-slate-500 group-hover:text-sky-400 font-bold uppercase flex items-center gap-1.5">
                              Concept #{idx + 1}
                              {card.completed && (
                                <span className="text-emerald-500 text-[9px] font-black uppercase font-mono bg-emerald-500/10 px-1 py-0.5 rounded flex items-center gap-0.5">
                                  ✓ Mastered
                                </span>
                              )}
                            </span>
                          </div>
                          <h5 className={`font-extrabold text-xs pl-1 leading-snug truncate w-full ${isActive ? 'text-sky-400' : thHeading}`}>
                            {card.title}
                          </h5>
                          <p className={`text-[10px] pl-1 leading-normal line-clamp-1 opacity-70 ${thTextMuted}`}>
                            {card.content}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* CARD DETECTIVE STATE RATIO */}
                <div className={`p-2.5 rounded-xl text-center text-[10px] font-black uppercase ${isDark ? 'bg-slate-950/60' : 'bg-slate-100'} border border-slate-800/40 mt-auto`}>
                  Active view: {activeCardIndex + 1} of {cardsList.length} concepts
                </div>
              </div>
            )}
          </div>

          {/* PANEL 2 & 3: RIGHT WORKSPACE SANDBOX */}
          <div className={`${leftPanelCollapsed ? 'md:col-span-11' : 'md:col-span-9'} flex flex-col md:flex-row gap-6 items-start w-full`}>
            
            {/* CENTER CONCEPT DETAILS PANEL */}
            <div className={`flex-grow w-full md:min-w-0 ${thPanel} p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col gap-5 min-h-[500px]`}>
              <div>
                <span className="text-[10px] bg-sky-500/10 border border-sky-450/20 text-sky-400 px-3 py-1 rounded-full uppercase font-mono font-extrabold tracking-wide">
                  Active Playbook details: #{activeCardIndex + 1}
                </span>
                <h2 className={`text-lg sm:text-xl font-bold mt-3 ${thHeading}`}>
                  {currentCard.title}
                </h2>
              </div>

              {/* EDUCATION DETAILS BODY */}
              <div className={`text-xs leading-relaxed font-semibold font-sans space-y-3 opacity-95 ${thSubHeading}`}>
                <p>{currentCard.content}</p>
              </div>

              {/* COMPLEX ARCHITECTURE CODE TERMINAL PANEL */}
              {currentCard.code && (
                <div className="flex flex-col gap-1.5">
                  <div className={`flex justify-between items-center p-2 px-4 rounded-t-xl text-[10px] font-black border-b leading-none ${
                    isDark 
                      ? 'bg-slate-950 text-slate-500 border-slate-900' 
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    <span className="font-mono">🛠️ TECHNICAL ARCHITECTURAL SCHEMATIC</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(currentCard.code || '');
                      }}
                      className={`bg-transparent border-none cursor-pointer text-[9px] font-mono leading-none tracking-wider uppercase ${
                        isDark ? 'text-sky-400 hover:text-sky-350' : 'text-sky-600 hover:text-sky-700'
                      }`}
                    >
                      [Copy Code]
                    </button>
                  </div>
                  <pre className={`p-4 rounded-b-xl border font-mono text-[10px] overflow-x-auto select-all max-h-[180px] leading-relaxed ${
                    isDark 
                      ? 'bg-slate-900 text-sky-400 border-slate-950' 
                      : 'bg-slate-50 text-indigo-950 border-slate-200'
                  }`}>
                    <code>{currentCard.code}</code>
                  </pre>
                </div>
              )}

              {/* CURATED REFERENCE LINKS */}
              {currentCard && (
                <div className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-200'} pt-4 mt-auto`}>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-2 font-mono">
                    Grounding References &amp; Search Queries (Active Card)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(currentCard.referenceLinks && currentCard.referenceLinks.length > 0
                      ? currentCard.referenceLinks
                      : [
                          {
                            label: `Docs: ${currentCard.title}`,
                            url: `https://www.google.com/search?q=${encodeURIComponent((selectedTopic?.name || '') + " " + currentCard.title + " technical documentation guide")}`
                          },
                          {
                            label: `Search: ${currentCard.title} Optimization`,
                            url: `https://www.google.com/search?q=${encodeURIComponent(currentCard.title + " high performance optimization patterns")}`
                          }
                        ]
                    ).map((link, lIdx) => (
                      <a 
                        key={lIdx}
                        href={resolveLinkUrl(link.url, selectedTopic?.name || '', currentCard?.title)}
                        target="_blank"
                        rel="noreferrer"
                        id={`classroom-ref-link-${lIdx}`}
                        className={`p-2 px-3 rounded-lg font-bold text-sky-400 flex items-center gap-1.5 transition-all text-xs border ${isDark ? 'bg-slate-900 hover:bg-slate-850 border border-slate-800' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 shadow-sm'}`}
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                        <span>{link.label}</span>
                        <ChevronRight className="w-3 h-3 shrink-0 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COMPANION TAB LAB WORKPLACE */}
            <div className={`${rightPanelCollapsed ? 'w-full md:w-14' : (companionWide ? 'w-full md:w-[480px] lg:w-[600px]' : 'w-full md:w-[330px] lg:w-[400px]')} shrink-0 flex flex-col gap-4 transition-all duration-300`}>
              {rightPanelCollapsed ? (
                /* COLLAPSED RIGHT PANEL */
                <>
                  {/* Desktop vertical tab */}
                  <div 
                    onClick={() => setRightPanelCollapsed(false)}
                    className={`hidden md:flex ${thPanel} p-3 rounded-2xl flex-col items-center gap-4 min-h-[440px] cursor-pointer hover:border-sky-500 hover:shadow-md transition-all group w-full`}
                    title="Expand Companion Labs"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRightPanelCollapsed(false);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded text-sky-455 cursor-pointer transition-colors"
                    >
                      <PanelRightOpen className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col items-center gap-1.5 mt-2">
                      <span className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-500 [writing-mode:vertical-rl] select-none group-hover:text-sky-400 transition-colors">
                        COMPANION LABS
                      </span>
                      <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full mt-2">
                        {topicTab.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Mobile compact header bar */}
                  <div 
                    onClick={() => setRightPanelCollapsed(false)}
                    className={`flex md:hidden ${thPanel} p-3.5 px-4 rounded-2xl items-center justify-between cursor-pointer hover:border-sky-500 transition-all w-full`}
                    title="Expand Companion Labs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">💬</span>
                      <div className="flex flex-col text-left">
                        <span className={`text-xs font-black uppercase ${thHeading}`}>Companion Labs</span>
                        <span className={`text-[10px] ${thTextMuted} font-semibold`}>
                          AI Tutor, Spot Quiz, Study Notes
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRightPanelCollapsed(false);
                      }}
                      className="p-1.5 hover:bg-slate-800 rounded text-sky-400 cursor-pointer flex items-center gap-1"
                    >
                      <span className="text-[10px] font-black uppercase font-mono tracking-wider">Expand</span>
                      <ChevronUp className="w-3.5 h-3.5 animate-bounce" />
                    </button>
                  </div>
                </>
              ) : (
                /* EXPANDED RIGHT PANEL */
                <>
                  {/* Panel Header Toggles */}
                  <div className="flex justify-between items-center w-full px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-550 dark:text-slate-500 font-mono">
                      Interactive Companion Labs
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* WIDE/EXPAND TOGGLE BUTTON */}
                      <button
                        type="button"
                        onClick={() => setCompanionWide(!companionWide)}
                        className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer hidden md:block ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        title={companionWide ? "Standard Width" : "Expand Width (Large Screens)"}
                      >
                        {companionWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRightPanelCollapsed(true)}
                        className={`p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                        title="Minimize Companion Panel"
                      >
                        <PanelRightClose className="w-4 h-4 hidden md:block" />
                        <ChevronUp className="w-4 h-4 md:hidden" />
                      </button>
                    </div>
                  </div>

                  {/* TABS SELECTOR DOCK BAR */}
              <div className={`p-1.5 rounded-xl border flex ${thPanel} w-full`}>
                <button
                  type="button"
                  onClick={() => setTopicTab('chat')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5
                    ${topicTab === 'chat' 
                      ? 'bg-sky-505 text-slate-950 font-black shadow' 
                      : `${isDark ? 'text-slate-450 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                    }
                  `}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>AI Tutor Chat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTopicTab('quiz' as any)}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5
                    ${(topicTab as string) === 'quiz' 
                      ? 'bg-sky-505 text-slate-955 font-black shadow' 
                      : `${isDark ? 'text-slate-450 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                    }
                  `}
                >
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Spot Quiz</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTopicTab('notes')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-lg border-none cursor-pointer transition-all flex items-center justify-center gap-1.5
                    ${topicTab === 'notes' 
                      ? 'bg-sky-505 text-slate-955 font-black shadow' 
                      : `${isDark ? 'text-slate-450 hover:text-white' : 'text-slate-600 hover:text-black hover:bg-slate-100'}`
                    }
                  `}
                >
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Study Notes</span>
                </button>
              </div>

              {/* TAB 1: 💬 AI POWERED ASSISTANT CHAT COMPANION */}
              {topicTab === 'chat' && (
                <div className={`${thPanel} p-5 rounded-2xl flex flex-col gap-4 h-[440px]`}>
                  <div className="border-b border-light-dim pb-2.5 dark:border-slate-800">
                    <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading}`}>
                      <Sparkles className="w-4 h-4 text-sky-400 animate-spin animate-duration-1000" /> Active Tutor Coaching Screen
                    </h4>
                    <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                      Get live assistance regarding "{currentCard.title}". Type custom queries below!
                    </p>
                  </div>

                  {/* SCROLL MESSAGE WINDOW */}
                  <div className={`flex-grow border rounded-xl p-3 overflow-y-auto flex flex-col gap-3 leading-relaxed text-xs ${isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-100 border-slate-205'}`}>
                    {(!selectedTopic.chatHistory || selectedTopic.chatHistory.length === 0) ? (
                      <div className="text-center my-auto flex flex-col items-center gap-1.5 p-4 text-slate-500">
                        <MessageSquare className="w-6 h-6 text-slate-405" />
                        <p className="font-semibold italic text-[10px]">Ask the Coach details regarding "{currentCard.title}"! We can discuss code optimization, trap limits or performance metrics here.</p>
                      </div>
                    ) : (
                      selectedTopic.chatHistory.map((chat, idx) => (
                        <div 
                          key={idx}
                          className={`p-2.5 rounded-xl max-w-[90%] font-semibold leading-normal ${
                            chat.role === 'user' 
                              ? 'bg-sky-500/10 text-sky-400 self-end border border-sky-400/25' 
                              : `${isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'} self-start border`
                          }`}
                        >
                          <span className="text-[8px] block opacity-50 font-black mb-0.5 font-mono">
                            {chat.role === 'user' ? 'STUDENT' : 'AI COACH'}
                          </span>
                          <div className="markdown-body text-[10px]">
                            <ReactMarkdown>{chat.content}</ReactMarkdown>
                          </div>
                        </div>
                      ))
                    )}
                    {isTopicChatting && (
                      <div className="self-start p-2 bg-slate-900 border border-slate-800 text-sky-400 rounded-xl flex items-center gap-1 font-bold animate-pulse text-[9px]">
                        <RefreshCw className="w-3 h-3 animate-spin text-sky-400" /> Coach is brainstorming guide...
                      </div>
                    )}
                    <div ref={topicChatEndRef} />
                  </div>

                  {/* MESSAGE FORM */}
                  <form onSubmit={handleTopicChatSubmit} className="flex gap-2">
                    <input
                      type="text"
                      value={topicChatInput}
                      onChange={(e) => setTopicChatInput(e.target.value)}
                      placeholder={`Ask regarding ${currentCard.title}...`}
                      className={`flex-grow h-9 ${thInput} focus:outline-none p-2 rounded-xl text-xs font-semibold`}
                    />
                    <button
                      type="submit"
                      disabled={isTopicChatting || !topicChatInput.trim()}
                      className="bg-sky-500 hover:bg-sky-450 disabled:bg-slate-800 text-slate-950 px-3.5 rounded-xl border-none cursor-pointer flex items-center justify-center font-black h-9"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" />
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 2: 🏆 DYNAMIC TESTING PRACTICES & QUIZ ENGINE */}
              {(((topicTab as string) === 'quiz') || ((topicTab as string) === 'assessment')) && (
                <div className={`${thPanel} p-5 rounded-2xl flex flex-col gap-4 h-[440px] overflow-y-auto`}>
                  <div className="border-b border-light-dim pb-2.5 dark:border-slate-800">
                    <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading}`}>
                      <HelpCircle className="w-4 h-4 text-sky-400" /> Topic Assessments &amp; Spot Quiz
                    </h4>
                    <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                      Generate customized technical multiple-choice exercises for "{selectedTopic.name}".
                    </p>
                  </div>

                  {quizQuestions.length === 0 ? (
                    <div className="my-auto flex flex-col items-center text-center gap-3 p-4">
                      <Trophy className="w-8 h-8 text-sky-400 animate-bounce" />
                      <div>
                        <p className={`text-xs font-black ${thHeading}`}>Create Dynamic Quiz</p>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1 max-w-[240px]">We'll formulate a diagnostic quiz of technical scenarios customized for this topic.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStartTopicQuiz(selectedTopic)}
                        disabled={isQuizLoading}
                        className="bg-sky-500 hover:bg-sky-450 text-slate-955 p-2.5 px-5 rounded-xl font-black text-[10px] uppercase cursor-pointer border-none shadow-md tracking-wider flex items-center gap-1.5 mt-1"
                      >
                        {isQuizLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-slate-955" />
                            COMPILING SCENARIOS...
                          </>
                        ) : (
                          <>
                            <Trophy className="w-3.5 h-3.5" />
                            Launch spot-quiz
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 leading-snug">
                      <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-500">
                        <span>Exams Progress: {currentQuizIndex + 1}/{quizQuestions.length}</span>
                        <span>Score: {quizScoreCounter}</span>
                      </div>

                      {showQuizResult ? (
                        <div className="text-center py-6 flex flex-col items-center gap-3 font-sans animate-fade-in text-slate-505 font-semibold">
                          <Trophy className="w-8 h-8 text-sky-400 animate-pulse" />
                          <div>
                            <h6 className={`font-black text-sm ${thHeading}`}>Assessment Saved!</h6>
                            <p className="text-[10px] font-semibold mt-1">
                              Accrued ratio: <strong>{quizScoreCounter} / {quizQuestions.length}</strong> points logged to plan archives.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleStartTopicQuiz(selectedTopic)}
                            className="bg-slate-850 hover:bg-slate-205 text-sky-400 font-black text-[9px] px-4 py-2.5 rounded-xl cursor-pointer uppercase border border-slate-705 leading-none mt-2"
                          >
                            Retake diagnostics
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <p className={`font-extrabold text-[11px] leading-relaxed font-sans ${thHeading}`}>
                            {quizQuestions[currentQuizIndex].text}
                          </p>

                          <div className="flex flex-col gap-2">
                            {Object.entries(quizQuestions[currentQuizIndex].options || {}).map(([key, value]) => {
                              const isSelected = selectedQuizAnswer === key;
                              const isCorrectAnswer = quizQuestions[currentQuizIndex].correct_answer === key;
                              let optionStyle = isDark ? 'bg-slate-900 border-slate-805 hover:border-slate-755 text-slate-300' : 'bg-white border-slate-250 hover:border-slate-350 text-slate-700';

                              if (isQuizAnswerSubmitted) {
                                if (isCorrectAnswer) {
                                  optionStyle = 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-300';
                                } else if (isSelected) {
                                  optionStyle = 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-300';
                                } else {
                                  optionStyle = 'opacity-40 border-slate-205 text-slate-600 dark:text-slate-550 pointer-events-none';
                                }
                              } else if (isSelected) {
                                optionStyle = 'bg-sky-500/5 border-sky-400 text-sky-500';
                              }

                              return (
                                <button
                                  key={key}
                                  type="button"
                                  disabled={isQuizAnswerSubmitted}
                                  onClick={() => handleSelectQuizAnswer(key)}
                                  className={`w-full p-2.5 rounded-xl border font-bold text-[11px] text-left cursor-pointer transition-all flex items-center gap-2 leading-snug ${optionStyle}`}
                                >
                                  <span className={`w-5 h-5 rounded font-mono font-black text-[10px] flex items-center justify-center shrink-0 border
                                    ${isSelected ? 'bg-sky-500 text-slate-950 border-sky-450' : `${isDark ? 'bg-slate-955 border-slate-850' : 'bg-slate-50 border-slate-250'}`}`}>
                                    {key}
                                  </span>
                                  <span>{value as string}</span>
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-850 pt-2.5 mt-1 leading-none">
                            <span className="text-[10px]">
                              {isQuizAnswerSubmitted ? (
                                selectedQuizAnswer === quizQuestions[currentQuizIndex].correct_answer ? (
                                  <span className="text-emerald-505 font-bold">✓ Correct option</span>
                                ) : (
                                  <span className="text-rose-500 font-bold">✗ Error tracked</span>
                                )
                              ) : (
                                <span className="text-[9px] text-slate-505 uppercase tracking-widest font-black">Ready</span>
                              )}
                            </span>

                            {!isQuizAnswerSubmitted ? (
                              <button
                                type="button"
                                onClick={handleSubmitQuizAnswer}
                                disabled={!selectedQuizAnswer}
                                className={`p-2 px-4 rounded-lg text-[10px] font-black uppercase tracking-wider border-none transition-all
                                  ${selectedQuizAnswer 
                                    ? 'bg-sky-505 hover:bg-sky-450 text-slate-950 cursor-pointer' 
                                    : 'bg-slate-200 text-slate-400 dark:bg-slate-850 dark:text-slate-650 cursor-not-allowed'
                                  }
                                `}
                              >
                                Submit
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handleNextQuizQuestion}
                                className="bg-slate-855 hover:bg-slate-800 text-sky-455 p-1 px-3.5 text-[10px] font-black rounded-lg border border-slate-705 cursor-pointer transition-all flex items-center gap-0.5"
                              >
                                <span>{currentQuizIndex < quizQuestions.length - 1 ? 'Next' : 'End'}</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {isQuizAnswerSubmitted && (
                            <div className="p-3 border border-slate-850 rounded-xl mt-1 text-[10px] leading-relaxed bg-slate-955">
                              <span className="text-[8px] font-black uppercase tracking-widest text-sky-500 block mb-0.5">AI Insights &amp; Explanations</span>
                              <div className="opacity-80 font-sans font-medium">
                                <ReactMarkdown>{quizQuestions[currentQuizIndex].explanation}</ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: 📝 PERSONAL RECALL SCRATCH MEMORY */}
              {topicTab === 'notes' && (
                <div className={`${thPanel} p-5 rounded-2xl flex flex-col gap-4 h-[440px]`}>
                  <div className="border-b border-light-dim pb-2.5 dark:border-slate-800">
                    <h4 className={`text-xs font-black flex items-center gap-1.5 ${thHeading}`}>
                      <StickyNote className="w-4 h-4 text-sky-400" /> Topic Recall Notes
                    </h4>
                    <p className={`text-[10px] leading-normal ${thTextMuted} mt-0.5`}>
                      Record key STAR outlines, architectural patterns or terms. Keeps logs persistently.
                    </p>
                  </div>

                  <textarea
                    value={topicNotes}
                    onChange={(e) => setTopicNotes(e.target.value)}
                    placeholder="Write custom recall summary, formulas, tips, patterns..."
                    className={`flex-grow h-44 p-3 rounded-xl text-xs font-semibold outline-none border resize-none leading-relaxed ${thInput}`}
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleSaveNotesMemory}
                      disabled={isSavingNotes}
                      className="bg-sky-500 hover:bg-sky-450 text-slate-950 text-[10px] font-black uppercase px-4 py-2.5 rounded-xl transition-all cursor-pointer border-none shadow-md flex items-center gap-1"
                    >
                      {isSavingNotes && <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />}
                      <span>Record Memory notes</span>
                    </button>
                  </div>
                </div>
              )}

                </>
              )}
            </div>

          </div>

        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${thBg} flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-305 transition-colors duration-300`}>
      
      {/* GLOBAL NAVBAR BAR */}
      <nav className={`${thNavbar} py-4 px-4 sm:px-8 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-sky-505 shrink-0" />
          <h2 className={`text-lg font-black tracking-tight flex items-center gap-2 ${thHeading}`}>
            <span>PrepMaster</span> 
            <span className="text-[9px] bg-sky-500/10 border border-sky-500/30 text-sky-550 dark:text-sky-400 px-2 py-0.5 rounded uppercase font-black tracking-widest leading-none font-mono">V2 CODESYLLABUS</span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          
          {/* THEME SWITCH TOGGLE BUTTON */}
          <button
            type="button"
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border transition-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 ${isDark ? 'border-slate-800 bg-slate-900 text-sky-400' : 'border-slate-200 bg-white text-amber-500'}`}
            title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={onBackToHome}
            className={`flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer border ${isDark ? 'border-slate-800 bg-slate-900 text-slate-300 hover:text-white' : 'border-slate-200 bg-white text-slate-700 hover:text-black hover:shadow-sm'}`}
          >
            ← Move to Exam Prep
          </button>
        </div>
      </nav>

      {/* THREE INTERACTIVE PROGRESSIVE CHANNELS */}
      {interviewScreen === 'plan' && renderPlanScreen()}
      {interviewScreen === 'bento' && renderBentoScreen()}
      {interviewScreen === 'topic' && renderTopicScreen()}

      {/* FOOTER */}
      <footer className={`text-center py-6 border-t ${isDark ? 'border-slate-900 text-slate-650 bg-slate-950/40' : 'border-slate-200 text-slate-600 bg-slate-100'} text-[11px] font-bold`}>
        © 2026 PrepMaster .ai — Active Interview Preparation System
      </footer>
    </div>
  );
}
