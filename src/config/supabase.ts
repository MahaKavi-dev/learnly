// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';
// @ts-ignore
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jcqzbffjitgwokplzwfr.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjcXpiZmZqaXRnd29rcGx6d2ZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEzMjQ5NTcsImV4cCI6MjA1NjkwNDk1N30.K9wE3p8qO-V8rWvJ4hK2n3bL5m6X7y8z9A0B1C2D3E4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
