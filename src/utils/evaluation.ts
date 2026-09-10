import { Language } from '@/types/exercise';

export interface WritingEvaluation {
  correct: boolean;
  score: number;
  feedback: string;
}

/**
 * Normalizes text for fair comparison:
 * - Trims leading/trailing whitespace
 * - Collapses multiple spaces to a single space
 * - Removes leading/trailing basic punctuation
 * - Converts to lowercase for English (preserves Tamil characters)
 */
export function normalizeText(text: string, language: Language): string {
  let normalized = text.trim().replace(/\s+/g, ' ');
  // Remove leading/trailing basic punctuation
  normalized = normalized.replace(/^[.,!?:;'"“”]+|[.,!?:;'"“”]+$/g, '');
  if (language === 'en') {
    normalized = normalized.toLowerCase();
  }
  return normalized;
}

/**
 * Calculates a Levenshtein-based similarity score (0 to 100)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100;
  if (!str1.length || !str2.length) return 0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1)
    .fill(null)
    .map(() => Array(len1 + 1).fill(0));

  for (let i = 0; i <= len1; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= len2; j += 1) matrix[j][0] = j;

  for (let j = 1; j <= len2; j += 1) {
    for (let i = 1; i <= len1; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // Deletion
        matrix[j - 1][i] + 1, // Insertion
        matrix[j - 1][i - 1] + indicator // Substitution
      );
    }
  }

  const distance = matrix[len2][len1];
  const maxLen = Math.max(len1, len2);
  const similarity = Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
  return similarity;
}

/**
 * Clean evaluation function structured for easy replacement with FastAPI/Gemini endpoints
 */
export function evaluateWritingAnswer(
  userAnswer: string,
  expectedAnswer: string,
  language: Language
): WritingEvaluation {
  const normUser = normalizeText(userAnswer, language);
  const normExpected = normalizeText(expectedAnswer, language);

  // Exact match after normalization
  if (normUser === normExpected) {
    return {
      correct: true,
      score: 100,
      feedback:
        language === 'ta'
          ? 'அற்புதம்! சரியான பதில்! 🎉'
          : "Great job! That's correct! 🎉",
    };
  }

  // Calculate similarity for partial matches
  const similarity = calculateSimilarity(normUser, normExpected);
  let score = 0;

  if (similarity >= 70) {
    score = Math.min(90, Math.max(70, similarity));
  } else if (similarity >= 40) {
    score = Math.min(60, Math.max(40, similarity));
  } else {
    score = 0;
  }

  return {
    correct: false,
    score,
    feedback:
      language === 'ta'
        ? 'சரியாக வரவில்லை. மீண்டும் உற்று நோக்கி முயற்சிக்கவும்! 💪'
        : 'Not quite. Take another look and try again! 💪',
  };
}
