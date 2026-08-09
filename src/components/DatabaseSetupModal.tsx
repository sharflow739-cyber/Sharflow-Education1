import React, { useState } from 'react';
import { X, Copy, Check, Database, ExternalLink, ShieldCheck } from 'lucide-react';

interface DatabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sqlSchemaCode = `-- ====================================================================
-- SUPABASE DATABASE SCHEMA FOR ABACUS PARENT TRAINING PROGRAM
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE
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

-- 2. COURSES TABLE
CREATE TABLE IF NOT EXISTS public.courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  total_classes INTEGER NOT NULL DEFAULT 8,
  badge TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CLASSES TABLE
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

-- 4. PROGRESS TABLE
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

-- 5. RLS POLICIES & TRIGGER
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile or Admin views all" ON public.profiles FOR SELECT USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Authenticated users view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage own progress" ON public.progress FOR ALL USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSchemaCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-orange-100 overflow-hidden relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-orange-400" />
            <div>
              <h3 className="font-extrabold text-base">Supabase Database SQL Setup</h3>
              <p className="text-[11px] text-slate-400">
                ডাটাবেজ টেবিল, প্রাইভেসি ও RLS সিকিউরিটি পলিসি সেটআপ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          
          <div className="p-3.5 bg-orange-50 border border-orange-200 rounded-xl space-y-1">
            <strong className="text-orange-800 font-bold block">ধাপ ১: Supabase এ SQL রান করার নির্দেশিকা:</strong>
            <p className="text-slate-600">
              আপনার Supabase Dashboard &gt; SQL Editor এ যান এবং নিচের SQL কোডটি পেস্ট করে "Run" বাটনে ক্লিক করুন।
            </p>
          </div>

          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs z-10"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'কপি হয়েছে (Copied)' : 'কোড কপি করুন'}
            </button>

            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800 leading-relaxed">
              {sqlSchemaCode}
            </pre>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <strong className="text-slate-800 font-bold block">ধাপ ২: Environment Variables সেটআপ:</strong>
            <p className="text-slate-600">
              আপনার Project Settings &gt; API থেকে URL এবং Anon Public Key নিয়ে <code className="bg-white border px-1 rounded text-orange-600 font-mono">.env.example</code> বা AI Studio Secrets এ যুক্ত করুন:
            </p>
            <div className="font-mono text-[11px] text-slate-800 pt-1">
              VITE_SUPABASE_URL=https://your-project.supabase.co<br />
              VITE_SUPABASE_ANON_KEY=your-anon-key
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
          >
            বন্ধ করুন (Close)
          </button>
        </div>

      </div>
    </div>
  );
};
