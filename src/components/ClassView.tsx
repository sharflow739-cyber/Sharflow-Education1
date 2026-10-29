import React, { useState, useEffect } from 'react';
import { ClassItem, UserProfile, ClassResource } from '../types';
import { supabase } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { VideoPlayer } from './VideoPlayer';
import { ArrowLeft, Loader2, Lock, Download, FileText, Phone, Mail } from 'lucide-react';

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
  const { settings } = useSettings();
  const isPremium = currentUser?.role === 'admin' || currentUser?.enrollment_status === 'approved';
  const isClassFree = currentClass.is_free !== false;
  const isLocked = !isClassFree && !isPremium;

  // Video State
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(!isLocked);

  // Resources State
  const [resources, setResources] = useState<ClassResource[]>([]);

  // Fetch Video (ONLY if NOT locked)
  useEffect(() => {
    if (isLocked) {
      setLoadingVideo(false);
      setVideoUrl(null);
      return;
    }

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
  }, [currentClass.id, isLocked]);

  // Fetch Resources (class_resources)
  useEffect(() => {
    let isCancelled = false;
    async function fetchResources() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('class_resources')
          .select('*')
          .eq('class_id', currentClass.id)
          .order('sort_order', { ascending: true });

        if (!isCancelled && !error && data) {
          setResources(data);
        }
      } catch (err) {
        console.error('Error fetching class resources:', err);
      }
    }

    fetchResources();
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded-md font-extrabold text-xs inline-block">
            ক্লাস {classNumDisplay}
          </span>
          {isClassFree ? (
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-bold text-xs inline-block">
              ফ্রি ক্লাস
            </span>
          ) : (
            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded-md font-bold text-xs inline-block">
              প্রিমিয়াম ক্লাস
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentClass.title}
        </h1>
      </div>

      {/* Embedded 16:9 Player Area OR Locked Box */}
      {isLocked ? (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-xl flex items-center justify-center p-6 text-center">
          {/* Background thumbnail */}
          {currentClass.thumbnail_url ? (
            <img
              src={currentClass.thumbnail_url}
              alt={currentClass.title}
              className="absolute inset-0 w-full h-full object-cover filter blur-xs brightness-30"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-amber-950 opacity-90" />
          )}

          {/* Locked Box Content */}
          <div className="relative z-10 max-w-md mx-auto space-y-4 text-white">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto shadow-lg">
              <Lock size={28} />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                🔒 এই ক্লাসটি প্রিমিয়াম মেম্বারদের জন্য।
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                প্রিমিয়াম অ্যাক্সেস পেতে যোগাযোগ করুন:
              </p>
            </div>

            {/* Contact Details */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              {settings.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors"
                >
                  <Phone size={14} className="text-amber-400" />
                  <span>{settings.contact_phone}</span>
                </a>
              )}
              {settings.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition-colors"
                >
                  <Mail size={14} className="text-amber-400" />
                  <span>{settings.contact_email}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      ) : loadingVideo ? (
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

      {/* Resources / Worksheets Card (Below video, after description - hidden if empty) */}
      {resources.length > 0 && (
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <FileText size={18} className="text-orange-500" />
            <h2 className="text-sm font-extrabold text-slate-900">
              রিসোর্স / ওয়ার্কশিট
            </h2>
          </div>

          <div className="divide-y divide-slate-100">
            {resources.map((res) => (
              <div
                key={res.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                    {res.title}
                  </span>
                </div>

                <a
                  href={res.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-2xs transition-all shrink-0 cursor-pointer"
                >
                  <Download size={13} />
                  <span>ডাউনলোড</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
