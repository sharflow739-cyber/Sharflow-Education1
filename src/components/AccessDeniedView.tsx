import React, { useState, useEffect } from 'react';
import { UserProfile, AdminRequest } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ShieldAlert, ArrowLeft, Clock, Send, AlertTriangle, RefreshCw } from 'lucide-react';

interface AccessDeniedViewProps {
  currentUser: UserProfile;
  onGoHome: () => void;
  onRefreshProfile?: () => void;
}

export const AccessDeniedView: React.FC<AccessDeniedViewProps> = ({
  currentUser,
  onGoHome,
  onRefreshProfile,
}) => {
  const [request, setRequest] = useState<AdminRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchRequestStatus = async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_requests')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching admin request status:', error);
      } else {
        setRequest(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestStatus();
  }, [currentUser.id]);

  const handleRequestAccess = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('ডাটাবেজ সংযোগ সক্রিয় নয়।');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const { error } = await supabase.rpc('request_admin_access');
      if (error) {
        setErrorMsg(error.message || 'অনুরোধ পাঠাতে ব্যর্থ হয়েছে।');
      } else {
        setSuccessMsg('আপনার এডমিন এক্সেস অনুরোধ সফলভাবে পাঠানো হয়েছে।');
        await fetchRequestStatus();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'অনুরোধ পাঠাতে ব্যর্থ হয়েছে।';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
      
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center font-bold border border-amber-200 shadow-xs">
        <ShieldAlert size={32} />
      </div>

      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
          এডমিন এক্সেস সংরক্ষিত
        </h1>
        <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
          এই ম্যানেজমেন্ট পোর্টালটি (/admin) শুধুমাত্র অনুমোদিত এডমিন অ্যাকাউন্টের জন্য সংরক্ষিত।
        </p>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium text-left flex items-start gap-2">
          <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium text-left">
          {successMsg}
        </div>
      )}

      {/* Request Status Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-left">
        <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-center">
          আপনার বর্তমান স্ট্যাটাস
        </h3>

        {loading ? (
          <div className="py-4 text-center text-xs text-slate-400">
            স্ট্যাটাস যাচাই করা হচ্ছে...
          </div>
        ) : request?.status === 'pending' ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs">
              <Clock size={16} className="text-amber-600 animate-pulse" />
              <span>অনুমোদনের অপেক্ষায় (Pending)</span>
            </div>
            <p className="text-[11px] text-amber-700 leading-relaxed">
              আপনার এডমিন এক্সেস অনুরোধটি পাঠানো হয়েছে। প্রধান এডমিন (Owner) এটি অনুমোদন করলে আপনি এক্সেস পাবেন।
            </p>
            <button
              onClick={() => {
                fetchRequestStatus();
                onRefreshProfile?.();
              }}
              className="mt-2 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw size={12} />
              পুনরায় স্ট্যাটাস চেক করুন
            </button>
          </div>
        ) : request?.status === 'rejected' ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-extrabold text-xs">
              <AlertTriangle size={16} className="text-rose-600" />
              <span>অনুরোধ প্রত্যাখ্যাত (Rejected)</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              আপনার পূর্ববর্তী এডমিন অনুরোধটি প্রত্যাখ্যাত হয়েছিল। প্রয়োজন হলে পুনরায় অনুরোধ পাঠাতে পারেন।
            </p>
            <button
              onClick={handleRequestAccess}
              disabled={submitting}
              className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send size={13} />
              {submitting ? 'পাঠানো হচ্ছে...' : 'পুনরায় অনুরোধ করুন'}
            </button>
          </div>
        ) : request?.status === 'approved' ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-center">
            <p className="text-xs font-bold text-emerald-800">
              আপনার অনুরোধ অনুমোদিত হয়েছে!
            </p>
            <button
              onClick={() => {
                onRefreshProfile?.();
                window.location.reload();
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={13} />
              পেজ রিফ্রেশ করুন
            </button>
          </div>
        ) : (
          <div className="space-y-3 text-center py-2">
            <p className="text-xs text-slate-600">
              আপনি কোর্স পরিচালনার জন্য এডমিন এক্সেস পেতে চান?
            </p>
            <button
              onClick={handleRequestAccess}
              disabled={submitting}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
              {submitting ? 'অনুরোধ পাঠানো হচ্ছে...' : 'এডমিন এক্সেসের অনুরোধ করুন'}
            </button>
          </div>
        )}
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={onGoHome}
          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowLeft size={16} />
          ক্লাস তালিকায় ফিরে যান
        </button>
      </div>

    </div>
  );
};
