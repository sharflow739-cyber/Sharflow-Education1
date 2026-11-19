import React, { useMemo, useState } from 'react';
import { ClassItem, CourseChapter, UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  DEFAULT_COURSE_CHAPTERS,
  buildClassesAccordionSections,
  getLearnerAccordionLabel,
} from '../lib/courseChapters';
import {
  ArrowLeft,
  ChevronDown,
  Layers,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  classes: ClassItem[];
  chapters?: CourseChapter[];
  chaptersSupported?: boolean;
  currentUser?: UserProfile | null;
  onSelectClass: (classItem: ClassItem) => void;
  onNavigate?: (path: string) => void;
  onBackHome?: () => void;
}

function toBanglaDigits(num: number): string {
  const digits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(num).replace(/\d/g, (d) => digits[Number(d)] || d);
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  chapters = DEFAULT_COURSE_CHAPTERS,
  chaptersSupported = false,
  currentUser,
  onSelectClass,
  onNavigate,
  onBackHome,
}) => {
  const { settings } = useSettings();
  const isPremium =
    currentUser?.role === 'admin' || currentUser?.enrollment_status === 'approved';
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());

  const accordionSections = useMemo(
    () => buildClassesAccordionSections(classes, chapters, chaptersSupported),
    [classes, chapters, chaptersSupported]
  );

  const toggleSection = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleBack = () => {
    if (onBackHome) {
      onBackHome();
    } else if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.pushState({}, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const handleCardAction = (cls: ClassItem, isLocked: boolean) => {
    if (isLocked) {
      if (onNavigate) {
        onNavigate('/enroll');
      } else {
        window.history.pushState({}, '', '/enroll');
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    } else {
      onSelectClass(cls);
    }
  };

  const renderClassCard = (cls: ClassItem) => {
    const classNumDisplay =
      cls.class_number < 10 ? `০${toBanglaDigits(cls.class_number)}` : toBanglaDigits(cls.class_number);

    const isClassFree = cls.is_free !== false;
    const isLocked = !isClassFree && !isPremium;

    return (
      <div
        key={cls.id}
        role="button"
        tabIndex={0}
        aria-label={isLocked ? `${cls.title} (সম্পূর্ণ প্যাকেজ লক করা - প্যাকেজ নিন)` : cls.title}
        onClick={() => handleCardAction(cls, isLocked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardAction(cls, isLocked);
          }
        }}
        className="group bg-white rounded-2xl border border-[#E5DEC9] hover:border-[#C89D4A] shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-emerald-600"
      >
        {/* 16:9 Thumbnail Area */}
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
          {cls.thumbnail_url ? (
            <img
              src={cls.thumbnail_url}
              alt={cls.title}
              className="w-full h-full object-cover group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-300 motion-reduce:transition-none"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-orange-400 via-amber-300 to-orange-200 flex flex-col items-center justify-center text-slate-800 p-4 select-none group-hover:scale-105 motion-reduce:group-hover:scale-100 transition-transform duration-300 motion-reduce:transition-none">
              <span className="text-4xl drop-shadow-sm mb-1">{settings.logo_emoji || '🧮'}</span>
              <span className="text-xs font-black tracking-wider uppercase text-orange-950/80 bg-white/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                ক্লাস {classNumDisplay}
              </span>
            </div>
          )}
        </div>

        {/* Card Body */}
        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-bold text-slate-500">ক্লাস {classNumDisplay}</span>
              {isClassFree ? (
                <span className="font-bold text-emerald-700">ফ্রি</span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                  {isLocked && <Lock size={12} className="text-amber-700" />}
                  <span>প্রিমিয়াম</span>
                </span>
              )}
            </div>

            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-[#8A6118] transition-colors">
              {cls.title}
            </h3>
          </div>

          {isLocked && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Lock size={14} className="text-amber-600 shrink-0" />
                <span>লক করা</span>
              </span>
              <span className="px-3.5 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs motion-safe:transition-colors whitespace-nowrap">
                প্যাকেজ নিন
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  let chapterCounter = 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Back Navigation */}
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#524E46] hover:text-[#141517] bg-white border border-[#E5DEC9] hover:border-[#C89D4A] px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>হোমে ফিরে যান</span>
        </button>
      </div>

      {/* Page Header */}
      <div className="border-b border-[#E5DEC9] pb-4 space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18191C] tracking-tight">
          ক্লাসসমূহ
        </h1>
        <p className="text-xs sm:text-sm text-[#575247]">
          পছন্দের ধাপ বেছে নিয়ে ক্লাসগুলো দেখুন।
        </p>
      </div>

      {/* Full-Width Chapter / Category Accordion Bars */}
      <div className="space-y-3" role="region" aria-label="অধ্যায়ভিত্তিক ক্লাস তালিকা">
        {accordionSections.map((section) => {
          const isOpen = expandedKeys.has(section.key);
          const panelId = `classes-panel-${section.key}`;
          const headingId = `classes-heading-${section.key}`;
          if (!section.isFreeSection && section.key !== 'uncategorized') {
            chapterCounter += 1;
          }
          const badgeLabel = section.isFreeSection
            ? null
            : section.key === 'uncategorized'
            ? null
            : toBanglaDigits(chapterCounter);

          return (
            <section
              key={section.key}
              aria-labelledby={headingId}
              className={`rounded-2xl border transition-colors overflow-hidden ${
                isOpen
                  ? 'bg-white border-[#C89D4A] shadow-sm'
                  : 'bg-white border-[#E5DEC9] hover:border-[#D4AF5F]'
              }`}
            >
              <button
                type="button"
                id={headingId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggleSection(section.key)}
                className={`w-full min-h-[64px] px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9E7324] ${
                  isOpen
                    ? section.isFreeSection
                      ? 'bg-emerald-50/70 border-b border-emerald-200/70'
                      : 'bg-[#FAF7F0] border-b border-[#E5DEC9]'
                    : 'hover:bg-[#FCFBF7]'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs border ${
                      section.isFreeSection
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : isOpen
                        ? 'bg-[#18191C] text-[#E4BE67] border-[#C89D4A]/60'
                        : 'bg-[#F3EDE0] text-[#755113] border-[#D4AF5F]/50'
                    }`}
                    aria-hidden="true"
                  >
                    {section.isFreeSection ? (
                      <Sparkles size={18} />
                    ) : badgeLabel ? (
                      <span>{badgeLabel}</span>
                    ) : (
                      <Layers size={17} />
                    )}
                  </div>

                  {(() => {
                    const displayLabel = getLearnerAccordionLabel(section);
                    return (
                      <div className="min-w-0">
                        <h2 className="text-sm sm:text-base font-black text-[#18191C] leading-snug truncate">
                          {displayLabel.title}
                        </h2>
                        {displayLabel.subtitle && (
                          <span className="text-[11px] sm:text-xs font-semibold text-[#625D52] block truncate">
                            {displayLabel.subtitle}
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap ${
                      section.isFreeSection
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-[#F3EDE0] text-[#574219]'
                    }`}
                  >
                    {toBanglaDigits(section.classes.length)}টি ক্লাস
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-[#575247] transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#18191C]' : ''
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </button>

              {isOpen && (
                <div id={panelId} className="p-4 sm:p-5 bg-[#FCFBF7]/70">
                  {section.classes.length === 0 ? (
                    <div className="p-6 text-center bg-white rounded-xl border border-dashed border-[#D8CBAF] space-y-1.5">
                      <PlayCircle size={22} className="mx-auto text-[#9E7324]" />
                      <p className="text-xs sm:text-sm font-bold text-[#3B3934]">
                        {section.emptyMessage}
                      </p>
                      <p className="text-[11px] text-[#625D52]">
                        নতুন ক্লাস যুক্ত হলে এখানে দেখতে পাবেন।
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {section.classes.map(renderClassCard)}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};
