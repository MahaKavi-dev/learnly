export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface UserBadge extends BadgeDefinition {
  unlocked: boolean;
  unlockedAt?: string;
}

export interface UserProgressState {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null; // ISO YYYY-MM-DD
  readingAccuracy: number; // average accuracy percentage (0-100)
  readingFluency: number; // average fluency percentage (0-100)
  readingCompleted: number;
  writingSpelling: number; // average spelling score percentage (0-100)
  writingSentence: number; // average sentence formation score percentage (0-100)
  writingCompleted: number;
  weakSkill: string | null;
  unlockedBadgeIds: string[];
}

export interface ExerciseResultPayload {
  type: 'reading' | 'writing';
  difficulty?: string | number; // 'easy' | 'medium' | 'hard' | 1 | 2 | 3
  score: number; // 0 to 100
  accuracy?: number;
  fluency?: number;
  skill?: string;
  childId?: string;
  evaluation?: any;
}

export interface RewardResult {
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
  newBadges: UserBadge[];
  updatedState: UserProgressState;
}
