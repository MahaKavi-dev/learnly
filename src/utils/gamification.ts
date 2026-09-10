import { BadgeDefinition, UserBadge, UserProgressState } from '@/types/gamification';

export const KNOWN_BADGES: BadgeDefinition[] = [
  {
    id: 'first_step',
    name: 'First Step',
    description: 'Complete your first exercise',
    emoji: '🌟',
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Achieve a 7-day practice streak',
    emoji: '🔥',
  },
  {
    id: 'xp_champion',
    name: 'XP Champion',
    description: 'Reach 200+ total XP',
    emoji: '🏆',
  },
  {
    id: 'writing_star',
    name: 'Writing Star',
    description: 'Master writing exercises',
    emoji: '✍️',
  },
  {
    id: 'reading_star',
    name: 'Reading Star',
    description: 'Master reading exercises',
    emoji: '📖',
  },
];

/**
 * Calculates XP earned for an exercise based on difficulty and score percentage.
 * - easy = 10 XP
 * - medium = 20 XP
 * - hard = 30 XP
 * 
 * Performance multiplier:
 * - Score >= 70 (Correct) -> 100% XP
 * - 40 <= Score < 70 (Partial) -> 50% XP
 * - Score < 40 (Incorrect) -> 0 XP
 */
export function calculateEarnedXP(difficulty?: string | number, score: number = 0): number {
  let baseXP = 10;
  const diffStr = String(difficulty || '').toLowerCase().trim();

  if (diffStr === 'medium' || diffStr === '2') {
    baseXP = 20;
  } else if (diffStr === 'hard' || diffStr === '3') {
    baseXP = 30;
  } else if (diffStr === 'easy' || diffStr === '1') {
    baseXP = 10;
  }

  if (score >= 70) {
    return baseXP;
  } else if (score >= 40) {
    return Math.round(baseXP * 0.5);
  }
  return 0;
}

/**
 * Calculates learner level from total accumulated XP:
 * - 0 to 99 XP -> Level 1
 * - 100 to 199 XP -> Level 2
 * - 200+ XP -> Level 3
 */
export function calculateLevel(xp: number): number {
  if (xp >= 200) return 3;
  if (xp >= 100) return 2;
  return 1;
}

/**
 * Calculates level threshold & progress details for progress bar displays.
 */
export function getLevelProgressDetails(xp: number) {
  const currentLevel = calculateLevel(xp);
  if (currentLevel === 1) {
    return {
      currentLevel: 1,
      nextLevel: 2,
      minXP: 0,
      maxXP: 100,
      progressXP: xp,
      percent: Math.min(100, Math.max(0, (xp / 100) * 100)),
    };
  } else if (currentLevel === 2) {
    return {
      currentLevel: 2,
      nextLevel: 3,
      minXP: 100,
      maxXP: 200,
      progressXP: xp - 100,
      percent: Math.min(100, Math.max(0, ((xp - 100) / 100) * 100)),
    };
  } else {
    return {
      currentLevel: 3,
      nextLevel: 3,
      minXP: 200,
      maxXP: 200,
      progressXP: xp,
      percent: 100,
    };
  }
}

/**
 * Formats a Date object to YYYY-MM-DD string in local timezone
 */
export function formatDateISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

/**
 * Calculates updated streak values given previous state and activity date.
 */
export function calculateUpdatedStreak(
  lastDateStr: string | null,
  currentStreak: number,
  longestStreak: number,
  todayStr: string = formatDateISO()
): { currentStreak: number; longestStreak: number; lastActivityDate: string } {
  if (!lastDateStr) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, 1),
      lastActivityDate: todayStr,
    };
  }

  const lastDay = lastDateStr.slice(0, 10);
  const todayDay = todayStr.slice(0, 10);

  if (lastDay === todayDay) {
    // Same day: preserve current streak without double-incrementing
    return {
      currentStreak: Math.max(currentStreak, 1),
      longestStreak: Math.max(longestStreak, currentStreak, 1),
      lastActivityDate: todayDay,
    };
  }

  const lastDate = parseLocalDateOnly(lastDay);
  const todayDate = parseLocalDateOnly(todayDay);
  if (Number.isNaN(lastDate.getTime()) || Number.isNaN(todayDate.getTime())) {
    return {
      currentStreak: Math.max(currentStreak, 1),
      longestStreak: Math.max(longestStreak, 1),
      lastActivityDate: todayDay,
    };
  }

  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

  if (diffDays === 1) {
    // Consecutive day: increment streak
    const newCurrent = currentStreak + 1;
    return {
      currentStreak: newCurrent,
      longestStreak: Math.max(longestStreak, newCurrent),
      lastActivityDate: todayDay,
    };
  } else if (diffDays > 1) {
    // Missed full day: reset current streak to 1, preserve longest streak
    return {
      currentStreak: 1,
      longestStreak: Math.max(longestStreak, currentStreak, 1),
      lastActivityDate: todayDay,
    };
  }

  return {
    currentStreak,
    longestStreak,
    lastActivityDate: lastDateStr,
  };
}

/**
 * Evaluates unlocked badges based on user progress state.
 */
export function checkBadges(state: UserProgressState): UserBadge[] {
  const totalCompleted = state.readingCompleted + state.writingCompleted;
  const todayStr = formatDateISO();

  return KNOWN_BADGES.map((def) => {
    let unlocked = state.unlockedBadgeIds.includes(def.id);

    if (!unlocked) {
      if (def.id === 'first_step' && totalCompleted >= 1) {
        unlocked = true;
      } else if (
        def.id === 'streak_master' &&
        (state.currentStreak >= 7 || state.longestStreak >= 7)
      ) {
        unlocked = true;
      } else if (def.id === 'xp_champion' && state.xp >= 200) {
        unlocked = true;
      } else if (def.id === 'writing_star' && state.writingCompleted >= 5) {
        unlocked = true;
      } else if (def.id === 'reading_star' && state.readingCompleted >= 5) {
        unlocked = true;
      }
    }

    return {
      ...def,
      unlocked,
      unlockedAt: unlocked ? todayStr : undefined,
    };
  });
}
