/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Brain, 
  GraduationCap, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  AlertCircle,
  RefreshCcw,
  ChevronRight,
  BookMarked,
  Languages,
  FileUp,
  Loader2,
  LayoutDashboard,
  Library,
  MessageSquare,
  Settings,
  Search,
  Menu,
  X,
  Send,
  User,
  Sparkles,
  PlayCircle,
  Clock
} from 'lucide-react';
import { analyzeLesson, chatWithAssistant } from './lib/gemini';
import { LessonAnalysis, QuizLevel, Question, Course, Lesson, ChatMessage } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MOCK_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Grade 10 English',
    description: 'Master the secondary level English curriculum with ease.',
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400',
    lessons: [
      { id: 'l1', title: 'Unit 1: Travel and Adventure', content: '', status: 'available' },
      { id: 'l2', title: 'Unit 2: Health and Hygiene', content: '', status: 'locked' },
      { id: 'l3', title: 'Unit 3: Ecology and Environment', content: '', status: 'locked' },
    ]
  },
  {
    id: 'c2',
    title: 'Grammar Essentials',
    description: 'Deep dive into Tenses, Reported Speech, and Passive Voice.',
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=400',
    lessons: [
      { id: 'l4', title: 'Mastering Tenses', content: '', status: 'available' },
      { id: 'l5', title: 'Direct & Indirect Speech', content: '', status: 'available' },
    ]
  }
];

export default function App() {
  const [view, setView] = useState<'dashboard' | 'course' | 'lesson' | 'quiz' | 'results'>('dashboard');
  const [step, setStep] = useState<'input' | 'analysis' | 'quiz' | 'results'>('input'); 
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [analysis, setAnalysis] = useState<LessonAnalysis | null>(null);
  const [currentLevel, setCurrentLevel] = useState<QuizLevel>(1);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [score, setScore] = useState(0);
  const [rescueNote, setRescueNote] = useState<string | null>(null);
  const [masteryBadge, setMasteryBadge] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // LMS State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'assistant', content: 'Namaste! I am your Knowledge Weaver. How can I help you with your English lessons today?', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      alert("Please upload a valid PDF file.");
      return;
    }

    setIsExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setTextInput(fullText);
      setView('lesson');
      setStep('input');
    } catch (error) {
      console.error("PDF extraction failed:", error);
      alert("Failed to extract text from PDF. Please try copying and pasting instead.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!textInput.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeLesson(textInput);
      setAnalysis(result);
      setStep('analysis');
      setView('lesson');
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Something went wrong while analyzing the lesson. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: Date.now()
    };
    
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      const context = analysis ? `Current Lesson: ${analysis.title}. Summary: ${analysis.summary}` : undefined;
      const response = await chatWithAssistant(chatInput, chatMessages, context);
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat failed:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const startQuiz = (level: QuizLevel) => {
    setCurrentLevel(level);
    setQuizAnswers({});
    setStep('quiz');
  };

  const submitQuiz = () => {
    if (!analysis) return;
    const questions = currentLevel === 1 ? analysis.questions.level_1 : 
                     currentLevel === 2 ? analysis.questions.level_2 : 
                     analysis.questions.level_3;
    
    let correctCount = 0;
    questions.forEach(q => {
      if (quizAnswers[q.id]?.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()) {
        correctCount++;
      }
    });

    const finalScore = (correctCount / questions.length) * 100;
    setScore(finalScore);

    // Adaptive Logic
    if (finalScore < 40) {
      setRescueNote(`Rescue Note (English-Nepali): Don't worry, Shanti! English takes time. Remember, ${analysis.grammar_tips.split('.')[0]}. चिन्ता नगर्नुहोस्, अंग्रेजी सिक्न समय लाग्छ।`);
      setMasteryBadge(null);
    } else if (finalScore > 80) {
      setMasteryBadge(`Mastery Badge: Excellent work, Pasang! You are a Scholar! Keep it up! तपाईं एक उत्कृष्ट विद्यार्थी हुनुहुन्छ!`);
      setRescueNote(null);
    } else {
      setRescueNote(null);
      setMasteryBadge(null);
    }

    setStep('results');
  };

  const NavItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        active 
        ? 'bg-[#7D2E68] text-white shadow-lg shadow-[#7D2E68]/20' 
        : 'text-[#2D2D2D]/60 hover:bg-[#F9F2F7] hover:text-[#2D2D2D]'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D2D2D] font-sans selection:bg-[#E6E6E6] flex">
      {/* Sidebar - Desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-[#2D2D2D]/5 transform transition-transform lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#7D2E68] rounded-xl flex items-center justify-center text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold">Hamro Guru</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-40 font-bold">LMS Nepal</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            <NavItem icon={LayoutDashboard} label="Dashboard" active={view === 'dashboard'} onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }} />
            <NavItem icon={Library} label="My Courses" active={view === 'course'} onClick={() => { setView('course'); setIsSidebarOpen(false); }} />
            <NavItem icon={BookMarked} label="Resources" active={false} onClick={() => {}} />
            <NavItem icon={Settings} label="Settings" active={false} onClick={() => {}} />
          </nav>

          <div className="mt-auto p-4 bg-[#F9F2F7] rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-[#7D2E68]/10 flex items-center justify-center text-[#7D2E68]">
                <User size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">Pasang Lama</p>
                <p className="text-[10px] opacity-50">Grade 10 Student</p>
              </div>
            </div>
            <div className="h-1.5 w-full bg-white rounded-full overflow-hidden">
              <div className="h-full bg-[#7D2E68] w-[65%]"></div>
            </div>
            <p className="text-[10px] mt-2 opacity-50 font-bold">65% Course Completed</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-20 border-b border-[#2D2D2D]/5 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 hover:bg-[#F9F2F7] rounded-lg">
            <Menu size={24} />
          </button>

          <div className="flex-1 max-w-xl mx-4 lg:mx-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D2D2D]/30" size={18} />
              <input 
                type="text" 
                placeholder="Search lessons, vocabulary..." 
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9F2F7] border-none rounded-xl focus:ring-2 focus:ring-[#7D2E68]/20 transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#7D2E68]/5 text-[#7D2E68] rounded-xl text-sm font-bold hover:bg-[#7D2E68]/10 transition-colors">
              <Sparkles size={16} />
              <span>120 XP</span>
            </button>
            <div className="w-10 h-10 rounded-xl bg-[#F9F2F7] flex items-center justify-center text-[#2D2D2D]/40">
              <AlertCircle size={20} />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          <AnimatePresence mode="wait">
            {view === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-10"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-serif italic text-[#7D2E68]">Namaste, Pasang!</h2>
                    <p className="text-[#2D2D2D]/60 mt-1">Ready to weave some more knowledge today?</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-[#7D2E68] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#632452] transition-all shadow-lg shadow-[#7D2E68]/20"
                    >
                      <FileUp size={18} />
                      Quick Upload PDF
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    { label: 'Lessons Done', value: '12', icon: BookOpen, color: 'bg-blue-50 text-blue-600' },
                    { label: 'Quiz Avg', value: '84%', icon: Trophy, color: 'bg-yellow-50 text-yellow-600' },
                    { label: 'Study Time', value: '14h', icon: Clock, color: 'bg-purple-50 text-purple-600' },
                    { label: 'Streak', value: '5 Days', icon: Sparkles, color: 'bg-orange-50 text-orange-600' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-[#2D2D2D]/5 shadow-sm">
                      <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                        <stat.icon size={24} />
                      </div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs font-bold uppercase tracking-widest opacity-40">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Courses Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-serif italic">Continue Learning</h3>
                    <button className="text-sm font-bold text-[#7D2E68] hover:underline">View All</button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {MOCK_COURSES.map(course => (
                      <div 
                        key={course.id} 
                        onClick={() => { setActiveCourse(course); setView('course'); }}
                        className="group bg-white rounded-[32px] overflow-hidden border border-[#2D2D2D]/5 shadow-sm hover:shadow-xl transition-all cursor-pointer"
                      >
                        <div className="h-48 overflow-hidden relative">
                          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                            <div className="text-white">
                              <p className="text-xs font-bold uppercase tracking-widest opacity-80">Course</p>
                              <h4 className="text-xl font-bold">{course.title}</h4>
                            </div>
                          </div>
                        </div>
                        <div className="p-6 flex items-center justify-between">
                          <p className="text-sm text-[#2D2D2D]/60">{course.lessons.length} Lessons</p>
                          <div className="flex items-center gap-2 text-[#7D2E68] font-bold text-sm">
                            <span>Resume</span>
                            <PlayCircle size={18} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'course' && activeCourse && (
              <motion.div
                key="course"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-sm font-bold text-[#7D2E68] hover:opacity-70">
                  <ArrowRight className="rotate-180" size={18} />
                  Back to Dashboard
                </button>

                <div className="bg-white p-8 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm flex flex-col md:flex-row gap-8 items-center">
                  <img src={activeCourse.thumbnail} className="w-48 h-48 rounded-3xl object-cover" />
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="text-4xl font-serif italic text-[#7D2E68]">{activeCourse.title}</h2>
                    <p className="text-lg opacity-60 mt-2">{activeCourse.description}</p>
                    <div className="mt-6 flex flex-wrap gap-4 justify-center md:justify-start">
                      <div className="px-4 py-2 bg-[#F9F2F7] rounded-xl text-xs font-bold uppercase tracking-widest">12 Lessons</div>
                      <div className="px-4 py-2 bg-[#F9F2F7] rounded-xl text-xs font-bold uppercase tracking-widest">8 Quizzes</div>
                      <div className="px-4 py-2 bg-[#F9F2F7] rounded-xl text-xs font-bold uppercase tracking-widest">Certificate</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-serif italic px-2">Course Curriculum</h3>
                  <div className="space-y-3">
                    {activeCourse.lessons.map((lesson, i) => (
                      <div 
                        key={lesson.id}
                        onClick={() => {
                          if (lesson.status !== 'locked') {
                            setActiveLesson(lesson);
                            setView('lesson');
                            setStep('input');
                          }
                        }}
                        className={`p-6 rounded-3xl border flex items-center justify-between transition-all ${
                          lesson.status === 'locked' 
                          ? 'bg-[#F9F2F7]/50 border-transparent opacity-50 cursor-not-allowed' 
                          : 'bg-white border-[#2D2D2D]/5 shadow-sm hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                            lesson.status === 'completed' ? 'bg-green-100 text-green-600' : 'bg-[#7D2E68]/5 text-[#7D2E68]'
                          }`}>
                            {lesson.status === 'completed' ? <CheckCircle2 size={20} /> : i + 1}
                          </div>
                          <div>
                            <h4 className="font-bold">{lesson.title}</h4>
                            <p className="text-xs opacity-50">15 mins • Reading & Quiz</p>
                          </div>
                        </div>
                        {lesson.status === 'locked' ? (
                          <XCircle size={20} className="opacity-20" />
                        ) : (
                          <ChevronRight size={20} className="text-[#7D2E68]" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {view === 'lesson' && (
              <motion.div
                key="lesson"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="flex items-center justify-between mb-8">
                  <button onClick={() => setView('course')} className="flex items-center gap-2 text-sm font-bold text-[#7D2E68] hover:opacity-70">
                    <ArrowRight className="rotate-180" size={18} />
                    Back to Course
                  </button>
                  {analysis && step !== 'input' && (
                    <button 
                      onClick={() => setStep('input')}
                      className="text-xs font-bold uppercase tracking-widest text-[#7D2E68] flex items-center gap-2 px-4 py-2 bg-[#7D2E68]/5 rounded-xl"
                    >
                      <RefreshCcw size={14} /> New Content
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {step === 'input' && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-8"
                    >
                      <div className="space-y-4 text-center">
                        <h2 className="text-4xl font-serif italic text-[#7D2E68]">
                          {activeLesson ? activeLesson.title : 'Namaste, Student!'}
                        </h2>
                        <p className="text-lg opacity-70 max-w-xl mx-auto">Paste your textbook content or upload a PDF to start weaving knowledge.</p>
                      </div>

                      <div className="relative group">
                        <textarea
                          value={textInput}
                          onChange={(e) => setTextInput(e.target.value)}
                          placeholder="Example: Once upon a time in Pokhara, there lived a brave girl named Shanti..."
                          className="w-full h-64 p-8 bg-white border-2 border-[#2D2D2D]/10 rounded-[40px] shadow-sm focus:border-[#7D2E68] focus:ring-0 transition-all text-lg resize-none"
                        />
                        
                        <div className="absolute bottom-6 left-6 flex items-center gap-3">
                          <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".pdf" className="hidden" />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExtracting || isAnalyzing}
                            className="bg-white border-2 border-[#7D2E68]/20 text-[#7D2E68] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#F9F2F7] disabled:opacity-50 transition-all shadow-sm"
                          >
                            {isExtracting ? <Loader2 className="animate-spin" size={20} /> : <FileUp size={20} />}
                            {isExtracting ? 'Extracting...' : 'Upload PDF'}
                          </button>
                        </div>

                        <div className="absolute bottom-6 right-6">
                          <button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing || isExtracting || !textInput.trim()}
                            className="bg-[#7D2E68] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#632452] disabled:opacity-50 transition-all shadow-lg shadow-[#7D2E68]/20"
                          >
                            {isAnalyzing ? <RefreshCcw className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {isAnalyzing ? 'Analyzing...' : 'Weave Knowledge'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === 'analysis' && analysis && (
                    <motion.div
                      key="analysis"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-10"
                    >
                      <div className="text-center space-y-2">
                        <h2 className="text-4xl font-serif italic text-[#7D2E68]">{analysis.title}</h2>
                        <p className="text-xs uppercase tracking-[0.3em] font-bold opacity-40">Lesson Analysis</p>
                      </div>

                      <section className="bg-white p-10 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                        <div className="flex items-center gap-3 text-[#7D2E68]">
                          <BookOpen size={24} />
                          <h3 className="font-serif text-2xl italic">Summary</h3>
                        </div>
                        <p className="text-xl leading-relaxed opacity-80">{analysis.summary}</p>
                      </section>

                      <div className="grid md:grid-cols-2 gap-8">
                        <section className="bg-white p-8 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                          <div className="flex items-center gap-3 text-[#7D2E68]">
                            <Languages size={22} />
                            <h3 className="font-serif text-xl italic">Vocabulary</h3>
                          </div>
                          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {analysis.vocabulary.map((item, idx) => (
                              <div key={idx} className="p-4 rounded-2xl bg-[#F9F2F7]/50 border border-transparent hover:border-[#7D2E68]/10 transition-all">
                                <p className="font-bold text-lg text-[#7D2E68]">{item.word}</p>
                                <p className="text-sm opacity-60 italic">{item.english_meaning}</p>
                                <p className="text-sm font-medium text-[#7D2E68]/80 mt-1">{item.nepali_meaning}</p>
                              </div>
                            ))}
                          </div>
                        </section>

                        <section className="bg-white p-8 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm flex flex-col">
                          <div className="flex items-center gap-3 text-[#7D2E68] mb-6">
                            <Brain size={22} />
                            <h3 className="font-serif text-xl italic">Grammar Focus</h3>
                          </div>
                          <div className="p-6 bg-[#F9F2F7] rounded-3xl border border-[#7D2E68]/10 flex-1">
                            <p className="text-lg leading-relaxed opacity-80">{analysis.grammar_tips}</p>
                          </div>
                          <button 
                            onClick={() => startQuiz(1)}
                            className="w-full mt-8 bg-[#7D2E68] text-white p-5 rounded-2xl font-bold flex items-center justify-between hover:bg-[#632452] transition-all shadow-lg shadow-[#7D2E68]/20"
                          >
                            Start Adaptive Quiz
                            <ChevronRight size={20} />
                          </button>
                        </section>
                      </div>
                    </motion.div>
                  )}

                  {step === 'quiz' && analysis && (
                    <motion.div
                      key="quiz"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#7D2E68] opacity-60">Level {currentLevel}</span>
                          <h2 className="text-3xl font-serif italic text-[#7D2E68]">
                            {currentLevel === 1 ? 'Explorer' : currentLevel === 2 ? 'Learner' : 'Scholar'}
                          </h2>
                        </div>
                        <div className="w-16 h-16 rounded-full border-4 border-[#7D2E68]/10 flex items-center justify-center">
                          <span className="font-bold text-[#7D2E68]">{Object.keys(quizAnswers).length}/{currentLevel === 1 ? analysis.questions.level_1.length : currentLevel === 2 ? analysis.questions.level_2.length : analysis.questions.level_3.length}</span>
                        </div>
                      </div>

                      <div className="space-y-8">
                        {(currentLevel === 1 ? analysis.questions.level_1 : 
                          currentLevel === 2 ? analysis.questions.level_2 : 
                          analysis.questions.level_3).map((q, idx) => (
                          <div key={q.id} className="bg-white p-8 rounded-[32px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                            <p className="text-xl font-medium leading-relaxed">
                              <span className="opacity-30 mr-3">{idx + 1}.</span>
                              {q.question}
                            </p>
                            
                            {q.type === 'mcq' && q.options && (
                              <div className="grid gap-3">
                                {q.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                    className={`p-4 rounded-2xl text-left transition-all border-2 ${
                                      quizAnswers[q.id] === opt 
                                      ? 'border-[#7D2E68] bg-[#7D2E68]/5 text-[#7D2E68] font-bold' 
                                      : 'border-transparent bg-[#F9F2F7] hover:bg-[#EBEBE0]'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}

                            {q.type === 'true_false' && (
                              <div className="flex gap-4">
                                {['True', 'False'].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                    className={`flex-1 p-4 rounded-2xl transition-all border-2 ${
                                      quizAnswers[q.id] === opt 
                                      ? 'border-[#7D2E68] bg-[#7D2E68]/5 text-[#7D2E68] font-bold' 
                                      : 'border-transparent bg-[#F9F2F7] hover:bg-[#EBEBE0]'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            )}

                            {(q.type === 'short_answer' || q.type === 'transformation') && (
                              <input
                                type="text"
                                value={quizAnswers[q.id] || ''}
                                onChange={(e) => setQuizAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Type your answer here..."
                                className="w-full p-4 bg-[#F9F2F7] border-2 border-transparent rounded-2xl focus:border-[#7D2E68] transition-all"
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={submitQuiz}
                          className="bg-[#7D2E68] text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#632452] transition-all shadow-lg shadow-[#7D2E68]/20"
                        >
                          Submit Answers
                          <ArrowRight size={20} />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 'results' && (
                    <motion.div
                      key="results"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-12 text-center"
                    >
                      <div className="space-y-4">
                        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-[#7D2E68]/5 border-8 border-[#7D2E68]/10">
                          <span className="text-4xl font-bold text-[#7D2E68]">{Math.round(score)}%</span>
                        </div>
                        <h2 className="text-4xl font-serif italic text-[#7D2E68]">Quiz Complete!</h2>
                      </div>

                      <div className="max-w-xl mx-auto space-y-6">
                        {rescueNote && (
                          <div className="bg-red-50 p-8 rounded-[40px] border border-red-100 flex items-start gap-4 text-left">
                            <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                            <div className="space-y-2">
                              <p className="font-bold text-red-900">Rescue Note</p>
                              <p className="text-red-800 leading-relaxed">{rescueNote}</p>
                            </div>
                          </div>
                        )}

                        {masteryBadge && (
                          <div className="bg-green-50 p-8 rounded-[40px] border border-green-100 flex items-start gap-4 text-left">
                            <Trophy className="text-green-600 shrink-0 mt-1" size={24} />
                            <div className="space-y-2">
                              <p className="font-bold text-green-900">Mastery Badge Unlocked!</p>
                              <p className="text-green-800 leading-relaxed">{masteryBadge}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                        <button
                          onClick={() => startQuiz(currentLevel)}
                          className="p-6 bg-white border-2 border-[#7D2E68]/10 rounded-3xl font-bold text-[#7D2E68] hover:bg-[#F9F2F7] transition-all flex items-center justify-center gap-2"
                        >
                          <RefreshCcw size={20} /> Try Again
                        </button>
                        {score > 80 && currentLevel < 3 ? (
                          <button
                            onClick={() => startQuiz((currentLevel + 1) as QuizLevel)}
                            className="p-6 bg-[#7D2E68] text-white rounded-3xl font-bold hover:bg-[#632452] transition-all flex items-center justify-center gap-2"
                          >
                            Next Level <ChevronRight size={20} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setStep('analysis')}
                            className="p-6 bg-[#7D2E68] text-white rounded-3xl font-bold hover:bg-[#632452] transition-all flex items-center justify-center gap-2"
                          >
                            Review Lesson <BookMarked size={20} />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* AI Assistant - Floating Chat */}
      <div className="fixed bottom-6 right-6 z-[100]">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="absolute bottom-20 right-0 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-[32px] shadow-2xl border border-[#2D2D2D]/5 flex flex-col overflow-hidden"
            >
              <div className="p-6 bg-[#7D2E68] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Brain size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold">Knowledge Weaver</h4>
                    <p className="text-[10px] uppercase tracking-widest opacity-60">AI Tutor</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user' 
                      ? 'bg-[#7D2E68] text-white rounded-tr-none' 
                      : 'bg-[#F9F2F7] text-[#2D2D2D] rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#F9F2F7] p-4 rounded-2xl rounded-tl-none">
                      <Loader2 className="animate-spin text-[#7D2E68]" size={18} />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-[#2D2D2D]/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder="Ask me anything..."
                    className="w-full pl-4 pr-12 py-3 bg-[#F9F2F7] border-none rounded-xl focus:ring-2 focus:ring-[#7D2E68]/20 transition-all text-sm"
                  />
                  <button 
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#7D2E68] hover:bg-[#7D2E68]/10 rounded-lg transition-colors disabled:opacity-30"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 active:scale-95 ${
            isChatOpen ? 'bg-[#2D2D2D] rotate-90' : 'bg-[#7D2E68]'
          }`}
        >
          {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
}
