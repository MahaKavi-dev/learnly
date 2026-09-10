import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/config/supabase';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

export function translateAuthError(error: any): string {
  if (!error) return 'An unknown error occurred.';

  const message = typeof error === 'string' ? error : error.message || String(error);
  const msgLower = message.toLowerCase();

  // Log safe error attributes to Metro console for developer diagnostics (no credentials/tokens)
  if (typeof error === 'object' && error !== null) {
    console.error('[Supabase Auth Error Details]:', {
      name: error.name,
      code: error.code,
      status: error.status,
      message: error.message,
    });
  }

  if (msgLower.includes('already registered') || msgLower.includes('user_already_exists')) {
    return 'This email is already registered. Try signing in!';
  }
  if (msgLower.includes('invalid login credentials') || msgLower.includes('invalid_credentials')) {
    return 'Please check your email and password.';
  }
  if (msgLower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msgLower.includes('network') || msgLower.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Surface actual Supabase error message rather than masking with generic text
  return message || 'Something went wrong. Please try again.';
}

export async function signUp(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        name: name.trim(),
      },
    },
  });

  if (error) {
    throw new Error(translateAuthError(error));
  }

  // Initialize user profile, child, learner_profile, and streak records in Supabase (fallback)
  if (data.user) {
    const userId = data.user.id;
    const userName = name.trim();
    try {
      await supabase.from('profiles').upsert(
        { id: userId, name: userName, role: 'student', language: 'en' },
        { onConflict: 'id' }
      );
      await supabase.from('children').upsert(
        { id: userId, parent_id: userId, name: userName, age: 10, preferred_language: 'en' },
        { onConflict: 'id' }
      );
      await supabase.from('learner_profiles').upsert(
        {
          user_id: userId,
          level: 1,
          xp: 0,
          current_streak: 0,
          longest_streak: 0,
          reading_accuracy: 0,
          reading_fluency: 0,
          spelling: 0,
          sentence_formation: 0,
          reading_completed: 0,
          writing_completed: 0,
        },
        { onConflict: 'user_id' }
      );
      await supabase.from('streaks').upsert(
        { child_id: userId, current_streak: 0, longest_streak: 0 },
        { onConflict: 'child_id' }
      );
    } catch (dbErr) {
      console.warn('Initial profile database record creation warning:', dbErr);
    }
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(translateAuthError(error));
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.warn('Supabase signOut warning:', error);
  }
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return authListener.subscription;
}
