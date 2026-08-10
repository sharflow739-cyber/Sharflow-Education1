import React, { useState, useEffect } from 'react';
import { ClassItem, UserProgress } from '../types';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, CheckCircle2, Play, Sparkles, Award, 
  RotateCcw, HelpCircle, Volume2, VolumeX, Check, ChevronRight, Eye, ShieldAlert
} from 'lucide-react';

interface Class02PracticalViewProps {
  currentClass: ClassItem;
  allClasses: ClassItem[];
  userProgressMap: Record<string, UserProgress>;
  onCompleteClass: (classId: string, homeworkAnswer?: string) => void;
  onNavigateToClass: (classId: string) => void;
  onBackToDashboard: () => void;
}

interface RodState {
  upperBead: boolean; // false = up (val 0), true = down against beam (val 5)
  lowerBeads: number; // 0 to 4 beads pushed up against beam
}

export const Class02PracticalView: React.FC<Class02PracticalViewProps> = ({
  currentClass,
  allClasses,
  userProgressMap,
  onCompleteClass,
  onNavigateToClass,
  onBackToDashboard,
}) => {
  const isCompleted = Boolean(userProgressMap[currentClass.id]?.is_completed);

  // 5 Rods for Japanese Soroban: Ten-Thousands (10K), Thousands (1K), Hundreds (100), Tens (10), Units (1)
  const rodNames = ['ওজুথ (10K)', 'হাজার (1K)', 'শতক (100)', 'দশক (10)', 'একক (1)'];
  const rodMultipliers = [10000, 1000, 100, 10, 1];

  const [rods, setRods] = useState<RodState[]>([
    { upperBead: false, lowerBeads: 0 },
    { upperBead: false, lowerBeads: 0 },
    { upperBead: false, lowerBeads: 0 },
    { upperBead: false, lowerBeads: 0 },
    { upperBead: false, lowerBeads: 0 },
  ]);

  const [soundEnabled, setSoundEnabled] = useState(true);

  // PRACTICE MODE SEQUENCE (Req 7)
  const practiceSequence = [1, 3, 5, 7, 9, 2, 4, 6, 8, 10];
  const [practiceIndex, setPracticeIndex] = useState(0);
  const targetNumber = practiceSequence[practiceIndex];
  const [practiceCompleted, setPracticeCompleted] = useState<boolean[]>(
    new Array(practiceSequence.length).fill(false)
  );

  // GUIDED MODE DEMONSTRATION STATE (Req 8)
  const [guidedStep, setGuidedStep] = useState<'intro' | 'make5' | 'make3' | 'make7'>('make5');

  // PRACTICE TASK STATE (Req 10): 3, 5, 7, 9, 12
  const practiceTasks = [3, 5, 7, 9, 12];
  const [taskStatus, setTaskStatus] = useState<Record<number, 'correct' | 'incorrect' | 'pending'>>({});

  // Audio click feedback
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio fallback
    }
  };

  // Convert number to Bengali digits
  const toBengaliNumerals = (num: number): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bengaliDigits[parseInt(d, 10)] || d).join('');
  };

  // Calculate current total value
  const currentValue = rods.reduce((acc, rod, idx) => {
    const rodVal = (rod.upperBead ? 5 : 0) + rod.lowerBeads;
    return acc + rodVal * rodMultipliers[idx];
  }, 0);

  // Check Practice Mode Auto-Success
  useEffect(() => {
    if (currentValue === targetNumber && !practiceCompleted[practiceIndex]) {
      // Mark current sequence item as completed
      const updated = [...practiceCompleted];
      updated[practiceIndex] = true;
      setPracticeCompleted(updated);

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#f97316', '#10b981', '#f59e0b'],
      });
    }
  }, [currentValue, targetNumber, practiceIndex]);

  const resetAbacus = () => {
    setRods([
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
    ]);
    playClickSound();
  };

  const toggleUpperBead = (rodIndex: number) => {
    playClickSound();
    setRods((prev) => {
      const next = [...prev];
      next[rodIndex] = {
        ...next[rodIndex],
        upperBead: !next[rodIndex].upperBead,
      };
      return next;
    });
  };

  const setLowerBeadsCount = (rodIndex: number, count: number) => {
    playClickSound();
    setRods((prev) => {
      const next = [...prev];
      const newCount = next[rodIndex].lowerBeads === count ? 0 : count;
      next[rodIndex] = {
        ...next[rodIndex],
        lowerBeads: newCount,
      };
      return next;
    });
  };

  // Set abacus to specific value for demo / tasks
  const setAbacusToValue = (val: number) => {
    resetAbacus();
    let rem = val;
    const newRods: RodState[] = [
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
      { upperBead: false, lowerBeads: 0 },
    ];

    for (let i = 0; i < rodMultipliers.length; i++) {
      const mult = rodMultipliers[i];
      const rodDigit = Math.floor(rem / mult);
      rem %= mult;

      if (rodDigit >= 5) {
        newRods[i].upperBead = true;
        newRods[i].lowerBeads = rodDigit - 5;
      } else {
        newRods[i].upperBead = false;
        newRods[i].lowerBeads = rodDigit;
      }
    }
    setRods(newRods);
    playClickSound();
  };

  // Verify task (Req 10)
  const handleVerifyTask = (taskNum: number) => {
    if (currentValue === taskNum) {
      setTaskStatus((prev) => ({ ...prev, [taskNum]: 'correct' }));
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
    } else {
      setTaskStatus((prev) => ({ ...prev, [taskNum]: 'incorrect' }));
    }
  };

  // Complete Class (Req 11)
  const handleCompleteClassClick = () => {
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f97316', '#f59e0b', '#10b981', '#3b82f6'],
    });
    onCompleteClass(currentClass.id, 'ক্লাস ০২ সোবান প্র্যাকটিক্যাল সিমুলেটর অনুশীলন সম্পন্ন।');
  };

  // Embed URL helper
  const getEmbedUrl = (youtubeId: string) => {
    let cleanId = youtubeId.trim();
    if (cleanId.includes('v=')) {
      cleanId = cleanId.split('v=')[1]?.split('&')[0] || cleanId;
    } else if (cleanId.includes('youtu.be/')) {
      cleanId = cleanId.split('youtu.be/')[1]?.split('?')[0] || cleanId;
    }
    return `https://www.youtube-nocookie.com/embed/${cleanId}?rel=0&modestbranding=1&controls=1&showinfo=0`;
  };

  const nextClass = allClasses.find((c) => c.class_number === currentClass.class_number + 1);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-fade-in">
      
      {/* Top Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-orange-600 bg-white border border-slate-200 hover:border-orange-200 px-3 py-2 rounded-xl transition-all shadow-2xs"
        >
          <ArrowLeft size={16} />
          ড্যাশবোর্ডে ফিরে যান
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <span>{currentClass.module_name || 'মডিউল ১: মৌলিক ধারণা'}</span>
          <span>•</span>
          <span className="text-orange-600">ক্লাস ০২</span>
        </div>
      </div>

      {/* REQ 5: TITLE & SHORT INTRO */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-extrabold text-xs">
            ক্লাস ০২: প্র্যাকটিক্যাল লেসন
          </span>

          {isCompleted && (
            <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-xs flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-600" />
              সম্পন্ন (Completed)
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          ক্লাস ০২: অ্যাবাকাসের সাথে প্রথম পরিচয়
        </h1>

        <p className="text-sm sm:text-base text-slate-700 leading-relaxed bg-orange-50/80 p-4 rounded-2xl border border-orange-200/60 font-medium">
          আজ আমরা অ্যাবাকাস হাতে নিয়ে এর গঠন বুঝব এবং পুঁতি কীভাবে নড়াচড়া করে তা অনুশীলন করব।
        </p>
      </div>

      {/* REQ 5: 🎥 আজকের ভিডিও SECTION */}
      <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 space-y-0">
        <div className="bg-slate-950 px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Play size={16} className="text-orange-500 fill-orange-500" />
            <span>🎥 আজকের ভিডিও (Video Lesson)</span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldAlert size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Unlisted Class Stream</span>
          </div>
        </div>

        {/* Embedded YouTube Video Player */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={getEmbedUrl(currentClass.youtube_video_id || 'd9L4v0z5X_c')}
            title="ক্লাস ০২: অ্যাবাকাসের সাথে প্রথম পরিচয়"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* REQUIRED Note under video */}
        <div className="p-4 bg-orange-950/60 border-t border-orange-900/50 text-center">
          <p className="text-sm font-bold text-orange-200">
            "ভিডিওটি দেখার পর নিচের Practical অংশটি করুন।"
          </p>
        </div>
      </div>

      {/* REQ 8: GUIDED DEMONSTRATION MODE */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 sm:p-8 border border-amber-200 shadow-sm space-y-5">
        <div className="flex items-center gap-3 border-b border-amber-200/80 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-xl shadow-md">
            💡
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              গাইডেড ডেমোনস্ট্রেশন (Guided Demonstration)
            </h2>
            <p className="text-xs text-slate-600 font-medium">
              অ্যাঙ্কর্ড ভিউয়ালের মাধ্যমে কীভাবে বিড সরিয়ে সংখ্যা বানাতে হয় দেখুন
            </p>
          </div>
        </div>

        {/* Guided Step Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setGuidedStep('make5'); setAbacusToValue(5); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              guidedStep === 'make5'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-orange-100 border border-slate-200'
            }`}
          >
            ৫ কীভাবে বানাব? (How to make 5)
          </button>

          <button
            onClick={() => { setGuidedStep('make3'); setAbacusToValue(3); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              guidedStep === 'make3'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-orange-100 border border-slate-200'
            }`}
          >
            ৩ কীভাবে বানাব? (How to make 3)
          </button>

          <button
            onClick={() => { setGuidedStep('make7'); setAbacusToValue(7); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              guidedStep === 'make7'
                ? 'bg-orange-600 text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-orange-100 border border-slate-200'
            }`}
          >
            ৭ কীভাবে বানাব? (How to make 7)
          </button>
        </div>

        {/* Demonstration Content Box */}
        {guidedStep === 'make5' && (
          <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-orange-700 text-base">
              "৫ কীভাবে বানাব?"
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">১</span>
                <span>এককের রডে (Units rod) <strong>উপরের বিড (Heaven Bead)</strong>-কে বিমের দিকে নিচে নামান।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">২</span>
                <span>স্মরণ রাখুন: বিম স্পর্শ করা <strong>উপরের প্রতিটি বিডের মান হলো ৫</strong>।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <span className="text-emerald-800 font-bold">ফলাফল তৈরি হলো: ৫ (5)</span>
              </li>
            </ul>
          </div>
        )}

        {guidedStep === 'make3' && (
          <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-orange-700 text-base">
              "৩ কীভাবে বানাব?"
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">১</span>
                <span>এককের রডে বুড়ো আঙুল (Thumb) ব্যবহার করে <strong>নিচের ৩টি বিড (Earth Beads)</strong> বিমের দিকে উপরে তুলুন।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">২</span>
                <span>প্রতিটি নিচের বিডের মান ১, তাই ৩টি বিড তুলে গঠিত হলো ৩।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <span className="text-emerald-800 font-bold">ফলাফল তৈরি হলো: ৩ (3)</span>
              </li>
            </ul>
          </div>
        )}

        {guidedStep === 'make7' && (
          <div className="bg-white p-5 rounded-2xl border border-orange-200 shadow-2xs space-y-3">
            <h3 className="font-extrabold text-orange-700 text-base">
              "৭ কীভাবে বানাব?"
            </h3>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed font-medium">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">১</span>
                <span>এককের রডে উপরের ১টি বিড নিচে নামান (মান ৫)।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 font-bold flex items-center justify-center shrink-0 text-[11px]">২</span>
                <span>একই রডে নিচের ২টি বিড উপরে তুলুন (মান ২)।</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">✓</span>
                <span className="text-emerald-800 font-bold">ফলাফল তৈরি হলো: ৫ + ২ = ৭ (7)</span>
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* REQ 6: PRACTICAL ABACUS SIMULATOR */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-6">
        
        {/* Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-xl font-black text-slate-900">
                ইন্টারেক্টিভ সোবান অ্যাবাকাস সিমুলেটর
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              মাউস বা টাচ দিয়ে বিডগুলো নড়িয়ে সংখ্যা তৈরি করার অনুশীলন করুন
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 text-slate-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors text-xs flex items-center gap-1 border border-slate-200"
              title={soundEnabled ? 'সাউন্ড মিউট' : 'সাউন্ড অন'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              onClick={resetAbacus}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-slate-300"
            >
              <RotateCcw size={16} />
              রিসেট (Clear)
            </button>
          </div>
        </div>

        {/* PROMINENT NUMBER DISPLAY ABOVE SIMULATOR (Req 6) */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-6 text-white text-center shadow-md space-y-1">
          <span className="text-xs font-extrabold uppercase tracking-widest text-orange-100">
            অ্যাবাকাসে গঠিত বর্তমান সংখ্যা
          </span>
          <div className="text-5xl sm:text-6xl font-black tracking-tight drop-shadow-md">
            {toBengaliNumerals(currentValue)}
          </div>
          <span className="text-xs font-semibold text-orange-100">
            ({currentValue})
          </span>
        </div>

        {/* REQ 7: PRACTICE MODE (🎯 তৈরি করুন: X) */}
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-xl shadow-sm">
              🎯
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900 block">অনুশীলন চ্যালেঞ্জ (Practice Mode)</span>
              <div className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>তৈরি করুন:</span>
                <span className="text-2xl text-orange-600 font-black">
                  {toBengaliNumerals(targetNumber)}
                </span>
                <span className="text-sm text-slate-500">({targetNumber})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentValue === targetNumber ? (
              <div className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-extrabold text-sm shadow-md animate-bounce flex items-center gap-1.5">
                <Check size={18} />
                <span>✓ সঠিক!</span>
              </div>
            ) : (
              <span className="text-xs text-amber-800 font-medium bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200">
                বিড সরিয়ে {toBengaliNumerals(targetNumber)} তৈরি করুন
              </span>
            )}

            <button
              onClick={() => setPracticeIndex((prev) => (prev + 1) % practiceSequence.length)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 shadow-2xs transition-all"
            >
              পরবর্তী সংখ্যা →
            </button>
          </div>
        </div>

        {/* PHYSICAL JAPANESE SOROBAN FRAME */}
        <div className="relative bg-slate-900 p-4 sm:p-6 rounded-3xl border-8 border-amber-900 shadow-2xl overflow-x-auto">
          <div className="min-w-[340px] bg-amber-950 p-3 rounded-2xl border border-amber-800 shadow-inner">
            
            {/* Horizontal Dividing Beam */}
            <div className="absolute left-0 right-0 top-[38%] h-4 bg-amber-200 border-y-2 border-amber-400 z-10 shadow-md flex items-center justify-around">
              {rods.map((_, i) => (
                <div key={`dot-${i}`} className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner" />
              ))}
            </div>

            {/* Rods Grid */}
            <div className="grid grid-cols-5 gap-3 pt-2 pb-2 text-center">
              {rods.map((rod, rodIdx) => {
                const rodVal = (rod.upperBead ? 5 : 0) + rod.lowerBeads;

                return (
                  <div key={`rod-${rodIdx}`} className="flex flex-col items-center relative group">
                    {/* Rod Label */}
                    <span className="text-[11px] font-extrabold text-amber-200 mb-1 tracking-tight">
                      {rodNames[rodIdx]}
                    </span>

                    {/* Vertical Steel Rod Line */}
                    <div className="absolute top-7 bottom-8 w-1.5 bg-slate-300 z-0 shadow-sm rounded-full" />

                    {/* Upper Deck (Heaven Bead = Val 5) */}
                    <div className="h-20 w-full flex flex-col justify-between items-center z-20 py-1">
                      <button
                        onClick={() => toggleUpperBead(rodIdx)}
                        className={`w-12 h-7 rounded-lg border-2 transition-all duration-200 shadow-md flex items-center justify-center font-black text-xs cursor-pointer ${
                          rod.upperBead
                            ? 'mt-auto bg-amber-500 border-amber-200 text-white shadow-orange-500/60 scale-105'
                            : 'mb-auto bg-amber-700/90 border-amber-500 text-amber-100 hover:bg-amber-600'
                        }`}
                        title={`Upper Bead (5 x ${rodMultipliers[rodIdx]})`}
                      >
                        ৫
                      </button>
                    </div>

                    {/* Beam Gap */}
                    <div className="h-5 z-20" />

                    {/* Lower Deck (Earth Beads = Val 1 each, 4 beads total) */}
                    <div className="h-32 w-full flex flex-col justify-end items-center z-20 gap-1.5 pb-1">
                      {[1, 2, 3, 4].map((beadNum) => {
                        const isUpAgainstBeam = beadNum <= rod.lowerBeads;

                        return (
                          <button
                            key={`lower-${rodIdx}-${beadNum}`}
                            onClick={() => setLowerBeadsCount(rodIdx, beadNum)}
                            className={`w-12 h-6 rounded-lg border transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center text-xs font-black ${
                              isUpAgainstBeam
                                ? 'bg-orange-500 border-orange-200 text-white shadow-orange-500/50'
                                : 'bg-amber-800/90 border-amber-600 text-amber-200 hover:bg-amber-700'
                            }`}
                            style={{
                              transform: isUpAgainstBeam ? 'translateY(-14px)' : 'translateY(0px)',
                            }}
                          >
                            ১
                          </button>
                        );
                      })}
                    </div>

                    {/* Individual Rod Value Footer */}
                    <div className="mt-2 bg-slate-800 text-amber-300 px-2.5 py-1 rounded-lg text-xs font-black border border-slate-700 shadow-inner">
                      {toBengaliNumerals(rodVal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* REQ 9: LEARNING POINTS ("আজ যা শিখলাম") */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Award size={20} className="text-orange-500" />
          আজ যা শিখলাম:
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-slate-800">
          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
            <span>Soroban-এর গঠন (Frame, Beam, Rods)</span>
          </div>

          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
            <span>উপরের পুঁতির মান ৫</span>
          </div>

          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
            <span>নিচের প্রতিটি পুঁতির মান ১</span>
          </div>

          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
            <span>পুঁতি সরিয়ে সংখ্যা তৈরি করা</span>
          </div>

          <div className="p-3.5 bg-emerald-50/80 sm:col-span-2 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs shrink-0">✓</span>
            <span>সংখ্যা দেখে আবার Abacus-এ তৈরি করা</span>
          </div>
        </div>
      </div>

      {/* REQ 10: PRACTICE TASK ("📝 আজকের অনুশীলন") */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            📝 আজকের অনুশীলন
          </h2>
          <p className="text-xs text-slate-600 font-medium mt-1">
            অ্যাবাকাসে নিচের সংখ্যাগুলো তৈরি করো: <strong>৩, ৫, ৭, ৯, ১২</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {practiceTasks.map((taskNum) => {
            const status = taskStatus[taskNum];

            return (
              <div
                key={`task-${taskNum}`}
                className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">টাস্ক সংখ্যা</span>
                  <div className="text-3xl font-black text-orange-600">
                    {toBengaliNumerals(taskNum)} <span className="text-sm font-bold text-slate-400">({taskNum})</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => handleVerifyTask(taskNum)}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all active:scale-95"
                  >
                    যাচাই করুন (Verify)
                  </button>

                  {status === 'correct' && (
                    <div className="p-2 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg text-center flex items-center justify-center gap-1">
                      <Check size={16} />
                      <span>✓ সঠিক উত্তর</span>
                    </div>
                  )}

                  {status === 'incorrect' && (
                    <div className="p-2 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg text-center">
                      আবার চেষ্টা করুন (বর্তমানে: {currentValue})
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* REQ 11: CLASS COMPLETION CARD */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <Sparkles size={24} className="text-amber-200" />
            আজকের Practical শেষ হলে Class Complete চাপুন।
          </h2>
          <p className="text-xs sm:text-sm text-orange-100 mt-1">
            ক্লাস সম্পন্ন করলে আপনার অগ্রগতি সংরক্ষিত হবে এবং পরবর্তী ক্লাস ৩ আনলক হবে।
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCompleteClassClick}
            className={`px-6 py-4 rounded-2xl font-black text-sm shadow-lg transition-all flex items-center gap-2 ${
              isCompleted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white text-orange-600 hover:bg-orange-50 active:scale-95'
            }`}
          >
            <CheckCircle2 size={20} />
            ✓ ক্লাস সম্পন্ন করুন
          </button>

          {nextClass && (
            <button
              onClick={() => onNavigateToClass(nextClass.id)}
              className="px-5 py-4 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-2xl border border-white/30 transition-colors flex items-center gap-1.5"
            >
              <span>পরবর্তী ক্লাস</span>
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
