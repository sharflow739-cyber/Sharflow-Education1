import React from 'react';
import { ClassItem } from '../types';
import { VideoPlayer } from './VideoPlayer';
import { ArrowLeft } from 'lucide-react';

interface ClassViewProps {
  currentClass: ClassItem;
  allClasses: ClassItem[];
  onBackToDashboard: () => void;
}

export const ClassView: React.FC<ClassViewProps> = ({
  currentClass,
  onBackToDashboard,
}) => {
  const classNumDisplay = currentClass.class_number < 10 
    ? `০${currentClass.class_number}` 
    : `${currentClass.class_number}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Back Navigation */}
      <div>
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3.5 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft size={16} />
          ক্লাসসমূহে ফিরে যান
        </button>
      </div>

      {/* Class Details Box */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-extrabold text-xs inline-block">
          ক্লাস {classNumDisplay}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentClass.title}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed">
          {currentClass.description || currentClass.short_intro}
        </p>
      </div>

      {/* Embedded Video Player */}
      <VideoPlayer
        videoUrl={currentClass.video_url || currentClass.youtube_video_id}
        title={currentClass.title}
      />

    </div>
  );
};
