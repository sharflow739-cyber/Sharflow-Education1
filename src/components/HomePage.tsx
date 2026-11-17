import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { PublicWelcomeVideo } from './PublicWelcomeVideo';
import { SorobanMiniDemo } from './SorobanMiniDemo';
import { 
  PlayCircle, UserPlus, CheckCircle2, HelpCircle, 
  Smartphone, BookOpen, Clock, Calculator, Video, ArrowRight
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onOpenDemoAuth: () => void;
  onOpenFreeResourcesAuth?: (redirectPath?: string, tab?: 'login' | 'register') => void;
  publishedClassesCount: number;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenAuth,
  onOpenDemoAuth,
  publishedClassesCount,
}) => {
  const { settings } = useSettings();
  const resolvedWelcomeVideoUrl =
    (settings.public_welcome_video_url || '').trim() || '/sharflow-welcome-signup.mp4';

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section - Charcoal, Warm Gold & Soft Ivory */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#141517] via-[#1B1C20] to-[#23201A] border-b border-[#D4AF5F]/30 pt-10 pb-16 sm:pt-16 sm:pb-20 text-[#FAF7F0]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(222,181,92,0.12),transparent_62%)]"
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#222328] border border-[#D4AF5F]/35 text-[#E8C778] text-xs font-extrabold shadow-2xs">
            <span>{settings.logo_emoji || '🧮'}</span>
            <span>অভিভাবকদের জন্য বিশেষ অনলাইন কোর্স</span>
          </div>

          {/* Public Welcome Video Slot - appears in hero before h1; hides gracefully when missing */}
          <PublicWelcomeVideo src={resolvedWelcomeVideoUrl} />

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl font-black text-[#FAF7F0] tracking-tight leading-tight sm:leading-snug text-balance">
            নিজে অ্যাবাকাস শিখুন, সন্তানকে ঘরে শেখান
          </h1>

          {/* Subtitle / Explainer */}
          <p className="text-base sm:text-lg text-[#DDD6C7] max-w-2xl mx-auto font-medium leading-relaxed">
            অভিভাবকদের জন্য বাংলায় ধাপে ধাপে সোরোবান শেখার সম্পূর্ণ ধারাবাহিক কোর্স।
          </p>

          {/* Primary & Secondary Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">
            <button
              onClick={onOpenDemoAuth}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-gradient-to-r from-[#E4BE67] via-[#D7AC4C] to-[#C89B3B] hover:from-[#ECC978] hover:to-[#D5A847] text-[#141517] font-extrabold text-sm rounded-2xl shadow-lg shadow-[#D4AF5F]/20 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D992] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <PlayCircle size={18} />
              <span>ফ্রি ক্লাস দেখুন</span>
            </button>

            <button
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 hover:border-[#E8C778] font-extrabold text-sm rounded-2xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C778] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <UserPlus size={18} className="text-[#E4BE67]" />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>

          {/* Step-by-step instructions for accessing free demo */}
          <div className="max-w-lg mx-auto bg-[#1E1F24]/95 border border-[#D4AF5F]/25 rounded-2xl px-4 py-3 text-xs sm:text-sm text-[#EFE9DC] font-semibold leading-relaxed shadow-2xs">
            <p>নতুন অ্যাকাউন্ট নিবন্ধন করুন, ইমেইল যাচাই করুন, তারপর লগইন করে ফ্রি ডেমো দেখুন।</p>
            <p className="text-[11px] text-[#CFC7B7] mt-1 font-medium">
              ইতিমধ্যে অ্যাকাউন্ট থাকলে{' '}
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="font-extrabold text-[#E8C778] underline hover:text-[#F4D992] cursor-pointer"
              >
                লগইন করুন
              </button>
              {' '}অথবা{' '}
              <button
                type="button"
                onClick={() => onNavigate('/demo')}
                className="font-extrabold text-[#E8C778] underline hover:text-[#F4D992] cursor-pointer"
              >
                ডেমো পেজে যান
              </button>
              ।
            </p>
          </div>

          {/* Quick trust highlights - No fake claims, strictly factual */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-[#D8D1C2]">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#E0B960]" />
              সহজ বাংলা লেকচার
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-[#E0B960]" />
              মোবাইল ও কম্পিউটারে সুবিধা
            </span>
            {publishedClassesCount > 0 && (
              <span className="flex items-center gap-1.5 text-[#E8C778]">
                <CheckCircle2 size={15} className="text-[#E0B960]" />
                {publishedClassesCount}টি ধারাবাহিক ক্লাস
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Preview Before Enrolling Section ("ভর্তির আগে দেখে নিন") */}
      <section
        aria-labelledby="preview-before-enroll-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#E5DEC9] shadow-xs p-5 sm:p-8 space-y-6">
          <div className="space-y-1.5 border-b border-[#EFE9D8] pb-5">
            <h2
              id="preview-before-enroll-heading"
              className="text-xl sm:text-2xl font-black text-[#18191C]"
            >
              ভর্তির আগে দেখে নিন
            </h2>
            <p className="text-xs sm:text-sm text-[#4F4B43] max-w-2xl leading-relaxed">
              কোর্সে ভর্তি হওয়ার আগেই আমাদের ফ্রি ক্লাস ও অনুশীলন শিট, বাংলা ই-বুক লাইব্রেরি এবং ভার্চুয়াল সোরোবান অ্যাবাকাস সম্পর্কে পরিষ্কার ধারণা নিন।
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
            {/* Card 1: Class Preview (navigable text with icon; respects gated classes RLS) */}
            <article className="p-5 rounded-2xl bg-[#FBF7EC] border border-[#E6D9B8] flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                    <Video size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#855E18]">
                      ফ্রি ভিডিও লেসন · প্র্যাকটিস শিট
                    </p>
                    <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                      ফ্রি ক্লাস প্রিভিউ
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#4F4B43] leading-relaxed">
                  বিনামূল্যে অ্যাকাউন্ট খুলে ও ইমেইল যাচাই করে সোরোবানের শুরু ও পাঠদান পদ্ধতির ফ্রি ক্লাস এবং অনুশীলন ওয়ার্কশিট দেখুন।
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenDemoAuth}
                className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
              >
                <PlayCircle size={16} className="shrink-0" />
                <span>ফ্রি ক্লাস দেখুন</span>
              </button>
            </article>

            {/* Card 2: E-book Library (navigable text with icon; preserves /ebooks auth gate) */}
            <article className="p-5 rounded-2xl bg-[#FBF7EC] border border-[#E6D9B8] flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#855E18]">
                      বাংলা গাইড · বুকমার্ক সুবিধা
                    </p>
                    <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                      ই-বুক লাইব্রেরি
                    </h3>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-[#4F4B43] leading-relaxed">
                  অ্যাকাউন্টে লগইন করে বাংলা অ্যাবাকাস ই-বুক ও গাইড, শেষ পঠিত পৃষ্ঠা সংরক্ষণ ও বুকমার্ক সুবিধাসহ সরাসরি সাইটে পড়ুন।
                </p>
              </div>

              <a
                href="/ebooks"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('/ebooks');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#FAF7F0] border border-[#C89D4A]/45 font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
              >
                <BookOpen size={16} className="text-[#E4BE67] shrink-0" />
                <span>ই-বুক লাইব্রেরি দেখুন</span>
              </a>
            </article>

            {/* Card 3: Virtual Abacus (compact working Soroban mini demo + direct /abacus link) */}
            <article className="p-5 rounded-2xl bg-[#FBF7EC] border border-[#E6D9B8] flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                    <Calculator size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#855E18]">
                      ইন্টারঅ্যাক্টিভ টুল · মিনি ডেমো
                    </p>
                    <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                      ভার্চুয়াল অ্যাবাকাস
                    </h3>
                  </div>
                </div>

                <SorobanMiniDemo />
              </div>

              <a
                href="/abacus"
                className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#FAF7F0] border border-[#C89D4A]/45 font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
              >
                <span>ভার্চুয়াল অ্যাবাকাস খুলুন</span>
                <ArrowRight size={15} className="text-[#E4BE67] shrink-0" />
              </a>
            </article>
          </div>

          <div className="pt-3 border-t border-[#EFE9D8] flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-[#4F4B43] font-medium">
              ফ্রি ও প্রিমিয়াম কোর্সের সুবিধাসমূহের তুলনা দেখতে চান?
            </span>
            <a
              href="/enroll"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('/enroll');
              }}
              className="font-extrabold text-[#855E18] hover:text-[#6B4A10] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] rounded"
            >
              ফ্রি বনাম প্রিমিয়াম তুলনা দেখুন →
            </a>
          </div>
        </div>
      </section>

      {/* Section 1: কী শিখবেন (What You Will Learn) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18191C]">
            এই কোর্সে আপনি কী কী শিখবেন?
          </h2>
          <p className="text-xs sm:text-sm text-[#575247] max-w-xl mx-auto">
            কোনো পূর্ব অভিজ্ঞতা ছাড়াই শুরু থেকে সোরোবান অ্যাবাকাসের প্রতিটি ধাপ সহজ নিয়মে সাজানো।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ১
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">সোরোবান ফ্রেম ও পুঁতি পরিচিতি</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              অ্যাবাকাস ফ্রেমের গঠন, আপার ও লোয়ার বিডস, একক-দশকের কলাম এবং সঠিক ফিঙ্গার মুভমেন্ট।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ২
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">সরাসরি যোগ ও বিয়োগ (Direct Math)</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              কোনো জটিল সূত্র ছাড়া কেবল পুঁতি ওঠানামা করিয়ে দ্রুত ও নির্ভুল প্রাথমিক যোগ-বিয়োগ।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ৩
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">স্মল ফ্রেন্ডস সূত্র (+/- 1 to 4)</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              ৫-এর পরিপূরক (Complement of 5) ব্যবহার করে বাস্তব উদাহরণের সাহায্যে সমাধান পদ্ধতি।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ৪
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">বিগ ফ্রেন্ডস ও কম্বিনেশন সূত্র</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              ১০-এর পরিপূরক এবং মিশ্র সূত্রের প্রয়োগ, যা শিশুদের বড় সংখ্যা দ্রুত হিসাব করতে শেখায়।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ৫
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">মানসিক গণনা ও ভিজ্যুয়ালাইজেশন</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              হাতে অ্যাবাকাস ছাড়াও মনে মনে পুঁতি কল্পনা করে মুখে মুখে দ্রুত গাণিতিক ফলাফল বের করার কৌশল।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E5DEC9] shadow-2xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F4ECDA] border border-[#E2D0A4] text-[#785314] flex items-center justify-center font-black text-sm">
              ৬
            </div>
            <h3 className="font-extrabold text-[#18191C] text-sm">সন্তানকে প্রতিদিন অনুশীলনের কৌশল</h3>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              কীভাবে প্রতিদিন ১০-১৫ মিনিট আনন্দের সাথে শিশুকে বিরক্তি ছাড়া ঘরে প্র্যাকটিস করাবেন।
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: কীভাবে ক্লাস করবেন (How to Take Classes) */}
      <section className="bg-[#FFFDF9] border-y border-[#E5DEC9] py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18191C]">
              কীভাবে ক্লাস করবেন?
            </h2>
            <p className="text-xs sm:text-sm text-[#575247] max-w-xl mx-auto">
              ব্যস্ত অভিভাবকদের সুবিধার কথা বিবেচনা করে কোর্সটি সম্পূর্ণ নিজের সুবিধাজনক সময়ে শেখার উপযোগী।
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center font-black">
                <Smartphone size={24} />
              </div>
              <h3 className="font-bold text-[#18191C] text-sm">১. নিজের সুবিধামতো সময়ে</h3>
              <p className="text-xs text-[#4F4B43] leading-relaxed">
                মোবাইল বা কম্পিউটার থেকে যেকোনো সময় লগইন করে আগের বা নতুন ক্লাস দেখা যায়। নির্দিষ্ট সময়ের কোনো বাধ্যবাধকতা নেই।
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center font-black">
                <BookOpen size={24} />
              </div>
              <h3 className="font-bold text-[#18191C] text-sm">২. ধাপে ধাপে ভিডিও লেকচার</h3>
              <p className="text-xs text-[#4F4B43] leading-relaxed">
                প্রতিটি নিয়মের ভিডিও বারবার দেখার সুবিধা রয়েছে। না বুঝলে টেনে পেছনে গিয়ে পুনরায় দেখা যায়।
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3 p-4">
              <div className="w-12 h-12 rounded-2xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center font-black">
                <Clock size={24} />
              </div>
              <h3 className="font-bold text-[#18191C] text-sm">৩. ঘরে বসে সন্তানকে শেখান</h3>
              <p className="text-xs text-[#4F4B43] leading-relaxed">
                প্রতিটি লেসনের কৌশল নিজে আয়ত্ত করে সরাসরি সন্তানের সাথে অনুশীলন করান। বাইরে কোচিংয়ে পাঠানোর ঝামেলা নেই।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: কী কী অন্তর্ভুক্ত (What Is Included) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18191C]">
            কোর্সে কী কী অন্তর্ভুক্ত রয়েছে?
          </h2>
          <p className="text-xs sm:text-sm text-[#575247] max-w-xl mx-auto">
            অভিভাবকদের জন্য প্রয়োজনীয় সব সামগ্রী এক প্ল্যাটফর্মে সাজানো।
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-[#8A6118] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">পর্যায়ক্রমিক ভিডিও লেসন</h4>
              <p className="text-xs text-[#4F4B43]">
                সোবান অ্যাবাকাসের শুরু থেকে মানসিক গণিত পর্যন্ত প্রতিটি বিষয়ের স্পষ্ট ভিডিও।
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-[#8A6118] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">ভার্চুয়াল অ্যাবাকাস টুল</h4>
              <p className="text-xs text-[#4F4B43]">
                ব্রাউজারে সরাসরি ইন্টারঅ্যাক্টিভ অ্যাবাকাস ফ্রেম ব্যবহারের সুবিধা।
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-[#8A6118] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">ডাউনলোডযোগ্য প্র্যাকটিস শিট</h4>
              <p className="text-xs text-[#4F4B43]">
                ক্লাসের সাথে প্রাসঙ্গিক অনুশীলন শিট ও ওয়ার্কশিটের পিডিএফ ফাইল।
              </p>
            </div>
          </div>

          <div className="p-4 bg-[#FFFDF9] border border-[#E5DEC9] rounded-2xl flex items-start gap-3">
            <CheckCircle2 size={20} className="text-[#8A6118] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">ডেডিকেটেড সহায়তা ও হেল্পডেস্ক</h4>
              <p className="text-xs text-[#4F4B43]">
                কোর্স চলাকালীন যেকোনো অ্যাকাডেমিক বা টেকনিক্যাল সমস্যার সহায়তার ব্যবস্থা।
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: সচরাচর জিজ্ঞাসা (FAQ) */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#855E18]">
            <HelpCircle size={15} />
            <span>সচরাচর জিজ্ঞাসা</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#18191C]">
            সাধারণ কিছু প্রশ্নের উত্তর
          </h2>
        </div>

        <div className="space-y-3">
          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] space-y-1.5">
            <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">
              প্রশ্ন: কোর্সটি কি শিশুদের জন্য নাকি অভিভাবকদের জন্য?
            </h4>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              উত্তর: কোর্সটি মূলত অভিভাবকদের শেখানোর জন্য ডিজাইন করা হয়েছে, যাতে অভিভাবক নিজে ভালোমতো নিয়মগুলো বুঝে সন্তানকে ঘরে আনন্দদায়ক পরিবেশে নিয়মিত অনুশীলন করাতে পারেন।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] space-y-1.5">
            <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">
              প্রশ্ন: আমার কি গণিতে ভালো হওয়া জরুরি?
            </h4>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              উত্তর: একেবারেই না। এখানে জটিল কোনো গণিত নেই। সোরোবান অ্যাবাকাস মূলত পুঁতি স্থানান্তরের সুনির্দিষ্ট নিয়মের খেলা, যা যেকোনো অভিভাবক সহজেই শিখতে পারেন।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] space-y-1.5">
            <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">
              প্রশ্ন: ক্লাসগুলো কি লাইভ নাকি রেকর্ডেড?
            </h4>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              উত্তর: ক্লাসগুলো হাই-কোয়ালিটি রেকর্ডেড ভিডিও লেকচার। ফলে আপনার অবসর সময়ে মোবাইল বা কম্পিউটারে লগইন করে সুবিধাজনক গতিতে শিখতে পারবেন।
            </p>
          </div>

          <div className="bg-[#FFFDF9] p-4 sm:p-5 rounded-2xl border border-[#E5DEC9] space-y-1.5">
            <h4 className="font-bold text-[#18191C] text-xs sm:text-sm">
              প্রশ্ন: কত বছর বয়সী শিশুর জন্য এই কোর্স উপযোগী?
            </h4>
            <p className="text-xs text-[#4F4B43] leading-relaxed">
              উত্তর: সাধারণত ৪ থেকে ১২ বছর বয়সী শিশুদের জন্য সোরোবান অ্যাবাকাস পদ্ধতি অত্যন্ত কার্যকর ভূমিকা রাখে।
            </p>
          </div>
        </div>
      </section>

      {/* Call To Action Box */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-tr from-[#141517] via-[#1C1D21] to-[#26231C] text-[#FAF7F0] rounded-3xl border border-[#D4AF5F]/30 p-8 sm:p-10 text-center space-y-5 shadow-xl">
          <h3 className="text-2xl sm:text-3xl font-black text-balance">
            আজই শুরু করুন আপনার সন্তানের অ্যাবাকাস যাত্রা
          </h3>
          <p className="text-xs sm:text-sm text-[#D8D1C2] max-w-lg mx-auto leading-relaxed">
            নতুন অ্যাকাউন্ট নিবন্ধন করুন, ইমেইল যাচাই করুন, তারপর লগইন করে ফ্রি ডেমো দেখুন।
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenDemoAuth}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlayCircle size={16} />
              <span>ফ্রি ক্লাস দেখুন</span>
            </button>
            <button
              onClick={() => onNavigate('/enroll')}
              className="w-full sm:w-auto min-h-[44px] px-6 py-3 bg-white/8 hover:bg-white/14 text-[#FAF7F0] font-bold text-xs rounded-xl border border-[#D4AF5F]/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus size={16} className="text-[#E4BE67]" />
              <span>ভর্তির তথ্য দেখুন</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
