-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR ABACUS PARENT TRAINING PROGRAM
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  child_name TEXT,
  child_age INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_classes INTEGER NOT NULL DEFAULT 8,
  badge TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CLASSES TABLE
CREATE TABLE IF NOT EXISTS public.classes (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
  class_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  title_en TEXT,
  short_intro TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  practice_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  homework_title TEXT NOT NULL,
  homework_instructions TEXT NOT NULL,
  is_locked_by_default BOOLEAN NOT NULL DEFAULT true,
  module_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(course_id, class_number)
);

-- 5. PROGRESS TABLE
CREATE TABLE IF NOT EXISTS public.progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  homework_submission TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, class_id)
);

-- 6. HOMEWORK SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.homework_submissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  class_id TEXT REFERENCES public.classes(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'needs_revision')),
  feedback TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile or Admins can view all" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- COURSES & CLASSES POLICIES (Public read for authenticated users)
CREATE POLICY "Authenticated users can view courses" 
ON public.courses FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage courses" 
ON public.courses FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users can view active classes" 
ON public.classes FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can insert/update/delete classes" 
ON public.classes FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- PROGRESS POLICIES
CREATE POLICY "Users can view and update their own progress" 
ON public.progress FOR ALL 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- HOMEWORK SUBMISSIONS POLICIES
CREATE POLICY "Users can view and submit their homework" 
ON public.homework_submissions FOR ALL 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ANNOUNCEMENTS POLICIES
CREATE POLICY "Authenticated users can read announcements" 
ON public.announcements FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage announcements" 
ON public.announcements FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ====================================================================
-- AUTO-CREATE PROFILE TRIGGER ON SIGNUP
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'অভিভাবক'),
    COALESCE(new.raw_user_meta_data->>'role', 'parent')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
