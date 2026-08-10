import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

interface AccessDeniedViewProps {
  onGoHome: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ onGoHome }) => {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold border border-rose-200">
        <Lock size={30} />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          আপনার এই পেজে প্রবেশের অনুমতি নেই।
        </h1>
        <p className="text-xs text-slate-500">
          এই পেজটি শুধুমাত্র অনুমোদিত ব্যবহাকারীদের জন্য সংরক্ষিত।
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={onGoHome}
          className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          ক্লাস তালিকায় ফিরে যান
        </button>
      </div>
    </div>
  );
};

