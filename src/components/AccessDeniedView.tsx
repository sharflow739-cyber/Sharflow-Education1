import React from 'react';
import { Lock, ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';

interface AccessDeniedViewProps {
  onGoHome: () => void;
  onSwitchToAdmin?: () => void;
  userRole?: string;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({ 
  onGoHome, 
  onSwitchToAdmin, 
  userRole 
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-6 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold shadow-lg shadow-rose-500/10 border border-rose-200">
        <Lock size={36} />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full inline-block">
          403 ACCESS DENIED
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          প্রবেশাধিকার সংরক্ষিত (Access Denied)
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          আপনার বর্তমান অ্যাকাউন্টটি ({userRole === 'parent' ? 'অভিভাবক/Parent' : 'সাধারণ ইউজার'}) দিয়ে এডমিন পেজে প্রবেশ করার অনুমতি নেই।
        </p>
      </div>

      <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-500 text-left space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-700">
          <ShieldAlert size={16} className="text-amber-500" />
          <span>নিরাপত্তা নীতিমালা:</span>
        </div>
        <p className="leading-relaxed">
          এডমিন ম্যানেজমেন্ট পোর্টালটি ( /admin ) শুধুমাত্র role = "admin" বিশিষ্ট অ্যাকাউন্টের জন্য সুরক্ষিত।
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          onClick={onGoHome}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          অভিভাবক ড্যাশবোর্ডে ফিরে যান
        </button>

        {onSwitchToAdmin && (
          <button
            onClick={onSwitchToAdmin}
            className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
          >
            <KeyRound size={16} className="text-amber-400" />
            এডমিন অ্যাকাউন্টে স্যুইচ করুন
          </button>
        )}
      </div>
    </div>
  );
};
