import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useSettings } from '../contexts/SettingsContext';
import { explainAuthError, isValidEmail, isValidBdPhone } from '../lib/authErrors';
import {
  SignupOrigin,
  DemoSignupAttempt,
  beginDemoSignupAttempt,
  cancelDemoSignupAttempt,
  claimAndTrackDemoRegistration,
} from '../lib/demoSignupPixel';
import { X, Lock, Mail, User, Phone, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';

export { explainAuthError };

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
  initialTab?: 'login' | 'register' | 'forgot' | 'verify-otp';
  signupOrigin?: SignupOrigin;
  onBeforeDemoCompleteRegistration?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialTab = 'login',
  signupOrigin = 'other',
  onBeforeDemoCompleteRegistration,
}) => {
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'verify-otp'>(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // OTP Verification states
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpNotice, setOtpNotice] = useState<string | null>(null);

  // Welcome popup on OTP success
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [verifiedProfile, setVerifiedProfile] = useState<UserProfile | null>(null);

  // Explicit in-memory demo signup attempt & OTP submit concurrency lock
  const demoAttemptRef = useRef<DemoSignupAttempt | null>(null);
  const verifyingRef = useRef(false);

  const clearDemoAttempt = useCallback(() => {
    if (demoAttemptRef.current) {
      cancelDemoSignupAttempt(demoAttemptRef.current.id);
      demoAttemptRef.current = null;
    }
  }, []);

  // Sync activeTab with initialTab whenever modal opens/closes and clear stale attempts
  useEffect(() => {
    clearDemoAttempt();
    verifyingRef.current = false;
    if (isOpen) {
      setActiveTab(initialTab);
      setError(null);
      setSuccessMsg(null);
      setOtpError(null);
      setOtpNotice(null);
      setShowWelcomeModal(false);
      setVerifiedProfile(null);
    }
  }, [isOpen, initialTab, clearDemoAttempt]);

  // 60-second countdown for Resend OTP button
  useEffect(() => {
    if (activeTab !== 'verify-otp') return;
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => {
      setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [activeTab, otpCountdown]);

  if (!isOpen) return null;

  const handleRequestClose = () => {
    clearDemoAttempt();
    if (showWelcomeModal && verifiedProfile) {
      setShowWelcomeModal(false);
      onLoginSuccess(verifiedProfile);
    }
    onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearDemoAttempt();
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
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code?.toLowerCase() || '';
      const msg = errorObj?.message?.toLowerCase() || '';

      // Check for unverified user (email_not_confirmed)
      if (code === 'email_not_confirmed' || msg.includes('email not confirmed')) {
        const targetEmail = email.trim();
        setOtpEmail(targetEmail);
        setActiveTab('verify-otp');
        setOtpCode('');
        setOtpError(null);
        setOtpNotice('আপনার ইমেইল যাচাই করা হয়নি। একটি নতুন ভেরিফিকেশন কোড পাঠানো হচ্ছে...');
        setOtpCountdown(60);

        // Auto resend fresh OTP token
        supabase.auth.resend({
          type: 'signup',
          email: targetEmail,
        }).then(({ error: resendErr }) => {
          if (resendErr) {
            console.warn('Auto resend error:', resendErr);
          } else {
            setOtpNotice('নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে। ইমেইল ইনবক্স চেক করে কোডটি প্রবেশ করান।');
          }
        });
        return;
      }

      setError(explainAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearDemoAttempt();
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
    if (!phone.trim()) {
      setError('মোবাইল নম্বর আবশ্যক।');
      return;
    }
    if (!isValidBdPhone(phone)) {
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

    const attempt = beginDemoSignupAttempt(signupOrigin === 'demo');
    demoAttemptRef.current = attempt;
    setLoading(true);

    try {
      const normalizedPhone = phone.replace(/\D/g, '');
      // NOTE: We deliberately do NOT send 'role' in client metadata!
      // Server-side SQL trigger assigns role ('admin' only for owner email, else 'parent').
      const { data, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: normalizedPhone,
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authErr) throw authErr;

      // Supabase returns empty identities array when email confirmation is enabled and email already exists
      const isObfuscatedExistingUser =
        Boolean(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0);

      if (isObfuscatedExistingUser) {
        clearDemoAttempt();
      }

      if (data.session && data.user) {
        // Direct session created immediately (if confirm email was disabled)
        if (!isObfuscatedExistingUser) {
          demoAttemptRef.current = null;
          claimAndTrackDemoRegistration(
            attempt?.id,
            { isNewUser: true },
            {
              onBeforeDispatch: () => {
                if (attempt) {
                  onBeforeDemoCompleteRegistration?.();
                }
              },
            }
          );
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        const profile: UserProfile = profileData || {
          id: data.user.id,
          email: data.user.email || email.trim(),
          full_name: fullName.trim(),
          role: 'parent',
          is_active: true,
          enrollment_status: 'pending',
        };

        setVerifiedProfile(profile);
        setShowWelcomeModal(true);
      } else {
        // Supabase email confirmation is ON (standard path, no session yet -> do NOT fire CompleteRegistration)
        // Switch to code-entry step inside this auth modal
        setOtpEmail(email.trim());
        setActiveTab('verify-otp');
        setOtpCode('');
        setOtpError(null);
        setOtpNotice(null);
        setOtpCountdown(60);
      }
    } catch (err: unknown) {
      clearDemoAttempt();
      setError(explainAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    if (verifyingRef.current) return;

    const rawCode = (codeToVerify ?? otpCode).trim();
    const token = rawCode.replace(/\D/g, '');

    if (!token) {
      setOtpError('অনুগ্রহ করে কোডটি প্রবেশ করান।');
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setOtpError('ডাটাবেজ কনফিগার করা হয়নি।');
      return;
    }

    verifyingRef.current = true;
    try {
      setIsVerifying(true);
      setOtpError(null);
      setOtpNotice(null);

      const { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email: otpEmail.trim(),
        token,
        type: 'signup',
      });

      if (verifyErr) throw verifyErr;

      if (data.user) {
        // Claim and fire CompleteRegistration strictly once on verified new demo-origin signup
        const attempt = demoAttemptRef.current;
        demoAttemptRef.current = null;
        claimAndTrackDemoRegistration(
          attempt?.id,
          { isNewUser: true },
          {
            onBeforeDispatch: () => {
              if (attempt) {
                onBeforeDemoCompleteRegistration?.();
              }
            },
          }
        );

        // Fetch or wait for profile created by trigger
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const profile: UserProfile = profileData || {
          id: data.user.id,
          email: data.user.email || otpEmail.trim(),
          full_name: data.user.user_metadata?.full_name || fullName.trim() || 'অভিভাবক',
          role: 'parent',
          is_active: true,
          enrollment_status: 'pending',
        };

        setVerifiedProfile(profile);
        setShowWelcomeModal(true);
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code?.toLowerCase() || '';
      const msg = errorObj?.message?.toLowerCase() || '';

      if (
        code.includes('otp_expired') ||
        code.includes('token_expired') ||
        code.includes('invalid_otp') ||
        msg.includes('token has expired') ||
        msg.includes('invalid token') ||
        msg.includes('otp expired') ||
        msg.includes('invalid')
      ) {
        setOtpError('কোডটি ভুল বা মেয়াদ শেষ হয়েছে। নতুন কোড নিন।');
      } else if (
        code.includes('rate_limit') ||
        code.includes('over_email_send_rate_limit') ||
        msg.includes('rate limit')
      ) {
        setOtpError('অল্প সময়ে অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } else {
        const displayCode = errorObj?.code ? ` (${errorObj.code})` : '';
        setOtpError(`${errorObj?.message || 'যাচাইকরণ ব্যর্থ হয়েছে।'}${displayCode}`);
      }
    } finally {
      verifyingRef.current = false;
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || isResending) return;
    if (!isSupabaseConfigured || !supabase) {
      setOtpError('ডাটাবেজ কনফিগার করা হয়নি।');
      return;
    }

    try {
      setIsResending(true);
      setOtpError(null);
      setOtpNotice(null);

      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: otpEmail.trim(),
      });

      if (resendErr) throw resendErr;

      setOtpCountdown(60);
      setOtpNotice('নতুন ভেরিফিকেশন কোড পাঠানো হয়েছে। অনুগ্রহ করে ইনবক্স ও স্প্যাম ফোল্ডার চেক করুন।');
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code?.toLowerCase() || '';
      const msg = errorObj?.message?.toLowerCase() || '';

      if (
        code.includes('rate_limit') ||
        code.includes('over_email_send_rate_limit') ||
        msg.includes('rate limit')
      ) {
        setOtpError('অল্প সময়ে অনেকবার চেষ্টা হয়েছে, কিছুক্ষণ পর আবার চেষ্টা করুন।');
      } else {
        const displayCode = errorObj?.code ? ` (${errorObj.code})` : '';
        setOtpError(`${errorObj?.message || 'কোড পাঠাতে সমস্যা হয়েছে।'}${displayCode}`);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setOtpCode(cleaned);

    // Auto-submit when pasted/entered length reaches 6 or 8 digits
    if (cleaned.length === 6 || cleaned.length === 8) {
      handleVerifyOtp(cleaned);
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    const cleaned = pasted.replace(/\D/g, '').slice(0, 10);
    if (cleaned) {
      e.preventDefault();
      setOtpCode(cleaned);
      if (cleaned.length === 6 || cleaned.length === 8) {
        handleVerifyOtp(cleaned);
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/65 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="bg-white rounded-2xl max-w-md w-full max-h-[92dvh] overflow-y-auto shadow-2xl border border-slate-200 relative"
      >
        
        {/* Welcome Success Popup Modal (Triggered on OTP verification success) */}
        {showWelcomeModal && (
          <div className="absolute inset-0 z-50 bg-white p-5 sm:p-8 flex flex-col items-center justify-center text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-4 shadow-sm shrink-0">
              <CheckCircle2 size={38} className="text-emerald-700" />
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 mb-3 leading-snug">
              {settings.welcome_popup_title || 'স্বাগতম! 🎉'}
            </h3>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl mb-6">
              <p className="text-sm text-slate-800 leading-relaxed font-medium">
                {settings.welcome_popup_text || 'আপনার ইমেইল যাচাই হয়েছে এবং আবেদন গ্রহণ করা হয়েছে। আমরা তথ্য যাচাই করে ২৪ ঘণ্টার মধ্যে ইমেইলে জানাব।'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowWelcomeModal(false);
                if (verifiedProfile) {
                  onLoginSuccess(verifiedProfile);
                  onClose();
                } else {
                  setActiveTab('login');
                  onClose();
                }
              }}
              className="w-full min-h-[48px] px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-700/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2 shrink-0"
            >
              ঠিক আছে
            </button>
          </div>
        )}

        {/* Top Header Banner */}
        <div className="bg-slate-900 p-4 sm:p-6 text-white relative">
          <button
            type="button"
            onClick={handleRequestClose}
            aria-label="বন্ধ করুন"
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3 pr-11">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-400/20 border border-amber-400/30 text-white flex items-center justify-center font-bold text-xl shrink-0">
              {settings.logo_emoji || '🧮'}
            </div>
            <div className="min-w-0">
              <h3 id="auth-modal-title" className="font-extrabold text-base sm:text-xl leading-snug text-white break-words">
                {settings.site_name || 'অ্যাবাকাস পেরেন্ট পোর্টাল'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-snug mt-0.5">
                {settings.site_subtitle || 'অভিভাবকদের প্রফেশনাল অনলাইন কোর্স প্ল্যাটফর্ম'}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Selection - 48px+ tactile desktop/mobile targets */}
        <div role="tablist" aria-label="অ্যাকাউন্ট ট্যাব" className="p-2 sm:p-2.5 bg-slate-100 border-b border-slate-200 flex items-stretch gap-1.5 sm:gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'login'}
            onClick={() => { clearDemoAttempt(); setActiveTab('login'); setError(null); setSuccessMsg(null); }}
            className={`flex-1 min-h-[48px] px-2 sm:px-3 py-2.5 rounded-xl text-[13px] sm:text-[15px] font-extrabold leading-snug transition-colors cursor-pointer flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              activeTab === 'login'
                ? 'bg-amber-400 text-slate-950 border-2 border-amber-500 shadow-xs focus-visible:ring-slate-900'
                : 'bg-white text-slate-800 border border-slate-300 hover:bg-amber-50 hover:text-slate-950 focus-visible:ring-slate-900'
            }`}
          >
            লগইন করুন
          </button>

          {settings.allow_registration && (
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'register'}
              onClick={() => { clearDemoAttempt(); setActiveTab('register'); setError(null); setSuccessMsg(null); }}
              className={`flex-1 min-h-[48px] px-2 sm:px-3 py-2.5 rounded-xl text-[13px] sm:text-[15px] font-extrabold leading-snug transition-colors cursor-pointer flex items-center justify-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                activeTab === 'register'
                  ? 'bg-emerald-700 text-white border-2 border-emerald-800 shadow-xs focus-visible:ring-emerald-800'
                  : 'bg-white text-slate-800 border border-slate-300 hover:bg-emerald-50 hover:text-emerald-950 focus-visible:ring-emerald-800'
              }`}
            >
              নতুন অ্যাকাউন্ট
            </button>
          )}

          {activeTab === 'verify-otp' && (
            <button
              type="button"
              role="tab"
              aria-selected={true}
              className="flex-1 min-h-[48px] px-2 sm:px-3 py-2.5 rounded-xl text-[13px] sm:text-[15px] font-extrabold leading-snug bg-slate-900 text-white border-2 border-slate-900 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <KeyRound size={15} className="shrink-0" />
              <span>কোড যাচাই</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">

          {/* Global Error / Success Banners */}
          {error && activeTab !== 'verify-otp' && (
            <div role="alert" className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs sm:text-sm font-semibold leading-relaxed flex items-start gap-2.5">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && activeTab !== 'verify-otp' && (
            <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-semibold leading-relaxed flex items-start gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="auth-login-email" className="block text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                  ইমেইল এড্রেস
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
                  <input
                    id="auth-login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label htmlFor="auth-login-password" className="block text-sm font-bold text-slate-800 leading-snug">
                    পাসওয়ার্ড
                  </label>
                  <button
                    type="button"
                    onClick={() => { clearDemoAttempt(); setActiveTab('forgot'); setError(null); setSuccessMsg(null); }}
                    className="min-h-[44px] px-2 -my-2 inline-flex items-center text-xs sm:text-sm font-bold text-amber-800 hover:text-amber-950 hover:underline rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-1"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
                  <input
                    id="auth-login-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] px-5 py-3 bg-amber-400 hover:bg-amber-500 active:bg-amber-500 text-slate-950 border-2 border-amber-500 font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-amber-500/20 transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
              >
                {loading ? 'লগইন হচ্ছে...' : (settings.login_button_label || 'লগইন করুন')}
              </button>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label htmlFor="auth-reg-name" className="block text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                  অভিভাবকের পূর্ণ নাম *
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
                  <input
                    id="auth-reg-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="আপনার নাম"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-reg-email" className="block text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                  ইমেইল এড্রেস *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
                  <input
                    id="auth-reg-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="auth-reg-phone" className="block text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                    মোবাইল নম্বর *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <input
                      id="auth-reg-phone"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full min-h-[46px] pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-reg-password" className="block text-sm font-bold text-slate-800 mb-1.5 leading-snug">
                    পাসওয়ার্ড (কমপক্ষে ৮ অক্ষর) *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    <input
                      id="auth-reg-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[46px] pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-[48px] px-5 py-3 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white border-2 border-emerald-800 font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-700/20 transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
              >
                {loading ? 'নিবন্ধন করা হচ্ছে...' : 'অ্যাকাউন্ট তৈরি করুন'}
              </button>
            </form>
          )}

          {/* TAB 3: VERIFY OTP CODE STEP */}
          {activeTab === 'verify-otp' && (
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtp(); }} className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-relaxed">
                  আপনার ইমেইলে একটি ভেরিফিকেশন কোড পাঠানো হয়েছে। কোডটি নিচে বসান।
                </p>
                <div className="inline-block px-3.5 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs sm:text-sm font-bold text-slate-900 break-all">
                  {otpEmail}
                </div>
              </div>

              {otpError && (
                <div role="alert" className="p-3.5 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <span>{otpError}</span>
                </div>
              )}

              {otpNotice && (
                <div role="status" className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                  <CheckCircle2 size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                  <span>{otpNotice}</span>
                </div>
              )}

              <div>
                <label htmlFor="auth-otp-code" className="block text-sm font-bold text-slate-800 mb-2 text-center">
                  ভেরিফিকেশন কোড
                </label>
                <input
                  id="auth-otp-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  maxLength={10}
                  value={otpCode}
                  onChange={handleCodeChange}
                  onPaste={handleCodePaste}
                  placeholder="123456"
                  className="w-full min-h-[52px] px-4 py-3 bg-slate-50 border-2 border-slate-400 rounded-xl text-center text-2xl font-mono font-bold tracking-widest text-slate-950 focus:bg-white focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isVerifying || !otpCode.trim()}
                className="w-full min-h-[48px] px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white border-2 border-emerald-800 font-extrabold text-sm sm:text-base rounded-xl shadow-md shadow-emerald-700/20 transition-colors disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
              >
                {isVerifying ? 'যাচাই করা হচ্ছে...' : 'কোড যাচাই করুন'}
              </button>

              <div className="pt-1 flex flex-col items-center gap-1.5 text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpCountdown > 0 || isResending}
                  className="min-h-[44px] px-3 inline-flex items-center font-bold text-amber-800 hover:text-amber-950 disabled:text-slate-400 rounded-lg cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
                >
                  {isResending
                    ? 'কোড পাঠানো হচ্ছে...'
                    : otpCountdown > 0
                    ? `পুনরায় কোড পাঠান (${otpCountdown} সেকেন্ড)`
                    : 'পুনরায় কোড পাঠান'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    clearDemoAttempt();
                    setActiveTab('register');
                    setOtpError(null);
                    setOtpNotice(null);
                  }}
                  className="min-h-[44px] px-3 inline-flex items-center text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 hover:underline rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-700"
                >
                  ভুল ইমেইল? আবার নিবন্ধন করুন
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: FORGOT PASSWORD */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                আপনার নিবন্ধিত ইমেইল এড্রেস লিখুন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠাব।
              </p>
              <div>
                <label htmlFor="auth-forgot-email" className="block text-sm font-bold text-slate-800 mb-1.5">
                  ইমেইল এড্রেস
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={17} />
                  <input
                    id="auth-forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full min-h-[46px] pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => { clearDemoAttempt(); setActiveTab('login'); setError(null); setSuccessMsg(null); }}
                  className="flex-1 min-h-[46px] px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-sm rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-800 focus-visible:ring-offset-2"
                >
                  ফিরে যান
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 min-h-[46px] px-4 py-2.5 bg-amber-400 hover:bg-amber-500 text-slate-950 border-2 border-amber-500 font-extrabold text-sm rounded-xl shadow-xs cursor-pointer disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
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
