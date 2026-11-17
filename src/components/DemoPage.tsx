import React from 'react';
import { UserProfile } from '../types';
import {
  PlayCircle,
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  LogIn,
  Lock,
  BookOpen,
  Calculator,
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
  const isSignedInActive = Boolean(currentUser && currentUser.is_active);

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
          <span>{isSignedInActive ? 'ফ্রি ক্লাস ড্যাশবোর্ডে যান' : 'মূল পাতায় ফিরে যান'}</span>
        </button>
        <span className="px-3 py-1 bg-[#18191C] text-[#E8C778] border border-[#C89D4A]/45 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5">
          <Lock size={13} className="text-[#E4BE67]" />
          <span>ফ্রি ক্লাস</span>
        </span>
      </div>

      {/* Main Free-Class Entry Card (Login-Gated) */}
      <div className="p-6 sm:p-10 bg-gradient-to-br from-[#141517] via-[#1B1C20] to-[#23201A] text-[#FAF7F0] rounded-3xl border border-[#D4AF5F]/35 shadow-xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-[#222328] border border-[#C89D4A]/45 text-[#E4BE67] mx-auto flex items-center justify-center">
          <Lock size={26} />
        </div>

        <div className="space-y-2.5 max-w-2xl mx-auto">
          <h1 className="text-2xl sm:text-4xl font-black text-[#FAF7F0] tracking-tight leading-tight">
            ফ্রিতে অ্যাবাকাস শেখা শুরু করুন
          </h1>
          <p className="text-xs sm:text-sm text-[#DDD6C7] leading-relaxed">
            নতুন অ্যাকাউন্ট খুলুন, ইমেইল যাচাই করুন এবং লগইন করে ফ্রি ক্লাস ও শেখার রিসোর্স ব্যবহার করুন।
          </p>
        </div>

        {isSignedInActive ? (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs sm:text-sm rounded-2xl shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlayCircle size={18} className="shrink-0" />
              <span>ফ্রি ক্লাস দেখুন</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/ebooks')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 font-bold text-xs sm:text-sm rounded-2xl inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen size={17} className="text-[#E4BE67] shrink-0" />
              <span>ই-বুক লাইব্রেরি দেখুন</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenAuth('register')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] via-[#D7AC4C] to-[#C89B3B] hover:from-[#ECC978] hover:to-[#D5A847] text-[#141517] font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-[#D4AF5F]/20 inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D992] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <PlayCircle size={18} className="shrink-0" />
              <span>ফ্রি ক্লাস দেখুন</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 hover:border-[#E8C778] font-bold text-xs sm:text-sm rounded-2xl inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C778] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <LogIn size={17} className="text-[#E4BE67] shrink-0" />
              <span>ফ্রি রিসোর্স পেতে লগইন করুন</span>
            </button>
          </div>
        )}
      </div>

      {/* Package CTA Card */}
      <div className="p-6 bg-[#FFFDF9] rounded-2xl border border-[#E5DEC9] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <p className="text-[11px] font-bold text-[#855E18]">সম্পূর্ণ প্যাকেজ</p>
          <h2 className="font-extrabold text-sm sm:text-base text-[#18191C]">
            ঘরে ঘরে অ্যাবাকাস — প্যারেন্ট স্টার্টার প্যাকেজ
          </h2>
          <p className="text-xs text-[#575247]">
            সম্পূর্ণ ভিডিও ক্লাস, অভিভাবক গাইডলাইন, ই-বুক লাইব্রেরি, প্র্যাকটিস শিট, ভার্চুয়াল ও ফিজিক্যাল অ্যাবাকাস সম্পর্কে বিস্তারিত জানুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/enroll')}
          className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-md shadow-[#D4AF5F]/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
        >
          <UserPlus size={16} className="shrink-0" />
          <span>প্যাকেজের বিস্তারিত দেখুন</span>
        </button>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h3 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-[#855E18] shrink-0" />
            ফ্রি ক্লাস ও গাইডলাইন
          </h3>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            অ্যাকাউন্ট তৈরি ও ইমেইল যাচাই করেই নির্বাচিত ফ্রি ভিডিও ক্লাস দেখতে পারবেন।
          </p>
        </div>

        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h3 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <BookOpen size={14} className="text-[#855E18] shrink-0" />
            বাংলা ই-বুক লাইব্রেরি
          </h3>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            লগইন করে বাংলা অ্যাবাকাস ই-বুক, বুকমার্ক ও পঠিত পৃষ্ঠা সংরক্ষণের সুবিধা পাবেন।
          </p>
        </div>

        <div className="p-4 bg-[#FBF7EC] border border-[#E6D9B8] rounded-2xl space-y-1">
          <h3 className="font-bold text-xs text-[#18191C] flex items-center gap-1.5">
            <Calculator size={14} className="text-[#855E18] shrink-0" />
            ভার্চুয়াল অ্যাবাকাস টুল
          </h3>
          <p className="text-[11px] text-[#4F4B43] leading-normal">
            অ্যাকাউন্টে লগইন করে সরাসরি ব্রাউজারে ইন্টারঅ্যাক্টিভ সোরোবান অ্যাবাকাস অনুশীলন করুন।
          </p>
        </div>
      </div>
    </div>
  );
};
