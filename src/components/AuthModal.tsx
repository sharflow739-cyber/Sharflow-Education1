import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { explainAuthError, isValidEmail, isValidBdPhone } from '../lib/authErrors';
import { X, Lock, Mail, User, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export { explainAuthError };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialTab?: 'login' | 'register' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'login',
}) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | ''>(7);
  const [showRegisterSuccessModal, setShowRegisterSuccessModal] = useState(false);
  const [registeredProfile, setRegisteredProfile] = useState<UserProfile | null>(null);
  const [registrationModalMessage, setRegistrationModalMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side checks BEFORE sending to Supabase
    if (!email.trim() || !isValidEmail(email)) {
      setError('সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }
    if (!password || password.length < 8) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase ডাটাবেজ কনফিগার করা হয়নি। .env ফাইলে VITE_SUPABASE_URL ও VITE_SUPABASE_ANON_KEY সেট করুন।');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authErr) throw authErr;

      if (data.user) {
        // Fetch real profile from profiles table
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileErr) {
          throw new Error('ব্যবহারকারীর প্রোফাইল পাওয়া যায়নি: ' + profileErr.message);
        }

        if (profileData && !profileData.is_active) {
          await supabase.auth.signOut();
          setError('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় (Deactivated) করা আছে। এডমিনের সাথে যোগাযোগ করুন।');
          return;
        }

        onLoginSuccess(profileData);
        onClose();
      }
    } catch (err: unknown) {
      setError(explainAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side checks BEFORE sending to Supabase
    if (!fullName.trim()) {
      setError('অভিভাবকের নাম লিখুন।');
      return;
    }
    if (!email.trim() || !isValidEmail(email)) {
      setError('সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }
    if (!password || password.length < 8) {
      setError('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে।');
      return;
    }
    if (phone.trim() && !isValidBdPhone(phone)) {
      setError('সঠিক বাংলাদেশী মোবাইল নম্বর দিন (যেমন: 01712345678)।');
      return;
    }

    if (!settings.allow_registration) {
      setError('নতুন রেজিস্ট্রেশন এখন বন্ধ আছে।');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase ডাটাবেজ কনফিগার করা হয়নি।');
      return;
    }

    setLoading(true);

    try {
      // NOTE: We deliberately do NOT send 'role' in client metadata!
      // Server-side SQL trigger assigns role ('admin' only for owner email, else 'parent').
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            child_name: childName.trim(),
            child_age: childAge ? Number(childAge) : null,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authErr) throw authErr;

      if (data.session && data.user) {
        // Direct session created (if email confirmation was disabled)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileData) {
          setRegisteredProfile(profileData);
        }

        setRegistrationModalMessage(
          settings.register_success_text ||
          'আপনার আবেদন পেয়েছি। ইমেইলে পাঠানো লিংকে ক্লিক করে ইমেইল যাচাই করুন, তারপর ২৪ ঘণ্টার মধ্যে আমরা জানাব।'
        );
        setShowRegisterSuccessModal(true);
      } else {
        // Supabase email confirmation is ON (data.session is null)
        setRegisteredProfile(null);
        setRegistrationModalMessage(
          settings.register_success_text ||
          'আপনার আবেদন পেয়েছি। ইমেইলে পাঠানো লিংকে ক্লিক করে ইমেইল যাচাই করুন, তারপর ২৪ ঘণ্টার মধ্যে আমরা জানাব।'
        );
        setShowRegisterSuccessModal(true);
      }
    } catch (err: unknown) {
      setError(explainAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Client-side checks BEFORE sending to Supabase
    if (!email.trim() || !isValidEmail(email)) {
      setError('সঠিক ইমেইল এড্রেস লিখুন।');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase ডাটাবেজ কনফিগার করা হয়নি।');
      return;
    }

    try {
      setLoading(true);

      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (resetErr) throw resetErr;

      setSuccessMsg(`পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে (${email}) পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স চেক করুন।`);
    } catch (err: unknown) {
      setError(explainAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-orange-100 overflow-hidden relative">
        
        {/* Registration Success Popup Modal */}
        {showRegisterSuccessModal && (
          <div className="absolute inset-0 z-50 bg-white p-6 sm:p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-4 shadow-sm">
              <CheckCircle2 size={38} className="text-emerald-500" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-3">
              {settings.register_success_title || 'রেজিস্ট্রেশন গ্রহণ করা হয়েছে ✅'}
            </h3>

            <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl mb-6">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                {registrationModalMessage || settings.register_success_text || 'আপনার আবেদন পেয়েছি। ইমেইলে পাঠানো লিংকে ক্লিক করে ইমেইল যাচাই করুন, তারপর ২৪ ঘণ্টার মধ্যে আমরা জানাব।'}
              </p>
            </div>

            <button
              onClick={() => {
                setShowRegisterSuccessModal(false);
                if (registeredProfile) {
                  onLoginSuccess(registeredProfile);
                  onClose();
                } else {
                  setActiveTab('login');
                  onClose();
                }
              }}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              ঠিক আছে (OK)
            </button>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-xl">
              {settings.logo_emoji || '🧮'}
            </div>
            <div>
              <h3 className="font-extrabold text-xl leading-tight">
                {settings.site_name || 'অ্যাবাকাস পেরেন্ট পোর্টাল'}
              </h3>
              <p className="text-xs text-orange-100">
                {settings.site_subtitle || 'অভিভাবকদের প্রফেশনাল অনলাইন কোর্স প্ল্যাটফর্ম'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === 'login'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            লগইন (Login)
          </button>
          {settings.allow_registration && (
            <button
              onClick={() => { setActiveTab('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'register'
                  ? 'border-orange-500 text-orange-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              নতুন অ্যাকাউন্ট (Register)
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">

          {/* Error / Success Banners */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল এড্রেস (Email)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    পাসওয়ার্ড (Password)
                  </label>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-[11px] font-semibold text-orange-600 hover:underline cursor-pointer"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'লগইন হচ্ছে...' : (settings.login_button_label || 'লগইন করুন')}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অভিভাবকের পূর্ণ নাম *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল এড্রেস *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পাসওয়ার্ড *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 text-slate-400" size={15} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-orange-50/60 p-2.5 rounded-xl border border-orange-100">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    সন্তানের নাম
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="সন্তানের নাম"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    বয়স
                  </label>
                  <input
                    type="number"
                    value={childAge}
                    onChange={(e) => setChildAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="7"
                    className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? 'নিবন্ধন করা হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন (Register)'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠাব।
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল এড্রেস
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'পাঠানো হচ্ছে...' : 'লিংক পাঠান'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
