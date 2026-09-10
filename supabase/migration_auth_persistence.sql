-- ==============================================================================
-- LEARNLY SUPABASE DATABASE AUTH & PERSISTENCE MIGRATION (FINAL REVISION)
-- ==============================================================================
-- Idempotent, non-destructive migration script that reconciles existing database
-- tables with Learnly's authentication and gamification system.
-- Preserves existing demo data, leaves legacy learners_profile untouched,
-- and configures Row Level Security (RLS) and automatic user creation triggers.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- SECTION 1: ENSURE TABLES EXIST (NON-DESTRUCTIVE)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'student',
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL,
  name TEXT,
  age INTEGER DEFAULT 10,
  preferred_language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learner_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  reading_accuracy INTEGER DEFAULT 0,
  reading_fluency INTEGER DEFAULT 0,
  spelling INTEGER DEFAULT 0,
  sentence_formation INTEGER DEFAULT 0,
  reading_completed INTEGER DEFAULT 0,
  writing_completed INTEGER DEFAULT 0,
  weak_skill TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  exercise_id UUID,
  answer TEXT,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  skill TEXT,
  accuracy INTEGER DEFAULT 0,
  fluency INTEGER DEFAULT 0,
  exercises_completed INTEGER DEFAULT 0,
  next_difficulty TEXT,
  current_level INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.child_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  badge_id UUID,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  earned_id TIMESTAMPTZ
);

-- ------------------------------------------------------------------------------
-- SECTION 2: EXPLICIT COLUMN RECONCILIATION
-- ------------------------------------------------------------------------------

ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS fluency INTEGER DEFAULT 0;
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS next_difficulty TEXT;
ALTER TABLE public.progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.child_badges ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS reading_accuracy INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS reading_fluency INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS spelling INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS sentence_formation INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS reading_completed INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS writing_completed INTEGER DEFAULT 0;
ALTER TABLE public.learner_profiles ADD COLUMN IF NOT EXISTS weak_skill TEXT;

-- ------------------------------------------------------------------------------
-- SECTION 3: FOREIGN KEYS
-- ------------------------------------------------------------------------------

-- Add Foreign Key on profiles.id -> auth.users(id) if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- SECTION 4: HARDENED AUTOMATIC USER CREATION TRIGGER ON auth.users
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, name, role, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    'student',
    'en'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Create Child Record (child_id = NEW.id, parent_id = NEW.id for 1-to-1 MVP)
  INSERT INTO public.children (id, parent_id, name, age, preferred_language)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    10,
    'en'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. Create Learner Profile
  INSERT INTO public.learner_profiles (
    user_id, level, xp, current_streak, longest_streak,
    reading_accuracy, reading_fluency, spelling, sentence_formation,
    reading_completed, writing_completed
  )
  VALUES (
    NEW.id, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- 4. Create Streak Record
  INSERT INTO public.streaks (child_id, current_streak, longest_streak)
  VALUES (
    NEW.id, 0, 0
  )
  ON CONFLICT (child_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ------------------------------------------------------------------------------
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------

-- Enable RLS on user data tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Children Policies
DROP POLICY IF EXISTS "Users can view own child record" ON public.children;
CREATE POLICY "Users can view own child record" ON public.children FOR SELECT USING (auth.uid() = id OR auth.uid() = parent_id);

DROP POLICY IF EXISTS "Users can insert own child record" ON public.children;
CREATE POLICY "Users can insert own child record" ON public.children FOR INSERT WITH CHECK (auth.uid() = id OR auth.uid() = parent_id);

DROP POLICY IF EXISTS "Users can update own child record" ON public.children;
CREATE POLICY "Users can update own child record" ON public.children FOR UPDATE USING (auth.uid() = id OR auth.uid() = parent_id);

-- Learner Profiles Policies
DROP POLICY IF EXISTS "Users can view own learner profile" ON public.learner_profiles;
CREATE POLICY "Users can view own learner profile" ON public.learner_profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own learner profile" ON public.learner_profiles;
CREATE POLICY "Users can insert own learner profile" ON public.learner_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own learner profile" ON public.learner_profiles;
CREATE POLICY "Users can update own learner profile" ON public.learner_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Streaks Policies
DROP POLICY IF EXISTS "Users can view own streak" ON public.streaks;
CREATE POLICY "Users can view own streak" ON public.streaks FOR SELECT USING (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can insert own streak" ON public.streaks;
CREATE POLICY "Users can insert own streak" ON public.streaks FOR INSERT WITH CHECK (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can update own streak" ON public.streaks;
CREATE POLICY "Users can update own streak" ON public.streaks FOR UPDATE USING (auth.uid() = child_id);

-- Attempts Policies
DROP POLICY IF EXISTS "Users can view own attempts" ON public.attempts;
CREATE POLICY "Users can view own attempts" ON public.attempts FOR SELECT USING (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can insert own attempt" ON public.attempts;
CREATE POLICY "Users can insert own attempt" ON public.attempts FOR INSERT WITH CHECK (auth.uid() = child_id);

-- Progress Policies
DROP POLICY IF EXISTS "Users can view own progress" ON public.progress;
CREATE POLICY "Users can view own progress" ON public.progress FOR SELECT USING (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can insert own progress" ON public.progress;
CREATE POLICY "Users can insert own progress" ON public.progress FOR INSERT WITH CHECK (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can update own progress" ON public.progress;
CREATE POLICY "Users can update own progress" ON public.progress FOR UPDATE USING (auth.uid() = child_id);

-- Child Badges Policies
DROP POLICY IF EXISTS "Users can view own child badges" ON public.child_badges;
CREATE POLICY "Users can view own child badges" ON public.child_badges FOR SELECT USING (auth.uid() = child_id);

DROP POLICY IF EXISTS "Users can insert own child badge" ON public.child_badges;
CREATE POLICY "Users can insert own child badge" ON public.child_badges FOR INSERT WITH CHECK (auth.uid() = child_id);

-- Exercises & Badges (Strict Public Read Access; Write Operations Denied to Anon/Authenticated)
ALTER TABLE IF EXISTS public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on exercises" ON public.exercises;
CREATE POLICY "Allow public read on exercises" ON public.exercises FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on badges" ON public.badges;
CREATE POLICY "Allow public read on badges" ON public.badges FOR SELECT USING (true);
