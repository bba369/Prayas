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
