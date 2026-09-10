/**
 * Learnly Learner Identity Configuration
 */
import { supabase } from '@/config/supabase';

export const DEMO_CHILD_ID = '096e0481-844a-4a68-a589-e888f3781318';

let cachedUserId: string | null = null;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedUserId = session?.user?.id || null;
});

/**
 * Returns the current authenticated user's ID from Supabase auth session.
 * Falls back to DEMO_CHILD_ID if unauthenticated.
 */
export function getCurrentChildId(): string {
  if (cachedUserId) {
    return cachedUserId;
  }
  try {
    const currentUser = (supabase.auth as any)._currentUser || (supabase.auth as any).user;
    if (currentUser?.id) {
      return currentUser.id;
    }
  } catch (err) {
    // fallback
  }
  return DEMO_CHILD_ID;
}
