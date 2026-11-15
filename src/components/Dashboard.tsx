import React from 'react';
import { ClassItem, UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Lock } from 'lucide-react';

interface DashboardProps {
  classes: ClassItem[];
  currentUser?: UserProfile | null;
  onSelectClass: (classItem: ClassItem) => void;
  onNavigate?: (path: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  currentUser,
  onSelectClass,
  onNavigate,
}) => {
  const { settings } = useSettings();
  const isPremium = currentUser?.role === 'admin' || currentUser?.enrollment_status === 'approved';

  // Only show published classes to parents
  const displayClasses = classes.filter((c) => c.is_published !== false);

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {settings.dashboard_title || 'অ্যাবাকাস Parent Training'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {settings.dashboard_subtitle || 'ক্লাস নির্বাচন করে ট্রেনিং ভিডিও শুরু করুন।'}
        </p>
      </div>

      {/* YouTube-style Responsive Grid: 1 col mobile, 2 sm, 3 lg */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayClasses.map((cls) => {
          const classNumDisplay = cls.class_number < 10 
            ? `০${cls.class_number}` 
            : `${cls.class_number}`;

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
                    <span className="font-bold text-slate-500">
                      ক্লাস {classNumDisplay}
                    </span>
                    {isClassFree ? (
                      <span className="font-bold text-emerald-700">
                        ফ্রি
                      </span>
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
        })}

        {displayClasses.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            {settings.empty_classes_text || 'এখনও কোনো প্রকাশকৃত ক্লাস নেই।'}
          </div>
        )}
      </div>

    </div>
  );
};
