export interface VocabularyItem {
  word: string;
  english_meaning: string;
  nepali_meaning: string;
}

export interface Question {
  id: string;
  type: "mcq" | "true_false" | "short_answer" | "transformation";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export interface LessonAnalysis {
  title: string;
  summary: string;
  vocabulary: VocabularyItem[];
  grammar_tips: string;
  questions: {
    level_1: Question[];
    level_2: Question[];
    level_3: Question[];
  };
}

export type QuizLevel = 1 | 2 | 3;
export type GradeLevel = '1-4' | '5-7' | '8-10' | '11-12';

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  analysis?: LessonAnalysis;
  status: 'locked' | 'available' | 'completed';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
