import React from 'react';
import { ClassItem, UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Lock } from 'lucide-react';

interface DashboardProps {
  classes: ClassItem[];
  currentUser?: UserProfile | null;
  onSelectClass: (classItem: ClassItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  currentUser,
  onSelectClass,
}) => {
  const { settings } = useSettings();
  const isPremium = currentUser?.role === 'admin' || currentUser?.enrollment_status === 'approved';

  // Only show published classes to parents
  const displayClasses = classes.filter((c) => c.is_published !== false);

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
              onClick={() => onSelectClass(cls)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-orange-300 shadow-2xs hover:shadow-md transition-all cursor-pointer overflow-hidden flex flex-col"
            >
              {/* 16:9 Thumbnail Area */}
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                {cls.thumbnail_url ? (
                  <img
                    src={cls.thumbnail_url}
                    alt={cls.title}
                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                      isLocked ? 'brightness-50' : ''
                    }`}
                  />
                ) : (
                  <div
                    className={`w-full h-full bg-gradient-to-tr from-orange-400 via-amber-300 to-orange-200 flex flex-col items-center justify-center text-slate-800 p-4 select-none group-hover:scale-105 transition-transform duration-300 ${
                      isLocked ? 'brightness-50' : ''
                    }`}
                  >
                    <span className="text-4xl drop-shadow-sm mb-1">{settings.logo_emoji || '🧮'}</span>
                    <span className="text-xs font-black tracking-wider uppercase text-orange-950/80 bg-white/40 px-2 py-0.5 rounded-md backdrop-blur-xs">
                      ক্লাস {classNumDisplay}
                    </span>
                  </div>
                )}

                {/* Centered Lock Overlay if premium and viewer not premium */}
                {isLocked && (
                  <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex flex-col items-center justify-center text-white gap-1 z-10">
                    <div className="w-11 h-11 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center shadow-lg">
                      <Lock size={20} className="text-amber-300" />
                    </div>
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">
                      ক্লাস {classNumDisplay}
                    </span>
                    {isClassFree ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[11px] font-bold">
                        ফ্রি
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[11px] font-bold">
                        প্রিমিয়াম
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {cls.title}
                  </h3>
                </div>
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
