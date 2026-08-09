import React, { useState } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured, getStoredUsers, saveStoredUsers, setCurrentUser } from '../lib/supabase';
import { X, Lock, Mail, User, Phone, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | ''>(7);

  if (!isOpen) return null;

  // Instant fill for testing
  const handleQuickDemoFill = (role: 'parent' | 'admin') => {
    setError(null);
    setSuccessMsg(null);
    if (role === 'parent') {
      setEmail('parent@abacus.bd');
      setPassword('123456');
    } else {
      setEmail('admin@abacus.bd');
      setPassword('admin123');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (isSupabaseConfigured && supabase) {
        // Real Supabase Auth Login
        const { data, error: authErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authErr) throw authErr;

        if (data.user) {
          // Fetch profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          const profile: UserProfile = profileData || {
            id: data.user.id,
            email: data.user.email || email,
            full_name: data.user.user_metadata?.full_name || 'অভিভাবক',
            role: 'parent',
            is_active: true,
            created_at: new Date().toISOString(),
          };

          setCurrentUser(profile);
          onLoginSuccess(profile);
          onClose();
          return;
        }
      }

      // Local Fallback Login Logic
      const allUsers = getStoredUsers();
      const foundUser = allUsers.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );

      if (!foundUser) {
        // If demo user typed anything else, create or allow login
        const newUser: UserProfile = {
          id: `user-${Date.now()}`,
          email,
          full_name: fullName || email.split('@')[0] || 'অভিভাবক',
          role: email.includes('admin') ? 'admin' : 'parent',
          is_active: true,
          phone,
          child_name: childName || 'সন্তান',
          created_at: new Date().toISOString(),
        };
        allUsers.push(newUser);
        saveStoredUsers(allUsers);
        setCurrentUser(newUser);
        onLoginSuccess(newUser);
        onClose();
        return;
      }

      if (!foundUser.is_active) {
        setError('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় (Deactivated) করা আছে। এডমিনের সাথে যোগাযোগ করুন।');
        setLoading(false);
        return;
      }

      setCurrentUser(foundUser);
      onLoginSuccess(foundUser);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে। সঠিক ইমেইল ও পাসওয়ার্ড দিন।';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    if (!email || !password || !fullName) {
      setError('অনুগ্রহ করে সকল প্রয়োজনীয় তথ্য প্রদান করুন।');
      setLoading(false);
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone,
              child_name: childName,
              child_age: childAge ? Number(childAge) : 7,
              role: 'parent',
            },
          },
        });

        if (authErr) throw authErr;

        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email,
            full_name: fullName,
            phone,
            role: 'parent',
            is_active: true,
            child_name: childName,
            child_age: childAge ? Number(childAge) : 7,
            created_at: new Date().toISOString(),
          };

          setCurrentUser(profile);
          onLoginSuccess(profile);
          onClose();
          return;
        }
      }

      // Local Registration Fallback
      const allUsers = getStoredUsers();
      if (allUsers.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        setError('এই ইমেইল দিয়ে ইতোমধ্যেই একটি একাউন্ট খোলা আছে।');
        setLoading(false);
        return;
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        email,
        full_name: fullName,
        phone,
        role: 'parent',
        is_active: true,
        child_name: childName,
        child_age: childAge ? Number(childAge) : undefined,
        created_at: new Date().toISOString(),
      };

      allUsers.push(newUser);
      saveStoredUsers(allUsers);
      setCurrentUser(newUser);
      onLoginSuccess(newUser);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'নিবন্ধন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('পাসওয়ার্ড পুনরুদ্ধারের জন্য আপনার নিবন্ধিত ইমেইল প্রদান করুন।');
      return;
    }
    setSuccessMsg(`পাসওয়ার্ড পুনর্বিন্যাস নির্দেশাবলী ${email} এ পাঠানো হয়েছে।`);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-orange-100 overflow-hidden relative">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center font-bold text-xl">
              🧮
            </div>
            <div>
              <h3 className="font-extrabold text-xl leading-tight">
                অ্যাবাকাস পেরেন্ট পোর্টালে স্বাগতম
              </h3>
              <p className="text-xs text-orange-100">
                অভিভাবকদের প্রফেশনাল অনলাইন কোর্স প্ল্যাটফর্ম
              </p>
            </div>
          </div>

          {/* Quick Fill Helper */}
          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between gap-2 text-xs">
            <span className="text-orange-100 text-[11px]">ডেমো লগইন টেস্ট:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  handleQuickDemoFill('parent');
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold text-white transition-colors flex items-center gap-1"
              >
                <Sparkles size={11} /> অভিভাবক ডেমো
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  handleQuickDemoFill('admin');
                }}
                className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold text-white transition-colors"
              >
                এডমিন ডেমো
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 bg-slate-50">
          <button
            onClick={() => { setActiveTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'login'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            লগইন (Login)
          </button>
          <button
            onClick={() => { setActiveTab('register'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
              activeTab === 'register'
                ? 'border-orange-500 text-orange-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            নতুন অ্যাকাউন্ট (Register)
          </button>
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
                    placeholder="parent@example.com"
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
                    onClick={() => setActiveTab('forgot')}
                    className="text-[11px] font-semibold text-orange-600 hover:underline"
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
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all active:scale-98 disabled:opacity-50"
              >
                {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন (Login)'}
              </button>
            </form>
          )}

          {/* REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  অভিভাবকের নাম (Parent's Full Name) *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="মো: রফিকুল ইসলাম"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল এড্রেস (Email) *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@example.com"
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
                      placeholder="01712345678"
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
                    সন্তানের নাম (Child Name)
                  </label>
                  <input
                    type="text"
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="আফিয়া ইসলাম"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    বয়স (Age)
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
                className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
              >
                {loading ? 'নিবন্ধন করা হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন (Register)'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন। আমরা একটি পাসওয়ার্ড পুনরুদ্ধারের সিকিউর লিংক পাঠাব।
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
                    placeholder="parent@example.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs"
                >
                  লিংক পাঠান
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
