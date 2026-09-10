import { supabase } from '@/config/supabase';
import {
  ExerciseResultPayload,
  RewardResult,
  UserProgressState,
} from '@/types/gamification';
import {
  calculateEarnedXP,
  calculateLevel,
  calculateUpdatedStreak,
  checkBadges,
  formatDateISO,
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
let activeUserId: string | null = null;
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

/**
 * Loads user gamification metrics and progress from Supabase database.
 */
export async function loadUserGamificationState(userId: string): Promise<UserProgressState> {
  activeUserId = userId;

  if (!userId) {
    currentState = { ...DEFAULT_STATE };
    notifyListeners();
    return currentState;
  }

  try {
    // 1. Fetch learner profile
    const { data: profile } = await supabase
      .from('learner_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // 2. Fetch streak info
    const { data: streakRow } = await supabase
      .from('streaks')
      .select('*')
      .eq('child_id', userId)
      .single();

    if (profile || streakRow) {
      currentState = {
        xp: profile?.xp || 0,
        level: profile?.level || calculateLevel(profile?.xp || 0),
        currentStreak: streakRow?.current_streak || profile?.streak || 0,
        longestStreak: streakRow?.longest_streak || profile?.streak || 0,
        lastActivityDate: streakRow?.last_activity_date || null,
        readingAccuracy: profile?.reading_accuracy || 0,
        readingFluency: profile?.reading_fluency || 0,
        readingCompleted: profile?.reading_completed || 0,
        writingSpelling: profile?.spelling || 0,
        writingSentence: profile?.sentence_formation || 0,
        writingCompleted: profile?.writing_completed || 0,
        weakSkill: profile?.weak_skill || null,
        unlockedBadgeIds: [],
      };

      // Check badges for loaded state
      const evaluatedBadges = checkBadges(currentState);
      currentState.unlockedBadgeIds = evaluatedBadges
        .filter((b) => b.unlocked)
        .map((b) => b.id);

      notifyListeners();
      return currentState;
    }
  } catch (err) {
    console.warn('Failed to load user gamification state from Supabase, using local:', err);
  }

  notifyListeners();
  return currentState;
}

/**
 * Records exercise completion and persists updated state to Supabase database.
 */
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

  // Asynchronously persist to Supabase PostgreSQL database
  const targetUserId = payload.childId || activeUserId;
  if (targetUserId) {
    persistGamificationStateToSupabase(targetUserId, currentState).catch((err) =>
      console.warn('Async Supabase state persist warning:', err)
    );
  }

  return {
    xpEarned,
    newLevel,
    leveledUp,
    newBadges,
    updatedState: { ...currentState },
  };
}

async function persistGamificationStateToSupabase(
  userId: string,
  state: UserProgressState
) {
  try {
    // Upsert learner_profiles
    await supabase.from('learner_profiles').upsert(
      {
        user_id: userId,
        level: state.level,
        xp: state.xp,
        current_streak: state.currentStreak,
        longest_streak: state.longestStreak,
        reading_accuracy: state.readingAccuracy,
        reading_fluency: state.readingFluency,
        spelling: state.writingSpelling,
        sentence_formation: state.writingSentence,
        reading_completed: state.readingCompleted,
        writing_completed: state.writingCompleted,
        weak_skill: state.weakSkill,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // Upsert streaks
    await supabase.from('streaks').upsert(
      {
        child_id: userId,
        current_streak: state.currentStreak,
        longest_streak: state.longestStreak,
        last_activity_date: state.lastActivityDate,
      },
      { onConflict: 'child_id' }
    );
  } catch (err) {
    console.warn('Failed to persist gamification state to Supabase:', err);
  }
}

export function resetGamificationState(): void {
  activeUserId = null;
  currentState = { ...DEFAULT_STATE };
  notifyListeners();
}
