import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export interface SorobanColumnState {
  heaven: boolean;
  earth: number; // 0..4 beads pushed up to the reckoning beam
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'] as const;

export function toBengaliDigits(value: number): string {
  return String(value)
    .split('')
    .map((ch) => {
      const code = ch.charCodeAt(0) - 48;
      return code >= 0 && code <= 9 ? BENGALI_DIGITS[code] : ch;
    })
    .join('');
}

export function computeSorobanColumnValue(col: SorobanColumnState): number {
  const clampedEarth = Math.max(0, Math.min(4, Math.floor(col.earth)));
  return (col.heaven ? 5 : 0) + clampedEarth;
}

export function computeSorobanTotal(columns: SorobanColumnState[]): number {
  return columns.reduce((sum, col, idx) => {
    const placeMultiplier = Math.pow(10, columns.length - 1 - idx);
    return sum + computeSorobanColumnValue(col) * placeMultiplier;
  }, 0);
}

export function toggleEarthBeadValue(currentEarth: number, beadIndex: number): number {
  const target = beadIndex + 1;
  return currentEarth >= target ? beadIndex : target;
}

// Initial state demonstrates 15 (Tens = 1, Ones = 5) so upper (5) & lower (1) bead values are clear immediately
const INITIAL_COLUMNS: SorobanColumnState[] = [
  { heaven: false, earth: 0 }, // শতক (Hundreds)
  { heaven: false, earth: 1 }, // দশক (Tens)
  { heaven: true, earth: 0 },  // একক (Ones)
];

const COLUMN_LABELS = ['শতক', 'দশক', 'একক'] as const;

export const SorobanMiniDemo: React.FC = () => {
  const [columns, setColumns] = useState<SorobanColumnState[]>(INITIAL_COLUMNS);

  const totalValue = computeSorobanTotal(columns);

  const handleToggleHeaven = (colIndex: number) => {
    setColumns((prev) =>
      prev.map((col, idx) => (idx === colIndex ? { ...col, heaven: !col.heaven } : col))
    );
  };

  const handleToggleEarth = (colIndex: number, beadIndex: number) => {
    setColumns((prev) =>
      prev.map((col, idx) =>
        idx === colIndex
          ? { ...col, earth: toggleEarthBeadValue(col.earth, beadIndex) }
          : col
      )
    );
  };

  const handleReset = () => {
    setColumns([
      { heaven: false, earth: 0 },
      { heaven: false, earth: 0 },
      { heaven: false, earth: 0 },
    ]);
  };

  return (
    <div className="rounded-xl bg-[#F4EFE2] border border-[#DFD2B0] p-3 space-y-2.5">
      {/* Live Calculated Readout & Reset */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="font-extrabold text-[#18191C] tabular-nums">
          <span>মোট মান: </span>
          <span className="text-sm text-[#785314]">
            {toBengaliDigits(totalValue)} ({totalValue})
          </span>
        </div>
        <button
          type="button"
          onClick={handleReset}
          aria-label="অ্যাবাকাস মান শূন্যে রিসেট করুন"
          className="px-2 py-1 rounded-lg bg-[#FFFDF9] hover:bg-[#EFE6D2] border border-[#D8CBAF] text-[#4F4B43] hover:text-[#18191C] font-bold text-[11px] inline-flex items-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324]"
        >
          <RotateCcw size={11} aria-hidden="true" />
          <span>রিসেট</span>
        </button>
      </div>

      {/* Tactile 3-Rod Soroban Frame */}
      <div
        role="group"
        aria-label="ইন্টারঅ্যাক্টিভ মিনি সোরোবান অ্যাবাকাস (পুঁতি ক্লিক করে মান পরিবর্তন করুন)"
        className="rounded-xl bg-[#18191C] border-2 border-[#3C382E] p-2.5 select-none shadow-inner"
      >
        <div className="grid grid-cols-3 gap-2">
          {columns.map((col, colIdx) => {
            const colLabel = COLUMN_LABELS[colIdx];
            const colDigit = computeSorobanColumnValue(col);

            return (
              <div key={colLabel} className="flex flex-col items-center">
                {/* Rod Frame */}
                <div className="relative w-full flex flex-col items-center bg-[#FAF7F0] rounded-lg border border-[#3C382E] overflow-hidden">
                  {/* Vertical Rod */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-y-0 w-1 bg-[#B39356]/70 rounded-full"
                  />

                  {/* Upper Heaven Section (Bead value = 5) */}
                  <div className="relative z-10 w-full h-12 flex flex-col justify-between items-center py-1 px-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleHeaven(colIdx)}
                      aria-pressed={col.heaven}
                      aria-label={`${colLabel} কলামের ৫ মানের পুঁতি (${col.heaven ? 'সক্রিয়' : 'নিষ্ক্রিয়'})`}
                      className={`w-10 sm:w-9 h-4 rounded-full border shadow-xs cursor-pointer transition-transform duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] ${
                        col.heaven
                          ? 'translate-y-5 bg-gradient-to-b from-[#ECCB7A] to-[#C69738] border-[#7D5714]'
                          : 'translate-y-0 bg-[#2A2B30] hover:bg-[#3A3B42] border-[#141517]'
                      }`}
                    />
                  </div>

                  {/* Reckoning Beam */}
                  <div
                    aria-hidden="true"
                    className="relative z-20 w-full h-1.5 bg-[#141517] border-y border-[#D4AF5F]/50"
                  />

                  {/* Lower Earth Section (4 beads, each value = 1) */}
                  <div className="relative z-10 w-full h-[84px] flex flex-col justify-end items-center py-1 px-1.5 gap-0.5">
                    {[0, 1, 2, 3].map((beadIdx) => {
                      const isActive = beadIdx < col.earth;
                      return (
                        <button
                          key={beadIdx}
                          type="button"
                          onClick={() => handleToggleEarth(colIdx, beadIdx)}
                          aria-pressed={isActive}
                          aria-label={`${colLabel} কলামের নিচের পুঁতি ${beadIdx + 1} (মান ১, ${isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'})`}
                          className={`w-10 sm:w-9 h-3.5 rounded-full border shadow-xs cursor-pointer transition-transform duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] ${
                            isActive
                              ? '-translate-y-3 bg-gradient-to-b from-[#ECCB7A] to-[#C69738] border-[#7D5714]'
                              : 'translate-y-0 bg-[#2A2B30] hover:bg-[#3A3B42] border-[#141517]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Column Place Label + Current Digit */}
                <div className="mt-1.5 text-center leading-tight tabular-nums">
                  <span className="block text-[10px] font-semibold text-[#D6CFC0]">
                    {colLabel}
                  </span>
                  <span className="block text-xs font-black text-[#E8C778]">
                    {toBengaliDigits(colDigit)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-[#4F4B43] font-medium text-center leading-snug">
        পুঁতিতে ট্যাপ করে দেখুন: উপরের পুঁতি = ৫, নিচের প্রতিটি পুঁতি = ১
      </p>
    </div>
  );
};
