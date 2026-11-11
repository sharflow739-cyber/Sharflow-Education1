import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { VideoPlayer } from './VideoPlayer';
import { PlayCircle, UserPlus, ArrowLeft, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

interface DemoPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export const DemoPage: React.FC<DemoPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { settings } = useSettings();
  const demoUrl = (settings.public_demo_video_url || '').trim();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Breadcrumb / Back button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>মূল পাতায় ফিরে যান</span>
        </button>
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-extrabold flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>ফ্রি পাবলিক ডেমো</span>
        </span>
      </div>

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          অ্যাবাকাস ফ্রি ডেমো ক্লাস
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          কোর্সে অন্তর্ভুক্ত ভিডিওর মান, উপস্থাপন এবং পাঠদান পদ্ধতি বিনামূল্যে যাচাই করুন। কোনো অ্যাকাউন্ট বা রেজিস্ট্রেশন ছাড়াই দেখতে পারেন।
        </p>
      </div>

      {/* Demo Video Container or Clear Empty State */}
      <div className="space-y-4">
        {demoUrl ? (
          <div className="rounded-2xl overflow-hidden shadow-xl border border-slate-800 bg-black">
            <VideoPlayer
              videoUrl={demoUrl}
              title="অ্যাবাকাস ফ্রি ডেমো ক্লাস"
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
              ১২ নভেম্বরের আনুষ্ঠানিক রিলিজের জন্য ডেমো ভিডিওটি প্রস্তুত হচ্ছে। কোর্স ও ভর্তির তথ্য দেখতে নিচের বোতামটি ব্যবহার করুন।
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
            লগইন ছাড়া দেখুন
          </h5>
          <p className="text-[11px] text-orange-800 leading-normal">
            কোনো রেজিস্ট্রেশন বা পাসওয়ার্ড ছাড়া সরাসরি ফোনে ফুলস্ক্রিন প্লে করে ক্লাস পর্যবেক্ষণ করুন।
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
