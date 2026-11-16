import React, { useMemo, useState } from 'react';
import { ClassItem, CourseChapter, UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import {
  DEFAULT_COURSE_CHAPTERS,
  UNCATEGORIZED_CHAPTER_KEY,
  groupClassesByChapter,
  sortChapters,
} from '../lib/courseChapters';
import { Lock } from 'lucide-react';

interface DashboardProps {
  classes: ClassItem[];
  chapters?: CourseChapter[];
  chaptersSupported?: boolean;
  currentUser?: UserProfile | null;
  onSelectClass: (classItem: ClassItem) => void;
  onNavigate?: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  chapters = DEFAULT_COURSE_CHAPTERS,
  chaptersSupported = false,
  currentUser,
  onSelectClass,
  onNavigate,
}) => {
  const { settings } = useSettings();
  const isPremium = currentUser?.role === 'admin' || currentUser?.enrollment_status === 'approved';
  const [selectedChapterKey, setSelectedChapterKey] = useState<string>('all');

  // Only show published classes to parents
  const displayClasses = useMemo(
    () => classes.filter((c) => c.is_published !== false),
    [classes]
  );

  const orderedChapters = useMemo(() => sortChapters(chapters), [chapters]);

  const chapterGroups = useMemo(
    () => groupClassesByChapter(displayClasses, orderedChapters, chaptersSupported),
    [displayClasses, orderedChapters, chaptersSupported]
  );

  const uncategorizedGroup = useMemo(
    () => chapterGroups.find((g) => g.key === UNCATEGORIZED_CHAPTER_KEY) || null,
    [chapterGroups]
  );

  const effectiveSelectedKey =
    selectedChapterKey !== 'all' &&
    selectedChapterKey !== UNCATEGORIZED_CHAPTER_KEY &&
    !orderedChapters.some((ch) => ch.id === selectedChapterKey)
      ? 'all'
      : selectedChapterKey === UNCATEGORIZED_CHAPTER_KEY && !uncategorizedGroup
      ? 'all'
      : selectedChapterKey;

  const visibleGroups = useMemo(() => {
    if (effectiveSelectedKey === 'all') {
      return chapterGroups.filter((grp) => grp.classes.length > 0);
    }
    const matched = chapterGroups.find((grp) => grp.key === effectiveSelectedKey);
    if (matched) {
      return [matched];
    }
    const ch = orderedChapters.find((c) => c.id === effectiveSelectedKey);
    if (ch) {
      return [
        {
          chapter: ch,
          key: ch.id,
          title: ch.title,
          subtitle: ch.subtitle,
          classes: [],
        },
      ];
    }
    return [];
  }, [chapterGroups, effectiveSelectedKey, orderedChapters]);

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
      cls.class_number < 10 ? `০${cls.class_number}` : `${cls.class_number}`;

    const isClassFree = cls.is_free !== false;
    const isLocked = !isClassFree && !isPremium;

    return (
      <div
        key={cls.id}
        role="button"
        tabIndex={0}
        aria-label={isLocked ? `${cls.title} (প্রিমিয়াম লক করা - কিনুন)` : cls.title}
        onClick={() => handleCardAction(cls, isLocked)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardAction(cls, isLocked);
          }
        }}
        className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-300 shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {/* 16:9 Thumbnail Area - Normal brightness preserved for both free & locked cards */}
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

            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
              {cls.title}
            </h3>
          </div>

          {/* Lock status + green 'কিনুন' CTA below for locked premium cards */}
          {isLocked && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600">
                <Lock size={14} className="text-amber-600 shrink-0" />
                <span>লক করা</span>
              </span>
              <span className="px-3.5 py-1.5 bg-emerald-600 group-hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl shadow-xs motion-safe:transition-colors whitespace-nowrap">
                কিনুন
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {settings.dashboard_title || 'অ্যাবাকাস Parent Training'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {settings.dashboard_subtitle || 'ক্লাস নির্বাচন করে ট্রেনিং ভিডিও শুরু করুন।'}
        </p>
      </div>

      {/* Compact Horizontally Scrollable Chapter Filter Row */}
      {displayClasses.length > 0 && (
        <div
          role="tablist"
          aria-label="অধ্যায় ফিল্টার"
          className="w-full max-w-full flex items-center gap-2 overflow-x-auto pb-1.5 sm:flex-wrap"
        >
          <button
            type="button"
            role="tab"
            aria-selected={effectiveSelectedKey === 'all'}
            onClick={() => setSelectedChapterKey('all')}
            className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              effectiveSelectedKey === 'all'
                ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-slate-900'
            }`}
          >
            সব ({displayClasses.length})
          </button>

          {orderedChapters.map((ch) => {
            const count = chapterGroups.find((g) => g.key === ch.id)?.classes.length || 0;
            const isSelected = effectiveSelectedKey === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedChapterKey(ch.id)}
                className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  isSelected
                    ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-slate-900'
                }`}
              >
                {ch.title}
                {count > 0 ? ` (${count})` : ''}
              </button>
            );
          })}

          {uncategorizedGroup && uncategorizedGroup.classes.length > 0 && (
            <button
              type="button"
              role="tab"
              aria-selected={effectiveSelectedKey === UNCATEGORIZED_CHAPTER_KEY}
              onClick={() => setSelectedChapterKey(UNCATEGORIZED_CHAPTER_KEY)}
              className={`shrink-0 whitespace-nowrap min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                effectiveSelectedKey === UNCATEGORIZED_CHAPTER_KEY
                  ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-orange-300 hover:text-slate-900'
              }`}
            >
              অন্যান্য ({uncategorizedGroup.classes.length})
            </button>
          )}
        </div>
      )}

      {/* Chapter Sections + Class Grid */}
      {displayClasses.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          {settings.empty_classes_text || 'এখনও কোনো প্রকাশকৃত ক্লাস নেই।'}
        </div>
      ) : (
        <div className="space-y-8">
          {visibleGroups.map((group) => (
            <section
              key={group.key}
              aria-labelledby={`chapter-heading-${group.key}`}
              className="space-y-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div className="flex flex-wrap items-baseline gap-2 min-w-0">
                  <h2
                    id={`chapter-heading-${group.key}`}
                    className="text-base sm:text-lg font-black text-slate-900"
                  >
                    {group.title}
                  </h2>
                  {group.subtitle && (
                    <span className="text-xs font-semibold text-slate-400">
                      {group.subtitle}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  {group.classes.length}টি ক্লাস
                </span>
              </div>

              {group.classes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.classes.map(renderClassCard)}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                  <p className="text-xs text-slate-500">
                    এই অধ্যায়ে এখনো কোনো প্রকাশিত ক্লাস যোগ করা হয়নি।
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedChapterKey('all')}
                    className="min-h-[38px] px-4 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    সব ক্লাস দেখুন
                  </button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
