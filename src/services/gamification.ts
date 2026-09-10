import {
  ExerciseResultPayload,
  RewardResult,
  UserBadge,
  UserProgressState,
} from '@/types/gamification';
import {
  calculateEarnedXP,
  calculateLevel,
  calculateUpdatedStreak,
  checkBadges,
  formatDateISO,
  KNOWN_BADGES,
} from '@/utils/gamification';

const DEFAULT_STATE: UserProgressState = {
  xp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  readingAccuracy: 0,
  readingFluency: 0,
  readingCompleted: 0,
  writingSpelling: 0,
  writingSentence: 0,
  writingCompleted: 0,
  weakSkill: null,
  unlockedBadgeIds: [],
};

let currentState: UserProgressState = { ...DEFAULT_STATE };
const listeners = new Set<(state: UserProgressState) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener({ ...currentState }));
}

export function getGamificationState(): UserProgressState {
  return { ...currentState };
}

export function subscribeGamificationState(
  listener: (state: UserProgressState) => void
): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => {
    listeners.delete(listener);
  };
}

export function recordExerciseCompletion(payload: ExerciseResultPayload): RewardResult {
  const xpEarned = calculateEarnedXP(payload.difficulty, payload.score);
  const oldLevel = currentState.level;
  const newXP = currentState.xp + xpEarned;
  const newLevel = calculateLevel(newXP);
  const leveledUp = newLevel > oldLevel;

  // Streak update
  const todayStr = formatDateISO();
  const streakInfo = calculateUpdatedStreak(
    currentState.lastActivityDate,
    currentState.currentStreak,
    currentState.longestStreak,
    todayStr
  );

  // Performance metrics update
  let newReadingCompleted = currentState.readingCompleted;
  let newReadingAccuracy = currentState.readingAccuracy;
  let newReadingFluency = currentState.readingFluency;
  let newWritingCompleted = currentState.writingCompleted;
  let newWritingSpelling = currentState.writingSpelling;
  let newWritingSentence = currentState.writingSentence;

  if (payload.type === 'reading') {
    newReadingCompleted += 1;
    const acc = payload.accuracy !== undefined ? payload.accuracy : payload.score;
    const flu = payload.fluency !== undefined ? payload.fluency : payload.score;
    newReadingAccuracy = Math.round(
      (currentState.readingAccuracy * (newReadingCompleted - 1) + acc) / newReadingCompleted
    );
    newReadingFluency = Math.round(
      (currentState.readingFluency * (newReadingCompleted - 1) + flu) / newReadingCompleted
    );
  } else if (payload.type === 'writing') {
    newWritingCompleted += 1;
    const scoreVal = payload.score;
    newWritingSpelling = Math.round(
      (currentState.writingSpelling * (newWritingCompleted - 1) + scoreVal) / newWritingCompleted
    );
    newWritingSentence = Math.round(
      (currentState.writingSentence * (newWritingCompleted - 1) + scoreVal) / newWritingCompleted
    );
  }

  // Weak skill identification
  let weakSkill: string | null = null;
  if (newReadingCompleted > 0 && newReadingAccuracy < 70) {
    weakSkill = 'Reading Accuracy';
  } else if (newReadingCompleted > 0 && newReadingFluency < 70) {
    weakSkill = 'Reading Fluency';
  } else if (newWritingCompleted > 0 && newWritingSpelling < 70) {
    weakSkill = 'Writing Spelling';
  } else if (newWritingCompleted > 0 && newWritingSentence < 70) {
    weakSkill = 'Sentence Formation';
  }

  // Intermediate state for checking badges
  const updatedTempState: UserProgressState = {
    ...currentState,
    xp: newXP,
    level: newLevel,
    currentStreak: streakInfo.currentStreak,
    longestStreak: streakInfo.longestStreak,
    lastActivityDate: streakInfo.lastActivityDate,
    readingCompleted: newReadingCompleted,
    readingAccuracy: newReadingAccuracy,
    readingFluency: newReadingFluency,
    writingCompleted: newWritingCompleted,
    writingSpelling: newWritingSpelling,
    writingSentence: newWritingSentence,
    weakSkill,
  };

  // Evaluate badges
  const evaluatedBadges = checkBadges(updatedTempState);
  const unlockedBadgeIds = evaluatedBadges
    .filter((b) => b.unlocked)
    .map((b) => b.id);

  const newBadges = evaluatedBadges.filter(
    (b) => b.unlocked && !currentState.unlockedBadgeIds.includes(b.id)
  );

  currentState = {
    ...updatedTempState,
    unlockedBadgeIds,
  };

  notifyListeners();

  return {
    xpEarned,
    newLevel,
    leveledUp,
    newBadges,
    updatedState: { ...currentState },
  };
}

export function resetGamificationState(): void {
  currentState = { ...DEFAULT_STATE };
  notifyListeners();
}
