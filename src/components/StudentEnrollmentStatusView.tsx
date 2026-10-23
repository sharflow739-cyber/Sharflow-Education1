import React, { useState } from 'react';
import { UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Clock, AlertCircle, RefreshCw, LogOut, Phone, Mail, HelpCircle, CheckCircle } from 'lucide-react';

interface StudentEnrollmentStatusViewProps {
  currentUser: UserProfile;
  onRefreshProfile: () => Promise<void>;
  onLogout: () => void;
}

export const StudentEnrollmentStatusView: React.FC<StudentEnrollmentStatusViewProps> = ({
  currentUser,
  onRefreshProfile,
  onLogout,
}) => {
  const { settings } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const isPending = !currentUser.enrollment_status || currentUser.enrollment_status === 'pending';
  const isRejected = currentUser.enrollment_status === 'rejected';

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshMsg(null);
      await onRefreshProfile();
      setRefreshMsg('স্ট্যাটাস আপডেট যাচাই করা হয়েছে');
      setTimeout(() => setRefreshMsg(null), 3000);
    } catch {
      setRefreshMsg('রিফ্রেশ ব্যর্থ হয়েছে, পুনরায় চেষ্টা করুন');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-orange-100 shadow-xl overflow-hidden">
        
        {/* Top colored status banner */}
        <div className={`p-8 text-center text-white relative ${
          isPending 
            ? 'bg-gradient-to-r from-amber-500 to-orange-500' 
            : 'bg-gradient-to-r from-rose-600 to-red-600'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs text-white mx-auto flex items-center justify-center font-bold mb-4 shadow-inner">
            {isPending ? (
              <Clock size={36} className="animate-pulse" />
            ) : (
              <AlertCircle size={36} />
            )}
          </div>
          
          <span className="px-3 py-1 bg-white/25 rounded-full text-xs font-black tracking-wide inline-block mb-2 uppercase">
            {isPending ? 'Pending Approval' : 'Application Not Approved'}
          </span>
          
          <h2 className="text-2xl font-black tracking-tight">
            {isPending ? (settings.pending_title || 'অনুমোদনের অপেক্ষায় (Pending)') : 'আবেদন গ্রহণ করা হয়নি'}
          </h2>
          <p className="text-xs text-white/90 mt-1 font-medium">
            অভিভাবক: {currentUser.full_name} ({currentUser.email})
          </p>
        </div>

        {/* Content body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Main message */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center space-y-2">
            <p className="text-sm text-slate-700 leading-relaxed font-medium">
              {isPending 
                ? (settings.pending_text || `আপনার আবেদনটি পর্যালোচনার জন্য অপেক্ষমাণ রয়েছে। সাধারণত ${settings.review_hours || 24} ঘণ্টার মধ্যে তথ্য যাচাই করে ইমেইলের মাধ্যমে এক্সেস উন্মুক্ত করা হয়।`)
                : (settings.rejected_text || 'আপনার ভর্তি আবেদন এই মুহূর্তে গ্রহণ করা সম্ভব হয়নি। বিস্তারিত জানতে আমাদের সাপোর্টে যোগাযোগ করুন।')
              }
            </p>
            {isPending && (
              <p className="text-xs text-amber-700 font-semibold">
                ⏳ অনুমোদন সম্পন্ন হলে স্বয়ংক্রিয়ভাবে ক্লাসগুলো আপনার জন্য উন্মুক্ত হয়ে যাবে।
              </p>
            )}
          </div>

          {/* Rejection Reason Box */}
          {isRejected && currentUser.reject_reason && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-left space-y-1">
              <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <AlertCircle size={14} className="text-rose-600" />
                প্রত্যাখ্যানের কারণ:
              </span>
              <p className="text-xs text-rose-900 font-medium whitespace-pre-wrap pl-5">
                {currentUser.reject_reason}
              </p>
            </div>
          )}

          {/* Child Details Card */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-slate-400 block text-[11px]">সন্তানের নাম</span>
              <span className="font-bold text-slate-800">{currentUser.child_name || 'উল্লেখ নেই'}</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-slate-400 block text-[11px]">সন্তানের বয়স</span>
              <span className="font-bold text-slate-800">{currentUser.child_age ? `${currentUser.child_age} বছর` : 'উল্লেখ নেই'}</span>
            </div>
          </div>

          {/* Helpdesk Contact Section */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <HelpCircle size={14} className="text-orange-500" />
              <span>সহায়তা ও যোগাযোগ:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
              {settings.contact_phone && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50/50 text-orange-950 font-medium">
                  <Phone size={14} className="text-orange-600 shrink-0" />
                  <span>{settings.contact_phone}</span>
                </div>
              )}
              {settings.contact_email && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50/50 text-orange-950 font-medium">
                  <Mail size={14} className="text-orange-600 shrink-0" />
                  <span className="truncate">{settings.contact_email}</span>
                </div>
              )}
            </div>
            {settings.contact_hours && (
              <p className="text-[11px] text-slate-400 text-center pt-1">
                যোগাযোগের সময়: {settings.contact_hours}
              </p>
            )}
          </div>

          {/* Notification feedback */}
          {refreshMsg && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold text-center flex items-center justify-center gap-1.5">
              <CheckCircle size={14} className="text-emerald-600" />
              <span>{refreshMsg}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>{refreshing ? 'যাচাই করা হচ্ছে...' : 'স্ট্যাটাস রিফ্রেশ করুন'}</span>
            </button>

            <button
              onClick={onLogout}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={15} />
              <span>লগআউট করুন</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
