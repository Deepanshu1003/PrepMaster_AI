export interface ExamPlan {
  id: string;
  title: string;
  created_at: string;
  device_id?: string;
}

export interface Question {
  id: string;
  exam_plan_id: string;
  question_number: number;
  text: string;
  options: Record<string, string>;
}

export interface ProgressItem {
  question_id: string;
  question_number: number;
  status: 'green' | 'red' | 'gray';
  selected_answer?: string;
  explanation?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

// ==========================================
// NEW INTERVIEW PREPARATION TYPES (V2)
// ==========================================

export interface InterviewTopicCard {
  title: string;
  content: string;
  code?: string;
  completed?: boolean;
  referenceLinks?: InterviewReferenceLink[];
}

export interface InterviewReferenceLink {
  label: string;
  url: string;
}

export interface InterviewTopicDetails {
  id: string; // Unique index
  name: string;
  description: string;
  completed: boolean;
  notes?: string; // Structured note memory
  cards: InterviewTopicCard[];
  referenceLinks: InterviewReferenceLink[];
  chatHistory?: ChatMessage[]; // Optional per-topic conversational logs
  quizQuestions?: any[]; // Optional persistent quiz questions
  quizCurrentIndex?: number; // Current active index in quiz
  quizSelectedAnswer?: string | null; // Selected answer key
  quizIsAnswerSubmitted?: boolean; // True if current question's answer is submitted
  quizScoreCounter?: number; // Score count
  quizCompleted?: boolean; // True if quiz is finished/reviewed
}

export interface InterviewQuizScore {
  topic_id: string;
  score: number;
  total: number;
  date: string;
}

export interface InterviewPlan {
  id: string;
  device_id: string;
  role: string;
  experience_level: string;
  created_at: string;
  finalized: boolean;
  chat_history: ChatMessage[];
  topics: InterviewTopicDetails[];
  scores: InterviewQuizScore[];
}

export interface UserAttempt {
  id: string;
  question_id: string;
  device_id?: string;
  selected_answer: string;
  is_correct: boolean;
  explanation?: string;
  attempted_at: string;
}
