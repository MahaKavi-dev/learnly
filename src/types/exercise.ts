export type Language = 'en' | 'ta';
export type ExerciseType = 'reading' | 'writing';
export type DifficultyLevel = 1 | 2 | 3 | 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate';

export interface ExerciseItem {
  id: string;
  language: Language;
  type: ExerciseType;
  difficulty: number;
  skill: string;
  content: string;
  expected_answer: string;
  hint?: string;
  xp?: number;
  created_at?: string;
  questionNumber?: number;
}

export interface ReadingExercise extends ExerciseItem {
  text: string;
}

export interface WritingExercise extends ExerciseItem {
  prompt: string;
  expectedAnswer: string;
}

