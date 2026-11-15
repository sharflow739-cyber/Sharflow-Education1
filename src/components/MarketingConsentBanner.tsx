import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { useConsent } from '../contexts/ConsentContext';

export const MarketingConsentBanner: React.FC = () => {
  const { marketingConsent, grantMarketingConsent, denyMarketingConsent } = useConsent();

  // Show minimal opt-in banner only when consent has not been chosen yet
  if (marketingConsent !== 'unset') {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="মার্কেটিং কুকি সম্মতি"
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-md z-40 bg-slate-900 text-white border border-slate-700 rounded-2xl shadow-2xl p-4 space-y-3"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 mt-0.5">
          <ShieldCheck size={18} />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-extrabold text-white">
            মার্কেটিং বিশ্লেষণ সম্মতি (ঐচ্ছিক)
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            আপনি সম্মতি দিলে কেবল ফ্রি ডেমো পেজ ভিজিট ও ডেমো অ্যাকাউন্ট নিবন্ধন পরিমাপের জন্য Meta Pixel চালু হবে। সম্মতি না দিলে কোনো ট্র্যাকিং স্ক্রিপ্ট লোড হবে না।
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={denyMarketingConsent}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          প্রত্যাখ্যান করুন
        </button>
        <button
          type="button"
          onClick={grantMarketingConsent}
          className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer shadow-xs"
        >
          সম্মতি দিন
        </button>
      </div>
    </div>
  );
};
