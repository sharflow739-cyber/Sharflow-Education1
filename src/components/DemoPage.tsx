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
  Loader2,
  LogIn,
  Video,
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
  const [demoUrl, setDemoUrl] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchPublicDemoUrl() {
      setLoadingDemo(true);
      setFetchError(null);
      setDemoUrl(null);

      try {
        // Primary public delivery path via /api/demo-video (reads only demo_settings)
        try {
          const response = await fetch('/api/demo-video', {
            method: 'GET',
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
          // Fall through to Supabase demo_settings query when /api route is unavailable (e.g., Vite dev)
        }

        if (!isSupabaseConfigured || !supabase) {
          if (!cancelled) {
            setDemoUrl(null);
            setLoadingDemo(false);
          }
          return;
        }

        const { data: demoRow, error: demoErr } = await supabase
          .from('demo_settings')
          .select('video_url')
          .eq('id', 1)
          .maybeSingle();

        if (!cancelled) {
          if (demoErr) {
            // Gracefully fall back to the "coming soon" state if public policy hasn't been applied yet
            setDemoUrl(null);
          } else {
            setDemoUrl(demoRow?.video_url?.trim() || null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching public demo video:', err);
          setFetchError('ডেমো ভিডিও লোড করতে সমস্যা হয়েছে।');
          setDemoUrl(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingDemo(false);
        }
      }
    }

    fetchPublicDemoUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Top Breadcrumb / Back button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#575247] hover:text-[#18191C] transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>{currentUser ? 'ড্যাশবোর্ডে ফিরে যান' : 'মূল পাতায় ফিরে যান'}</span>
        </button>
        <span className="px-3 py-1 bg-[#18191C] text-[#E8C778] border border-[#C89D4A]/45 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#E4BE67]" />
          <span>পাবলিক ডেমো ক্লাস</span>
        </span>
      </div>

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-[#18191C] tracking-tight">
          অ্যাবাকাস ডেমো ক্লাস
        </h1>
        <p className="text-xs sm:text-sm text-[#4F4B43] max-w-xl mx-auto leading-relaxed">
          লগইন ছাড়াই আমাদের পাঠদান পদ্ধতি, ভিডিওর মান এবং উপস্থাপন সরাসরি দেখুন।
        </p>
      </div>

      {/* Public Demo Video Container (Accessible Before Login) */}
      <div className="space-y-4">
        {loadingDemo ? (
          <div className="w-full aspect-video rounded-2xl bg-[#18191C] border border-[#C89D4A]/40 flex flex-col items-center justify-center text-[#DDD6C7] gap-2 shadow-xl">
            <Loader2 size={26} className="animate-spin text-[#E4BE67]" />
            <span className="text-xs font-medium">ডেমো ভিডিও লোড হচ্ছে...</span>
          </div>
        ) : fetchError ? (
          <div className="p-8 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-2 text-rose-900">
            <AlertCircle size={28} className="text-rose-500 mx-auto" />
            <h3 className="font-extrabold text-sm">{fetchError}</h3>
          </div>
        ) : demoUrl ? (
          <div className="rounded-2xl overflow-hidden shadow-xl border border-[#3C382E] bg-black">
            <VideoPlayer
              videoUrl={demoUrl}
              title="অ্যাবাকাস ডেমো ক্লাস"
              viewerEmail={currentUser?.email}
              viewerPhone={currentUser?.phone}
              watermarkEnabled={Boolean(currentUser)}
              isLivePreview={false}
            />
          </div>
        ) : (
          <div className="p-8 sm:p-12 bg-[#FFFDF9] rounded-3xl border-2 border-dashed border-[#D8CBAF] text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] mx-auto flex items-center justify-center shadow-sm">
              <Video size={26} />
            </div>
            <h2 className="font-extrabold text-base sm:text-lg text-[#18191C]">
              ডেমো ক্লাসের ভিডিও শীঘ্রই যুক্ত হবে।
            </h2>
            <p className="text-xs text-[#575247] max-w-md mx-auto leading-relaxed">
              কোর্সে ভর্তি, সম্পূর্ণ ফ্রি রিসোর্স ও অন্যান্য তথ্য জানতে নিচের অপশনগুলো ব্যবহার করুন।
            </p>
          </div>
        )}

        {/* Action Button: Enroll */}
        <div className="p-6 bg-[#FFFDF9] rounded-2xl border border-[#E5DEC9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-extrabold text-sm text-[#18191C]">
              কোর্সে ভর্তি হতে চান?
            </h3>
            <p className="text-xs text-[#575247]">
              কোর্স ফি, অন্তর্ভুক্ত সুযোগ-সুবিধা এবং ভর্তির বিস্তারিত নিয়ম জেনে নিন।
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-md shadow-[#D4AF5F]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>
        </div>

        {/* Optional Free Resources CTA for Logged-out Visitors */}
        {!currentUser && (
          <div className="p-6 bg-gradient-to-r from-[#141517] via-[#1B1C20] to-[#23201A] text-[#FAF7F0] rounded-2xl border border-[#D4AF5F]/35 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-extrabold text-sm text-[#FAF7F0]">
                পূর্ণাঙ্গ ফ্রি ক্লাস, ই-বুক ও ভার্চুয়াল অ্যাবাকাস ব্যবহার করতে চান?
              </h3>
              <p className="text-xs text-[#CFC7B7]">
                বিনামূল্যে লগইন বা নতুন অ্যাকাউন্ট তৈরি করে সকল ফ্রি রিসোর্স আনলক করুন।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 bg-[#FFFDF9] hover:bg-[#F3EDE0] text-[#141517] font-extrabold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <LogIn size={15} className="text-[#855E18] shrink-0" />
                <span>ফ্রি রিসোর্স পেতে লগইন করুন</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenAuth('register')}
                className="w-full sm:w-auto min-h-[42px] px-4 py-2.5 bg-[#24252B] hover:bg-[#2F3138] text-[#E8C778] border border-[#D4AF5F]/45 font-bold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <UserPlus size={15} className="shrink-0" />
                <span>নতুন অ্যাকাউন্ট</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h4 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#855E18] shrink-0" />
            লগইন ছাড়াই উন্মুক্ত ডেমো
          </h4>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            কোনো অ্যাকাউন্ট বা লগইন ছাড়াই সরাসরি আমাদের পাঠদান পদ্ধতি ও ক্লাসের মান দেখে নিতে পারবেন।
          </p>
        </div>

        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h4 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#855E18] shrink-0" />
            বাস্তব পাঠদান
          </h4>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            মূল পেইড ক্লাসের মতোই স্পষ্ট অডিও ও ভিডিও উপস্থাপনার মাধ্যমে তৈরি।
          </p>
        </div>

        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h4 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#855E18] shrink-0" />
            সন্তানকে ঘরে শেখান
          </h4>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            অভিভাবক নিজে শিখে সন্তানকে কীভাবে গাইড করবেন তা সহজে তুলে ধরা হয়েছে।
          </p>
        </div>
      </div>
    </div>
  );
};
