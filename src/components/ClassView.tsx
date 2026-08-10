import React, { useState } from 'react';
import { ClassItem, UserProgress, HomeworkSubmission } from '../types';
import { VirtualAbacus } from './VirtualAbacus';
import { Class02PracticalView } from './Class02PracticalView';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, CheckCircle2, Lock, Play, BookOpen, 
  Send, ShieldAlert, Sparkles, CheckSquare, ChevronRight, Award
} from 'lucide-react';

interface ClassViewProps {
  currentClass: ClassItem;
  allClasses: ClassItem[];
  userProgressMap: Record<string, UserProgress>;
  onCompleteClass: (classId: string, homeworkAnswer?: string) => void;
  onNavigateToClass: (classId: string) => void;
  onBackToDashboard: () => void;
}

export const ClassView: React.FC<ClassViewProps> = ({
  currentClass,
  allClasses,
  userProgressMap,
  onCompleteClass,
  onNavigateToClass,
  onBackToDashboard,
}) => {
  // Dedicated Practical view for Class 02
  if (currentClass.class_number === 2 || currentClass.id === 'class-02') {
    return (
      <Class02PracticalView
        currentClass={currentClass}
        allClasses={allClasses}
        userProgressMap={userProgressMap}
        onCompleteClass={onCompleteClass}
        onNavigateToClass={onNavigateToClass}
        onBackToDashboard={onBackToDashboard}
      />
    );
  }
  const isCompleted = Boolean(userProgressMap[currentClass.id]?.is_completed);
  
  const [homeworkText, setHomeworkText] = useState(
    userProgressMap[currentClass.id]?.homework_submission || ''
  );
  const [homeworkSubmitted, setHomeworkSubmitted] = useState(
    Boolean(userProgressMap[currentClass.id]?.homework_submission)
  );
  const [practiceChecked, setPracticeChecked] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'video' | 'practice' | 'homework'>('video');

  // Trigger celebration animation on class completion
  const handleComplete = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#f97316', '#f59e0b', '#10b981', '#3b82f6'],
    });

    onCompleteClass(currentClass.id, homeworkText);
  };

  const handlePracticeToggle = (index: number) => {
    setPracticeChecked((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkText.trim()) return;
    setHomeworkSubmitted(true);
    onCompleteClass(currentClass.id, homeworkText);
  };

  // Find next class in sequence
  const nextClass = allClasses.find((c) => c.class_number === currentClass.class_number + 1);

  // Convert YouTube ID / URL to embed URL safely
  const getEmbedUrl = (youtubeId: string) => {
    let cleanId = youtubeId.trim();
    if (cleanId.includes('v=')) {
      cleanId = cleanId.split('v=')[1]?.split('&')[0] || cleanId;
    } else if (cleanId.includes('youtu.be/')) {
      cleanId = cleanId.split('youtu.be/')[1]?.split('?')[0] || cleanId;
    }
    return `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&controls=1&showinfo=0`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft size={16} />
          ড্যাশবোর্ডে ফিরে যান (Back to Dashboard)
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>{currentClass.module_name}</span>
          <span>•</span>
          <span className="text-orange-600">ক্লাস ০{currentClass.class_number}</span>
        </div>
      </div>

      {/* Main Class Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-bold text-xs">
              ক্লাস ০{currentClass.class_number}
            </span>
            {isCompleted && (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1">
                <CheckCircle2 size={14} className="text-emerald-600" />
                সম্পন্ন (Completed)
              </span>
            )}
          </div>

          <div className="text-xs font-semibold text-slate-500">
            আনুমানিক সময়: {currentClass.duration_minutes} মিনিট
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {currentClass.title}
        </h1>

        <p className="text-sm text-slate-600 leading-relaxed max-w-4xl bg-orange-50/50 p-3.5 rounded-xl border border-orange-100/60">
          <strong className="text-orange-800 font-bold block mb-1">সংক্ষিপ্ত পরিচিতি:</strong>
          {currentClass.short_intro}
        </p>
      </div>

      {/* Embedded Video Section */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
        
        {/* Embedded Player Header */}
        <div className="bg-slate-950 px-4 py-3 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Play size={14} className="text-orange-500 fill-orange-500" />
            <span>অফিসিয়াল ট্রেনিং ভিডিও প্লেয়ার</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldAlert size={13} className="text-amber-400" />
            <span className="hidden sm:inline">YouTube Unlisted Protected Stream</span>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={getEmbedUrl(currentClass.youtube_video_id)}
            title={currentClass.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video Footer Protection Note */}
        <div className="p-3 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between gap-2 border-t border-slate-800">
          <span>
            নিরাপত্তা নির্দেশিকা: ভিডিওটি শুধুমাত্র আপনার অভিভাবক একাউন্টের জন্য অনুমোদিত।
          </span>
          <span className="text-orange-400 font-bold hidden sm:inline">
            Abacus Parent Portal
          </span>
        </div>
      </div>

      {/* Tabs for Practice Tool, Instructions, and Homework */}
      <div className="space-y-4">
        
        {/* Tab Headers */}
        <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-xl p-1.5 border shadow-2xs gap-1">
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'video'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <BookOpen size={16} />
            অনুশীলন ও ওয়ার্কস্পেস (Practice Tool)
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'practice'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CheckSquare size={16} />
            অনুশীলনের ধাপ ({currentClass.practice_instructions.length}টি)
          </button>

          <button
            onClick={() => setActiveTab('homework')}
            className={`flex-1 min-w-[120px] py-2.5 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'homework'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Award size={16} />
            হোমওয়ার্ক জমা (Homework)
          </button>
        </div>

        {/* TAB 1: INTERACTIVE ABACUS WORKSPACE */}
        {activeTab === 'video' && (
          <div className="space-y-4 animate-fade-in">
            <VirtualAbacus />
          </div>
        )}

        {/* TAB 2: STEP-BY-STEP PRACTICE CHECKLIST */}
        {activeTab === 'practice' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CheckSquare size={18} className="text-orange-500" />
                ক্লাসের অনুশীলনের দিকনির্দেশনা (Practice Checkpoints)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ভিডিও দেখার পাশাপাশি সন্তানকে সাথে নিয়ে নিচের ধাপগুলো অনুসরণ করে প্র্যাকটিস করুন:
              </p>
            </div>

            <div className="space-y-2.5">
              {currentClass.practice_instructions.map((inst, idx) => (
                <label
                  key={idx}
                  onClick={() => handlePracticeToggle(idx)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                    practiceChecked[idx]
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                      : 'bg-slate-50/80 border-slate-200 text-slate-700 hover:bg-orange-50/40 hover:border-orange-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={Boolean(practiceChecked[idx])}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded text-orange-600 focus:ring-orange-500 border-slate-300"
                  />
                  <span className="text-xs font-medium leading-relaxed flex-1">
                    {inst}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: HOMEWORK SUBMISSION */}
        {activeTab === 'homework' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <span className="px-2.5 py-0.5 bg-orange-100 text-orange-800 rounded text-[11px] font-bold">
                হোমওয়ার্ক টাস্ক
              </span>
              <h3 className="font-bold text-slate-800 text-lg mt-1">
                {currentClass.homework_title}
              </h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-amber-50 p-3 rounded-lg border border-amber-200">
                {currentClass.homework_instructions}
              </p>
            </div>

            <form onSubmit={handleHomeworkSubmit} className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                আপনার উত্তর বা অভিজ্ঞতার উত্তরপত্র (Your Answer/Notes):
              </label>
              
              <textarea
                rows={4}
                value={homeworkText}
                onChange={(e) => setHomeworkText(e.target.value)}
                placeholder="এখানে উত্তর টাইপ করুন (যেমন: সন্তান কোন রডে বিড বসাতে পেরেছে, ফলাফল ইত্যাদি)..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
              />

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {homeworkSubmitted ? '✓ আপনার উত্তর সংরক্ষণ করা হয়েছে।' : 'হোমওয়ার্ক জমা দিলে টিচার প্যানেলে আপডেট হবে।'}
                </span>

                <button
                  type="submit"
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Send size={14} />
                  হোমওয়ার্ক জমা দিন
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Completion Action Card Footer */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-extrabold text-xl flex items-center gap-2">
            <Sparkles size={22} className="text-amber-200" />
            {isCompleted ? 'আপনি এই ক্লাসটি সম্পন্ন করেছেন!' : 'ক্লাস সম্পন্ন করেছেন?'}
          </h3>
          <p className="text-xs text-orange-100 mt-1">
            {isCompleted
              ? 'পরবর্তী ক্লাসটি আপনার জন্য সম্পূর্ণ আনলক করা হয়েছে।'
              : 'ক্লাস সম্পন্ন করুন বোতামে ক্লিক করলে আপনার কোর্স অগ্রগতি বৃদ্ধি পাবে এবং পরের ক্লাস আনলক হবে।'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleComplete}
            className={`px-5 py-3 rounded-xl font-extrabold text-xs shadow-md transition-all flex items-center gap-2 ${
              isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white text-orange-600 hover:bg-orange-50 active:scale-95'
            }`}
          >
            <CheckCircle2 size={18} />
            {isCompleted ? 'পুনরায় সম্পন্ন হিসেবে চিহ্নিত করুন' : 'ক্লাস সম্পন্ন করুন (Complete Class)'}
          </button>

          {nextClass && (
            <button
              onClick={() => onNavigateToClass(nextClass.id)}
              className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl border border-white/30 transition-colors flex items-center gap-1.5"
            >
              <span>পরবর্তী ক্লাস</span>
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
