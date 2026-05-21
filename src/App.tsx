/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Atom, 
  FlaskConical, 
  Hammer, 
  CloudRain, 
  Leaf, 
  Trophy, 
  LayoutDashboard, 
  Settings as SettingsIcon, 
  MessageSquare, 
  BookOpen, 
  X, 
  Menu, 
  ChevronRight, 
  Award, 
  Zap, 
  Flame, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Send,
  Loader2,
  Eye,
  EyeOff,
  Save,
  Download,
  Upload,
  Search,
  BrainCircuit,
  Gamepad2,
  MousePointerClick,
  CircleDollarSign,
  HelpCircle,
  Users,
  Flower2,
  LayoutGrid,
  Mountain,
  Bell,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { marked } from 'marked';
import Swal from 'sweetalert2';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Subject, Question, Session, Progress, AppSettings, AppData, Badge } from './types';
import { INITIAL_SUBJECTS, INITIAL_QUESTIONS, BADGES, GEMINI_MODELS } from './constants';
import { generateExplanation, askAITutor } from './services/geminiService';
import { exportQuestionsToDocx } from './services/docxExporter';

// Utility for shuffling array
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  // --- State ---
  const [currentPage, setCurrentPage] = useState<'home' | 'quiz' | 'dashboard' | 'tutor' | 'flashcards' | 'settings' | 'games'>('home');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [appData, setAppData] = useState<AppData>(() => {
    const saved = localStorage.getItem('hoa_hoc_app_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Tự động cập nhật câu hỏi mới nếu bản lưu cũ ít câu hỏi hơn bản cập nhật
        if (parsed.questions.length < INITIAL_QUESTIONS.length) {
          return {
            ...parsed,
            subjects: INITIAL_SUBJECTS,
            questions: INITIAL_QUESTIONS
          };
        }
        return parsed;
      } catch (e) {
        console.error('Error parsing saved data', e);
      }
    }
    return {
      subjects: INITIAL_SUBJECTS,
      questions: INITIAL_QUESTIONS,
      sessions: [],
      progress: {
        totalAttempts: 0,
        averageScore: 0,
        streakDays: 0,
        weakTopics: [],
        badges: BADGES.map(b => ({ ...b, unlockedAt: undefined }))
      },
      settings: {
        theme: 'light',
        soundEnabled: true,
        autoSave: true,
        geminiApiKey: '',
        selectedModel: 'gemini-3-flash-preview'
      }
    };
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // --- Effects ---
  useEffect(() => {
    if (appData.settings.autoSave) {
      localStorage.setItem('hoa_hoc_app_data', JSON.stringify(appData));
    }
  }, [appData]);

  // --- Handlers ---
  const handleStartQuiz = (subject: Subject) => {
    setSelectedSubject(subject);
    const filtered = appData.questions.filter(q => q.subjectId === subject.id);
    const shuffled = shuffleArray([...filtered]) as Question[];
    const sorted = shuffled.sort((a, b) => {
      const diffVal: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
      return diffVal[a.difficulty] - diffVal[b.difficulty];
    });
    setQuizQuestions(sorted.slice(0, 10));
    setCurrentPage('quiz');
  };

  const updateProgress = (session: Session) => {
    setAppData(prev => {
      const newSessions = [...prev.sessions, session];
      const totalScore = newSessions.reduce((acc, s) => acc + s.score, 0);
      const avgScore = totalScore / newSessions.length;
      
      // Unlock badges logic
      const newBadges = [...prev.progress.badges];
      if (newSessions.length === 1 && !newBadges[0].unlockedAt) {
        newBadges[0].unlockedAt = new Date().toISOString();
        Swal.fire({
          title: 'Huy hiệu mới!',
          text: `Bạn đã nhận được huy hiệu: ${newBadges[0].name}`,
          icon: 'success',
          confirmButtonText: 'Tuyệt vời!'
        });
      }

      return {
        ...prev,
        sessions: newSessions,
        progress: {
          ...prev.progress,
          totalAttempts: newSessions.length,
          averageScore: avgScore,
          badges: newBadges
        }
      };
    });
  };

  // --- Components ---
  const Sidebar = () => (
    <>
      {/* Backdrop for Mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
      <div className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg gradient-bg">
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">Hóa Học Pro</span>
        </div>
        <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md">
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="mt-6 px-4 space-y-1">
        {[
          { id: 'home', icon: BookOpen, label: 'Hành trình' },
          { id: 'games', icon: Gamepad2, label: 'Khu vui chơi' },
          { id: 'dashboard', icon: LayoutDashboard, label: 'Tiến độ' },
          { id: 'flashcards', icon: BrainCircuit, label: 'Thẻ ghi nhớ' },
          { id: 'tutor', icon: MessageSquare, label: 'Gia sư AI' },
          { id: 'settings', icon: SettingsIcon, label: 'Cài đặt' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCurrentPage(item.id as any);
              setIsSidebarOpen(false);
            }}
            className={cn(
              "flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
              currentPage === item.id 
                ? "bg-primary/10 text-primary shadow-sm" 
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon className={cn("w-5 h-5 mr-3", currentPage === item.id ? "text-primary" : "text-slate-400")} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="absolute bottom-0 w-full p-4 border-t border-slate-200">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold">
              {appData.progress.averageScore.toFixed(0)}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Điểm trung bình</p>
              <p className="text-sm font-bold text-slate-800">Học sinh ưu tú</p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${appData.progress.averageScore}%` }}></div>
          </div>
        </div>
      </div>
      </div>
    </>
  );

  const Header = () => (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center">
        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 mr-4 text-slate-500 hover:bg-slate-100 rounded-md">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex flex-col">
          <h2 className="text-sm md:text-lg font-black text-slate-800 leading-tight">
            {currentPage === 'home' && 'Hành trình chinh phục'}
            {currentPage === 'quiz' && `Thử thách: ${selectedSubject?.name}`}
            {currentPage === 'dashboard' && 'Bảng vàng thành tích'}
            {currentPage === 'games' && 'Khu Vui Chơi & Giải Trí'}
            {currentPage === 'tutor' && 'Gia sư AI Gemini'}
            {currentPage === 'flashcards' && 'Thư viện tóm tắt'}
            {currentPage === 'settings' && 'Cấu hình ứng dụng'}
          </h2>
          <span className="text-[8px] md:text-[10px] font-bold text-rose-400/80 uppercase tracking-wider truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
            Sản phẩm được phát triển bởi cô giáo Vũ Thị Ngọc
          </span>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        {!appData.settings.geminiApiKey && (
          <button 
            onClick={() => setCurrentPage('settings')}
            className="hidden sm:flex items-center px-3 py-1.5 text-xs font-medium text-error bg-error/10 border border-error/20 rounded-full animate-pulse"
          >
            <AlertCircle className="w-3 h-3 mr-1.5" />
            Chưa có API Key
          </button>
        )}
        <div className="flex items-center space-x-2 p-1 bg-slate-100 rounded-full">
          <div className="px-3 py-1 text-xs font-bold text-slate-600">
            <Trophy className="w-3 h-3 inline mr-1 text-yellow-500" />
            {appData.progress.totalAttempts * 100} XP
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {currentPage === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-6xl mx-auto"
              >
                <div className="mb-8 md:mb-12 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] gradient-bg text-white relative overflow-hidden shadow-[0_20px_50px_rgba(255,106,136,0.3)] border-4 border-white">
                  {/* Decorative Bubbles */}
                  <div className="absolute top-10 left-10 w-8 h-8 bg-white/20 rounded-full animate-bubble" />
                  <div className="absolute top-20 right-20 w-12 h-12 bg-white/10 rounded-full animate-bubble" style={{ animationDelay: '1s' }} />
                  <div className="absolute bottom-10 left-1/2 w-6 h-6 bg-white/30 rounded-full animate-bubble" style={{ animationDelay: '2s' }} />
                  
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between">
                    <div className="text-center md:text-left mb-6 md:mb-0">
                      <motion.h1 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="text-4xl md:text-5xl font-black mb-4 drop-shadow-md"
                      >
                        Hành trình kỳ thú! ✨
                      </motion.h1>
                      <p className="text-white/90 text-lg font-medium max-w-lg leading-relaxed">
                        Cùng những người bạn nguyên tử khám phá thế giới hóa học diệu kỳ ngay hôm nay nhé! 🎈
                      </p>
                      <button 
                        onClick={() => setCurrentPage('tutor')}
                        className="mt-8 px-8 py-4 bg-white text-rose-500 font-black rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center mx-auto md:mx-0 group"
                      >
                        <MessageSquare className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                        Gia sư AI giúp bạn
                      </button>
                    </div>
                    <div className="relative w-48 h-48 md:w-64 md:h-64 animate-float">
                      <Atom size={200} className="text-white opacity-90 filter drop-shadow-2xl" />
                      <div className="absolute -top-4 -right-4 text-4xl">🌟</div>
                      <div className="absolute -bottom-4 -left-4 text-4xl">🌈</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {appData.subjects.map((subject) => (
                    <SubjectCard 
                      key={subject.id} 
                      subject={subject} 
                      onStart={() => handleStartQuiz(subject)} 
                      onExport={() => {
                        const subjectQuestions = appData.questions.filter(q => q.subjectId === subject.id);
                        if (subjectQuestions.length === 0) {
                          Swal.fire('Thất bại', 'Không có câu hỏi nào cho chủ đề này để tạo đề.', 'error');
                          return;
                        }
                        const diffVal: Record<string, number> = { easy: 1, medium: 2, hard: 3 };
                        const shuffled = (shuffleArray(subjectQuestions) as Question[]).sort((a, b) => diffVal[a.difficulty] - diffVal[b.difficulty]);
                        exportQuestionsToDocx('BÀI KIỂM TRA MÔN HÓA HỌC', shuffled.slice(0, 10), subject.name);
                        Swal.fire('Thành công', `Đã xuất đề thi cho ${subject.name}!`, 'success');
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {currentPage === 'quiz' && selectedSubject && (
              <QuizView 
                subject={selectedSubject} 
                questions={quizQuestions}
                apiKey={appData.settings.geminiApiKey}
                onComplete={(session) => {
                  updateProgress(session);
                  setCurrentPage('dashboard');
                }}
                onCancel={() => setCurrentPage('home')}
              />
            )}

            {currentPage === 'dashboard' && (
              <DashboardView appData={appData} />
            )}

            {currentPage === 'tutor' && (
              <AITutorView apiKey={appData.settings.geminiApiKey} />
            )}

            {currentPage === 'games' && (
              <GameCenterView appData={appData} onWinXP={(xp) => {
                setAppData(prev => ({
                  ...prev,
                  progress: {
                    ...prev.progress,
                    totalAttempts: prev.progress.totalAttempts + (xp / 100)
                  }
                }));
              }} />
            )}

            {currentPage === 'flashcards' && (
              <FlashcardsView appData={appData} />
            )}

            {currentPage === 'settings' && (
              <SettingsView 
                settings={appData.settings} 
                onSave={(newSettings) => {
                  setAppData(prev => ({ ...prev, settings: newSettings }));
                  Swal.fire('Thành công', 'Đã lưu cài đặt!', 'success');
                }}
                onReset={() => {
                  Swal.fire({
                    title: 'Xóa toàn bộ dữ liệu?',
                    text: 'Hành động này không thể hoàn tác!',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Xóa ngay',
                    cancelButtonText: 'Hủy'
                  }).then((result) => {
                    if (result.isConfirmed) {
                      localStorage.removeItem('hoa_hoc_app_data');
                      window.location.reload();
                    }
                  });
                }}
              />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// --- Sub-components ---

interface SubjectCardProps {
  subject: Subject;
  onStart: () => void;
  onExport: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, onStart, onExport }) => {
  const Icon = ({
    Atom,
    FlaskConical,
    Hammer,
    CloudRain,
    Leaf
  } as any)[subject.icon] || Atom;

  return (
    <motion.div 
      whileHover={{ y: -12, scale: 1.02 }}
      className="cute-card bg-white p-6 md:p-8 flex flex-col h-full relative overflow-hidden group"
    >
      <div className="flex items-start justify-between mb-6">
        <div className={cn(
          "p-5 rounded-[2rem] transition-all duration-500 group-hover:rotate-12",
          subject.level === 1 ? "bg-blue-100 text-blue-500 shadow-[0_10px_20px_rgba(59,130,246,0.1)]" :
          subject.level === 2 ? "bg-purple-100 text-purple-500 shadow-[0_10px_20px_rgba(168,85,247,0.1)]" :
          subject.level === 3 ? "bg-orange-100 text-orange-500 shadow-[0_10px_20px_rgba(249,115,22,0.1)]" :
          subject.level === 4 ? "bg-emerald-100 text-emerald-500 shadow-[0_10px_20px_rgba(16,185,129,0.1)]" : "bg-rose-100 text-rose-500 shadow-[0_10px_20px_rgba(244,63,94,0.1)]"
        )}>
          <Icon className="w-10 h-10" />
        </div>
        <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100 flex items-center space-x-1">
          {[1, 2, 3, 4, 5].map((l) => (
            <div 
              key={l} 
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-500",
                l <= subject.level ? "bg-rose-400 scale-110" : "bg-slate-200"
              )}
            />
          ))}
        </div>
      </div>
      
      <h3 className="text-2xl font-black text-slate-800 mb-3 group-hover:text-rose-500 transition-colors">{subject.name}</h3>
      <p className="text-slate-500 font-medium text-sm mb-8 line-clamp-2 leading-relaxed">{subject.description}</p>
      
      <div className="mt-auto flex items-center justify-between pt-6 border-t border-slate-50">
        <span className="text-xs font-black text-rose-300 uppercase tracking-widest flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-1.5" />
          {subject.questionsCount} Thử thách
        </span>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onExport}
            title="Xuất đề thi đáng yêu (.docx)"
            className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
          >
            <Download className="w-5 h-5" />
          </button>
          <button 
            onClick={onStart}
            className="flex items-center px-6 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-rose-500 transition-all shadow-lg active:scale-95 group/btn"
          >
            Chơi
            <ChevronRight className="w-4 h-4 ml-1.5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function QuizView({ subject, questions, apiKey, onComplete, onCancel }: { 
  subject: Subject; 
  questions: Question[]; 
  apiKey: string;
  onComplete: (session: Session) => void;
  onCancel: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isExplaining, setIsExplaining] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [startTime] = useState(Date.now());

  const currentQuestion = questions[currentIdx];

  useEffect(() => {
    if (timeLeft > 0 && !isAnswered) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered) {
      handleAnswer('');
    }
  }, [timeLeft, isAnswered]);

  const handleAnswer = async (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === currentQuestion.correctAnswer;
    if (isCorrect) {
      setScore(prev => prev + (timeLeft * 10));
      setCorrectCount(prev => prev + 1);
    }

    // Get AI explanation if API key exists
    if (apiKey) {
      setIsExplaining(true);
      try {
        const explanation = await generateExplanation(
          currentQuestion.content,
          option || 'Không chọn',
          currentQuestion.correctAnswer,
          apiKey
        );
        setAiExplanation(explanation || currentQuestion.explanation);
      } catch (e) {
        setAiExplanation(currentQuestion.explanation);
      } finally {
        setIsExplaining(false);
      }
    } else {
      setAiExplanation(currentQuestion.explanation);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setTimeLeft(30);
      setAiExplanation('');
    } else {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      onComplete({
        id: Math.random().toString(36).substr(2, 9),
        subjectId: subject.id,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        timeSpent,
        date: new Date().toISOString()
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onCancel} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-4">
          <div className="flex items-center px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Clock className={cn("w-4 h-4 mr-2", timeLeft < 10 ? "text-error animate-pulse" : "text-primary")} />
            <span className={cn("font-mono font-bold", timeLeft < 10 ? "text-error" : "text-slate-700")}>
              00:{timeLeft.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-100 font-bold text-primary">
            {score} XP
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center space-x-3">
          <span>Câu hỏi {currentIdx + 1}/{questions.length}</span>
          <span className="opacity-50">•</span>
          <span className={cn(
            currentQuestion.difficulty === 'easy' && "text-emerald-500",
            currentQuestion.difficulty === 'medium' && "text-orange-500",
            currentQuestion.difficulty === 'hard' && "text-rose-500"
          )}>
            Chặng {currentQuestion.difficulty === 'easy' ? '1: Khởi động (Dễ)' : currentQuestion.difficulty === 'medium' ? '2: Tăng tốc (Trung bình)' : '3: Về đích (Khó)'}
          </span>
        </div>
        <span>{Math.round(((currentIdx + 1) / questions.length) * 100)}% Hoàn thành</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 mb-8 overflow-hidden">
        <motion.div 
          className="bg-primary h-2 rounded-full" 
          initial={{ width: 0 }}
          animate={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <motion.div 
        key={currentIdx}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-5 md:p-8 rounded-3xl shadow-xl border border-slate-100 mb-6"
      >
        <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 md:mb-8">{currentQuestion.content}</h2>
        
        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((option, idx) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedOption;
            
            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleAnswer(option)}
                className={cn(
                  "flex items-center justify-between p-4 md:p-5 rounded-2xl border-2 transition-all duration-200 text-left",
                  !isAnswered && "border-slate-100 hover:border-primary hover:bg-primary/5",
                  isAnswered && isCorrect && "border-success bg-success/10 text-success",
                  isAnswered && isSelected && !isCorrect && "border-error bg-error/10 text-error",
                  isAnswered && !isCorrect && !isSelected && "border-slate-100 opacity-50"
                )}
              >
                <span className="font-medium text-sm md:text-base">{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 md:w-6 h-6" />}
                {isAnswered && isSelected && !isCorrect && <AlertCircle className="w-5 h-5 md:w-6 h-6" />}
              </button>
            );
          })}
        </div>
      </motion.div>

      <AnimatePresence>
        {isAnswered && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white p-6 rounded-3xl shadow-lg border border-slate-100">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <BrainCircuit className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-slate-800">Giải thích từ AI</h3>
              </div>
              
              {isExplaining ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <span className="ml-3 text-slate-500 font-medium">AI đang phân tích...</span>
                </div>
              ) : (
                <div 
                  className="markdown-body text-slate-600 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: marked.parse(aiExplanation) }}
                />
              )}
            </div>

            <button
              onClick={handleNext}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-primary transition-all duration-300 flex items-center justify-center group"
            >
              {currentIdx < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả'}
              <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DashboardView({ appData }: { appData: AppData }) {
  const chartData = useMemo(() => {
    return appData.sessions.slice(-7).map(s => ({
      date: new Date(s.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      score: s.score
    }));
  }, [appData.sessions]);

  const stats = [
    { label: 'Tổng bài học', value: appData.progress.totalAttempts, icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Điểm trung bình', value: `${appData.progress.averageScore.toFixed(0)}%`, icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50' },
    { label: 'Chuỗi ngày', value: appData.progress.streakDays, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
    { label: 'Tổng XP', value: appData.progress.totalAttempts * 100, icon: Zap, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className={cn("p-3 rounded-2xl w-fit mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Biểu đồ tiến độ</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4A90E2" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#4A90E2', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Huy hiệu đạt được</h3>
          <div className="grid grid-cols-2 gap-4">
            {appData.progress.badges.map((badge) => {
              const Icon = {
                Award, Zap, Flame, TrendingUp
              }[badge.icon] || Award;
              
              return (
                <div 
                  key={badge.id} 
                  className={cn(
                    "flex flex-col items-center p-4 rounded-2xl border transition-all duration-300",
                    badge.unlockedAt 
                      ? "bg-white border-slate-100 shadow-sm" 
                      : "bg-slate-50 border-transparent opacity-40 grayscale"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-full mb-3",
                    badge.unlockedAt ? "gradient-bg text-white" : "bg-slate-200 text-slate-400"
                  )}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-center text-slate-800">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-3 text-yellow-500" />
            Bảng xếp hạng tuần
          </h3>
          <div className="space-y-4">
            {[
              { name: 'Nguyễn Văn A', score: 2500, avatar: 'A' },
              { name: 'Trần Thị B', score: 2100, avatar: 'B' },
              { name: 'Lê Văn C', score: 1850, avatar: 'C' },
              { name: 'Bạn (Hiện tại)', score: appData.progress.totalAttempts * 100, avatar: 'U', isMe: true },
              { name: 'Phạm Văn D', score: 1200, avatar: 'D' },
            ].sort((a, b) => b.score - a.score).map((user, idx) => (
              <div key={idx} className={cn(
                "flex items-center justify-between p-4 rounded-2xl transition-all",
                user.isMe ? "bg-primary/10 border border-primary/20" : "bg-slate-50"
              )}>
                <div className="flex items-center space-x-4">
                  <span className={cn(
                    "w-6 text-center font-bold",
                    idx === 0 ? "text-yellow-500" : idx === 1 ? "text-slate-400" : idx === 2 ? "text-orange-400" : "text-slate-300"
                  )}>{idx + 1}</span>
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                    {user.avatar}
                  </div>
                  <span className={cn("font-bold", user.isMe ? "text-primary" : "text-slate-700")}>{user.name}</span>
                </div>
                <span className="font-mono font-bold text-slate-800">{user.score} XP</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="text-xl font-bold text-slate-800 mb-6">Lịch sử học tập</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="pb-4">Chủ đề</th>
                  <th className="pb-4">Điểm số</th>
                  <th className="pb-4">Đúng/Tổng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {appData.sessions.slice().reverse().slice(0, 5).map((session) => (
                  <tr key={session.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">
                      {appData.subjects.find(s => s.id === session.subjectId)?.name}
                    </td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                        {session.score} XP
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 font-medium">
                      {session.correctAnswers}/{session.totalQuestions}
                    </td>
                  </tr>
                ))}
                {appData.sessions.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-12 text-center text-slate-400 font-medium">
                      Chưa có lịch sử học tập.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AITutorView({ apiKey }: { apiKey: string }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: 'Chào bạn! Tôi là Gia sư AI Hóa học. Bạn có thắc mắc gì về các phản ứng, nguyên tử hay hợp chất không? Hãy hỏi tôi nhé!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!apiKey) {
      Swal.fire('Lỗi', 'Vui lòng cấu hình API Key trong phần Cài đặt!', 'error');
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const context = "Học sinh đang học chương trình Hóa học THCS (lớp 8, 9).";
      const response = await askAITutor(userMsg, context, apiKey);
      setMessages(prev => [...prev, { role: 'ai', text: response || 'Xin lỗi, tôi không thể trả lời lúc này.' }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'ai', text: `Lỗi: ${e.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] md:h-[calc(100vh-12rem)] flex flex-col bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      <div className="p-4 md:p-6 border-b border-slate-100 flex items-center space-x-4">
        <div className="p-2 bg-primary/10 rounded-xl">
          <BrainCircuit className="w-5 h-5 md:w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-sm md:text-base font-bold text-slate-800">Gia sư AI Gemini</h3>
          <p className="text-[10px] md:text-xs text-slate-500 font-medium">Luôn sẵn sàng giải đáp mọi thắc mắc Hóa học</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30">
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex",
              msg.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[85%] md:max-w-[80%] p-3 md:p-4 rounded-2xl shadow-sm",
              msg.role === 'user' 
                ? "bg-primary text-white rounded-tr-none" 
                : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
            )}>
              <div 
                className={cn("markdown-body text-xs md:text-sm", msg.role === 'user' ? "text-white" : "text-slate-700")}
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.text) }}
              />
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 md:p-4 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm flex items-center space-x-2">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs md:text-sm text-slate-500 font-medium">AI đang suy nghĩ...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-white border-t border-slate-100">
        <div className="relative">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Hỏi về Hóa học..."
            className="w-full pl-4 md:pl-6 pr-12 md:pr-14 py-3 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-1.5 md:right-2 top-1.5 md:top-2 p-2 md:p-2.5 bg-slate-900 text-white rounded-xl hover:bg-primary disabled:opacity-50 disabled:hover:bg-slate-900 transition-all"
          >
            <Send className="w-4 h-4 md:w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function GameCenterView({ appData, onWinXP }: { appData: AppData, onWinXP: (xp: number) => void }) {
  const [activeGame, setActiveGame] = useState<'lab' | 'memory' | 'dragdrop' | 'millionaire' | 'flower' | 'crossword' | 'obstacle' | 'goldenbell' | null>(null);

  const GAMES = [
    { id: 'lab', name: 'Phòng Thí Nghiệm', icon: <FlaskConical className="w-10 h-10" />, emoji: '🧪', desc: 'Sáng tạo phản ứng, tạo ra các hợp chất mới.', color: 'from-blue-500 to-indigo-600' },
    { id: 'memory', name: 'Lật Thẻ Trí Nhớ', icon: <Gamepad2 className="w-10 h-10" />, emoji: '🧠', desc: 'Trình ghi nhớ ký hiệu và tên nguyên tố.', color: 'from-purple-500 to-violet-600' },
    { id: 'dragdrop', name: 'Phân Loại Hóa Học', icon: <MousePointerClick className="w-10 h-10" />, emoji: '📦', desc: 'Phân loại Hợp chất vô cơ & Hữu cơ.', color: 'from-emerald-500 to-teal-600' },
    { id: 'millionaire', name: 'Ai Là Triệu Phú', icon: <CircleDollarSign className="w-10 h-10" />, emoji: '💰', desc: 'Chinh phục 10 câu hỏi để nhận thưởng XP.', color: 'from-blue-900 to-slate-900' },
    { id: 'flower', name: 'Hái Hoa Dân Chủ', icon: <Flower2 className="w-10 h-10" />, emoji: '🌸', desc: 'Hái hoa kiến thức, nhận lộc điểm số.', color: 'from-pink-500 to-rose-600' },
    { id: 'crossword', name: 'Ô Chữ Bí Mật', icon: <LayoutGrid className="w-10 h-10" />, emoji: '🧩', desc: 'Giải mã từ khóa hàng dọc bí ẩn.', color: 'from-indigo-600 to-blue-700' },
    { id: 'obstacle', name: 'Vượt Chướng Ngại Vật', icon: <Mountain className="w-10 h-10" />, emoji: '🏃', desc: 'Nhảy qua vật cản và trả lời câu hỏi nhanh.', color: 'from-amber-500 to-orange-600' },
    { id: 'goldenbell', name: 'Rung Chuông Vàng', icon: <Bell className="w-10 h-10" />, emoji: '🔔', desc: 'Thử thách loại trực tiếp 10 câu hỏi khó.', color: 'from-yellow-400 to-amber-600' },
  ];

  if (activeGame) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <button 
          onClick={() => setActiveGame(null)}
          className="flex items-center text-slate-500 hover:text-primary font-bold transition-colors group"
        >
          <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          Quay lại Khu Vui Chơi
        </button>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeGame}
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeGame === 'lab' && <VirtualLabGame onWinXP={onWinXP} />}
            {activeGame === 'memory' && <MemoryGame onWinXP={onWinXP} />}
            {activeGame === 'dragdrop' && <DragDropGame onWinXP={onWinXP} />}
            {activeGame === 'millionaire' && <MillionaireGame appData={appData} onWinXP={onWinXP} />}
            {activeGame === 'flower' && <FlowerGame appData={appData} onWinXP={onWinXP} />}
            {activeGame === 'crossword' && <CrosswordGame onWinXP={onWinXP} />}
            {activeGame === 'obstacle' && <ObstacleGame appData={appData} onWinXP={onWinXP} />}
            {activeGame === 'goldenbell' && <GoldenBellGame appData={appData} onWinXP={onWinXP} />}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black text-slate-800 mb-4 flex items-center justify-center">
          <Gamepad2 className="w-10 h-10 mr-4 text-primary" />
          Khu Vui Chơi Giải Trí
        </h2>
        <p className="text-slate-500 font-medium max-w-2xl mx-auto">
          Vừa học vừa chơi với kho mini-game hóa học cực đỉnh. Hãy chọn trò chơi bạn yêu thích và bắt đầu ngay!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {GAMES.map((game, idx) => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl border border-slate-100 hover:shadow-2xl hover:border-primary/20 transition-all flex flex-col h-full overflow-hidden"
          >
            {/* Background Decor */}
            <div className={cn("absolute -right-8 -top-8 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity", game.color)} />
            
            <div className="flex items-start justify-between mb-6">
              <div className={cn("p-4 rounded-3xl text-white shadow-lg shadow-indigo-500/10", "bg-gradient-to-br " + game.color)}>
                {game.icon}
              </div>
              <span className="text-5xl filter drop-shadow-sm group-hover:scale-110 transition-transform duration-500">
                {game.emoji}
              </span>
            </div>

            <h3 className="text-2xl font-black text-slate-800 mb-2 truncate">
              {game.name}
            </h3>
            <p className="text-slate-500 text-sm font-medium mb-8 leading-relaxed">
              {game.desc}
            </p>

            <div className="mt-auto">
              <button
                onClick={() => setActiveGame(game.id as any)}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center group/btn",
                  "bg-gradient-to-r " + game.color
                )}
              >
                Chơi ngay
                <ChevronRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Trò chơi 5: Hái Hoa Dân Chủ
function FlowerGame({ appData, onWinXP }: { appData: AppData, onWinXP: (xp: number) => void }) {
  type Flower = { id: number; question: Question; state: 'ready' | 'picked' | 'answered'; color: string; emoji: string; correct: boolean | null };
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const [activeFlower, setActiveFlower] = useState<Flower | null>(null);
  
  const COLORS = [
    'text-pink-600 bg-pink-100 border-pink-300',
    'text-rose-600 bg-rose-100 border-rose-300',
    'text-fuchsia-600 bg-fuchsia-100 border-fuchsia-300',
    'text-purple-600 bg-purple-100 border-purple-300',
    'text-violet-600 bg-violet-100 border-violet-300',
    'text-orange-600 bg-orange-100 border-orange-300',
    'text-red-600 bg-red-100 border-red-300',
    'text-amber-600 bg-amber-100 border-amber-300',
  ];

  const EMOJIS = ['🌸', '🌺', '🌼', '🌻', '🪷', '🌷', '🌹', '🏵️'];

  useEffect(() => {
    if (selectedSubjectId) {
      initTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  const initTree = () => {
    let pool = appData.questions;
    if (selectedSubjectId && selectedSubjectId !== 'all') {
      pool = pool.filter(q => q.subjectId === selectedSubjectId);
    }
    
    // Pick up to 8 random questions
    const q = (shuffleArray([...pool]) as Question[]).slice(0, 8);
    const fls = q.map((quest, idx) => ({
      id: idx,
      question: quest,
      state: 'ready' as const,
      color: COLORS[idx % COLORS.length],
      emoji: EMOJIS[idx % EMOJIS.length],
      correct: null
    }));
    setFlowers(fls);
    setActiveFlower(null);
  };

  const pickFlower = (f: Flower) => {
    if (f.state !== 'ready') return;
    setActiveFlower(f);
  };

  const handleAnswer = (option: string) => {
    if (!activeFlower) return;
    const isCorrect = option === activeFlower.question.correctAnswer;
    
    // update flowers array
    const updated = flowers.map(f => {
      if (f.id === activeFlower.id) {
        return { ...f, state: 'answered' as const, correct: isCorrect };
      }
      return f;
    });
    setFlowers(updated);
    
    if (isCorrect) {
      Swal.fire({
        title: 'Bông Hoa May Mắn! 🌸',
        text: 'Bạn đã trả lời đúng!\n\nNhận được: +30 XP',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      onWinXP(30);
    } else {
      Swal.fire({
        title: 'Hoa Tàn... 🥀',
        text: `Sai mất rồi!\nĐáp án đúng là: ${activeFlower.question.correctAnswer}`,
        icon: 'error'
      });
      onWinXP(5); // an ủi lượm lá
    }
    
    // Close modal
    setActiveFlower(null);
  };

  if (!selectedSubjectId) {
    return <TopicSelector appData={appData} onSelect={setSelectedSubjectId} title="Hái Hoa Dân Chủ" color="pink" />;
  }

  if (flowers.length === 0) return <div className="p-8 text-center text-slate-500">Không có câu hỏi nào cho chủ đề này.</div>;

  return (
    <div className="bg-gradient-to-b from-sky-300 to-indigo-100 overflow-hidden relative p-8 rounded-3xl shadow-2xl min-h-[600px] border-4 border-white flex flex-col items-center">
      {/* Cỏ xanh dễ thương */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-emerald-400 rounded-t-[50%] z-0 border-t-8 border-emerald-500" />
      <div className="absolute -bottom-10 -left-10 w-64 h-32 bg-emerald-500 rounded-full z-0 blur-[2px]" />
      <div className="absolute -bottom-10 -right-10 w-96 h-40 bg-green-500 rounded-full z-0 blur-[2px]" />

      {/* Mây bay */}
      <div className="absolute top-10 left-10 w-32 h-12 bg-white/80 rounded-full blur-[1px] animate-pulse" />
      <div className="absolute top-24 right-20 w-40 h-14 bg-white/70 rounded-full blur-[1px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Cành cây (Tree trunk) */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-72 bg-amber-800/90 rounded-t-3xl z-0 shadow-lg">
        <div className="absolute bottom-40 right-0 w-48 h-8 bg-amber-800/90 rounded-full rotate-[-25deg] origin-bottom-left shadow-md" />
        <div className="absolute bottom-20 left-0 w-56 h-8 bg-amber-800/90 rounded-full rotate-[35deg] origin-bottom-right shadow-md" />
        <div className="absolute top-10 right-0 w-32 h-6 bg-amber-800/90 rounded-full rotate-[-40deg] origin-bottom-left shadow-md" />
        <div className="absolute top-20 left-0 w-36 h-6 bg-amber-800/90 rounded-full rotate-[15deg] origin-bottom-right shadow-md" />
      </div>

      {/* Giao diện Header */}
      <div className="relative z-10 text-center mb-12 bg-white/60 p-6 rounded-3xl backdrop-blur-md w-full max-w-3xl mt-4 shadow-xl border-2 border-white">
        <div className="flex justify-between items-start w-full">
          <button onClick={() => setSelectedSubjectId(null)} className="px-5 py-2.5 bg-white hover:bg-pink-50 text-pink-600 rounded-2xl text-sm font-black border-2 border-pink-200 transition-colors shrink-0 shadow-sm">
            ← Đổi môn
          </button>
          
          <div className="flex-1">
            <h3 className="text-4xl font-black text-pink-500 mb-2 flex items-center justify-center drop-shadow-sm">
              <span className="text-5xl mr-3 animate-spin-slow">🌸</span>
              Hái Hoa Dân Chủ
            </h3>
            <p className="text-pink-600/80 font-bold">Bấm vào các bông hoa để hái và trả lời câu hỏi nhận điểm XP nhé!</p>
            <button onClick={initTree} className="mt-4 px-6 py-2.5 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-400 hover:to-rose-300 text-white font-black rounded-2xl shadow-lg border-2 border-white text-sm transition-transform hover:scale-105">
              🌱 Gieo hạt, Trồng cây mới
            </button>
          </div>
        </div>
      </div>

      {/* The Flowers */}
      <div className="relative z-10 w-full max-w-4xl flex flex-wrap justify-center gap-8 mt-4 pb-12 px-8">
        {flowers.map((f, idx) => {
          let yOffset = "0px";
          // Create some random scattering visually
          if (idx % 2 === 0) yOffset = "-30px";
          if (idx % 3 === 0) yOffset = "30px";

          return (
            <motion.button
              key={f.id}
              style={{ y: yOffset }}
              whileHover={{ scale: 1.15, rotate: [0, -15, 15, -15, 15, 0] }}
              whileTap={{ scale: 0.9 }}
              onClick={() => pickFlower(f)}
              disabled={f.state === 'answered'}
              className={cn(
                "relative flex items-center justify-center w-28 h-28 rounded-[40%] shadow-xl transition-all cursor-pointer outline-none border-4 focus:ring-4 focus:ring-pink-300",
                f.state === 'ready' ? f.color : "bg-slate-200 border-slate-300 opacity-80 cursor-not-allowed grayscale"
              )}
            >
              {f.state === 'ready' ? (
                <span className="text-6xl filter drop-shadow-md animate-pulse">{f.emoji}</span>
              ) : (
                <span className="font-bold text-4xl">
                  {f.correct ? '🏆' : '🥀'}
                </span>
              )}
              {f.state === 'ready' && (
                <span className="absolute -bottom-4 px-3 py-1 bg-white text-pink-600 text-xs font-black rounded-xl shadow-md border-2 border-pink-200 z-20">
                  Câu hỏi {idx + 1}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Modal Câu hỏi */}
      <AnimatePresence>
        {activeFlower && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 100, rotate: -5 }}
              animate={{ scale: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0.8, y: 100, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn("w-full max-w-lg bg-white rounded-[2rem] p-8 shadow-2xl border-t-8", activeFlower.color.split(' ')[0].replace('text-', 'border-'))}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn("p-4 rounded-3xl w-fit shadow-inner", activeFlower.color)}>
                  <span className="text-4xl">{activeFlower.emoji}</span>
                </div>
                <button onClick={() => setActiveFlower(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <h4 className="text-xl font-bold text-slate-800 mb-8 leading-relaxed">
                {activeFlower.question.content}
              </h4>
              
              <div className="space-y-3">
                {activeFlower.question.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleAnswer(opt)}
                    className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-pink-500 hover:bg-pink-50 transition-colors font-medium text-slate-700 flex items-center"
                  >
                    <span className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 font-bold flex items-center justify-center mr-3 shrink-0">
                      {['A','B','C','D'][oIdx]}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Bộ chọn chủ đề chung cho các minigame
function TopicSelector({ appData, onSelect, title, color }: { appData: AppData, onSelect: (id: string) => void, title: string, color: 'blue' | 'pink' }) {
  const borderColor = color === 'blue' ? 'border-blue-900' : 'border-pink-900';
  const glow = color === 'blue' ? 'bg-blue-600/20' : 'bg-pink-600/20';
  const textColor = color === 'blue' ? 'text-blue-300' : 'text-pink-300';
  
  return (
    <div className={cn("bg-slate-900 border-4 p-4 md:p-8 rounded-3xl shadow-2xl relative min-h-[500px] flex flex-col items-center justify-center overflow-hidden", borderColor)}>
      <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] blur-[100px] pointer-events-none rounded-full", glow)} />
      
      <h2 className="text-4xl font-black text-white mb-4 relative z-10">{title}</h2>
      <p className={cn("mb-12 font-bold relative z-10", textColor)}>Hãy chọn một chuyên đề để bắt đầu thử thách</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl relative z-10">
        <button onClick={() => onSelect('all')} className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg border border-white/20 transition-all hover:scale-105">
          🌌 Trộn ngẫu nhiên (Tất cả)
        </button>
        {appData.subjects.map(sub => (
          <button key={sub.id} onClick={() => onSelect(sub.id)} className="p-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold shadow border border-white/10 transition-all hover:scale-105 flex items-center">
            {sub.name === 'Hợp chất vô cơ' ? 'Hợp chất vô cơ (Acid, Base, Muối, Oxide)' : sub.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// Trò chơi 4: Ai Là Triệu Phú Hóa Học
function MillionaireGame({ appData, onWinXP }: { appData: AppData, onWinXP: (xp: number) => void }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [gameState, setGameState] = useState<'playing' | 'wrong' | 'won'>('playing');
  const [isAnimating, setIsAnimating] = useState(false);

  // Lifelines
  const [used5050, setUsed5050] = useState(false);
  const [removedOptions, setRemovedOptions] = useState<string[]>([]);
  const [usedAudience, setUsedAudience] = useState(false);
  const [audiencePoll, setAudiencePoll] = useState<{opt: string, pct: number}[] | null>(null);

  const PRIZES = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000];

  useEffect(() => {
    if (selectedSubjectId) {
      initGame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubjectId]);

  const initGame = () => {
    let pool = appData.questions;
    if (selectedSubjectId && selectedSubjectId !== 'all') {
      pool = pool.filter(q => q.subjectId === selectedSubjectId);
    }
    
    const maxQs = Math.min(10, pool.length);
    const q = (shuffleArray([...pool]) as Question[]).slice(0, maxQs);
    
    setQuestions(q);
    setCurrentLevel(0);
    setGameState('playing');
    setSelectedOption(null);
    setUsed5050(false);
    setRemovedOptions([]);
    setUsedAudience(false);
    setAudiencePoll(null);
    setIsAnimating(false);
  };

  const handleAnswer = (option: string) => {
    if (gameState !== 'playing' || isAnimating) return;
    setSelectedOption(option);
    setIsAnimating(true);

    const currentQ = questions[currentLevel];
    const isCorrect = option === currentQ.correctAnswer;

    setTimeout(() => {
      if (isCorrect) {
        if (currentLevel === questions.length - 1) {
          setGameState('won');
          Swal.fire({
            title: 'SẮC MÀU TRIỆU PHÚ! 🏆',
            text: `Bạn đã vượt qua xuất sắc ${questions.length} câu hỏi và giành giải thưởng ${PRIZES[currentLevel]} Xu!\n\nThưởng đặc biệt: +200 XP`,
            icon: 'success',
            confirmButtonText: 'Tuyệt vời'
          });
          onWinXP(200);
        } else {
          setCurrentLevel(l => l + 1);
          setSelectedOption(null);
          setRemovedOptions([]);
          setAudiencePoll(null);
          setIsAnimating(false);
        }
      } else {
        setGameState('wrong');
        Swal.fire({
          title: 'Rất tiếc! 😢',
          text: `Bạn dừng lại ở câu số ${currentLevel + 1}.\nĐã nhận: ${currentLevel > 0 ? PRIZES[currentLevel - 1] : 0} Xu.\n\nNhận an ủi: +10 XP`,
          icon: 'error',
          confirmButtonText: 'Chơi lại'
        });
        onWinXP(10);
      }
    }, 2000); // Wait for suspense
  };

  const handle5050 = () => {
    if (used5050 || isAnimating || gameState !== 'playing') return;
    setUsed5050(true);
    const currentQ = questions[currentLevel];
    // Find wrong options
    const wrongOptions = currentQ.options.filter(o => o !== currentQ.correctAnswer);
    const toRemove = shuffleArray(wrongOptions).slice(0, 2);
    setRemovedOptions(toRemove);
  };

  const handleAudience = () => {
    if (usedAudience || isAnimating || gameState !== 'playing') return;
    setUsedAudience(true);
    const currentQ = questions[currentLevel];
    
    // Simulate smart audience (70% right)
    let remains = 100;
    const poll = currentQ.options.map(opt => {
      if (removedOptions.includes(opt)) return { opt, pct: 0 };
      if (opt === currentQ.correctAnswer) {
        const val = Math.floor(Math.random() * 20) + 60; // 60-80% correct
        remains -= val;
        return { opt, pct: val };
      }
      return { opt, pct: 0 };
    });

    // distribute rest
    const validOthers = poll.filter(p => p.opt !== currentQ.correctAnswer && p.pct === 0 && !removedOptions.includes(p.opt));
    validOthers.forEach((p, idx) => {
      if (idx === validOthers.length - 1) {
        p.pct = remains;
      } else {
        const val = Math.floor(Math.random() * remains);
        p.pct = val;
        remains -= val;
      }
    });

    setAudiencePoll(poll);
  };

  if (!selectedSubjectId) {
    return <TopicSelector appData={appData} onSelect={setSelectedSubjectId} title="Ai Là Triệu Phú" color="blue" />;
  }

  if (questions.length === 0) return <div className="p-8 text-center text-slate-500">Không có câu hỏi nào cho chủ đề này.</div>;

  const currentQ = questions[currentLevel];

  return (
    <div className="bg-slate-900 border-4 border-blue-900 p-4 md:p-8 rounded-3xl shadow-2xl overflow-hidden relative min-h-[500px] flex flex-col justify-between">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 blur-[100px] pointer-events-none rounded-full" />
      
      {/* Header: Lifelines, Level & Back */}
      <div className="flex justify-between items-start relative z-10 mb-4">
        <div className="flex flex-wrap gap-2 md:gap-4">
          <button onClick={() => setSelectedSubjectId(null)} className="px-3 py-1.5 md:px-4 md:py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] md:text-sm font-bold border border-slate-700 transition-colors">
            ← Đổi
          </button>
          <button 
            onClick={handle5050}
            disabled={used5050 || gameState !== 'playing'} 
            className={cn("w-10 h-7 md:w-14 md:h-10 flex items-center justify-center rounded-full border-2 text-[10px] md:text-sm font-bold transition-all", used5050 ? "border-slate-700 text-slate-700 opacity-50" : "border-yellow-400 text-yellow-400 hover:bg-yellow-400/20")}
          >
            50:50
          </button>
          <button 
            onClick={handleAudience}
            disabled={usedAudience || gameState !== 'playing'} 
            className={cn("w-10 h-7 md:w-14 md:h-10 flex items-center justify-center rounded-full border-2 transition-all", usedAudience ? "border-slate-700 text-slate-700 opacity-50" : "border-yellow-400 text-yellow-400 hover:bg-yellow-400/20")}
          >
            <Users className="w-3.5 h-3.5 md:w-5 md:h-5" />
          </button>
        </div>
        
        <div className="text-right">
          <p className="text-blue-300 font-bold uppercase text-[10px] md:text-xs tracking-widest">Câu hỏi số {currentLevel + 1}</p>
          <p className="text-2xl md:text-3xl font-black text-yellow-400">${PRIZES[currentLevel]}</p>
        </div>
      </div>

      {audiencePoll && (
        <div className="absolute top-20 left-8 bg-blue-950/80 border border-blue-800 p-4 rounded-xl z-20 flex flex-col items-center space-y-2 backdrop-blur-md">
          <p className="text-yellow-400 text-xs font-bold uppercase mb-2">Khán giả bình chọn</p>
          <div className="flex space-x-4 items-end h-24">
            {['A', 'B', 'C', 'D'].map((lbl, idx) => {
              const p = audiencePoll[idx];
              return (
                <div key={idx} className="flex flex-col items-center w-8">
                  <span className="text-white text-xs mb-1">{p.pct}%</span>
                  <div className="w-full bg-blue-500 rounded-sm" style={{ height: `${p.pct}%` }} />
                  <span className="text-yellow-400 text-xs mt-1 font-bold">{lbl}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Question */}
      <div className="w-full max-w-3xl mx-auto my-6 md:my-12 relative z-10 text-center px-4 py-6 md:px-6 md:py-8">
        {/* Hexagon wrapper illusion */}
        <div className="absolute inset-0 border-2 border-blue-500 bg-blue-950/50 skew-x-[-10deg] rounded-xl" />
        <h2 className="text-xl md:text-3xl font-bold text-white relative z-10">
          {currentQ.content}
        </h2>
      </div>

      {/* Answers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full relative z-10">
        {currentQ.options.map((opt, idx) => {
          const isRemoved = removedOptions.includes(opt);
          const isSelected = selectedOption === opt;
          const isCorrectAnswerReveal = isAnimating && isSelected && opt === currentQ.correctAnswer;
          const isWrongAnswerReveal = isAnimating && isSelected && opt !== currentQ.correctAnswer;
          
          return (
            <button
              key={idx}
              disabled={isRemoved || gameState !== 'playing' || isAnimating}
              onClick={() => handleAnswer(opt)}
              className={cn(
                "relative text-left px-4 py-3 md:px-6 md:py-4 transition-all overflow-hidden group outline-none",
                isRemoved ? "opacity-0 invisible" : "opacity-100"
              )}
            >
              <div className={cn(
                "absolute inset-0 border-2 skew-x-[-15deg] rounded-xl transition-colors",
                isCorrectAnswerReveal ? "bg-success border-success text-white animate-pulse" :
                isWrongAnswerReveal ? "bg-error border-error text-white" :
                isSelected ? "bg-yellow-500 border-yellow-400 text-black" :
                "bg-blue-950 border-blue-500 group-hover:bg-blue-800"
              )} />
              <div className="relative z-10 flex items-center font-bold text-sm md:text-lg">
                <span className={cn("mr-3 md:mr-4", isSelected && !isWrongAnswerReveal && !isCorrectAnswerReveal ? "text-black" : "text-yellow-400")}>
                  {['A', 'B', 'C', 'D'][idx]}:
                </span>
                <span className={cn(isSelected && !isWrongAnswerReveal && !isCorrectAnswerReveal ? "text-black" : "text-white")}>
                  {opt}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {(gameState === 'wrong' || gameState === 'won') && (
        <div className="mt-8 text-center relative z-10">
          <button onClick={initGame} className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-full shadow-lg transition-transform hover:scale-105">
            Chơi Ván Mới
          </button>
        </div>
      )}
    </div>
  );
}

// Trò chơi 3: Kéo Thả Phân Loại Hóa Học
function DragDropGame({ onWinXP }: { onWinXP: (xp: number) => void }) {
  const ITEMS = [
    { id: 'i1', name: 'NaCl', category: 'voco' },
    { id: 'i2', name: 'H₂SO₄', category: 'voco' },
    { id: 'i3', name: 'NaOH', category: 'voco' },
    { id: 'i4', name: 'CO₂', category: 'voco' },
    { id: 'i5', name: 'CaO', category: 'voco' },
    { id: 'i6', name: 'CH₄', category: 'huuco' },
    { id: 'i7', name: 'C₂H₅OH', category: 'huuco' },
    { id: 'i8', name: 'CH₃COOH', category: 'huuco' },
    { id: 'i9', name: 'C₆H₁₂O₆', category: 'huuco' },
    { id: 'i10', name: 'C₂H₄', category: 'huuco' },
  ];

  const CATEGORIES = [
    { id: 'voco', name: 'Hợp Chất Vô Cơ', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'huuco', name: 'Hợp Chất Hữu Cơ', color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  ];

  const [placedItems, setPlacedItems] = useState<Record<string, string>>({});
  const [errorItem, setErrorItem] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, catId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = ITEMS.find(i => i.id === id);
    
    if (item) {
      if (item.category === catId) {
        setPlacedItems(prev => {
          const next = { ...prev, [id]: catId };
          if (Object.keys(next).length === ITEMS.length) {
            Swal.fire({
              title: 'Cực thông minh! 🎯',
              text: 'Bạn đã phân loại chính xác toàn bộ hóa chất!\n\nThưởng +100 XP!',
              icon: 'success',
              confirmButtonText: 'Chơi lại'
            }).then(() => {
              onWinXP(100);
              setPlacedItems({});
            });
          }
          return next;
        });
      } else {
        // Sai phân loại
        setErrorItem(id);
        setTimeout(() => setErrorItem(null), 800);
      }
    }
  };

  const unplacedItems = ITEMS.filter(i => !placedItems[i.id]);

  return (
    <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
      <div className="text-center mb-10">
        <h3 className="text-2xl font-bold text-slate-800 mb-2">Phân Loại Hóa Học</h3>
        <p className="text-slate-500">Kéo và thả các chất vào đúng rổ: Hợp chất vô cơ & Hợp chất hữu cơ.</p>
      </div>

      {/* Kho hóa chất chưa phân loại */}
      <div className="min-h-[120px] p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300 mb-8 flex flex-wrap gap-4 items-center justify-center">
        {unplacedItems.length === 0 ? (
          <span className="text-slate-400 font-bold">Trống rỗng! Bạn đã phân loại hết.</span>
        ) : (
          unplacedItems.map(item => (
            <motion.div
              key={item.id}
              draggable
              onDragStart={(e: any) => handleDragStart(e, item.id)}
              animate={errorItem === item.id ? { x: [-5, 5, -5, 5, 0] } : {}}
              transition={{ duration: 0.4 }}
              className={cn(
                "px-6 py-3 bg-white w-fit rounded-xl border-2 border-slate-200 shadow-sm cursor-grab active:cursor-grabbing font-bold text-lg text-slate-700 hover:border-primary transition-colors",
                errorItem === item.id && "border-error text-error bg-error/10"
              )}
            >
              {item.name}
            </motion.div>
          ))
        )}
      </div>

      {/* Rổ phân loại */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6 max-w-4xl mx-auto">
        {CATEGORIES.map(cat => (
          <div
            key={cat.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, cat.id)}
            className={cn(
              "p-6 rounded-2xl border-2 min-h-[250px] transition-all",
              cat.color
            )}
          >
            <h4 className="font-bold text-xl mb-4 pb-2 border-b border-inherit bg-inherit">{cat.name}</h4>
            <div className="flex flex-col gap-3">
              {Object.keys(placedItems).filter(id => placedItems[id] === cat.id).map(id => {
                const item = ITEMS.find(i => i.id === id);
                return (
                  <motion.div
                    key={id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-4 py-2 bg-white rounded-lg shadow-sm font-bold text-center border border-slate-100"
                  >
                    {item?.name}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Trò chơi 2: Lật thẻ trí nhớ
function MemoryGame({ onWinXP }: { onWinXP: (xp: number) => void }) {
  const PAIRS = [
    { symbol: 'Fe', name: 'Sắt' },
    { symbol: 'Cu', name: 'Đồng' },
    { symbol: 'Ag', name: 'Bạc' },
    { symbol: 'Au', name: 'Vàng' },
    { symbol: 'Al', name: 'Nhôm' },
    { symbol: 'Zn', name: 'Kẽm' },
    { symbol: 'Na', name: 'Natri' },
    { symbol: 'Ca', name: 'Canxi' },
  ];

  type Card = { id: string; type: 'symbol' | 'name'; value: string; matchKey: string; isFlipped: boolean; isMatched: boolean };

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);

  const initGame = () => {
    let newCards: Card[] = [];
    PAIRS.forEach((p, idx) => {
      newCards.push({ id: `s-${idx}`, type: 'symbol', value: p.symbol, matchKey: p.symbol, isFlipped: false, isMatched: false });
      newCards.push({ id: `n-${idx}`, type: 'name', value: p.name, matchKey: p.symbol, isFlipped: false, isMatched: false });
    });
    newCards = shuffleArray(newCards);
    setCards(newCards);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2 || cards[index].isFlipped || cards[index].isMatched) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [idx1, idx2] = newFlipped;
      if (newCards[idx1].matchKey === newCards[idx2].matchKey) {
        // Match!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[idx1].isMatched = true;
          matchedCards[idx2].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);
          setMatches(m => m + 1);
          
          if (matches + 1 === PAIRS.length) {
            Swal.fire({
              title: 'Tuyệt vời! 🎉',
              text: `Bạn đã hoàn thành trong ${moves + 1} lượt!\n\nThưởng +80 XP!`,
              icon: 'success',
              confirmButtonText: 'Chơi lại'
            }).then(() => {
              onWinXP(80);
              initGame();
            });
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[idx1].isFlipped = false;
          resetCards[idx2].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="bg-white p-4 md:p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center">
      <div className="mb-6 md:mb-8 w-full flex flex-col md:flex-row items-start md:items-center justify-between px-2 md:px-4 gap-4">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-slate-800">Lật Thẻ Trí Nhớ 🧠</h3>
          <p className="text-sm text-slate-500">Tìm các cặp Ký hiệu - Tên gọi tương ứng.</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-[10px] md:text-sm font-bold text-slate-400 uppercase tracking-widest">Lượt lật</p>
          <p className="text-2xl md:text-3xl font-black text-purple-500">{moves}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-2xl perspective-1000">
        {cards.map((card, idx) => (
          <motion.div
            key={card.id}
            className="relative h-24 md:h-28 cursor-pointer preserve-3d"
            animate={{ rotateY: card.isFlipped || card.isMatched ? 180 : 0 }}
            transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 20 }}
            onClick={() => handleCardClick(idx)}
          >
            {/* Front (Hidden) */}
            <div className="absolute inset-0 backface-hidden bg-slate-900 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/20">?</span>
            </div>
            
            {/* Back (Revealed) */}
            <div className={cn(
              "absolute inset-0 backface-hidden rounded-2xl shadow-md rotate-y-180 flex items-center justify-center p-1 md:p-2 text-center border-2",
              card.isMatched ? "bg-success/10 border-success text-success" : 
              card.type === 'symbol' ? "bg-purple-50 border-purple-200 text-purple-700" : "bg-orange-50 border-orange-200 text-orange-700"
            )}>
              <span className={cn("font-bold", card.type === 'symbol' ? "text-2xl md:text-3xl" : "text-sm md:text-lg")}>
                {card.value}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Trò chơi 1: Phòng thí nghiệm 
function VirtualLabGame({ onWinXP }: { onWinXP: (xp: number) => void }) {
  const ingredients = [
    { id: 'h2', name: 'H₂', color: 'bg-blue-100 text-blue-600', border: 'border-blue-200' },
    { id: 'o2', name: 'O₂', color: 'bg-sky-100 text-sky-600', border: 'border-sky-200' },
    { id: 'na', name: 'Na', color: 'bg-orange-100 text-orange-600', border: 'border-orange-200' },
    { id: 'h2o', name: 'H₂O', color: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-200' },
    { id: 'c', name: 'C', color: 'bg-stone-100 text-stone-600', border: 'border-stone-200' },
    { id: 'cu', name: 'Cu', color: 'bg-amber-100 text-amber-600', border: 'border-amber-200' },
    { id: 'hno3', name: 'HNO₃', color: 'bg-red-100 text-red-600', border: 'border-red-200' },
    { id: 'fe', name: 'Fe', color: 'bg-slate-100 text-slate-600', border: 'border-slate-200' },
    { id: 'hcl', name: 'HCl', color: 'bg-yellow-100 text-yellow-600', border: 'border-yellow-200' },
    { id: 'naoh', name: 'NaOH', color: 'bg-pink-100 text-pink-600', border: 'border-pink-200' },
    { id: 'bacl2', name: 'BaCl₂', color: 'bg-teal-100 text-teal-600', border: 'border-teal-200' },
    { id: 'h2so4', name: 'H₂SO₄', color: 'bg-fuchsia-100 text-fuchsia-600', border: 'border-fuchsia-200' },
    { id: 'cuo', name: 'CuO', color: 'bg-gray-100 text-gray-800', border: 'border-gray-300' },
    { id: 'co2', name: 'CO₂', color: 'bg-purple-100 text-purple-600', border: 'border-purple-200' },
    { id: 'caoh2', name: 'Ca(OH)₂', color: 'bg-indigo-100 text-indigo-600', border: 'border-indigo-200' },
    { id: 'mg', name: 'Mg', color: 'bg-zinc-100 text-zinc-600', border: 'border-zinc-300' },
    { id: 'zn', name: 'Zn', color: 'bg-slate-50 text-slate-700', border: 'border-slate-300' },
    { id: 'p', name: 'P', color: 'bg-red-50 text-red-700', border: 'border-red-300' },
    { id: 'agno3', name: 'AgNO₃', color: 'bg-neutral-100 text-neutral-600', border: 'border-neutral-300' },
    { id: 'nacl', name: 'NaCl', color: 'bg-blue-50 text-blue-500', border: 'border-blue-100' },
    { id: 'cuso4', name: 'CuSO₄', color: 'bg-blue-200 text-blue-800', border: 'border-blue-400' },
    // Hợp chất hữu cơ
    { id: 'ch4', name: 'CH₄', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-200' },
    { id: 'c2h4', name: 'C₂H₄', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-300' },
    { id: 'c2h2', name: 'C₂H₂', color: 'bg-emerald-200 text-emerald-800', border: 'border-emerald-400' },
    { id: 'c2h5oh', name: 'C₂H₅OH', color: 'bg-orange-50 text-orange-600', border: 'border-orange-200' },
    { id: 'ch3cooh', name: 'CH₃COOH', color: 'bg-red-50 text-red-600', border: 'border-red-200' },
    { id: 'br2', name: 'Br₂', color: 'bg-orange-800 text-orange-200', border: 'border-orange-900' },
    // Các chất hữu cơ KHTN 9 (Kết nối tri thức)
    { id: 'glucozo', name: 'Glucozơ', color: 'bg-yellow-50 text-yellow-600', border: 'border-yellow-200' },
    { id: 'saccarozo', name: 'Saccarozơ', color: 'bg-yellow-100 text-yellow-700', border: 'border-yellow-300' },
    { id: 'tinhbot', name: 'Tinh bột', color: 'bg-stone-50 text-stone-500', border: 'border-stone-200' },
    { id: 'chatbeo', name: 'Chất béo', color: 'bg-amber-50 text-amber-600', border: 'border-amber-200' },
    { id: 'i2', name: 'Iốt', color: 'bg-fuchsia-900 text-fuchsia-100', border: 'border-fuchsia-800' },
    { id: 'tollens', name: 'AgNO₃/NH₃', color: 'bg-slate-200 text-slate-800', border: 'border-slate-400' },
  ];

  const recipes = [
    { ingredients: ['h2', 'o2'], product: 'H₂O (Nước)', message: 'Phản ứng cháy tạo ra nước!', isExplosive: true, condition: 't°' },
    { ingredients: ['na', 'h2o'], product: 'NaOH + H₂↑', message: 'Natri phản ứng mãnh liệt với nước tạo bọt khí Hidro!', isExplosive: true, condition: '' },
    { ingredients: ['c', 'o2'], product: 'CO₂ (Khí Cacbonic)', message: 'Cacbon cháy trong Oxi tỏa nhiều nhiệt.', isExplosive: false, condition: 't°' },
    { ingredients: ['cu', 'hno3'], product: 'Cu(NO₃)₂ + NO₂↑ + H₂O', message: 'Đồng tác dụng với Acid Nitric đặc sinh ra dung dịch xanh lam và khí màu nâu đỏ độc!', isExplosive: true, condition: '' },
    { ingredients: ['fe', 'hcl'], product: 'FeCl₂ + H₂↑', message: 'Sắt tan trong Acid Clohidric sinh ra bọt khí Hidro.', isExplosive: false, condition: '' },
    { ingredients: ['naoh', 'hcl'], product: 'NaCl + H₂O', message: 'Phản ứng trung hòa tạo muối ăn và nước (tỏa nhiệt).', isExplosive: false, condition: '' },
    { ingredients: ['bacl2', 'h2so4'], product: 'BaSO₄↓ + HCl', message: 'Tạo kết tủa trắng Bari Sunfat ở đáy bình!', isExplosive: false, condition: '' },
    { ingredients: ['cuo', 'h2'], product: 'Cu + H₂O', message: 'Khí Hidro khử CuO màu đen thành Đồng (Cu) màu đỏ.', isExplosive: false, condition: 't°' },
    { ingredients: ['caoh2', 'co2'], product: 'CaCO₃↓ + H₂O', message: 'Khí CO₂ làm vẩn đục nước vôi trong do tạo kết tủa trắng Canxi Cacbonat.', isExplosive: false, condition: '' },
    { ingredients: ['mg', 'o2'], product: 'MgO', message: 'Magie cháy sáng chói lọi trong Oxi, tạo ra bột trắng Magie Oxit!', isExplosive: true, condition: 't°' },
    { ingredients: ['zn', 'hcl'], product: 'ZnCl₂ + H₂↑', message: 'Kẽm sủi bọt cực mạnh trong acid tạo khí Hidro bay lên.', isExplosive: false, condition: '' },
    { ingredients: ['p', 'o2'], product: 'P₂O₅', message: 'Photpho đỏ cháy rực sinh ra lượng lớn khói trắng (Điphotpho Pentaoxit).', isExplosive: true, condition: 't°' },
    { ingredients: ['agno3', 'nacl'], product: 'AgCl↓ + NaNO₃', message: 'Phản ứng lập tức tạo lớp kết tủa trắng Bạc Clorua!', isExplosive: false, condition: '' },
    { ingredients: ['fe', 'cuso4'], product: 'FeSO₄ + Cu↓', message: 'Sắt đẩy Đồng ra khỏi muối. Đinh sắt chuyển màu đỏ Đồng!', isExplosive: false, condition: '' },
    { ingredients: ['naoh', 'cuso4'], product: 'Cu(OH)₂↓ + Na₂SO₄', message: 'Từ dung dịch tạo ngay kết tủa màu xanh lam thẫm (Đồng II Hidroxit).', isExplosive: false, condition: '' },
    // Phản ứng hữu cơ
    { ingredients: ['ch4', 'o2'], product: 'CO₂ + H₂O', message: 'Metan cháy tạo nhiệt. Hỗn hợp nổ cực mạnh nếu trộn tỉ lệ 1:2!', isExplosive: true, condition: 't°' },
    { ingredients: ['c2h4', 'br2'], product: 'C₂H₄Br₂', message: 'Etilen làm phai màu nâu đỏ của dung dịch Brom do phản ứng cộng đứt liên kết đôi.', isExplosive: false, condition: '' },
    { ingredients: ['c2h2', 'br2'], product: 'C₂H₂Br₄', message: 'Axetilen phản ứng bẻ gãy liên kết ba làm mất màu dần dung dịch Brom.', isExplosive: false, condition: '' },
    { ingredients: ['c2h5oh', 'na'], product: 'C₂H₅ONa + H₂↑', message: 'Natri đẩy phản ứng sủi bọt khí Hidro khỏi Rượu Etylic.', isExplosive: false, condition: '' },
    { ingredients: ['c2h5oh', 'o2'], product: 'CO₂ + H₂O', message: 'Rượu Etylic (Cồn) cháy sáng bốc lửa với ngọn lửa màu xanh lam.', isExplosive: true, condition: 't°' },
    { ingredients: ['ch3cooh', 'naoh'], product: 'CH₃COONa + H₂O', message: 'Phản ứng trung hòa tạo dung dịch muối Natri Axetat (Dùng làm giấm).', isExplosive: false, condition: '' },
    { ingredients: ['ch3cooh', 'caoh2'], product: '(CH₃COO)₂Ca + H₂O', message: 'Acid Axetic tác dụng với Base tạo Canxi Axetat hòa tan.', isExplosive: false, condition: '' },
    { ingredients: ['ch3cooh', 'c2h5oh'], product: 'CH₃COOC₂H₅ + H₂O', message: 'Phản ứng Este hóa sinh ra Etyl Axetat mang mùi thơm dễ chịu của este.', isExplosive: false, condition: 't°, H₂SO₄ đặc' },
    { ingredients: ['tinhbot', 'i2'], product: 'Hợp chất xanh tím', message: 'Hồ tinh bột tác dụng với Iôt tạo hợp chất màu xanh tím đặc trưng!', isExplosive: false, condition: '' },
    { ingredients: ['glucozo', 'tollens'], product: 'Lớp Bạc (Ag) bám thành bình', message: 'Glucozơ khử AgNO₃ trong NH₃ (Thuốc thử Tollens) tạo lớp tráng gương màu bạc sáng loáng!', isExplosive: false, condition: 't°' },
    { ingredients: ['chatbeo', 'naoh'], product: 'Glixerol + Muối Natri (Xà phòng)', message: 'Phản ứng Xà phòng hóa chất béo khi đun nóng với dung dịch Xút tạo Xà phòng!', isExplosive: false, condition: 't°' },
    { ingredients: ['saccarozo', 'h2o'], product: 'Glucozơ + Fructozơ', message: 'Dưới xúc tác acid và đun nóng, Saccarozơ nứt đôi thành đường nho (Glucozơ) và đường mật ong (Fructozơ).', isExplosive: false, condition: 't°, H⁺' },
    { ingredients: ['glucozo', 'o2'], product: 'CO₂ + H₂O + ATP', message: 'Glucozơ cháy (hoặc hô hấp tế bào) tạo năng lượng và khí Các-bô-níc.', isExplosive: false, condition: 't°' },
  ];

  const [flask, setFlask] = useState<string[]>([]);
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [result, setResult] = useState<{product: string, message: string, success: boolean, condition?: string} | null>(null);
  const [isReacting, setIsReacting] = useState(false);

  const handleAdd = (id: string) => {
    if (flask.length >= 2 || isReacting) return;
    setFlask([...flask, id]);
    setResult(null);
  };

  const handleClear = () => {
    setFlask([]);
    setSelectedCondition('');
    setResult(null);
  };

  const handleReact = () => {
    if (flask.length < 2) return;
    setIsReacting(true);
    setResult(null);

    setTimeout(() => {
      const sortedFlask = [...flask].sort();
      const recipe = recipes.find(r => {
        const sortedRecipe = [...r.ingredients].sort();
        return sortedRecipe.length === sortedFlask.length && sortedRecipe.every((val, index) => val === sortedFlask[index]);
      });

      if (recipe) {
        // Kiểm tra điều kiện nếu có
        const needsCondition = recipe.condition !== '';
        // Một số phản ứng có thể có nhiều điều kiện, ở đây ta kiểm tra xem điều kiện đã chọn có nằm trong chuỗi điều kiện của công thức không
        const conditionMet = !needsCondition || (selectedCondition !== '' && recipe.condition.includes(selectedCondition));

        if (conditionMet) {
          setResult({ product: recipe.product, message: recipe.message, success: true, condition: recipe.condition });
          Swal.fire({
            title: 'Phản ứng thành công! 🎉',
            text: `Bạn tạo ra: ${recipe.product}${recipe.condition ? `\nĐiều kiện: ${recipe.condition}` : ''}\n\nThưởng +50 XP!`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false
          });
          onWinXP(50);
        } else {
          setResult({ 
            product: 'Phản ứng không xảy ra', 
            message: `Thiếu hoặc sai điều kiện phản ứng. Thử thêm nhiệt độ hoặc xúc tác xem sao? (Cần: ${recipe.condition})`, 
            success: false 
          });
        }
      } else {
        setResult({ product: 'Kết tủa đen / Không phản ứng', message: 'Hai chất này không phản ứng với nhau hoặc cần bộ công cụ thí nghiệm cao cấp hơn.', success: false });
      }
      setIsReacting(false);
      setFlask([]);
      setSelectedCondition('');
    }, 1500);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-slate-800 mb-4 flex items-center justify-center">
          <FlaskConical className="w-8 h-8 mr-3 text-primary" />
          Phòng Thí Nghiệm Ảo
        </h2>
        <p className="text-slate-500">Pha trộn các chất hóa học để khám phá các phản ứng bí ẩn và nhận XP!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kệ Hóa Chất */}
        <div className="bg-white p-3 md:p-8 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 h-fit">
          <h3 className="text-base md:text-xl font-bold text-slate-800 mb-4 md:mb-6 border-b pb-4 text-center md:text-left">Kệ Hóa Chất</h3>
          <div className="flex flex-wrap justify-center md:justify-start gap-1.5 md:gap-4">
            {ingredients.map(ing => (
              <motion.button
                key={ing.id}
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleAdd(ing.id)}
                disabled={flask.length >= 2 || isReacting}
                className={cn(
                  "w-[4.4rem] h-14 md:w-20 md:h-20 rounded-xl md:rounded-2xl border-2 flex items-center justify-center text-[10px] md:text-xl font-bold shadow-sm transition-all text-center px-1",
                  ing.color, ing.border,
                  (flask.length >= 2 || isReacting) ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"
                )}
              >
                {ing.name}
              </motion.button>
            ))}
          </div>

          <h3 className="text-lg font-bold text-slate-800 mt-10 mb-4 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-500" />
            Điều kiện phản ứng
          </h3>
          <div className="flex space-x-3">
            {[
              { id: 't°', name: 'Nhiệt độ (t°)', icon: Flame, color: 'text-orange-500 bg-orange-50' },
              { id: 'xt', name: 'Xúc tác (xt)', icon: Hammer, color: 'text-blue-500 bg-blue-50' },
              { id: 'as', name: 'Ánh sáng', icon: Zap, color: 'text-yellow-500 bg-yellow-50' },
            ].map(cond => (
              <button
                key={cond.id}
                onClick={() => setSelectedCondition(selectedCondition === cond.id ? '' : cond.id)}
                disabled={isReacting}
                className={cn(
                  "px-4 py-2 rounded-xl border-2 font-bold text-sm transition-all flex items-center",
                  selectedCondition === cond.id 
                    ? "border-primary bg-primary/10 text-primary shadow-sm" 
                    : "border-slate-100 text-slate-500 hover:border-slate-200"
                )}
              >
                <cond.icon className={cn("w-4 h-4 mr-2", selectedCondition === cond.id ? "text-primary" : "text-slate-400")} />
                {cond.name}
              </button>
            ))}
          </div>

          <p className="mt-8 text-sm text-slate-400 italic">Gợi ý: Đừng quên kiểm tra xem phản ứng có cần nhiệt độ (t°) không nhé!</p>
        </div>

        {/* Bình Phản Ứng */}
        <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative overflow-hidden flex flex-col items-center min-h-[400px]">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
          
          <h3 className="text-xl font-bold text-white mb-8 z-10 w-full text-center">Bình Phản Ứng</h3>
          
          <div className="flex-1 flex flex-col items-center justify-center z-10 w-full">
            <motion.div 
              animate={isReacting ? { 
                x: [-5, 5, -5, 5, 0],
                rotate: [-2, 2, -2, 2, 0],
                scale: [1, 1.1, 1],
              } : {}}
              transition={{ duration: 0.5, repeat: isReacting ? 2 : 0 }}
              className="relative w-36 h-36 md:w-48 md:h-48 mb-6 md:mb-8"
            >
              <div className="absolute inset-0 border-4 border-white/20 rounded-b-[4rem] rounded-t-xl bg-white/5 backdrop-blur-sm flex flex-col justify-end overflow-hidden">
                {/* Liquid simulation based on flask content */}
                <motion.div 
                  initial={{ height: '0%' }}
                  animate={{ height: flask.length > 0 ? `${flask.length * 40}%` : '5%' }}
                  className={cn(
                    "w-full transition-colors duration-1000",
                    isReacting ? "bg-gradient-to-t from-orange-500 to-yellow-300 animate-pulse" : 
                    flask.length === 0 ? "bg-transparent" :
                    flask.length === 1 ? "bg-blue-400/50" : "bg-purple-500/60"
                  )}
                />
              </div>

              {/* Bubbles if reacting */}
              {isReacting && (
                <div className="absolute inset-0 flex justify-center items-end pb-4">
                  <motion.div animate={{ y: [0, -100], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-white rounded-full mx-1" />
                  <motion.div animate={{ y: [0, -120], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-3 h-3 bg-white rounded-full mx-1" />
                  <motion.div animate={{ y: [0, -90], opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-white rounded-full mx-1" />
                </div>
              )}

              {/* Heat simulation if selected */}
              {selectedCondition === 't°' && (
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-20">
                   <Flame className="w-10 h-10 text-orange-500 animate-bounce" fill="currentColor" />
                </div>
              )}
            </motion.div>

            {/* Display added ingredients */}
            <div className="flex flex-col items-center space-y-3 mb-8">
              <div className="flex items-center space-x-4 h-12">
                {flask.length === 0 && !result && <span className="text-white/40 italic">Chưa có chất nào</span>}
                {flask.map((id, idx) => {
                  const ing = ingredients.find(i => i.id === id);
                  return (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-white font-bold">+</span>}
                      <div className={cn("px-4 py-2 rounded-xl border text-sm font-bold", ing?.color, ing?.border)}>
                        {ing?.name}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
              
              {selectedCondition && (
                <div className="flex items-center text-xs font-bold text-yellow-400 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <span className="mr-2">Điều kiện:</span>
                  {selectedCondition === 't°' ? 'Nhiệt độ' : selectedCondition === 'xt' ? 'Xúc tác' : 'Ánh sáng'}
                </div>
              )}
            </div>

            {/* Actions */}
            {!result && (
              <div className="flex space-x-4">
                <button 
                  onClick={handleClear}
                  disabled={flask.length === 0 || isReacting}
                  className="px-6 py-3 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
                >
                  Xóa
                </button>
                <button 
                  onClick={handleReact}
                  disabled={flask.length < 2 || isReacting}
                  className="px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-primary to-purple-500 text-white shadow-lg hover:shadow-primary/30 disabled:opacity-50 transition-all flex items-center"
                >
                  <Flame className={cn("w-5 h-5 mr-2", isReacting && "animate-pulse")} />
                  Thực hiện phản ứng
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-6 rounded-2xl w-full text-center border",
                  result.success ? "bg-success/20 border-success/30 text-emerald-300" : "bg-white/10 border-white/20 text-slate-300"
                )}
              >
                <h4 className="text-lg font-bold mb-2 text-white">
                  {result.success ? "Phản ứng kích hoạt!" : "Thất bại"}
                </h4>
                <p className="text-2xl font-black text-white mb-2">{result.product}</p>
                {result.condition && (
                  <div className="text-xs font-bold text-yellow-500 mb-2 uppercase">Điều kiện: {result.condition}</div>
                )}
                <p className="text-sm opacity-80">{result.message}</p>
                <button 
                  onClick={handleClear}
                  className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Làm thử lại
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FlashcardsView({ appData }: { appData: AppData }) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  
  const cards = useMemo(() => {
    let qs = appData.questions;
    if (selectedSubjectId !== 'all') {
      qs = qs.filter(q => q.subjectId === selectedSubjectId);
    }
    if (qs.length === 0) return [{ front: 'Chưa có thẻ nào', back: 'Hãy thêm câu hỏi' }];
    
    return qs.map(q => ({
      front: q.content,
      back: q.correctAnswer
    }));
  }, [appData.questions, selectedSubjectId]);

  const [current, setCurrent] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6">
      <div className="text-center mb-12">
        <motion.h2 
          initial={{ y: -20, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          className="text-2xl md:text-4xl font-black text-slate-800 mb-2 md:mb-4"
        >
          Thẻ Ghi Nhớ Diệu Kỳ ✨
        </motion.h2>
        <p className="text-xs md:text-sm text-slate-500 font-medium mb-6 md:mb-8">Lật mở từng bí mật của thế giới hóa học theo cách đáng yêu nhất.</p>
        
        <div className="flex justify-center flex-wrap gap-2 md:gap-3 mb-6 md:mb-10">
          <button 
            onClick={() => { setSelectedSubjectId('all'); setCurrent(0); setIsFlipped(false); }}
            className={cn(
              "px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-black rounded-xl md:rounded-2xl transition-all shadow-sm border-2", 
              selectedSubjectId === 'all' 
                ? "bg-rose-500 text-white border-rose-500 shadow-rose-200" 
                : "bg-white border-slate-100 text-slate-500 hover:border-rose-200"
            )}
          >
            🌈 Tất cả
          </button>
          {appData.subjects.map(sub => (
            <button 
              key={sub.id}
              onClick={() => { setSelectedSubjectId(sub.id); setCurrent(0); setIsFlipped(false); }}
              className={cn(
                "px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-black rounded-xl md:rounded-2xl transition-all shadow-sm border-2", 
                selectedSubjectId === sub.id 
                  ? "bg-rose-500 text-white border-rose-500 shadow-rose-200" 
                  : "bg-white border-slate-100 text-slate-500 hover:border-rose-200"
              )}
            >
              {sub.name === 'Nguyên tử' ? '⚛️ ' + sub.name.split(' ')[0] :
               sub.name === 'Nguyên tố hóa học' ? '🧪 ' + sub.name.split(' ')[0] :
               sub.name === 'Hợp chất vô cơ' ? '⚗️ Vô cơ' :
               sub.name === 'Kim loại' ? '🔨 ' + sub.name :
               sub.name === 'Phi kim' ? '☁️ ' + sub.name : '🍃 ' + sub.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[450px] perspective-1000 max-w-lg mx-auto">
        <motion.div 
          className="w-full h-full relative preserve-3d cursor-pointer"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200, damping: 20 }}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front Card */}
          <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] md:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.1)] border-4 md:border-8 border-white flex flex-col items-center justify-center p-6 md:p-12 text-center overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute top-10 left-10"><Atom size={100} /></div>
                <div className="absolute bottom-10 right-10"><FlaskConical size={100} /></div>
             </div>

             <div className="w-14 h-14 md:w-20 md:h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 md:mb-8 animate-float">
                <HelpCircle className="w-8 h-8 md:w-10 md:h-10" />
             </div>
             <span className="text-[10px] md:text-xs font-black text-rose-300 uppercase tracking-[0.2em] mb-3 md:mb-4">Câu hỏi bí mật</span>
             <h3 className="text-xl md:text-3xl font-black text-slate-800 leading-tight mb-6 md:mb-8">
               {cards[current].front}
             </h3>
             <div className="py-2 px-4 md:py-3 md:px-6 bg-slate-50 rounded-xl md:rounded-2xl text-slate-400 font-bold text-xs md:text-sm">
                Nhấn để lật thẻ ✨
             </div>
          </div>
          
          {/* Back Card */}
          <div className="absolute inset-0 backface-hidden bg-slate-900 text-white rounded-[2rem] md:rounded-[3rem] shadow-[0_30px_60px_rgba(0,0,0,0.2)] border-4 md:border-8 border-slate-800 flex flex-col items-center justify-center p-6 md:p-12 text-center rotate-y-180 overflow-hidden">
             {/* Sparkle Background */}
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900" />
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 md:w-64 md:h-64 bg-rose-500/20 blur-[60px] md:blur-[80px] rounded-full" />

             <div className="relative z-10">
                <div className="w-14 h-14 md:w-20 md:h-20 bg-white/10 text-rose-400 rounded-full flex items-center justify-center mb-6 md:mb-8 mx-auto animate-pulse">
                   <Zap className="w-8 h-8 md:w-10 md:h-10" fill="currentColor" />
                </div>
                <span className="text-[10px] md:text-xs font-black text-rose-400/60 uppercase tracking-[0.2em] mb-3 md:mb-4">Giải mã thành công</span>
                <h3 className="text-2xl md:text-4xl font-black text-white leading-tight mb-8 md:mb-10 drop-shadow-lg">
                  {cards[current].back}
                </h3>
                <div className="py-2 px-4 md:py-3 md:px-6 bg-white/10 rounded-xl md:rounded-2xl text-white/50 font-bold text-xs md:text-sm inline-block">
                   Quay lại mặt trước 🔄
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      <div className="mt-16 flex items-center justify-center space-x-10">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((current - 1 + cards.length) % cards.length);
            setIsFlipped(false);
          }}
          className="w-16 h-16 bg-white rounded-3xl shadow-xl border-4 border-white flex items-center justify-center hover:-translate-x-2 transition-all active:scale-90"
        >
          <ArrowLeft className="w-8 h-8 text-rose-500" />
        </button>
        
        <div className="px-8 py-3 bg-white rounded-2xl shadow-inner border border-slate-100 font-black text-slate-400 text-lg">
           {current + 1} / {cards.length}
        </div>

        <button 
          onClick={(e) => {
            e.stopPropagation();
            setCurrent((current + 1) % cards.length);
            setIsFlipped(false);
          }}
          className="w-16 h-16 bg-white rounded-3xl shadow-xl border-4 border-white flex items-center justify-center hover:translate-x-2 transition-all active:scale-90"
        >
          <ChevronRight className="w-8 h-8 text-rose-500" />
        </button>
      </div>
    </div>
  );
}

function SettingsView({ settings, onSave, onReset }: { 
  settings: AppSettings; 
  onSave: (s: AppSettings) => void;
  onReset: () => void;
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center">
          <BrainCircuit className="w-6 h-6 mr-3 text-primary" />
          Cấu hình Gemini AI
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Gemini API Key</label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"}
                value={localSettings.geminiApiKey}
                onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
                placeholder="Nhập API Key của bạn..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Lấy API Key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-primary hover:underline">Google AI Studio</a>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Mô hình ưu tiên</label>
            <select 
              value={localSettings.selectedModel}
              onChange={(e) => setLocalSettings({ ...localSettings, selectedModel: e.target.value })}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {GEMINI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-xl font-bold text-slate-800 mb-8 flex items-center">
          <SettingsIcon className="w-6 h-6 mr-3 text-primary" />
          Cài đặt chung
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Âm thanh</p>
              <p className="text-sm text-slate-500">Bật/tắt hiệu ứng âm thanh khi làm bài</p>
            </div>
            <button 
              onClick={() => setLocalSettings({ ...localSettings, soundEnabled: !localSettings.soundEnabled })}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                localSettings.soundEnabled ? "bg-primary" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                localSettings.soundEnabled ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Tự động lưu</p>
              <p className="text-sm text-slate-500">Tự động lưu tiến độ vào LocalStorage</p>
            </div>
            <button 
              onClick={() => setLocalSettings({ ...localSettings, autoSave: !localSettings.autoSave })}
              className={cn(
                "w-12 h-6 rounded-full transition-colors relative",
                localSettings.autoSave ? "bg-primary" : "bg-slate-200"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                localSettings.autoSave ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <button 
          onClick={onReset}
          className="w-full sm:w-auto px-8 py-3 bg-white text-error border border-error/20 font-bold rounded-2xl hover:bg-error/5 transition-all"
        >
          Xóa toàn bộ dữ liệu
        </button>
        <button 
          onClick={() => onSave(localSettings)}
          className="w-full sm:w-auto px-12 py-3 bg-slate-900 text-white font-bold rounded-2xl shadow-xl hover:bg-primary transition-all flex items-center justify-center"
        >
          <Save className="w-5 h-5 mr-2" />
          Lưu thay đổi
        </button>
      </div>
    </div>
  );
}

// Trò chơi 6: Ô Chữ Bí Mật
function CrosswordGame({ onWinXP }: { onWinXP: (xp: number) => void }) {
  const PUZZLE_SETS = [
    {
      secret: 'PROTON',
      data: [
        { answer: 'PHOSPHORUS', question: 'Nguyên tố phi kim cực độc (chuột rút, bỏng nặng) dạng đỏ hoặc trắng thường có trong đầu que diêm?', secretIndex: 0 }, 
        { answer: 'IRON', question: 'Tên tiếng Anh chuẩn IUPAC của nguyên tố Sắt?', secretIndex: 1 }, 
        { answer: 'OXYGEN', question: 'Chất khí thiết yếu duy trì sự sống và sự cháy?', secretIndex: 0 }, 
        { answer: 'METHANE', question: 'Thành phần chính của khí thiên nhiên và khí sinh học (biogas)?', secretIndex: 2 }, 
        { answer: 'OXIDE', question: 'Tên gọi chung của hợp chất kết hợp từ Oxygen với 1 nguyên tố khác?', secretIndex: 0 }, 
        { answer: 'ZINC', question: 'Tên tiếng Anh theo danh pháp IUPAC của nguyên tố Kẽm?', secretIndex: 2 }, 
      ]
    },
    {
      secret: 'HELIUM',
      data: [
        { answer: 'HYDROGEN', question: 'Nguyên tố phổ biến nhất trong vũ trụ và là thành phần chính của Mặt Trời?', secretIndex: 0 }, 
        { answer: 'ELECTRON', question: 'Hạt mang điện tích âm quay xung quanh hạt nhân nguyên tử?', secretIndex: 1 }, 
        { answer: 'LITHIUM', question: 'Kim loại nhẹ nhất, được sử dụng rộng rãi trong các loại pin sạc hiện đại?', secretIndex: 0 }, 
        { answer: 'ISOTOPE', question: 'Các nguyên tử có cùng số Proton nhưng khác số Neutron được gọi là gì?', secretIndex: 0 }, 
        { answer: 'URANIUM', question: 'Nguyên tố nặng dùng làm nhiên liệu cho các nhà máy điện hạt nhân?', secretIndex: 0 }, 
        { answer: 'MOLECULE', question: 'Hạt đại diện cho chất, gồm một số nguyên tử liên kết với nhau?', secretIndex: 0 }, 
      ]
    }
  ];

  const [puzzleIndex, setPuzzleIndex] = useState(0);

  useEffect(() => {
    setPuzzleIndex(Math.floor(Math.random() * PUZZLE_SETS.length));
  }, []);

  const PUZZLE = PUZZLE_SETS[puzzleIndex].data;
  const SECRET_WORD = PUZZLE_SETS[puzzleIndex].secret;
  const SECRET_COLUMN = 5; // Vị trí cột bí mật trung tâm

  const [answers, setAnswers] = useState<string[]>(Array(6).fill(''));
  const [solved, setSolved] = useState<boolean[]>(Array(6).fill(false));
  const [activeRow, setActiveRow] = useState<number | null>(null);

  const resetGame = () => {
    setPuzzleIndex(prev => (prev + 1) % PUZZLE_SETS.length);
    setAnswers(Array(6).fill(''));
    setSolved(Array(6).fill(false));
    setActiveRow(null);
  };

  const checkAnswer = (idx: number, guess: string) => {
    // Xóa dấu tiếng việt, khoảng trắng thừa nếu có
    const formattedGuess = guess.toUpperCase().trim().replace(/ /g, '');
    
    if (formattedGuess === PUZZLE[idx].answer) {
      const newSolved = [...solved];
      newSolved[idx] = true;
      setSolved(newSolved);
      
      const newAnswers = [...answers];
      newAnswers[idx] = PUZZLE[idx].answer;
      setAnswers(newAnswers);
      
      setActiveRow(null);

      // check win
      if (newSolved.every(s => s)) {
        setTimeout(() => {
          Swal.fire({
            title: 'Giải mã thành công! 🔓',
            text: `Từ khóa bí mật là: ${SECRET_WORD}\nChúc mừng bạn đã hoàn thành thử thách ô chữ hôm nay!\n\nNhận được: +100 XP`,
            icon: 'success'
          });
          onWinXP(100);
          resetGame();
        }, 3000); // Đợi 3 giây để người dùng chiêm ngưỡng thành quả rồi đổi bộ mới
      }
    } else {
      Swal.fire('Sai rồi 🥲', 'Đó chưa phải là đáp án đúng cho hàng ngang này.', 'error');
    }
  };

  return (
    <div className="bg-gradient-to-b from-purple-100 to-pink-100 border-4 border-white overflow-hidden relative p-8 rounded-3xl shadow-xl min-h-[600px] flex flex-col items-center">
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-purple-300/30 blur-[80px] pointer-events-none rounded-full" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-pink-300/30 blur-[80px] pointer-events-none rounded-full" />
      
      <div className="text-center mb-10 relative z-10 w-full max-w-3xl">
        <h3 className="text-4xl font-black text-purple-600 mb-2 flex items-center justify-center filter drop-shadow-sm">
          <LayoutGrid className="w-8 h-8 mr-3 text-pink-500" />
          Ô Chữ Bí Mật
        </h3>
        <p className="text-pink-600 font-bold bg-white/50 inline-block px-4 py-1 rounded-full shadow-sm">Tìm ra từ khóa hàng dọc phát sáng màu vàng để mở khóa kho báu XP!</p>
      </div>

      <div className="bg-white/80 p-8 rounded-3xl shadow-2xl border-4 border-purple-200 w-full max-w-4xl relative z-10 backdrop-blur-md">
        <div className="flex flex-col space-y-3 mb-8 items-center overflow-x-auto pb-4">
          <div className="min-w-max">
            {PUZZLE.map((row, rIndex) => {
              const offset = SECRET_COLUMN - row.secretIndex;
              return (
                <div 
                  key={rIndex} 
                  className="flex cursor-pointer hover:bg-purple-50 p-2 rounded-2xl transition-colors items-center group"
                  onClick={() => {
                    if (!solved[rIndex]) setActiveRow(rIndex);
                  }}
                >
                  <div className="w-10 text-right pr-4 font-black text-purple-400 text-xl group-hover:text-purple-600 transition-colors">{rIndex + 1}</div>
                  
                  {/* Space padding */}
                  {Array.from({ length: offset }).map((_, i) => (
                    <div key={'space'+i} className="w-12 h-12 m-0.5" />
                  ))}
                  
                  {/* Characters */}
                  {row.answer.split('').map((char, cIndex) => {
                    const isSecretCell = cIndex === row.secretIndex;
                    const isRevealed = solved[rIndex];
                    
                    return (
                      <div 
                        key={cIndex}
                        className={cn(
                          "w-12 h-12 m-0.5 flex items-center justify-center text-2xl font-black uppercase rounded-[1rem] shadow-sm border-2 transition-all duration-500 select-none",
                          isSecretCell 
                            ? (isRevealed ? "bg-amber-300 border-amber-500 text-amber-900 scale-110 z-10 shadow-amber-400/50" : "bg-amber-50 border-amber-300 text-transparent")
                            : (isRevealed ? "bg-white border-purple-300 text-purple-700 shadow-md transform rotate-0" : "bg-pink-50 border-pink-200 text-transparent shadow-inner")
                        )}
                      >
                        {isRevealed ? char : ''}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Answer Modal Drawer */}
      <AnimatePresence>
        {activeRow !== null && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-50 p-8 bg-white border-t-8 border-purple-400 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] flex flex-col items-center rounded-t-[3rem]"
          >
            <div className="w-full max-w-4xl relative">
              <button 
                onClick={() => setActiveRow(null)} 
                className="absolute -top-14 right-4 bg-purple-100 p-3 rounded-full text-purple-500 hover:text-white hover:bg-purple-400 transition-colors shadow-sm"
              >
                 <X className="w-6 h-6"/>
              </button>
              
              <div className="flex items-start mb-6">
                <div className="text-5xl font-black text-pink-300 mr-5">#{(activeRow + 1)}</div>
                <div>
                  <h4 className="text-xl font-bold text-purple-700 mb-2">Câu hỏi hàng ngang ({PUZZLE[activeRow].answer.length} chữ cái)</h4>
                  <p className="text-slate-600 text-lg leading-relaxed">{PUZZLE[activeRow].question}</p>
                </div>
              </div>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const input = form.elements.namedItem('guess') as HTMLInputElement;
                  checkAnswer(activeRow, input.value);
                }}
                className="flex space-x-4 w-full"
              >
                <input 
                  autoFocus
                  name="guess"
                  autoComplete="off"
                  type="text" 
                  className="flex-1 bg-purple-50/50 border-2 border-purple-200 text-purple-900 text-2xl p-5 rounded-2xl uppercase focus:border-pink-400 focus:ring-4 focus:ring-pink-100 focus:outline-none placeholder:text-purple-300/80 font-bold"
                  placeholder="Nhập đáp án..."
                />
                <button type="submit" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xl font-black py-5 px-10 rounded-2xl transition-all shadow-lg transform hover:scale-105 active:scale-95">
                  Giải đố
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Trò chơi 7: Vượt Chướng Ngại Vật (Runner Game + Quiz)
function ObstacleGame({ appData, onWinXP }: { appData: AppData, onWinXP: (xp: number) => void }) {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'quiz' | 'win' | 'lost'>('start');
  const [score, setScore] = useState(0);
  const [isJumping, setIsJumping] = useState(false);
  const [obstaclePos, setObstaclePos] = useState(100); // 100% position
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [checkpoints, setCheckpoints] = useState(0);
  
  const gameRef = React.useRef<HTMLDivElement>(null);
  const requestRef = React.useRef<number>(null);
  const lastTimeRef = React.useRef<number>(null);

  const MAX_CHECKPOINTS = 5;

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setCheckpoints(0);
    setObstaclePos(100);
    obstacleRef.current = 100;
    lastTimeRef.current = performance.now();
  };

  const jump = () => {
    if (isJumping || gameState !== 'playing') return;
    setIsJumping(true);
    setTimeout(() => setIsJumping(false), 600);
  };

  // Re-define gameLoop to correctly access state or use refs for positions
  const obstacleRef = React.useRef(100);

  useEffect(() => {
    if (gameState !== 'playing') {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const loop = (time: number) => {
      const dt = time - (lastTimeRef.current || time);
      lastTimeRef.current = time;

      obstacleRef.current -= (0.05 * dt);
      setObstaclePos(obstacleRef.current);

      // Collision
      if (obstacleRef.current > 15 && obstacleRef.current < 25 && !isJumping) {
        setGameState('quiz');
        pickQuestion();
        obstacleRef.current = 100;
        return;
      }

      if (obstacleRef.current < -5) {
        setScore(s => s + 10);
        setCheckpoints(c => {
          const nextC = c + 1;
          if (nextC >= MAX_CHECKPOINTS) {
            setGameState('win');
            onWinXP(150);
          }
          return nextC;
        });
        obstacleRef.current = 100;
      }

      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, isJumping]);

  const pickQuestion = () => {
    const q = appData.questions[Math.floor(Math.random() * appData.questions.length)];
    setActiveQuestion(q);
  };

  const handleAnswer = (ans: string) => {
    if (!activeQuestion) return;
    if (ans === activeQuestion.correctAnswer) {
      Swal.fire({ title: 'Suýt nữa thì! 😅', text: 'Trả lời đúng! Bạn được hồi sinh.', icon: 'success', timer: 1500 });
      setGameState('playing');
      lastTimeRef.current = performance.now();
    } else {
      setGameState('lost');
      Swal.fire('Thất bại! 🧪', `Game Over! Đáp án đúng là: ${activeQuestion.correctAnswer}`, 'error');
    }
    setActiveQuestion(null);
  };

  // Listen to Space/Click
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space') jump(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isJumping, gameState]);

  return (
    <div 
      className="bg-gradient-to-b from-amber-50 to-orange-100 p-8 rounded-[3rem] shadow-2xl border-4 border-white flex flex-col items-center min-h-[500px] overflow-hidden relative cursor-pointer"
      onClick={jump}
    >
      <div className="absolute top-6 left-6 flex space-x-4 items-center bg-white/60 p-4 rounded-2xl backdrop-blur-md shadow-sm border border-white z-20">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Tiến độ</span>
          <span className="text-xl font-black text-orange-600">{checkpoints}/{MAX_CHECKPOINTS}</span>
        </div>
        <div className="h-8 w-px bg-orange-200" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Điểm số</span>
          <span className="text-xl font-black text-orange-600">{score}</span>
        </div>
      </div>

      <div className="text-center mb-4 relative z-20">
        <h3 className="text-3xl font-black text-orange-600 flex items-center justify-center">
          <Mountain className="w-8 h-8 mr-3" />
          Vượt Chướng Ngại Vật
        </h3>
        {gameState === 'playing' && (
          <p className="text-orange-500 font-bold animate-pulse mt-2 flex items-center justify-center">
            <Zap className="w-4 h-4 mr-1"/> NHẤN DẤU CÁCH HOẶC CLICK ĐỂ NHẢY!
          </p>
        )}
      </div>

      {/* Game Stage */}
      <div className="relative w-full h-64 mt-12 border-b-8 border-orange-800 bg-gradient-to-b from-sky-200 to-sky-100 rounded-t-3xl overflow-hidden shadow-inner font-sans">
        {/* Clouds */}
        <div className="absolute top-10 left-[10%] w-24 h-8 bg-white/60 rounded-full blur-sm animate-pulse" />
        <div className="absolute top-20 left-[60%] w-32 h-10 bg-white/70 rounded-full blur-sm" />

        {/* Player (Flask) */}
        <motion.div 
          animate={{ y: isJumping ? -120 : 0, rotate: isJumping ? 360 : 0 }}
          transition={isJumping ? { duration: 0.6, ease: "easeOut" } : { duration: 0.3 }}
          className="absolute left-[20%] bottom-0 w-16 h-16 z-10"
        >
          <div className="relative">
            <FlaskConical className="w-16 h-16 text-indigo-600 fill-indigo-200" />
            <motion.div 
              animate={{ height: ["20%", "40%", "20%"] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 bg-indigo-400/50 rounded-full" 
            />
          </div>
        </motion.div>

        {/* Obstacles (Atoms/Rocks) */}
        <div 
          className="absolute bottom-0 w-12 h-12 flex items-center justify-center"
          style={{ left: `${obstaclePos}%` }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-red-500 blur-md opacity-40 animate-pulse" />
            <Atom className="w-12 h-12 text-red-600 animate-spin-slow rotate-45 relative z-10" />
          </div>
        </div>
      </div>

      {/* Start Overlay */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-orange-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-orange-400 max-w-sm">
            <Mountain className="w-20 h-20 text-orange-500 mx-auto mb-6" />
            <h4 className="text-3xl font-black text-slate-800 mb-4">Sẵn sàng chưa?</h4>
            <p className="text-slate-500 mb-8 font-medium italic">Vượt qua 5 chướng ngại vật để chiến thắng. Nếu đâm phải, bạn phải trả lời lời đúng 1 câu hỏi để hồi sinh!</p>
            <button onClick={startGame} className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 text-lg">
              Bắt đầu chạy!
            </button>
          </motion.div>
        </div>
      )}

      {/* Win State */}
      {gameState === 'win' && (
        <div className="absolute inset-0 bg-emerald-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-emerald-400 max-w-sm">
            <Trophy className="w-20 h-20 text-yellow-500 mx-auto mb-6" />
            <h4 className="text-3xl font-black text-slate-800 mb-2">VỀ ĐÍCH! 🏆</h4>
            <p className="text-emerald-600 font-bold mb-8">Bạn đã xuất sắc vượt qua mọi thử thách.\nThưởng: +150 XP</p>
            <button onClick={startGame} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-xl transition-all">
              Chơi lại ván mới
            </button>
          </motion.div>
        </div>
      )}

       {/* Lost State */}
       {gameState === 'lost' && (
        <div className="absolute inset-0 bg-red-950/40 backdrop-blur-sm z-30 flex items-center justify-center p-8 text-center">
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-red-400 max-w-sm">
            <FlaskConical className="w-20 h-20 text-red-500 mx-auto mb-6 opacity-30" />
            <h4 className="text-3xl font-black text-slate-800 mb-2">THẤT BẠI! 🧪</h4>
            <p className="text-red-600 font-bold mb-8">Phòng thí nghiệm đã phát nổ mất rồi...</p>
            <button onClick={startGame} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-black rounded-2xl shadow-xl transition-all">
              Thử lại lần nữa
            </button>
          </motion.div>
        </div>
      )}

      {/* Quiz UI (Hồi sinh) - Fix Rendering */}
      <AnimatePresence>
        {gameState === 'quiz' && activeQuestion && (
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-indigo-500 w-full max-w-2xl overflow-y-auto max-h-[90%]"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="px-4 py-1 bg-indigo-100 text-indigo-600 rounded-full font-black text-xs uppercase tracking-widest">
                  Phòng thí nghiệm gặp sự cố! ⚡
                </span>
              </div>
              
              <h4 className="text-xl md:text-2xl font-black text-slate-800 mb-8 leading-relaxed">
                {activeQuestion.content}
              </h4>
              
              <div className="grid grid-cols-1 gap-4">
                {activeQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(opt);
                    }}
                    className="group p-5 text-left border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50 rounded-2xl transition-all font-bold text-slate-700 hover:text-indigo-700 flex items-center shadow-sm"
                  >
                    <span className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl mr-4 text-slate-400 font-black group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                ))}
              </div>

              <p className="mt-8 text-center text-slate-400 text-sm font-medium italic">
                Trả lời đúng để tiếp tục hành trình...
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Trò chơi 8: Rung Chuông Vàng (Golden Bell)
function GoldenBellGame({ appData, onWinXP }: { appData: AppData, onWinXP: (xp: number) => void }) {
  const [gameState, setGameState] = useState<'start' | 'playing' | 'win' | 'lost'>('start');
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const TOTAL_LEVELS = 10;

  useEffect(() => {
    let timer: number;
    if (gameState === 'playing' && timeLeft > 0 && !isAnswered) {
      timer = window.setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && !isAnswered && gameState === 'playing') {
      handleAnswer(''); // Time's up
    }
    return () => clearInterval(timer);
  }, [gameState, timeLeft, isAnswered]);

  const startGame = () => {
    setLevel(1);
    setGameState('playing');
    loadQuestion(1);
  };

  const loadQuestion = (lv: number) => {
    let diff: 'easy'|'medium'|'hard' = 'easy';
    if (lv > 4) diff = 'medium';
    if (lv > 7) diff = 'hard';

    const pool = appData.questions.filter(q => q.difficulty === diff);
    const q = pool[Math.floor(Math.random() * pool.length)];
    
    setCurrentQuestion(q);
    setTimeLeft(15);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleAnswer = (opt: string) => {
    if (isAnswered) return;
    setSelectedOption(opt);
    setIsAnswered(true);

    const isCorrect = opt === currentQuestion?.correctAnswer;

    setTimeout(() => {
      if (isCorrect) {
        if (level === TOTAL_LEVELS) {
          setGameState('win');
          onWinXP(500);
        } else {
          setLevel(prev => prev + 1);
          loadQuestion(level + 1);
        }
      } else {
        setGameState('lost');
        Swal.fire({
          title: 'Chia tay sàn đấu! 😢',
          text: `Tiếc quá, đáp án đúng phải là: ${currentQuestion?.correctAnswer}`,
          icon: 'error'
        });
      }
    }, 1200);
  };

  return (
    <div className="bg-gradient-to-b from-amber-400 to-yellow-600 p-8 rounded-[3.5rem] shadow-2xl border-8 border-white min-h-[650px] flex flex-col items-center relative overflow-hidden font-sans">
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-white/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full flex justify-between items-center bg-white/30 backdrop-blur-md p-6 rounded-[2.5rem] border-2 border-white/50 mb-10 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
            <span className="text-3xl font-black text-amber-600">{level}</span>
          </div>
          <div>
            <h4 className="text-sm font-black text-white/80 uppercase tracking-widest">Câu hỏi số</h4>
            <p className="text-2xl font-black text-white">Chặng đua {level}/{TOTAL_LEVELS}</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className={cn(
            "w-20 h-20 rounded-full border-4 flex items-center justify-center transition-colors shadow-xl",
            timeLeft > 5 ? "bg-white border-amber-200 text-amber-600" : "bg-red-500 border-red-200 text-white animate-pulse"
          )}>
            <div className="text-center">
              <Timer className="w-4 h-4 mx-auto mb-1 opacity-50" />
              <span className="text-3xl font-black leading-none">{timeLeft}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-4xl flex-1 flex flex-col items-center">
        {gameState === 'start' && (
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-amber-500 text-center max-w-md">
            <Bell className="w-24 h-24 text-amber-500 mx-auto mb-6 animate-bounce" />
            <h3 className="text-4xl font-black text-slate-800 mb-4">Rung Chuông Vàng</h3>
            <p className="text-slate-500 font-medium mb-10 leading-relaxed italic">Vượt qua 10 câu hỏi để được rung chiếc chuông vàng danh giá. Trả lời sai dù chỉ 1 câu, bạn sẽ bị loại ngay lập tức!</p>
            <button onClick={startGame} className="w-full py-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white font-black rounded-3xl shadow-xl transition-all transform active:scale-95 text-xl">
              Vào sàn đấu 🏆
            </button>
          </motion.div>
        )}

        {gameState === 'playing' && currentQuestion && (
          <motion.div key={level} initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-white mb-8 relative overflow-hidden">
               <h4 className="text-2xl md:text-3xl font-black text-slate-800 leading-relaxed">
                 {currentQuestion.content}
               </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                const isCorrect = isAnswered && opt === currentQuestion.correctAnswer;
                const isWrong = isAnswered && isSelected && opt !== currentQuestion.correctAnswer;

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleAnswer(opt)}
                    className={cn(
                      "group p-6 text-left rounded-3xl transition-all font-black text-xl flex items-center border-4 shadow-lg active:scale-95",
                      !isAnswered ? "bg-white/80 border-white hover:border-amber-300 hover:bg-white text-slate-700" :
                      isCorrect ? "bg-emerald-500 border-emerald-300 text-white" :
                      isWrong ? "bg-red-500 border-red-300 text-white" : "bg-white/40 border-transparent text-slate-400"
                    )}
                  >
                    <span className={cn(
                      "w-12 h-12 flex items-center justify-center rounded-2xl mr-5 font-black shrink-0 transition-colors shadow-sm",
                      !isAnswered ? "bg-amber-100 text-amber-600 group-hover:bg-amber-500 group-hover:text-white" :
                      isCorrect ? "bg-emerald-400 text-white" : "bg-red-400 text-white"
                    )}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {gameState === 'win' && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white p-16 rounded-[4rem] shadow-2xl border-8 border-yellow-400 text-center max-w-lg">
            <Bell className="w-32 h-32 text-yellow-500 mx-auto mb-8 animate-bounce" />
            <h3 className="text-5xl font-black text-slate-900 mb-4">CHÚC MỪNG! 🎉</h3>
            <p className="text-amber-700 text-2xl font-black mb-10">BẠN ĐÃ RUNG CHUÔNG VÀNG THÀNH CÔNG!</p>
            <p className="text-amber-800 text-lg font-bold">Thưởng cực đại: +500 XP</p>
            <button onClick={startGame} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl shadow-xl hover:bg-slate-800 transition-all text-xl mt-8">
               Tiếp tục chinh phục 🚀
            </button>
          </motion.div>
        )}

        {gameState === 'lost' && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-4 border-slate-200 text-center max-w-md">
            <div className="text-8xl mb-8">🥀</div>
            <h3 className="text-4xl font-black text-slate-800 mb-2">Bị loại!</h3>
            <p className="text-slate-500 font-medium mb-10 text-lg">Bạn đã phải rời khỏi sàn đấu ở câu hỏi số {level}.</p>
            <button onClick={startGame} className="w-full py-5 bg-amber-500 text-white font-black rounded-3xl shadow-xl hover:bg-amber-600 transition-all text-xl">
              Thử lại ngay
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}


