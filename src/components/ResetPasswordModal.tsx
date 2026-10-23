import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('নতুন পাসওয়ার্ড প্রদান করুন');
      return;
    }
    if (password.length < 6) {
      setError('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে');
      return;
    }
    if (password !== confirmPassword) {
      setError('উভয় পাসওয়ার্ড একই হতে হবে');
      return;
    }

    if (!supabase) {
      setError('ডাটাবেজ সংযোগ সক্রিয় নয়');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { error: updateErr } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateErr) throw updateErr;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-orange-100 overflow-hidden relative p-6 space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="space-y-1">
          <h3 className="font-extrabold text-lg text-slate-900">
            নতুন পাসওয়ার্ড নির্ধারণ
          </h3>
          <p className="text-xs text-slate-500">
            আপনার অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড সেট করুন।
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
            <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
            <span>পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে! ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                নতুন পাসওয়ার্ড
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                পাসওয়ার্ড নিশ্চিত করুন
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'সংরক্ষণ করা হচ্ছে...' : 'পাসওয়ার্ড পরিবর্তন করুন'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
