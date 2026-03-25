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
  Loader2
} from 'lucide-react';
import { analyzeLesson } from './lib/gemini';
import { LessonAnalysis, QuizLevel, Question } from './types';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
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
    } catch (error) {
      console.error("Analysis failed:", error);
      alert("Something went wrong while analyzing the lesson. Please try again.");
    } finally {
      setIsAnalyzing(false);
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

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-[#2D2D2D] font-sans selection:bg-[#E6E6E6]">
      {/* Header */}
      <header className="border-b border-[#2D2D2D]/10 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#5A5A40] rounded-xl flex items-center justify-center text-white">
              <GraduationCap size={24} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-bold tracking-tight">Hamro English Guru</h1>
              <p className="text-[10px] uppercase tracking-widest opacity-50 font-medium">Adaptive LMS for Nepal</p>
            </div>
          </div>
          {analysis && step !== 'input' && (
            <button 
              onClick={() => setStep('input')}
              className="text-xs font-medium uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1"
            >
              <RefreshCcw size={14} /> New Lesson
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
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
                <h2 className="text-4xl font-serif italic text-[#5A5A40]">Namaste, Student!</h2>
                <p className="text-lg opacity-70 max-w-xl mx-auto">Paste the text from your English textbook below. I will help you master the vocabulary and grammar!</p>
              </div>

              <div className="relative group">
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Example: Once upon a time in Pokhara, there lived a brave girl named Shanti..."
                  className="w-full h-64 p-8 bg-white border-2 border-[#2D2D2D]/10 rounded-3xl shadow-sm focus:border-[#5A5A40] focus:ring-0 transition-all text-lg resize-none"
                />
                
                <div className="absolute bottom-6 left-6 flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isExtracting || isAnalyzing}
                    className="bg-white border-2 border-[#5A5A40]/20 text-[#5A5A40] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#F5F5F0] disabled:opacity-50 transition-all shadow-sm"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <FileUp size={20} />
                        Upload PDF
                      </>
                    )}
                  </button>
                </div>

                <div className="absolute bottom-6 right-6">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isExtracting || !textInput.trim()}
                    className="bg-[#5A5A40] text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#4A4A30] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#5A5A40]/20"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCcw className="animate-spin" size={20} />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        The Knowledge Weaver
                        <ArrowRight size={20} />
                      </>
                    )}
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
              exit={{ opacity: 0, scale: 1.02 }}
              className="space-y-12"
            >
              {/* Summary Section */}
              <section className="bg-white p-10 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                <div className="flex items-center gap-3 text-[#5A5A40]">
                  <BookOpen size={24} />
                  <h3 className="font-serif text-2xl italic">Lesson Summary</h3>
                </div>
                <p className="text-xl leading-relaxed opacity-80">{analysis.summary}</p>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Vocabulary Section */}
                <section className="bg-white p-8 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 text-[#5A5A40]">
                    <Languages size={22} />
                    <h3 className="font-serif text-xl italic">Vocabulary</h3>
                  </div>
                  <div className="space-y-4">
                    {analysis.vocabulary.map((item, idx) => (
                      <div key={idx} className="group p-4 rounded-2xl hover:bg-[#F5F5F0] transition-colors border border-transparent hover:border-[#5A5A40]/10">
                        <p className="font-bold text-lg text-[#5A5A40]">{item.word}</p>
                        <p className="text-sm opacity-60">{item.english_meaning}</p>
                        <p className="text-sm font-medium text-[#5A5A40]/80 mt-1">{item.nepali_meaning}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Grammar Section */}
                <section className="bg-white p-8 rounded-[40px] border border-[#2D2D2D]/5 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 text-[#5A5A40]">
                    <Brain size={22} />
                    <h3 className="font-serif text-xl italic">Grammar Focus</h3>
                  </div>
                  <div className="p-6 bg-[#F5F5F0] rounded-3xl border border-[#5A5A40]/10">
                    <p className="text-lg leading-relaxed opacity-80">{analysis.grammar_tips}</p>
                  </div>
                  
                  <div className="pt-4 space-y-4">
                    <p className="text-xs uppercase tracking-widest opacity-40 font-bold">Ready for the challenge?</p>
                    <button 
                      onClick={() => startQuiz(1)}
                      className="w-full bg-[#5A5A40] text-white p-5 rounded-2xl font-bold flex items-center justify-between hover:bg-[#4A4A30] transition-all"
                    >
                      Start Adaptive Quiz
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </section>
              </div>
            </motion.div>
          )}

          {step === 'quiz' && analysis && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#5A5A40] opacity-60">Level {currentLevel}</span>
                  <h2 className="text-3xl font-serif italic text-[#5A5A40]">
                    {currentLevel === 1 ? 'Explorer' : currentLevel === 2 ? 'Learner' : 'Scholar'}
                  </h2>
                </div>
                <div className="w-16 h-16 rounded-full border-4 border-[#5A5A40]/10 flex items-center justify-center">
                  <span className="font-bold text-[#5A5A40]">{Object.keys(quizAnswers).length}/{currentLevel === 1 ? analysis.questions.level_1.length : currentLevel === 2 ? analysis.questions.level_2.length : analysis.questions.level_3.length}</span>
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
                              ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40] font-bold' 
                              : 'border-transparent bg-[#F5F5F0] hover:bg-[#EBEBE0]'
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
                              ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40] font-bold' 
                              : 'border-transparent bg-[#F5F5F0] hover:bg-[#EBEBE0]'
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
                        className="w-full p-4 bg-[#F5F5F0] border-2 border-transparent rounded-2xl focus:border-[#5A5A40] transition-all"
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={submitQuiz}
                  className="bg-[#5A5A40] text-white px-10 py-5 rounded-2xl font-bold flex items-center gap-3 hover:bg-[#4A4A30] transition-all shadow-lg shadow-[#5A5A40]/20"
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
                <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-[#5A5A40]/5 border-8 border-[#5A5A40]/10">
                  <span className="text-4xl font-bold text-[#5A5A40]">{Math.round(score)}%</span>
                </div>
                <h2 className="text-4xl font-serif italic text-[#5A5A40]">Quiz Complete!</h2>
              </div>

              {rescueNote && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 p-8 rounded-[40px] border border-red-100 flex items-start gap-4 text-left"
                >
                  <AlertCircle className="text-red-500 shrink-0 mt-1" size={24} />
                  <div className="space-y-2">
                    <p className="font-bold text-red-900">Rescue Note</p>
                    <p className="text-red-800 leading-relaxed">{rescueNote}</p>
                  </div>
                </motion.div>
              )}

              {masteryBadge && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-green-50 p-8 rounded-[40px] border border-green-100 flex items-start gap-4 text-left"
                >
                  <Trophy className="text-green-600 shrink-0 mt-1" size={24} />
                  <div className="space-y-2">
                    <p className="font-bold text-green-900">Mastery Badge Unlocked!</p>
                    <p className="text-green-800 leading-relaxed">{masteryBadge}</p>
                  </div>
                </motion.div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <button
                  onClick={() => startQuiz(currentLevel)}
                  className="p-6 bg-white border-2 border-[#5A5A40]/10 rounded-3xl font-bold text-[#5A5A40] hover:bg-[#F5F5F0] transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCcw size={20} /> Try Again
                </button>
                {score > 80 && currentLevel < 3 && (
                  <button
                    onClick={() => startQuiz((currentLevel + 1) as QuizLevel)}
                    className="p-6 bg-[#5A5A40] text-white rounded-3xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2"
                  >
                    Next Level <ChevronRight size={20} />
                  </button>
                )}
                {score <= 80 && (
                  <button
                    onClick={() => setStep('analysis')}
                    className="p-6 bg-[#5A5A40] text-white rounded-3xl font-bold hover:bg-[#4A4A30] transition-all flex items-center justify-center gap-2"
                  >
                    Review Lesson <BookMarked size={20} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-12 border-t border-[#2D2D2D]/5 text-center opacity-40">
        <p className="text-xs uppercase tracking-widest font-bold">Made for the bright minds of Nepal</p>
      </footer>
    </div>
  );
}
