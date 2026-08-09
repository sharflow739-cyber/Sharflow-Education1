import React from 'react';
import { UserProfile, ClassItem, UserProgress, Announcement } from '../types';
import { DEFAULT_COURSE } from '../data/defaultCourses';
import { 
  BookOpen, CheckCircle2, Lock, Play, Award, 
  ChevronRight, Sparkles, Megaphone, Clock, Check
} from 'lucide-react';

interface DashboardProps {
  currentUser: UserProfile;
  classes: ClassItem[];
  userProgressMap: Record<string, UserProgress>;
  announcements: Announcement[];
  onSelectClass: (classItem: ClassItem) => void;
  onOpenWorksheets: () => void;
  onOpenQuiz: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  classes,
  userProgressMap,
  announcements,
  onSelectClass,
  onOpenWorksheets,
  onOpenQuiz,
}) => {
  // Calculate completed classes count
  const completedCount = classes.filter(
    (c) => userProgressMap[c.id]?.is_completed
  ).length;

  const totalClasses = classes.length || DEFAULT_COURSE.total_classes;
  const progressPercent = Math.round((completedCount / totalClasses) * 100);

  // Group classes by module
  const modulesMap: Record<string, ClassItem[]> = classes.reduce((acc: Record<string, ClassItem[]>, cls) => {
    const mod = cls.module_name || 'সাধারণ মডিউল';
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(cls);
    return acc;
  }, {});

  // Determine unlock status for Class N
  // Rule: Class 1 is always unlocked. Class N is unlocked if Class N-1 is completed, or if overridden by admin
  const isClassUnlocked = (cls: ClassItem, index: number) => {
    if (cls.class_number === 1) return true; // Class 1 always unlocked
    if (!cls.is_locked_by_default) return true;

    // Find previous class
    const prevClass = classes.find((c) => c.class_number === cls.class_number - 1);
    if (!prevClass) return index === 0;

    return Boolean(userProgressMap[prevClass.id]?.is_completed);
  };

  // Find current class to continue
  const currentActiveCls = classes.find((cls, idx) => {
    const unlocked = isClassUnlocked(cls, idx);
    const completed = Boolean(userProgressMap[cls.id]?.is_completed);
    return unlocked && !completed;
  }) || classes[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Abstract Background Accents */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          
          <div className="md:col-span-2 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-orange-100 backdrop-blur-xs">
              <Sparkles size={14} className="text-amber-200" />
              অভিভাবক ট্রেনিং ড্যাশবোর্ড (Parent Portal)
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              স্বাগতম, {currentUser.full_name}! 👋
            </h1>

            {currentUser.child_name && (
              <p className="text-xs sm:text-sm text-orange-100 font-medium">
                সন্তানের নাম: <strong className="text-white">{currentUser.child_name}</strong> {currentUser.child_age ? `(${currentUser.child_age} বছর)` : ''}
              </p>
            )}

            <p className="text-xs text-orange-100 max-w-xl leading-relaxed pt-1">
              আপনার অনলাইন ট্রেনিং কোর্সের সাম্প্রতিক অগ্রগতি এবং ক্লাসের তালিকা এখান থেকেই দেখতে পাবেন। সন্তানকে নিয়মিত অনুশীলন করিয়ে কোর্সটি সম্পন্ন করুন।
            </p>
          </div>

          {/* Progress Ring / Call to action */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 text-center space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-orange-100">
              কোর্স অগ্রগতি (Course Progress)
            </div>

            <div className="text-4xl sm:text-5xl font-black text-white tracking-tight flex items-center justify-center gap-1">
              <span>{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="text-xs text-orange-100 flex items-center justify-between font-semibold pt-1">
              <span>সমাপ্ত: {completedCount}/{totalClasses}</span>
              <span>অবশিষ্ট: {totalClasses - completedCount}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Announcements Notice Board */}
      {announcements.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Megaphone size={16} className="text-orange-600" />
            <span>জরুরী নোটিশ ও ঘোষণা (Parent Notice)</span>
          </div>
          {announcements.map((ann) => (
            <div key={ann.id} className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <strong className="text-slate-900 font-bold">{ann.title}: </strong>
                <span>{ann.content}</span>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0 font-medium">{ann.date}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Resume Active Class */}
        <div 
          onClick={() => currentActiveCls && onSelectClass(currentActiveCls)}
          className="bg-white p-5 rounded-2xl border border-orange-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-orange-600 uppercase">চলমান ক্লাস</span>
            <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-orange-600 transition-colors">
              ক্লাস ০{currentActiveCls?.class_number || 1}: {currentActiveCls?.title}
            </h3>
            <p className="text-[11px] text-slate-500">
              ক্লিক করে ক্লাসটি শুরু করুন
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm">
            <Play size={18} className="fill-white ml-0.5" />
          </div>
        </div>

        {/* Card 2: Worksheets */}
        <div 
          onClick={onOpenWorksheets}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">ওয়ার্কশিট ও পিডিএফ</span>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors">
              প্র্যাকটিস ওয়ার্কশিট ডাউনলোড
            </h3>
            <p className="text-[11px] text-slate-500">
              প্রিন্টযোগ্য পিডিএফ সংগ্রহ
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
            <BookOpen size={18} />
          </div>
        </div>

        {/* Card 3: Quiz Test */}
        <div 
          onClick={onOpenQuiz}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex items-center justify-between gap-3"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase">কুইজ ও মেধা যাচাই</span>
            <h3 className="font-bold text-slate-800 text-sm group-hover:text-orange-600 transition-colors">
              অনলাইন প্র্যাকটিস কুইজ
            </h3>
            <p className="text-[11px] text-slate-500">
              স্বয়ংক্রিয় স্কোর ও যাচাই
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Award size={18} />
          </div>
        </div>

      </div>

      {/* MAIN COURSE MODULES & CLASSES LIST */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* List Header */}
        <div className="p-6 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="font-extrabold text-slate-900 text-lg sm:text-xl">
              অ্যাবাকাস Parent Training Course Modules
            </h2>
            <p className="text-xs text-slate-500">
              ধারাবাহিকভাবে প্রতিটি ক্লাস সম্পূর্ণ করে পরের ক্লাস আনলক করুন
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <Check size={14} className="text-emerald-600" /> সম্পন্ন
            </span>
            <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
              ▶ চলমান
            </span>
            <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              <Lock size={12} /> লক করা
            </span>
          </div>
        </div>

        {/* Modules & Classes Rendering */}
        <div className="divide-y divide-slate-100">
          {Object.entries(modulesMap).map(([moduleName, moduleClasses]) => (
            <div key={moduleName} className="p-6 space-y-3">
              
              <h3 className="text-xs font-bold uppercase tracking-wider text-orange-600 bg-orange-50/80 px-3 py-1.5 rounded-lg inline-block border border-orange-100">
                {moduleName}
              </h3>

              <div className="space-y-2">
                {moduleClasses.map((cls, idx) => {
                  const globalIdx = classes.findIndex((c) => c.id === cls.id);
                  const isCompleted = Boolean(userProgressMap[cls.id]?.is_completed);
                  const unlocked = isClassUnlocked(cls, globalIdx);
                  const isCurrent = unlocked && !isCompleted;

                  return (
                    <div
                      key={cls.id}
                      onClick={() => unlocked && onSelectClass(cls)}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        unlocked
                          ? 'cursor-pointer hover:border-orange-300 hover:shadow-xs'
                          : 'cursor-not-allowed opacity-60 bg-slate-50/80 border-slate-200'
                      } ${
                        isCurrent
                          ? 'bg-orange-50/60 border-orange-300 ring-1 ring-orange-400/20'
                          : isCompleted
                          ? 'bg-emerald-50/30 border-emerald-200/80'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Left Title & Indicator */}
                      <div className="flex items-center gap-3">
                        {/* Indicator Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : isCurrent
                              ? 'bg-orange-500 text-white animate-pulse'
                              : 'bg-slate-200 text-slate-500'
                          }`}
                        >
                          {isCompleted ? (
                            '✓'
                          ) : isCurrent ? (
                            '▶'
                          ) : (
                            <Lock size={14} />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">
                              Class 0{cls.class_number}: {cls.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {cls.short_intro}
                          </p>
                        </div>
                      </div>

                      {/* Right Duration & Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={13} /> {cls.duration_minutes} মি.
                        </span>

                        {unlocked ? (
                          <span
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
                              isCurrent
                                ? 'bg-orange-500 text-white shadow-xs'
                                : isCompleted
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700 hover:bg-orange-100 hover:text-orange-700'
                            }`}
                          >
                            <span>{isCompleted ? 'পুনরায় দেখুন' : 'ক্লাস শুরু করুন'}</span>
                            <ChevronRight size={14} />
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1">
                            <Lock size={12} />
                            লক করা
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          ))}
        </div>

      </div>

    </div>
  );
};
