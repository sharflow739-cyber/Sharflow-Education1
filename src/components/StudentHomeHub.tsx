import React, { useMemo } from 'react';
import { ClassItem, UserProfile } from '../types';
import {
  PlayCircle,
  BookOpen,
  Calculator,
  ShoppingCart,
  ShieldAlert,
  ArrowRight,
  Phone,
  LogOut,
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
  const isAdmin = currentUser.role === 'admin';
  const isPremium = isAdmin || currentUser.enrollment_status === 'approved';

  const totalPublished = useMemo(
    () => classes.filter((c) => c.is_published !== false).length,
    [classes]
  );

  const firstName = (currentUser.full_name || 'অভিভাবক').trim().split(/\s+/)[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Simple Greeting Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5DEC9] pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-[#18191C] tracking-tight">
            স্বাগতম, {firstName}
          </h1>
        </div>

        {!isPremium && (
          <button
            type="button"
            onClick={() => onNavigate('/enroll')}
            className="shrink-0 min-h-[44px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
          >
            <ShoppingCart size={16} />
            <span>সম্পূর্ণ প্যাকেজ নিন</span>
          </button>
        )}
      </section>

      {/* Simple Resource Entry Cards: ক্লাস, বই, অ্যাবাকাস */}
      <section
        aria-label="শেখার উপকরণ"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 items-stretch"
      >
        {/* 1. ক্লাস */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#18191C] border border-[#C89D4A]/50 text-[#E4BE67] flex items-center justify-center">
              <PlayCircle size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#18191C]">ক্লাস</h2>
              <p className="text-xs text-[#575247] leading-relaxed">
                সহজ ভিডিও ক্লাস ও অনুশীলন
                {!classesLoading && totalPublished > 0
                  ? ` · ${toBanglaNumber(totalPublished)}টি ক্লাস`
                  : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/classes')}
            className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>ক্লাস দেখুন</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 2. বই */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#F3EDE0] border border-[#D4AF5F]/50 text-[#855E18] flex items-center justify-center">
              <BookOpen size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#18191C]">বই</h2>
              <p className="text-xs text-[#575247] leading-relaxed">
                বাংলা গাইড ও অনুশীলনের বই পড়ুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/ebooks')}
            className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#F2D283] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <span>বই পড়ুন</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 3. অ্যাবাকাস */}
        <div className="bg-white rounded-2xl border border-[#E5DEC9] p-5 shadow-2xs flex flex-col justify-between gap-4">
          <div className="space-y-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#F3EDE0] border border-[#D4AF5F]/50 text-[#855E18] flex items-center justify-center">
              <Calculator size={22} />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-[#18191C]">অ্যাবাকাস</h2>
              <p className="text-xs text-[#575247] leading-relaxed">
                স্ক্রিনেই পুঁতি সরিয়ে হিসাব অনুশীলন করুন
              </p>
            </div>
          </div>
          <a
            href="/abacus"
            className="w-full min-h-[44px] px-4 py-2.5 bg-[#FAF7F0] hover:bg-[#F3EDE0] text-[#18191C] border border-[#D4AF5F] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors"
          >
            <span>অ্যাবাকাস খুলুন</span>
            <ArrowRight size={14} className="text-[#855E18]" />
          </a>
        </div>
      </section>

      {/* Account & Support Bar */}
      <section
        aria-label="অ্যাকাউন্ট ও সহায়তা"
        className="bg-white rounded-2xl border border-[#E5DEC9] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-0.5 min-w-0">
          <p className="text-xs font-extrabold text-[#18191C] truncate">
            {currentUser.full_name || 'অভিভাবক'}
            <span className="font-semibold text-[#625D52]">
              {' · '}
              {isAdmin ? 'এডমিন' : isPremium ? 'সম্পূর্ণ প্যাকেজ' : 'ফ্রি সদস্য'}
            </span>
          </p>
          <p className="text-[11px] text-[#625D52] truncate">{currentUser.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isAdmin && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className="min-h-[40px] px-3.5 py-2 bg-[#18191C] hover:bg-[#27292E] text-[#F2D283] font-extrabold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldAlert size={14} className="text-[#E4BE67]" />
              <span>এডমিন প্যানেল</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#E4BE67] text-[#141517] rounded-full text-[10px] font-black leading-none">
                  {pendingRequestsCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onNavigate('/contact')}
            className="min-h-[40px] px-3.5 py-2 bg-[#FAF7F0] hover:bg-[#F3EDE0] text-[#3B3934] border border-[#E5DEC9] font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Phone size={13} className="text-[#8B641E]" />
            <span>সহায়তা</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="min-h-[40px] px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut size={13} />
            <span>লগআউট</span>
          </button>
        </div>
      </section>
    </div>
  );
};
