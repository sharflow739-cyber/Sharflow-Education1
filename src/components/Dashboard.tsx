import React from 'react';
import { ClassItem } from '../types';
import { ChevronRight, Play } from 'lucide-react';

interface DashboardProps {
  classes: ClassItem[];
  onSelectClass: (classItem: ClassItem) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  classes,
  onSelectClass,
}) => {
  // Only show published classes to parents if is_published field is present
  const displayClasses = classes.filter((c) => c.is_published !== false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Simple Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          অ্যাবাকাস Parent Training
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          ক্লাস নির্বাচন করে ট্রেনিং ভিডিও শুরু করুন।
        </p>
      </div>

      {/* Class List Cards Grid */}
      <div className="grid grid-cols-1 gap-4">
        {displayClasses.map((cls) => {
          const classNumDisplay = cls.class_number < 10 
            ? `০${cls.class_number}` 
            : `${cls.class_number}`;

          return (
            <div
              key={cls.id}
              onClick={() => onSelectClass(cls)}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-orange-300 shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded font-extrabold text-xs">
                    ক্লাস {classNumDisplay}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base group-hover:text-orange-600 transition-colors">
                  {cls.title}
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                  {cls.description || cls.short_intro}
                </p>
              </div>

              <div className="flex items-center justify-end shrink-0">
                <span className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center gap-1.5">
                  <Play size={14} className="fill-white" />
                  <span>ক্লাস দেখুন</span>
                  <ChevronRight size={14} />
                </span>
              </div>
            </div>
          );
        })}

        {displayClasses.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
            এখনও কোনো প্রকাশকৃত ক্লাস নেই।
          </div>
        )}
      </div>

    </div>
  );
};
