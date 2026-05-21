export interface Subject {
  id: string;
  name: string;
  icon: string;
  description: string;
  questionsCount: number;
  level: number; // 1 to 5
}

export interface Question {
  id: string;
  subjectId: string;
  content: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface Session {
  id: string;
  subjectId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number; // seconds
  date: string;
}

export interface Progress {
  totalAttempts: number;
  averageScore: number;
  streakDays: number;
  weakTopics: string[];
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  autoSave: boolean;
  geminiApiKey: string;
  selectedModel: string;
}

export interface AppData {
  subjects: Subject[];
  questions: Question[];
  sessions: Session[];
  progress: Progress;
  settings: AppSettings;
}
