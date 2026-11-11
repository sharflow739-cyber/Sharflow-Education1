import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  PlayCircle, UserPlus, CheckCircle2, ChevronRight, HelpCircle, 
  Smartphone, BookOpen, Clock, HeartHandshake, ShieldCheck
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
  publishedClassesCount: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAuth,
  publishedClassesCount,
}) => {
  const { settings } = useSettings();

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section - Mobile First */}
      <section className="relative overflow-hidden bg-gradient-to-b from-orange-50 via-white to-slate-50 border-b border-orange-100/60 pt-10 pb-16 sm:pt-16 sm:pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100 text-orange-800 text-xs font-extrabold shadow-2xs">
            <span>{settings.logo_emoji || '🧮'}</span>
            <span>অভিভাবকদের জন্য বিশেষ অনলাইন কোর্স</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight sm:leading-snug">
            নিজে অ্যাবাকাস শিখুন, সন্তানকে ঘরে শেখান
          </h1>

          {/* Subtitle / Explainer */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            অভিভাবকদের জন্য বাংলায় ধাপে ধাপে সোরোবান শেখার সম্পূর্ণ ধারাবাহিক কোর্স।
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              onClick={() => onNavigate('/demo')}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/25 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <PlayCircle size={18} />
              <span>ফ্রি ডেমো দেখুন</span>
            </button>

            <button
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-200 hover:border-orange-300 font-extrabold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <UserPlus size={18} className="text-orange-500" />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>

          {/* Quick trust highlights - No fake claims, strictly factual */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              সহজ বাংলা লেকচার
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-500" />
              মোবাইল ও কম্পিউটারে সুবিধা
            </span>
            {publishedClassesCount > 0 && (
              <span className="flex items-center gap-1.5 text-orange-600">
                <CheckCircle2 size={15} className="text-orange-500" />
                {publishedClassesCount}টি ধারাবাহিক ক্লাস
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Section 1: কী শিখবেন (What You Will Learn) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            এই কোর্সে আপনি কী কী শিখবেন?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            কোনো পূর্ব অভিজ্ঞতা ছাড়াই শুরু থেকে সোরোবান অ্যাবাকাসের প্রতিটি ধাপ সহজ নিয়মে সাজানো।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-sm">
              ১
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">সোরোবান ফ্রেম ও পুঁতি পরিচিতি</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              অ্যাবাকাস ফ্রেমের গঠন, আপার ও লোয়ার বিডস, একক-দশকের কলাম এবং সঠিক ফিঙ্গার মুভমেন্ট।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black text-sm">
              ২
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">সরাসরি যোগ ও বিয়োগ (Direct Math)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              কোনো জটিল সূত্র ছাড়া কেবল পুঁতি ওঠানামা করিয়ে দ্রুত ও নির্ভুল প্রাথমিক যোগ-বিয়োগ।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
              ৩
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">স্মল ফ্রেন্ডস সূত্র (+/- 1 to 4)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ৫-এর পরিপূরক (Complement of 5) ব্যবহার করে বাস্তব উদাহরণের সাহায্যে সমাধান পদ্ধতি।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-black text-sm">
              ৪
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">বিগ ফ্রেন্ডস ও কম্বিনেশন সূত্র</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ১০-এর পরিপূরক এবং মিশ্র সূত্রের প্রয়োগ, যা শিশুদের বড় সংখ্যা দ্রুত হিসাব করতে শেখায়।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm">
              ৫
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">মানসিক গণনা ও ভিজ্যুয়ালাইজেশন</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              হাতে অ্যাবাকাস ছাড়াও মনে মনে পুঁতি কল্পনা করে মুখে মুখে দ্রুত গাণিতিক ফলাফল বের করার কৌশল।
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-black text-sm">
              ৬
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">সন্তানকে প্রতিদিন অনুশীলনের কৌশল</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              কীভাবে প্রতিদিন ১০-১৫ মিনিট আনন্দের সাথে শিশুকে বিরক্তি ছাড়া ঘরে প্র্যাকটিস করাবেন।
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: কীভাবে ক্লাস করবেন (How to Take Classes) */}
      <section className="bg-white border-y border-slate-200 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              কীভাবে ক্লাস করবেন?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
              ব্যস্ত অভিভাবকদের সুবিধার কথা বিবেচনা করে কোর্সটি সম্পূর্ণ নিজের সুবিধাজনক সময়ে শেখার উপযোগী।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-black">
                <Smartphone size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">১. নিজের সুবিধামতো সময়ে</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                মোবাইল বা কম্পিউটার থেকে যেকোনো সময় লগইন করে আগের বা নতুন ক্লাস দেখা যায়। নির্দিষ্ট সময়ের কোনো বাধ্যবাধকতা নেই।
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-black">
                <BookOpen size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">২. ধাপে ধাপে ভিডিও লেকচার</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                প্রতিটি নিয়মের ভিডিও বারবার দেখার সুবিধা রয়েছে। না বুঝলে টেনে পেছনে গিয়ে পুনরায় দেখা যায়।
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-black">
                <Clock size={24} />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">৩. ঘরে বসে সন্তানকে শেখান</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                প্রতিটি লেসনের কৌশল নিজে আয়ত্ত করে সরাসরি সন্তানের সাথে অনুশীলন করান। বাইরে কোচিংয়ে পাঠানোর ঝামেলা নেই।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: কী কী অন্তর্ভুক্ত (What Is Included) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            কোর্সে কী কী অন্তর্ভুক্ত রয়েছে?
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            অভিভাবকদের জন্য প্রয়োজনীয় সব সামগ্রী এক প্ল্যাটফর্মে সাজানো।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">পর্যায়ক্রমিক ভিডিও লেসন</h4>
              <p className="text-xs text-slate-600">
                সোবান অ্যাবাকাসের শুরু থেকে মানসিক গণিত পর্যন্ত প্রতিটি বিষয়ের স্পষ্ট ভিডিও।
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">ভার্চুয়াল অ্যাবাকাস টুল</h4>
              <p className="text-xs text-slate-600">
                ব্রাউজারে সরাসরি ইন্টারঅ্যাক্টিভ অ্যাবাকাস ফ্রেম ব্যবহারের সুবিধা।
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">ডাউনলোডযোগ্য প্র্যাকটিস শিট</h4>
              <p className="text-xs text-slate-600">
                ক্লাসের সাথে প্রাসঙ্গিক অনুশীলন শিট ও ওয়ার্কশিটের পিডিএফ ফাইল।
              </p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">ডেডিকেটেড সহায়তা ও হেল্পডেস্ক</h4>
              <p className="text-xs text-slate-600">
                কোর্স চলাকালীন যেকোনো অ্যাকাডেমিক বা টেকনিক্যাল সমস্যার সহায়তার ব্যবস্থা।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: সচরাচর জিজ্ঞাসা (FAQ) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600">
            <HelpCircle size={15} />
            <span>সচরাচর জিজ্ঞাসা</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            সাধারণ কিছু প্রশ্নের উত্তর
          </h2>
        </div>

        <div className="space-y-3">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              প্রশ্ন: কোর্সটি কি শিশুদের জন্য নাকি অভিভাবকদের জন্য?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              উত্তর: কোর্সটি মূলত অভিভাবকদের শেখানোর জন্য ডিজাইন করা হয়েছে, যাতে অভিভাবক নিজে ভালোমতো নিয়মগুলো বুঝে সন্তানকে ঘরে আনন্দদায়ক পরিবেশে নিয়মিত অনুশীলন করাতে পারেন।
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              প্রশ্ন: আমার কি গণিতে ভালো হওয়া জরুরি?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              উত্তর: একেবারেই না। এখানে জটিল কোনো গণিত নেই। সোরোবান অ্যাবাকাস মূলত পুঁতি স্থানান্তরের সুনির্দিষ্ট নিয়মের খেলা, যা যেকোনো অভিভাবক সহজেই শিখতে পারেন।
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              প্রশ্ন: ক্লাসগুলো কি লাইভ নাকি রেকর্ডেড?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              উত্তর: ক্লাসগুলো হাই-কোয়ালিটি রেকর্ডেড ভিডিও লেকচার। ফলে আপনার অবসর সময়ে মোবাইল বা কম্পিউটারে লগইন করে সুবিধাজনক গতিতে শিখতে পারবেন।
            </p>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-1.5">
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              প্রশ্ন: কত বছর বয়সী শিশুর জন্য এই কোর্স উপযোগী?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              উত্তর: সাধারণত ৪ থেকে ১২ বছর বয়সী শিশুদের জন্য সোরোবান অ্যাবাকাস পদ্ধতি অত্যন্ত কার্যকর ভূমিকা রাখে।
            </p>
          </div>
        </div>
      </section>

      {/* Call To Action Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-10 text-center space-y-5 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-black">
            আজই শুরু করুন আপনার সন্তানের অ্যাবাকাস যাত্রা
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            বিনামূল্যে ডেমো ক্লাস দেখে কোর্সের মান যাচাই করুন, অথবা ভর্তির বিস্তারিত তথ্য জেনে নিন।
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('/demo')}
              className="w-full sm:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlayCircle size={16} />
              <span>ফ্রি ডেমো দেখুন</span>
            </button>
            <button
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
