-- Run this SQL in Supabase SQL Editor to create required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Charities table
CREATE TABLE IF NOT EXISTS charities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  charity_id INTEGER NOT NULL CHECK (charity_id >= 1 AND charity_id <= 3),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Winnings table
CREATE TABLE IF NOT EXISTS winnings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  draw_numbers INTEGER[] NOT NULL,
  matches INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draws table (individual draws history)
CREATE TABLE IF NOT EXISTS draws (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  winning_numbers INTEGER[] NOT NULL,
  matches INTEGER NOT NULL,
  reward INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Global draws table (admin controlled)
CREATE TABLE IF NOT EXISTS global_draws (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  winning_numbers INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE charities ENABLE ROW LEVEL SECURITY;
ALTER TABLE winnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update only own
CREATE POLICY "Profiles are viewable by all users" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Scores: users can read/insert/update/delete own scores
CREATE POLICY "Users can read own scores" ON scores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scores" ON scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own scores" ON scores
  FOR DELETE USING (auth.uid() = user_id);

-- Charities: users can read/insert/update/delete own charity
CREATE POLICY "Users can read own charity" ON charities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own charity" ON charities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own charity" ON charities
  FOR UPDATE USING (auth.uid() = user_id);

-- Winnings: users can read/insert own winnings
CREATE POLICY "Users can read own winnings" ON winnings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own winnings" ON winnings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Draws: users can read/insert own draws
CREATE POLICY "Users can read own draws" ON draws
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own draws" ON draws
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
