import React from 'react';
import { ClassItem, UserProfile } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { ArrowLeft } from 'lucide-react';

interface ClassViewProps {
  currentClass: ClassItem;
  allClasses: ClassItem[];
  currentUser?: UserProfile | null;
  onBackToDashboard: () => void;
}

export const ClassView: React.FC<ClassViewProps> = ({
  currentClass,
  currentUser,
  onBackToDashboard,
}) => {
  const classNumDisplay = currentClass.class_number < 10 
    ? `০${currentClass.class_number}` 
    : `${currentClass.class_number}`;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Back Navigation */}
      <div>
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs cursor-pointer"
        >
          <ArrowLeft size={16} />
          ক্লাসসমূহে ফিরে যান
        </button>
      </div>

      {/* Class Title Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-md font-extrabold text-xs inline-block">
            ক্লাস {classNumDisplay}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentClass.title}
        </h1>
      </div>

      {/* Embedded 16:9 Responsive Video Player with viewer watermark info */}
      <VideoPlayer
        videoUrl={currentClass.video_url || currentClass.youtube_video_id}
        title={currentClass.title}
        viewerEmail={currentUser?.email}
        viewerPhone={currentUser?.phone}
      />

      {/* Short Class Description */}
      {(currentClass.description || currentClass.short_intro) && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            ক্লাস বিবরণ
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {currentClass.description || currentClass.short_intro}
          </p>
        </div>
      )}

    </div>
  );
};
