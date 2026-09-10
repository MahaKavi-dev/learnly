export interface AssessmentRequest {
  exerciseId: string;
  expectedText: string;
  userTranscript: string;
  language: string;
  childId?: string;
}

export type NextDifficulty = 'easy' | 'medium' | 'hard';

export interface AssessmentResponse {
  score: number;
  accuracy: number;
  fluency: number;
  skill: string;
  needsPractice: boolean;
  feedback: string;
  nextDifficulty: NextDifficulty;
}
