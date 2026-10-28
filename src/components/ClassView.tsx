import React, { useState, useEffect } from 'react';
import { ClassItem, UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { VideoPlayer } from './VideoPlayer';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';

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
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    async function fetchVideo() {
      if (!supabase) {
        setLoadingVideo(false);
        return;
      }
      setLoadingVideo(true);
      setVideoUrl(null);
      try {
        const { data, error } = await supabase
          .from('class_videos')
          .select('video_url')
          .eq('class_id', currentClass.id)
          .maybeSingle();

        if (isCancelled) return;
        if (!error && data?.video_url && data.video_url.trim()) {
          setVideoUrl(data.video_url.trim());
        } else {
          setVideoUrl(null);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error fetching class video:', err);
          setVideoUrl(null);
        }
      } finally {
        if (!isCancelled) {
          setLoadingVideo(false);
        }
      }
    }

    fetchVideo();
    return () => {
      isCancelled = true;
    };
  }, [currentClass.id]);

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
          {currentClass.is_free && (
            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-md font-extrabold text-xs inline-block">
              ফ্রি ক্লাস
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentClass.title}
        </h1>
      </div>

      {/* Embedded 16:9 Responsive Video Player or Loading / Locked Box */}
      {loadingVideo ? (
        <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-white/70 gap-2">
          <Loader2 size={24} className="animate-spin text-orange-500" />
          <span className="text-xs font-medium">লোড হচ্ছে...</span>
        </div>
      ) : videoUrl ? (
        <VideoPlayer
          videoUrl={videoUrl}
          title={currentClass.title}
          viewerEmail={currentUser?.email}
          viewerPhone={currentUser?.phone}
        />
      ) : (
        <div className="w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-center p-6 space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
            <Lock size={24} />
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-100 max-w-md">
            🔒 এই ক্লাসটি পেইড মেম্বারদের জন্য। অ্যাক্সেস পেতে আমাদের সাথে যোগাযোগ করুন।
          </p>
        </div>
      )}

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
