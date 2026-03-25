import { GoogleGenAI, Type } from "@google/genai";
import { LessonAnalysis, ChatMessage, GradeLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function analyzeLesson(textbookContent: string, gradeLevel: GradeLevel): Promise<LessonAnalysis> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        text: `You are an expert English Language Tutor for students in Grade ${gradeLevel} in rural Nepal. Your goal is to act as the core engine for an Adaptive LMS.
        
        Adapt your complexity and tone:
        - Grade 1-4: Use extremely simple English, focus on basic nouns, verbs, and visual descriptions. Be very playful and use lots of emojis.
        - Grade 5-7: Use very simple English, focus on basic vocabulary and direct facts.
        - Grade 8-10: Use moderate complexity, focus on sentence structure and literary devices.
        - Grade 11-12: Use academic language, focus on critical analysis, advanced rhetoric, and complex themes.

        Input: ${textbookContent}
        
        Task 1: Content Analysis (The Knowledge Weaver)
        - Provide a catchy title for the lesson.
        - Extract key vocabulary words with their meanings in both English and Simple Nepali.
        - Identify the primary Grammar focus (e.g., Tense, Reported Speech, Passive Voice).
        - Create a 3-sentence simple summary of the lesson.
        
        Task 2: Question Generation (Adaptive Assessment)
        Generate 3 levels of questions based on the uploaded content:
        - Level: Explorer (Easy) - Focus on basic vocabulary and direct facts from the text. Use Multiple Choice Questions (MCQs).
        - Level: Learner (Medium) - Focus on Grammar application and True/False questions.
        - Level: Scholar (Hard) - Focus on critical thinking, sentence transformation, and short answers.
        
        Task 3: Tone & Context
        - Use an encouraging, energetic, and friendly tone.
        - Use local Nepali contexts (names like Shanti, Pasang; places like Pokhara, Namche) in example sentences to make it relatable.
        
        Output Format:
        Return the response in JSON format. Structure: { "title": "", "summary": "", "vocabulary": [], "grammar_tips": "", "questions": { "level_1": [], "level_2": [], "level_3": [] } }
        
        Ensure the 'questions' objects follow this structure:
        { "id": "unique_id", "type": "mcq" | "true_false" | "short_answer" | "transformation", "question": "", "options": ["A", "B", "C", "D"] (for mcq), "correct_answer": "", "explanation": "" }`
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                english_meaning: { type: Type.STRING },
                nepali_meaning: { type: Type.STRING }
              },
              required: ["word", "english_meaning", "nepali_meaning"]
            }
          },
          grammar_tips: { type: Type.STRING },
          questions: {
            type: Type.OBJECT,
            properties: {
              level_1: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["mcq"] },
                    question: { type: Type.STRING },
                    options: { type: Type.ARRAY, items: { type: Type.STRING } },
                    correct_answer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "type", "question", "options", "correct_answer"]
                }
              },
              level_2: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["true_false", "transformation"] },
                    question: { type: Type.STRING },
                    correct_answer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "type", "question", "correct_answer"]
                }
              },
              level_3: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["short_answer", "transformation"] },
                    question: { type: Type.STRING },
                    correct_answer: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  },
                  required: ["id", "type", "question", "correct_answer"]
                }
              }
            },
            required: ["level_1", "level_2", "level_3"]
          }
        },
        required: ["title", "summary", "vocabulary", "grammar_tips", "questions"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatWithAssistant(
  message: string,
  history: ChatMessage[],
  lessonContext?: string,
  gradeLevel: GradeLevel = '8-10'
): Promise<string> {
  const chat = ai.chats.create({
    model: "gemini-3.1-flash-lite-preview",
    config: {
      systemInstruction: `You are "The Knowledge Weaver", a friendly and encouraging AI tutor for students in Grade ${gradeLevel} in rural Nepal. 
      Your goal is to help them understand their English lessons. 
      
      Adapt your tone:
      - Grade 1-4: Be extremely playful, use many emojis, very simple words, and tell short, fun stories.
      - Grade 5-7: Be very encouraging, use emojis, simple explanations, and fun examples.
      - Grade 8-10: Be helpful and clear, use relatable examples, focus on academic growth.
      - Grade 11-12: Be professional, academic, and intellectually stimulating. Use precise terminology.

      Use simple English, and occasionally use Nepali words to make them feel comfortable.
      If a lesson context is provided, focus your answers on that lesson.
      Context: ${lessonContext || "No specific lesson context provided yet."}`,
    },
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I'm sorry, I couldn't process that.";
}
