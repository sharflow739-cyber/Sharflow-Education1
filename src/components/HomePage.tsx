import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { track } from '../lib/analytics.js';
import { PublicWelcomeVideo } from './PublicWelcomeVideo';
import { SorobanMiniDemo } from './SorobanMiniDemo';
import {
  PlayCircle,
  BookOpen,
  Calculator,
  Video,
  ArrowRight,
  LogIn,
  Lock,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (path: string) => void;
  onOpenFreeResourcesAuth?: (redirectPath?: string, tab?: 'login' | 'register') => void;
  onOpenAbacusAuth?: (tab?: 'login' | 'register') => void;
  publishedClassesCount: number;
}

const CLASS_PREVIEW_IMAGE_PATH = '/assets/aistudio/class-preview_838ba9f5.png';
const BOOK_PREVIEW_IMAGE_PATH = '/assets/aistudio/book-preview_8ecf165f.png';

const CONCISE_FAQS = [
  {
    question: 'এই শেখা কি অভিভাবকদের জন্য?',
    answer:
      'হ্যাঁ। অভিভাবক নিজে সহজ নিয়মগুলো বুঝে নিয়ে সন্তানকে ঘরে বসে আনন্দের সাথে শেখাতে পারবেন।',
  },
  {
    question: 'আগে থেকে গণিতে ভালো হতে হবে?',
    answer:
      'না। এখানে জটিল অঙ্ক নয়, বরং পুঁতি গুনে সহজে হিসাব শেখানো হয়। কোনো পূর্ব অভিজ্ঞতা ছাড়াই শুরু করা যায়।',
  },
  {
    question: 'ক্লাসগুলো কি নিজের সুবিধামতো সময়ে দেখা যাবে?',
    answer:
      'হ্যাঁ। লগইন করে মোবাইল বা কম্পিউটার থেকে আপনার সুবিধামতো সময়ে ক্লাস দেখতে পারবেন।',
  },
] as const;

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  onOpenFreeResourcesAuth,
  onOpenAbacusAuth,
}) => {
  const { settings } = useSettings();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const resolvedWelcomeVideoUrl =
    (settings.public_welcome_video_url || '').trim() || '/sharflow-welcome-signup.mp4';

  const openFreeClassAuth = (tab: 'login' | 'register' = 'register') => {
    onOpenFreeResourcesAuth?.('/', tab);
  };

  const openAbacusModal = (tab: 'login' | 'register' = 'login') => {
    if (onOpenAbacusAuth) {
      onOpenAbacusAuth(tab);
    } else {
      onOpenFreeResourcesAuth?.('/abacus', tab);
    }
  };

  return (
    <div className="space-y-14 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#141517] via-[#1B1C20] to-[#23201A] border-b border-[#D4AF5F]/30 pt-8 pb-14 sm:pt-14 sm:pb-18 text-[#FAF7F0]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(222,181,92,0.12),transparent_62%)]"
        />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Simple Offering Descriptor */}
          <p className="text-xs sm:text-sm font-bold text-[#E8C778] tracking-wide">
            অ্যাবাকাস ব্যবহারের সহজ গাইড
          </p>

          {/* Public Website Guideline Video Slot */}
          <PublicWelcomeVideo src={resolvedWelcomeVideoUrl} />

          {/* Main Headline & 1-sentence plain explanation */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl font-black text-[#FAF7F0] tracking-tight leading-tight sm:leading-snug text-balance">
              নিজে শিখুন, সন্তানকে শেখান
            </h1>
            <p className="text-sm sm:text-lg text-[#DDD6C7] max-w-xl mx-auto font-medium leading-relaxed">
              অ্যাবাকাস হলো পুঁতি গুনে সহজে যোগ-বিয়োগ ও হিসাব শেখার একটি মাধ্যম।
            </p>
          </div>

          {/* Primary & Secondary CTAs */}
          <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'home_hero', target: 'free_class_auth' });
                openFreeClassAuth('register');
              }}
              className="w-full sm:w-auto min-h-[48px] px-7 py-3.5 bg-gradient-to-r from-[#E4BE67] via-[#D7AC4C] to-[#C89B3B] hover:from-[#ECC978] hover:to-[#D5A847] text-[#141517] font-extrabold text-sm rounded-2xl shadow-lg shadow-[#D4AF5F]/20 transition-all inline-flex items-center justify-center gap-2 active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F4D992] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <PlayCircle size={18} />
              <span>ফ্রিতে শুরু করুন</span>
            </button>

            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'home_hero', target: 'enroll' });
                onNavigate('/enroll');
              }}
              className="w-full sm:w-auto min-h-[48px] px-6 py-3.5 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 hover:border-[#E8C778] font-bold text-sm rounded-2xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8C778] focus-visible:ring-offset-2 focus-visible:ring-offset-[#18191C]"
            >
              <span>সম্পূর্ণ প্যাকেজ দেখুন</span>
              <ArrowRight size={16} className="text-[#E4BE67]" />
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                track('cta_click', { place: 'home_hero', target: 'login_auth' });
                onOpenFreeResourcesAuth?.('/', 'login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CFC7B7] hover:text-[#E8C778] underline underline-offset-4 cursor-pointer"
            >
              <LogIn size={14} className="text-[#E4BE67]" />
              <span>আগে থেকেই অ্যাকাউন্ট আছে? লগইন করুন</span>
            </button>
          </div>
        </div>
      </section>

      {/* Three Visual Resource Cards ("ভর্তির আগে দেখে নিন") */}
      <section
        aria-labelledby="preview-before-enroll-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5"
      >
        <div className="space-y-1">
          <h2
            id="preview-before-enroll-heading"
            className="text-xl sm:text-2xl font-black text-[#18191C]"
          >
            ভর্তির আগে দেখে নিন
          </h2>
          <p className="text-xs sm:text-sm text-[#4F4B43]">
            অ্যাকাউন্ট খুলেই ফ্রি ক্লাস, বাংলা ই-বুক ও ভার্চুয়াল অ্যাবাকাস দেখতে পারবেন।
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
          {/* Card 1: Free Class Preview */}
          <article className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E5DEC9] flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                  <Video size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                    ফ্রি ক্লাস
                  </h3>
                  <p className="text-[11px] font-semibold text-[#625D52]">
                    অ্যাকাউন্টে লগইন করে দেখুন
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'home_preview', target: 'free_class_auth' });
                  openFreeClassAuth('register');
                }}
                aria-label="ফ্রি ক্লাস দেখুন (অ্যাকাউন্টে আনলক হয়)"
                className="group/thumb relative aspect-video w-full rounded-xl overflow-hidden bg-[#18191C] border border-[#C89D4A]/45 block cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
              >
                <img
                  src={CLASS_PREVIEW_IMAGE_PATH}
                  alt="সোরোবান অ্যাবাকাস হাতে অনুশীলনের ফ্রি ক্লাস প্রিভিউ"
                  width={1672}
                  height={941}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center group-hover/thumb:scale-[1.03] transition-transform duration-200 motion-reduce:transition-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#141517]/80 via-[#141517]/20 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2"
                >
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141517]/85 border border-[#D4AF5F]/50 text-[#FAF7F0] text-[11px] font-bold">
                    <Lock size={12} className="text-[#E4BE67] shrink-0" />
                    <span>অ্যাকাউন্টে আনলক হয়</span>
                  </span>
                  <span className="w-9 h-9 rounded-full bg-gradient-to-r from-[#E4BE67] to-[#CFA242] text-[#141517] flex items-center justify-center shadow-md shrink-0">
                    <PlayCircle size={18} />
                  </span>
                </div>
              </button>

              <p className="text-xs text-[#4F4B43] leading-relaxed">
                শুরুর ক্লাসগুলো দেখে বুঝতে পারবেন শেখার পদ্ধতি কতটা সহজ।
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'home_preview', target: 'free_class_auth' });
                  openFreeClassAuth('register');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-xs transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <PlayCircle size={16} className="shrink-0" />
                <span>ফ্রি ক্লাস দেখুন</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'home_preview', target: 'login_auth' });
                  onOpenFreeResourcesAuth?.('/', 'login');
                }}
                className="w-full min-h-[40px] px-3 py-2 text-[#524E46] hover:text-[#18191C] hover:bg-[#F3EDE0] font-bold text-xs rounded-xl transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn size={14} className="text-[#855E18] shrink-0" />
                <span>লগইন করুন</span>
              </button>
            </div>
          </article>

          {/* Card 2: E-book Library */}
          <article className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E5DEC9] flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                  <BookOpen size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                    ই-বুক লাইব্রেরি
                  </h3>
                  <p className="text-[11px] font-semibold text-[#625D52]">
                    বাংলা গাইড ও বুকমার্ক সুবিধা
                  </p>
                </div>
              </div>

              <a
                href="/ebooks"
                onClick={(e) => {
                  e.preventDefault();
                  track('cta_click', { place: 'home_preview', target: 'ebooks' });
                  onNavigate('/ebooks');
                }}
                aria-label="ই-বুক লাইব্রেরি দেখুন (ই-বুক পাঠের দৃষ্টান্ত)"
                className="group/book relative aspect-video w-full rounded-xl overflow-hidden bg-[#18191C] border border-[#C89D4A]/45 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
              >
                <img
                  src={BOOK_PREVIEW_IMAGE_PATH}
                  alt="ট্যাবলেটে ডিজিটাল অ্যাবাকাস ই-বুক পড়ার দৃষ্টান্ত"
                  width={1672}
                  height={941}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-[42%_50%] group-hover/book:scale-[1.03] transition-transform duration-200 motion-reduce:transition-none"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#141517]/80 via-[#141517]/10 to-transparent"
                />
                <span
                  aria-hidden="true"
                  className="absolute left-2.5 bottom-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141517]/85 border border-[#D4AF5F]/45 text-[#FAF7F0] text-[11px] font-bold"
                >
                  <BookOpen size={12} className="text-[#E4BE67] shrink-0" />
                  <span>ডিজিটাল ই-বুক পাঠের দৃষ্টান্ত</span>
                </span>
              </a>

              <p className="text-xs text-[#4F4B43] leading-relaxed">
                সহজ বাংলা ই-বুক ও অনুশীলনের নির্দেশিকা সরাসরি সাইটেই পড়ুন।
              </p>
            </div>

            <a
              href="/ebooks"
              onClick={(e) => {
                e.preventDefault();
                track('cta_click', { place: 'home_preview', target: 'ebooks' });
                onNavigate('/ebooks');
              }}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#FAF7F0] border border-[#C89D4A]/45 font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2"
            >
              <BookOpen size={16} className="text-[#E4BE67] shrink-0" />
              <span>ই-বুক লাইব্রেরি দেখুন</span>
            </a>
          </article>

          {/* Card 3: Virtual Abacus */}
          <article
            onClick={() => {
              track('cta_click', { place: 'home_preview', target: 'abacus_auth' });
              openAbacusModal('login');
            }}
            className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E5DEC9] hover:border-[#C89D4A] transition-colors flex flex-col justify-between gap-4 cursor-pointer"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#18191C] border border-[#C89D4A]/45 text-[#E4BE67] flex items-center justify-center shrink-0">
                  <Calculator size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-[#18191C] text-base leading-snug">
                    ভার্চুয়াল অ্যাবাকাস
                  </h3>
                  <p className="text-[11px] font-semibold text-[#625D52]">
                    হাতের কাছে অ্যাবাকাস না থাকলেও চলবে
                  </p>
                </div>
              </div>

              <SorobanMiniDemo
                onPreviewClick={() => {
                  track('cta_click', { place: 'home_preview', target: 'abacus_auth' });
                  openAbacusModal('login');
                }}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                track('cta_click', { place: 'home_preview', target: 'abacus_auth' });
                openAbacusModal('login');
              }}
              className="w-full min-h-[44px] px-4 py-2.5 bg-[#18191C] hover:bg-[#27292E] text-[#FAF7F0] border border-[#C89D4A]/45 font-extrabold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>ভার্চুয়াল অ্যাবাকাস খুলুন</span>
              <ArrowRight size={15} className="text-[#E4BE67] shrink-0" />
            </button>
          </article>
        </div>
      </section>

      {/* Short Free vs Full Package Entry */}
      <section
        aria-labelledby="home-package-entry-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8"
      >
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#E5DEC9] p-5 sm:p-8 space-y-5">
          <div className="space-y-1">
            <h2
              id="home-package-entry-heading"
              className="text-xl sm:text-2xl font-black text-[#18191C]"
            >
              ফ্রি শুরু নাকি সম্পূর্ণ প্যাকেজ?
            </h2>
            <p className="text-xs sm:text-sm text-[#4F4B43]">
              প্রথমে ফ্রি ক্লাস দিয়ে দেখে নিতে পারেন, অথবা একসাথে সব সুবিধা পেতে সম্পূর্ণ প্যাকেজ নিন।
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
            <div className="p-5 rounded-2xl bg-[#FAF7F0] border border-[#E5DEC9] flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <h3 className="text-base font-black text-[#18191C]">ফ্রি অ্যাকাউন্ট</h3>
                <ul className="space-y-2 text-xs text-[#4F4B43]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>শুরুর ফ্রি ভিডিও ক্লাস</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>বাংলা ই-বুক ও ভার্চুয়াল অ্যাবাকাস</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'home_package', target: 'free_class_auth' });
                  openFreeClassAuth('register');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 bg-white hover:bg-[#F3EDE0] text-[#18191C] border border-[#D8CBAF] font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
              >
                ফ্রিতে শুরু করুন
              </button>
            </div>

            <div className="p-5 rounded-2xl bg-[#18191C] text-[#FAF7F0] border border-[#C89D4A]/50 flex flex-col justify-between gap-4">
              <div className="space-y-2.5">
                <h3 className="text-base font-black text-[#FAF7F0]">
                  ঘরে ঘরে অ্যাবাকাস — প্যারেন্ট স্টার্টার প্যাকেজ
                </h3>
                <ul className="space-y-2 text-xs text-[#DDD6C7]">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#E4BE67] shrink-0 mt-0.5" />
                    <span>শুরু থেকে সব ধারাবাহিক ভিডিও ক্লাস ও প্র্যাকটিস শিট</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 size={15} className="text-[#E4BE67] shrink-0 mt-0.5" />
                    <span>ফিজিক্যাল অ্যাবাকাস পাঠানোর ব্যবস্থা ও ইমেইলে সহায়তা</span>
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => {
                  track('cta_click', { place: 'home_package', target: 'enroll' });
                  onNavigate('/enroll');
                }}
                className="w-full min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>প্যাকেজের বিস্তারিত দেখুন</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Maximum 3 Concise Collapsed FAQs */}
      <section aria-labelledby="home-faq-heading" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <h2 id="home-faq-heading" className="text-xl sm:text-2xl font-black text-[#18191C]">
          সাধারণ কিছু প্রশ্ন
        </h2>

        <div className="space-y-2.5">
          {CONCISE_FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const panelId = `home-faq-panel-${idx}`;
            return (
              <div
                key={faq.question}
                className="bg-[#FFFDF9] rounded-2xl border border-[#E5DEC9] overflow-hidden"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpenFaqIndex((prev) => (prev === idx ? null : idx))}
                  className="w-full min-h-[52px] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left font-bold text-xs sm:text-sm text-[#18191C] hover:bg-[#FAF7F0] transition-colors cursor-pointer"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    size={17}
                    aria-hidden="true"
                    className={`text-[#625D52] shrink-0 transition-transform duration-150 ${
                      isOpen ? 'rotate-180 text-[#18191C]' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div
                    id={panelId}
                    className="px-4 sm:px-5 pb-4 pt-1 text-xs sm:text-sm text-[#4F4B43] leading-relaxed border-t border-[#EFE9D8]"
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
