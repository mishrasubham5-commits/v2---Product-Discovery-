-- ============================================
-- Discovery21 App - Supabase Schema Setup
-- ============================================

-- 1. Create profiles table for user data
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    current_streak INTEGER DEFAULT 1,
    total_score INTEGER DEFAULT 0,
    days_completed INTEGER DEFAULT 0,
    last_submission_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create submissions table for AI reviews
CREATE TABLE IF NOT EXISTS submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    day INTEGER NOT NULL,
    title TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submission_text TEXT NOT NULL,
    ai_score INTEGER,
    ai_critique TEXT,
    daily_score INTEGER,
    UNIQUE(user_id, day) -- One submission per day per user
);

-- 3. Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_total_score ON profiles(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_current_streak ON profiles(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 5. Policies for profiles - anyone can see all profiles (for leaderboard)
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE USING (auth.uid() = id);

-- 6. Policies for submissions - anyone can see all submissions
CREATE POLICY "Public submissions are viewable by everyone" 
    ON submissions FOR SELECT USING (true);

-- Users can only insert their own submissions
CREATE POLICY "Users can insert own submissions" 
    ON submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own submissions
CREATE POLICY "Users can update own submissions" 
    ON submissions FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- HOW TO RUN THIS:
-- 1. Go to https://app.supabase.com
-- 2. Select your project
-- 3. Go to SQL Editor
-- 4. Copy and paste this entire script
-- 5. Click "Run" to execute
-- ============================================
