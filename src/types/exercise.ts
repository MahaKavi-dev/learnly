export type Language = 'en' | 'ta';
export type SkillType = 'reading' | 'writing';
export type DifficultyLevel = 'beginner' | 'easy' | 'intermediate';

export interface ReadingExercise {
  id: string;
  language: Language;
  text: string;
  difficulty: DifficultyLevel;
  skill: SkillType;
  questionNumber: number;
}

export interface WritingExercise {
  id: string;
  language: Language;
  prompt: string;
  expectedAnswer: string;
  difficulty: DifficultyLevel;
  skill: 'writing';
  questionNumber: number;
}
