import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { VideoPlayer } from './VideoPlayer';
import {
  UserPlus,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Lock,
  Loader2,
  LogIn,
} from 'lucide-react';

interface DemoPageProps {
  currentUser: UserProfile | null;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
}

export const DemoPage: React.FC<DemoPageProps> = ({
  currentUser,
  onNavigate,
  onOpenAuth,
}) => {
  const isAuthorizedForDemo = Boolean(currentUser && currentUser.is_active);
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(isAuthorizedForDemo);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // Strictly never fetch or expose demo media URL to signed-out visitors
    if (!isAuthorizedForDemo || !currentUser?.id || !isSupabaseConfigured || !supabase) {
      setDemoUrl(null);
      setLoadingDemo(false);
      setFetchError(null);
      return;
    }

    let cancelled = false;

    async function fetchAuthenticatedDemoUrl() {
      if (!supabase) return;
      setLoadingDemo(true);
      setFetchError(null);
      setDemoUrl(null);

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const accessToken = session?.access_token;
        if (!accessToken) {
          if (!cancelled) {
            setDemoUrl(null);
            setLoadingDemo(false);
          }
          return;
        }

        // Primary authenticated delivery path via /api/demo-video
        try {
          const response = await fetch('/api/demo-video', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            cache: 'no-store',
          });

          const contentType = response.headers.get('content-type') || '';
          if (response.ok && contentType.includes('application/json')) {
            const payload = (await response.json()) as { video_url?: string };
            if (!cancelled) {
              setDemoUrl(payload.video_url?.trim() || null);
              setLoadingDemo(false);
            }
            return;
          }
        } catch {
          // Fall through to authenticated Supabase RLS table when /api route is unavailable (e.g., local Vite dev)
        }

        // Authenticated RLS-protected table fallback (anon has zero SELECT access)
        const { data: demoRow, error: demoErr } = await supabase
          .from('demo_settings')
          .select('video_url')
          .eq('id', 1)
          .maybeSingle();

        if (!cancelled) {
          if (demoErr) {
            setFetchError('ডেমো ভিডিও লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।');
            setDemoUrl(null);
          } else {
            setDemoUrl(demoRow?.video_url?.trim() || null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching authenticated demo video:', err);
          setFetchError('ডেমো ভিডিও লোড করতে সমস্যা হয়েছে।');
          setDemoUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDemo(false);
        }
      }
    }

    fetchAuthenticatedDemoUrl();

    return () => {
      cancelled = true;
    };
  }, [isAuthorizedForDemo, currentUser?.id]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb / Back button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{currentUser ? 'ড্যাশবোর্ডে ফিরে যান' : 'মূল পাতায় ফিরে যান'}</span>
        </button>
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-extrabold flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>সদস্যদের ফ্রি ডেমো</span>
        </span>
      </div>

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          অ্যাবাকাস ফ্রি ডেমো ক্লাস
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          {isAuthorizedForDemo
            ? 'কোর্সে অন্তর্ভুক্ত ভিডিওর মান, উপস্থাপন এবং পাঠদান পদ্ধতি সরাসরি পর্যবেক্ষণ করুন।'
            : 'নতুন অ্যাকাউন্ট নিবন্ধন করুন, ইমেইল যাচাই করুন, তারপর লগইন করে ফ্রি ডেমো দেখুন।'}
        </p>
      </div>

      {/* Demo Video Container (Authenticated Only) OR Auth Gate */}
      <div className="space-y-4">
        {!isAuthorizedForDemo ? (
          <div className="p-5 sm:p-10 bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950 text-white rounded-3xl border border-slate-800 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-400/30 text-orange-300 mx-auto flex items-center justify-center shadow-lg">
              <Lock size={30} />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-xl sm:text-2xl font-black text-white">
                ফ্রি ডেমো দেখতে অ্যাকাউন্ট খুলুন
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                নতুন অ্যাকাউন্ট নিবন্ধন করুন, ইমেইল যাচাই করুন, তারপর লগইন করে ফ্রি ডেমো দেখুন।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto min-h-[48px] px-5 sm:px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-orange-500/25 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-center"
              >
                <UserPlus size={17} className="shrink-0" />
                <span>ফ্রি ক্লাস দেখুন</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto min-h-[48px] px-5 sm:px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-2xl border border-white/20 transition-all inline-flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <LogIn size={16} className="shrink-0" />
                <span>ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন</span>
              </button>
            </div>
          </div>
        ) : loadingDemo ? (
          <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-white/70 gap-2 shadow-xl">
            <Loader2 size={26} className="animate-spin text-orange-500" />
            <span className="text-xs font-medium">ডেমো ভিডিও লোড হচ্ছে...</span>
          </div>
        ) : fetchError ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-2 text-rose-900">
            <AlertCircle size={28} className="text-rose-500 mx-auto" />
            <h3 className="font-extrabold text-sm">{fetchError}</h3>
          </div>
        ) : demoUrl ? (
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-black">
            <VideoPlayer
              videoUrl={demoUrl}
              title="অ্যাবাকাস ফ্রি ডেমো ক্লাস"
              viewerEmail={currentUser?.email}
              viewerPhone={currentUser?.phone}
              isLivePreview={false}
            />
          </div>
        ) : (
          <div className="p-8 sm:p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center font-bold">
              <AlertCircle size={28} />
            </div>
            <h3 className="font-extrabold text-base text-slate-800">
              ডেমো ভিডিও শীঘ্রই যুক্ত করা হবে
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              ডেমো ভিডিওটি শীঘ্রই যুক্ত করা হচ্ছে। কোর্স ও ভর্তির তথ্য দেখতে নিচের বোতামটি ব্যবহার করুন।
            </p>
          </div>
        )}

        {/* Action Button: Enroll */}
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-extrabold text-sm text-slate-900">
              কোর্সে ভর্তি হতে চান?
            </h4>
            <p className="text-xs text-slate-500">
              কোর্স ফি, অন্তর্ভুক্ত সুযোগ-সুবিধা এবং ভর্তির বিস্তারিত নিয়ম জেনে নিন।
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
        <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl space-y-1">
          <h5 className="font-bold text-xs text-orange-950 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-orange-600 shrink-0" />
            বিনামূল্যে অ্যাকাউন্টে দেখুন
          </h5>
          <p className="text-[11px] text-orange-800 leading-normal">
            নতুন অ্যাকাউন্ট নিবন্ধন ও ইমেইল যাচাই করে লগইন করলেই সরাসরি ডেমো ক্লাস দেখতে পারবেন।
          </p>
        </div>

        <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1">
          <h5 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            বাস্তব পাঠদান
          </h5>
          <p className="text-[11px] text-emerald-800 leading-normal">
            মূল পেইড ক্লাসের মতোই স্পষ্ট অডিও ও ভিডিও উপস্থাপনার মাধ্যমে তৈরি।
          </p>
        </div>

        <div className="p-4 bg-sky-50/70 border border-sky-100 rounded-2xl space-y-1">
          <h5 className="font-bold text-xs text-sky-950 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-sky-600 shrink-0" />
            সন্তানকে ঘরে শেখান
          </h5>
          <p className="text-[11px] text-sky-800 leading-normal">
            অভিভাবক নিজে শিখে সন্তানকে কীভাবে গাইড করবেন তা সহজে তুলে ধরা হয়েছে।
          </p>
        </div>
      </div>
    </div>
  );
};
