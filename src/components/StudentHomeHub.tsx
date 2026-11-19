import React, { useMemo } from 'react';
import { ClassItem, UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  PlayCircle,
  BookOpen,
  Calculator,
  User,
  ShoppingCart,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Phone,
  LogOut,
  Layers,
} from 'lucide-react';

interface StudentHomeHubProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  classesLoading?: boolean;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  pendingRequestsCount?: number;
}

function toBanglaNumber(num: number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => digits[Number(d)] || d);
}

export const StudentHomeHub: React.FC<StudentHomeHubProps> = ({
  currentUser,
  classes,
  classesLoading = false,
  onNavigate,
  onLogout,
  pendingRequestsCount = 0,
}) => {
  const { settings } = useSettings();
  const isAdmin = currentUser.role === 'admin';
  const isPremium = isAdmin || currentUser.enrollment_status === 'approved';

  const { totalPublished, freePublished } = useMemo(() => {
    const published = classes.filter((c) => c.is_published !== false);
    const freeCount = published.filter((c) => c.is_free !== false).length;
    return {
      totalPublished: published.length,
      freePublished: freeCount,
    };
  }, [classes]);

  const firstName = (currentUser.full_name || 'অভিভাবক').trim().split(/\s+/)[0];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Greeting & Membership Banner */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-5">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/50 text-[11px] font-bold">
                <ShieldAlert size={12} className="text-[#E4BE67]" />
                এডমিন অ্যাকাউন্ট
              </span>
            ) : isPremium ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold">
                <CheckCircle2 size={12} className="text-emerald-700" />
                সম্পূর্ণ প্যাকেজ সক্রিয়
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#F3EDE0] text-[#755113] border border-[#D4AF5F]/50 text-[11px] font-bold">
                <Sparkles size={12} className="text-[#9E7324]" />
                ফ্রি অ্যাকাউন্ট
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#18191C] tracking-tight">
            স্বাগতম, {firstName}
          </h1>
          <p className="text-xs sm:text-sm text-[#575247]">
            {settings.dashboard_subtitle ||
              'আপনার ক্লাস, ই-বুক লাইব্রেরি, ভার্চুয়াল অ্যাবাকাস ও অ্যাকাউন্ট রিসোর্স এখান থেকে ব্যবহার করুন।'}
          </p>
        </div>

        {!isPremium && (
          <button
            type="button"
            onClick={() => onNavigate('/enroll')}
            className="shrink-0 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <ShoppingCart size={16} />
            <span>সম্পূর্ণ প্যাকেজ নিন</span>
          </button>
        )}
      </section>

      {/* Featured Primary Entry: ক্লাসসমূহ (/classes) */}
      <section aria-labelledby="hub-classes-heading">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141517] via-[#1B1C20] to-[#262219] text-[#FAF7F0] border border-[#D4AF5F]/45 shadow-lg p-5 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#E4BE67]">
                <Layers size={15} />
                <span>অধ্যায়ভিত্তিক ভিডিও ক্লাস</span>
              </div>
              <h2
                id="hub-classes-heading"
                className="text-xl sm:text-2xl font-black text-[#FAF7F0] leading-snug"
              >
                ক্লাসসমূহ
              </h2>
              <p className="text-xs sm:text-sm text-[#D8D1C2] leading-relaxed">
                ফ্রি ক্লাস, সরাসরি যোগ-বিয়োগ, ৫-এর বন্ধু, ১০-এর বন্ধু ও মিশ্র নিয়মের সব ক্লাস অধ্যায় অনুযায়ী সাজানো রয়েছে।
              </p>
              {!classesLoading && totalPublished > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs font-semibold text-[#EAD9B0]">
                  <span>মোট ক্লাস: {toBanglaNumber(totalPublished)}টি</span>
                  <span>•</span>
                  <span>ফ্রি ক্লাস: {toBanglaNumber(freePublished)}টি</span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/classes')}
                className="min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-black text-xs sm:text-sm rounded-2xl shadow-md inline-flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E4BE67] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
              >
                <PlayCircle size={18} />
                <span>ক্লাসসমূহ দেখুন</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Core Resource Cards Grid: E-books, Virtual Abacus & Account/Package */}
      <section
        aria-label="শিক্ষা উপকরণ ও অ্যাকাউন্ট"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {/* 1. E-Book Library */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F3EDE0] border border-[#D4AF5F]/50 text-[#855E18] flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#18191C]">ই-বুক লাইব্রেরি</h3>
              <p className="text-xs text-[#575247] leading-relaxed">
                বাংলা সোরোবান গাইড ও প্র্যাকটিস ওয়ার্কবুক পড়ুন। শেষ পড়া পাতা ও বুকমার্ক অ্যাকাউন্টে সংরক্ষিত থাকবে।
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/ebooks')}
            className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#F2D283] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <BookOpen size={15} />
            <span>ই-বুক খুলুন</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 2. Virtual Abacus */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-xl bg-[#F3EDE0] border border-[#D4AF5F]/50 text-[#855E18] flex items-center justify-center">
              <Calculator size={22} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#18191C]">ভার্চুয়াল অ্যাবাকাস</h3>
              <p className="text-xs text-[#575247] leading-relaxed">
                মোবাইল বা কম্পিউটারে ইন্টারঅ্যাক্টিভ সোরোবান বিড সরিয়ে সন্তানকে সরাসরি হাতে-কলমে অনুশীলন করান।
              </p>
            </div>
          </div>
          <a
            href="/abacus"
            className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Calculator size={15} />
            <span>ভার্চুয়াল অ্যাবাকাস খুলুন</span>
            <ArrowRight size={14} />
          </a>
        </div>

        {/* 3. Account & Package / Support Access */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4 sm:col-span-2 lg:col-span-1">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="w-11 h-11 rounded-xl bg-[#F3EDE0] border border-[#D4AF5F]/50 text-[#855E18] flex items-center justify-center">
                <User size={22} />
              </div>
              {isAdmin ? (
                <span className="text-[11px] font-bold text-[#8A6118]">এডমিন</span>
              ) : isPremium ? (
                <span className="text-[11px] font-bold text-emerald-700">প্রিমিয়াম</span>
              ) : (
                <span className="text-[11px] font-bold text-[#855E18]">ফ্রি সদস্য</span>
              )}
            </div>
            <div className="space-y-1 min-w-0">
              <h3 className="text-base font-black text-[#18191C]">আমার অ্যাকাউন্ট</h3>
              <p className="text-xs font-bold text-[#2F2D28] truncate">
                {currentUser.full_name || 'অভিভাবক'}
              </p>
              <p className="text-[11px] text-[#625D52] truncate">{currentUser.email}</p>
              {currentUser.phone && (
                <p className="text-[11px] text-[#625D52] truncate">{currentUser.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="w-full min-h-[42px] px-4 py-2 bg-[#18191C] hover:bg-[#27292E] text-[#F2D283] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShieldAlert size={15} className="text-[#E4BE67]" />
                <span>এডমিন প্যানেল</span>
                {pendingRequestsCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-[#E4BE67] text-[#141517] rounded-full text-[10px] font-black leading-none">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            ) : !isPremium ? (
              <button
                type="button"
                onClick={() => onNavigate('/enroll')}
                className="w-full min-h-[42px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ShoppingCart size={15} />
                <span>সম্পূর্ণ প্যাকেজ নিন</span>
              </button>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="min-h-[40px] px-3 py-2 bg-[#FAF7F0] hover:bg-[#F3EDE0] text-[#3B3934] border border-[#E5DEC9] font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Phone size={13} className="text-[#8B641E]" />
                <span>সহায়তা</span>
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[40px] px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
                <span>লগআউট</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
