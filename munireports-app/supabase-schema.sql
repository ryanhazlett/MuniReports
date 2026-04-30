-- =============================================
-- MuniReports Database Schema
-- Run this in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'team')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, plan)
  VALUES (NEW.id, 'free');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer_name TEXT NOT NULL,
  state TEXT,
  issuer_type TEXT,
  rating TEXT,
  sentiment TEXT,
  sentiment_score INTEGER,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Reports: users can CRUD their own reports
CREATE POLICY "Users can view own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON public.reports FOR DELETE
  USING (auth.uid() = user_id);

-- Allow the service role to manage profiles (for Stripe webhook)
CREATE POLICY "Service role can manage profiles"
  ON public.profiles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
