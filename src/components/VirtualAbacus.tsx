import React, { useState } from 'react';
import { RotateCcw, HelpCircle, Award, Volume2, VolumeX } from 'lucide-react';

interface RodState {
  upperBead: boolean; // false = up (val 0), true = down against beam (val 5)
  lowerBeads: number; // 0 to 4 beads pushed up against beam
}

export const VirtualAbacus: React.FC = () => {
  // 5 Rods: Ten-Thousands (10,000s), Thousands (1,000s), Hundreds (100s), Tens (10s), Units (1s)
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
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [challengeMessage, setChallengeMessage] = useState<string | null>(null);

  // Play subtle audio click feedback using Web Audio API
  const playClickSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // Audio context fallback
    }
  };

  // Calculate current total numeric value
  const currentValue = rods.reduce((acc, rod, idx) => {
    const rodVal = (rod.upperBead ? 5 : 0) + rod.lowerBeads;
    return acc + rodVal * rodMultipliers[idx];
  }, 0);

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
      // If clicking the current count, reset to 0; else set to count
      const newCount = next[rodIndex].lowerBeads === count ? 0 : count;
      next[rodIndex] = {
        ...next[rodIndex],
        lowerBeads: newCount,
      };
      return next;
    });
  };

  // Generate random target challenge
  const startChallenge = () => {
    const targets = [3, 7, 12, 25, 49, 78, 105, 342, 589];
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];
    setTargetNumber(randomTarget);
    setChallengeMessage(`অ্যাবাকাসে ${randomTarget} সংখ্যাটি তৈরি করুন!`);
    resetAbacus();
  };

  const checkChallenge = () => {
    if (targetNumber === null) return;
    if (currentValue === targetNumber) {
      setChallengeMessage(`অভিনন্দন! 🎉 আপনি সঠিকভাবে ${targetNumber} তৈরি করেছেন!`);
      setTargetNumber(null);
    } else {
      setChallengeMessage(`চেষ্টা করুন! বর্তমানে গঠিত সংখ্যা ${currentValue}, আপনার লক্ষ্য ছিল ${targetNumber}।`);
    }
  };

  // Format number to Bengali numerals
  const toBengaliNumerals = (num: number): string => {
    const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bengaliDigits[parseInt(d, 10)] || d).join('');
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/60 rounded-2xl border border-orange-200/80 p-5 shadow-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-orange-200/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            অ
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-base leading-snug">
              ভার্চুয়াল সোবান অ্যাবাকাস (Interactive Abacus Tool)
            </h3>
            <p className="text-xs text-slate-500">
              মাউস বা টাচ দিয়ে বিড নাড়িয়ে প্র্যাকটিস করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-600 hover:text-orange-600 hover:bg-orange-100 rounded-lg transition-colors text-xs flex items-center gap-1"
            title={soundEnabled ? 'শব্দ বন্ধ করুন' : 'শব্দ চালু করুন'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          
          <button
            onClick={resetAbacus}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:border-orange-300 text-slate-700 hover:text-orange-600 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <RotateCcw size={14} />
            রিসেট (Reset)
          </button>
        </div>
      </div>

      {/* Value Display Banner */}
      <div className="bg-white rounded-xl p-4 border border-orange-100 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">বর্তমান গঠিত সংখ্যা (Current Value)</span>
          <div className="text-3xl font-extrabold text-orange-600 tracking-tight flex items-baseline gap-2">
            <span>{toBengaliNumerals(currentValue)}</span>
            <span className="text-sm font-semibold text-slate-400">({currentValue})</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={startChallenge}
            className="px-3.5 py-2 bg-orange-100 hover:bg-orange-200 text-orange-800 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <Award size={16} className="text-orange-600" />
            অনুশীলন চ্যালেঞ্জ (Practice Game)
          </button>
        </div>
      </div>

      {challengeMessage && (
        <div className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 ${
          challengeMessage.includes('অভিনন্দন') 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
            : 'bg-amber-100 text-amber-900 border border-amber-200'
        }`}>
          <span>{challengeMessage}</span>
          {targetNumber !== null && (
            <button
              onClick={checkChallenge}
              className="px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-800 rounded text-xs font-bold border border-slate-200 shadow-2xs"
            >
              যাচাই করুন
            </button>
          )}
        </div>
      )}

      {/* Main Abacus Physical Frame Graphic */}
      <div className="relative bg-slate-900 p-4 rounded-xl border-4 border-amber-800 shadow-lg overflow-x-auto">
        {/* Outer Wooden Bezel */}
        <div className="min-w-[320px] bg-amber-950 p-2 rounded-lg border border-amber-700/60 shadow-inner">
          
          {/* Beam (Horizontal separator rod) */}
          <div className="absolute left-0 right-0 top-[38%] h-3 bg-amber-200 border-y border-amber-400 z-10 shadow-sm flex items-center justify-around">
            {/* Unit Dots on Beam */}
            {rods.map((_, i) => (
              <div key={`dot-${i}`} className="w-2 h-2 rounded-full bg-slate-800 shadow-inner" />
            ))}
          </div>

          {/* Rods Grid */}
          <div className="grid grid-cols-5 gap-3 pt-2 pb-2 text-center">
            {rods.map((rod, rodIdx) => {
              const rodVal = (rod.upperBead ? 5 : 0) + rod.lowerBeads;

              return (
                <div key={`rod-${rodIdx}`} className="flex flex-col items-center relative group">
                  {/* Rod Label */}
                  <span className="text-[10px] font-bold text-amber-200/80 mb-1 tracking-tighter">
                    {rodNames[rodIdx]}
                  </span>

                  {/* Vertical Steel Rod Line */}
                  <div className="absolute top-6 bottom-8 w-1 bg-slate-400 z-0 shadow-sm rounded-full" />

                  {/* Upper Deck (Heaven Bead = Val 5) */}
                  <div className="h-16 w-full flex flex-col justify-between items-center z-20 py-1">
                    <button
                      onClick={() => toggleUpperBead(rodIdx)}
                      className={`w-10 h-6 rounded-md border-2 transition-all duration-200 shadow-md flex items-center justify-center font-bold text-[10px] cursor-pointer ${
                        rod.upperBead
                          ? 'mt-auto bg-amber-500 border-amber-300 text-white shadow-orange-500/50 scale-105'
                          : 'mb-auto bg-amber-600/90 border-amber-400 text-amber-100 hover:bg-amber-500'
                      }`}
                      title={`Upper Bead (5 x ${rodMultipliers[rodIdx]})`}
                    >
                      ৫
                    </button>
                  </div>

                  {/* Beam Spacer Gap */}
                  <div className="h-4 z-20" />

                  {/* Lower Deck (Earth Beads = Val 1 each, 4 beads total) */}
                  <div className="h-28 w-full flex flex-col justify-end items-center z-20 gap-1 pb-1">
                    {[1, 2, 3, 4].map((beadNum) => {
                      const isUpAgainstBeam = beadNum <= rod.lowerBeads;

                      return (
                        <button
                          key={`lower-${rodIdx}-${beadNum}`}
                          onClick={() => setLowerBeadsCount(rodIdx, beadNum)}
                          className={`w-10 h-5 rounded-md border transition-all duration-150 shadow-sm cursor-pointer flex items-center justify-center text-[10px] font-bold ${
                            isUpAgainstBeam
                              ? 'bg-orange-500 border-orange-300 text-white shadow-orange-500/40'
                              : 'bg-amber-700/80 border-amber-500 text-amber-200 hover:bg-amber-600'
                          }`}
                          style={{
                            transform: isUpAgainstBeam ? 'translateY(-12px)' : 'translateY(0px)',
                          }}
                        >
                          ১
                        </button>
                      );
                    })}
                  </div>

                  {/* Individual Rod Value Footer */}
                  <div className="mt-2 bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-xs font-bold border border-slate-700">
                    {toBengaliNumerals(rodVal)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Guide Help Text */}
      <div className="flex items-start gap-2 bg-white/80 p-3 rounded-lg border border-orange-100 text-xs text-slate-600">
        <HelpCircle size={16} className="text-orange-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-800">ব্যবহার বিধি:</strong> উপরের ডেকের ১টি বিড নিচে নামালে তার মান ৫। নিচের ডেকের ৪টি বিড উপরে তুললে প্রতিটির মান ১। ডানদিকের প্রথম রডটি হলো এককের রড (Units)।
        </p>
      </div>
    </div>
  );
};
