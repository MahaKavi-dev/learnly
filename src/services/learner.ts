import { API_BASE_URL } from '@/config/api';
import { DEMO_CHILD_ID } from '@/config/learner';

export interface ChildProfile {
  id: string;
  name: string;
  age?: number;
  preferred_language?: string;
}

export interface LearnerProgressSummary {
  childId: string;
  currentStreak?: number;
  longestStreak?: number;
  exercisesCompleted?: number;
  readingAccuracy?: number;
}

/**
 * Fetches learner profile and progress metrics from backend services.
 */
export async function getLearnerProfile(childId: string = DEMO_CHILD_ID): Promise<ChildProfile> {
  try {
    const response = await globalThis.fetch(`${API_BASE_URL}/api/learner/${childId}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn('Backend learner profile fetch failed, returning demo profile:', error);
  }

  return {
    id: DEMO_CHILD_ID,
    name: 'Demo Student',
    age: 10,
    preferred_language: 'en',
  };
}
