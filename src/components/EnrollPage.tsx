import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  isPaymentsMigrationMissingError,
  isProviderConfigured,
  isValidTrxId,
  LearnerManualPaymentClaim,
  ManualPaymentProviderConfig,
  normalizeBdMobile,
  normalizeTrxId,
  parsePositiveBdtAmount,
  PAYMENT_CLAIM_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_PROVIDER_LABELS,
  PaymentMethod,
  PaymentProvider,
} from '../lib/manualPayments';
import { PaymentProviderLogo } from './PaymentProviderBadge';
import { SUPPORT_WHATSAPP_URL, SUPPORT_MESSENGER_URL } from './SupportWidget';
import {
  ArrowLeft,
  CheckCircle2,
  Phone,
  Mail,
  Clock,
  CreditCard,
  FileText,
  Sparkles,
  Send,
  PlayCircle,
  ArrowDown,
  MessageCircle,
  MessagesSquare,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  XCircle,
  Lock,
} from 'lucide-react';

interface EnrollPageProps {
  currentUser?: UserProfile | null;
  onNavigate: (path: string) => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onRefreshProfile?: () => Promise<void>;
}

export const EnrollPage: React.FC<EnrollPageProps> = ({
  currentUser = null,
  onNavigate,
  onOpenAuth,
  onRefreshProfile,
}) => {
  const { settings } = useSettings();

  // Set the displayed course fee to ৳২,৬৫০ (one-time). If owner sets custom in settings, allow it or default to ২,৬৫০.
  const fee = (settings.course_fee_bdt || '').trim() || '২,৬৫০';
  const duration = (settings.course_duration_access || '').trim();
  const includesText = (settings.course_includes_text || '').trim();
  const refundText = (settings.refund_policy_text || '').trim();
  const paymentInstructions = (settings.payment_instructions || '').trim();
  const supportEmail = (settings.contact_email || '').trim();
  const supportPhone = (settings.contact_phone || '').trim();

  // Manual Payment State
  const [providersLoading, setProvidersLoading] = useState(true);
  const [configuredProviders, setConfiguredProviders] = useState<ManualPaymentProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const [claimsLoading, setClaimsLoading] = useState(false);
  const [myClaims, setMyClaims] = useState<LearnerManualPaymentClaim[]>([]);

  // Form inputs (never asks for PIN/OTP/password/screenshot)
  const [payerNumber, setPayerNumber] = useState('');
  const [trxId, setTrxId] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const isAlreadyPremium = Boolean(
    currentUser && (currentUser.role === 'admin' || currentUser.enrollment_status === 'approved')
  );

  const loadPaymentState = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setProvidersLoading(false);
      return;
    }

    try {
      setProvidersLoading(true);
      const { data: providerRows, error: providerErr } = await supabase
        .from('manual_payment_providers')
        .select('*');

      if (providerErr) {
        if (!isPaymentsMigrationMissingError(providerErr)) {
          console.error('Error loading payment providers:', providerErr);
        }
        setConfiguredProviders([]);
        setSelectedProvider(null);
      } else {
        const valid = ((providerRows || []) as ManualPaymentProviderConfig[]).filter(
          isProviderConfigured
        );
        // Deterministic display order: bkash first, then nagad
        valid.sort((a, b) => (a.provider === b.provider ? 0 : a.provider === 'bkash' ? -1 : 1));
        setConfiguredProviders(valid);
        setSelectedProvider((prev) => {
          if (prev && valid.some((v) => v.provider === prev)) return prev;
          return valid[0]?.provider ?? null;
        });
      }

      if (currentUser?.id && currentUser.is_active) {
        setClaimsLoading(true);
        const { data: claimRows, error: claimsErr } = await supabase.rpc(
          'get_my_manual_payment_claims'
        );

        if (!claimsErr && Array.isArray(claimRows)) {
          setMyClaims(claimRows as LearnerManualPaymentClaim[]);
        } else {
          setMyClaims([]);
        }
      } else {
        setMyClaims([]);
      }
    } finally {
      setProvidersLoading(false);
      setClaimsLoading(false);
    }
  }, [currentUser?.id, currentUser?.is_active]);

  useEffect(() => {
    loadPaymentState();
  }, [loadPaymentState]);

  const activeProviderConfig = useMemo(
    () => configuredProviders.find((p) => p.provider === selectedProvider) || null,
    [configuredProviders, selectedProvider]
  );

  const handleCopyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNumber(num);
      setTimeout(() => setCopiedNumber(null), 2200);
    } catch {
      // Fallback ignored if clipboard denied
    }
  };

  const handleRefreshStatus = async () => {
    await Promise.all([loadPaymentState(), onRefreshProfile?.()]);
  };

  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!currentUser || !currentUser.is_active) {
      onOpenAuth('login');
      return;
    }

    if (!activeProviderConfig) {
      setSubmitError('বর্তমানে কোনো পেমেন্ট মাধ্যম সক্রিয় নেই।');
      return;
    }

    const normalizedPhone = normalizeBdMobile(payerNumber);
    if (!normalizedPhone) {
      setSubmitError('যে নম্বর থেকে টাকা পাঠিয়েছেন তার সঠিক ১১ সংখ্যার বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01XXXXXXXXX)।');
      return;
    }

    const normalizedTrx = normalizeTrxId(trxId);
    if (!isValidTrxId(normalizedTrx)) {
      setSubmitError('সঠিক ট্রানজ্যাকশন আইডি (TrxID) লিখুন (৬ থেকে ৩২ অক্ষরের ইংরেজি বর্ণ ও সংখ্যা)।');
      return;
    }

    const parsedAmount = parsePositiveBdtAmount(amountInput);
    if (!parsedAmount) {
      setSubmitError('সঠিক টাকার পরিমাণ (BDT পূর্ণ সংখ্যায়) লিখুন।');
      return;
    }

    if (activeProviderConfig.price_bdt && parsedAmount !== activeProviderConfig.price_bdt) {
      setSubmitError(
        `${PAYMENT_PROVIDER_LABELS[activeProviderConfig.provider]}-এর নির্ধারিত কোর্স ফি ৳${activeProviderConfig.price_bdt}। অনুগ্রহ করে সঠিক পরিমাণ লিখুন।`
      );
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setSubmitError('সিস্টেম কনফিগার করা হয়নি।');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.rpc('submit_manual_payment_claim', {
        p_provider: activeProviderConfig.provider,
        p_trx_id: normalizedTrx,
        p_payer_number: normalizedPhone,
        p_amount_bdt: parsedAmount,
      });

      if (error) {
        setSubmitError(error.message || 'পেমেন্ট তথ্য জমা দেওয়া যায়নি।');
        return;
      }

      setTrxId('');
      setAmountInput('');
      setSubmitSuccess(
        'আপনার পেমেন্ট তথ্য সফলভাবে জমা হয়েছে! এডমিন আপনার TrxID ও লেজার যাচাই করে অনুমোদন দেওয়ার সাথে সাথে কোর্স এক্সেস চালু হয়ে যাবে।'
      );
      await loadPaymentState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'পেমেন্ট তথ্য জমা দেওয়া যায়নি।';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleScrollToCheckout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = document.getElementById('enroll-checkout');
    if (!target) return;
    e.preventDefault();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>মূল পাতায় ফিরে যান</span>
        </button>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-extrabold flex items-center gap-1.5">
          <Sparkles size={13} />
          <span>ভর্তি তথ্য ও এক্সেস</span>
        </span>
      </div>

      {/* Main Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          কোর্সে ভর্তি সংক্রান্ত তথ্য
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
          অভিভাবকদের জন্য সোরোবান অ্যাবাকাস অনলাইন ট্রেনিং কোর্সের ফি, সময়সীমা ও ভর্তির নিয়মাবলি।
        </p>
      </div>

      {/* Course Fee & Key Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
              কোর্স এক্সেস
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              অ্যাবাকাস প্যারেন্ট ট্রেনিং ফুল কোর্স
            </h2>
            <p className="text-xs text-slate-500">
              অভিভাবকদের জন্য সম্পূর্ণ ধারাবাহিক বাংলা ভিডিও কোর্স।
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center sm:text-right shrink-0">
            <span className="text-[11px] font-bold text-slate-500 block">কোর্স ফি</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900">
              ৳ {fee}
            </div>
            <span className="text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-full inline-block mt-1">
              এককালীন ফি (One-time)
            </span>
            {duration && (
              <span className="text-[11px] text-slate-600 font-bold block mt-1">
                এক্সেস মেয়াদ: {duration}
              </span>
            )}
          </div>
        </div>

        {/* What is Included */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>কোর্সের অন্তর্ভুক্ত সুযোগ-সুবিধাসমূহ:</span>
          </h3>

          {includesText ? (
            <div className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {includesText}
            </div>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
              <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>সকল ধারাবাহিক ভিডিও লেসনে সম্পূর্ণ এক্সেস</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>ইন্টারঅ্যাক্টিভ ভার্চুয়াল অ্যাবাকাস ব্যবহারের সুবিধা</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>ক্লাসভিত্তিক প্র্যাকটিস শিট ও ওয়ার্কশিট ডাউনলোড</span>
              </li>
              <li className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>মোবাইল বা কম্পিউটারে যেকোনো সুবিধাজনক সময়ে দেখার সুবিধা</span>
              </li>
            </ul>
          )}
        </div>

        {/* Access Duration */}
        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <Clock size={15} className="text-orange-500" />
            <span>অ্যাক্সেসের সময়সীমা</span>
          </h4>
          <p className="text-slate-600 leading-relaxed">
            {duration 
              ? `কোর্সে ভর্তির পর একাউন্টে ${duration} পর্যন্ত নিয়মিত এক্সেস বজায় থাকবে।`
              : 'কোর্সে সফলভাবে ভর্তির পর নির্দিষ্ট মেয়াদ পর্যন্ত সুবিধামতো সময়ে যেকোনো স্থান থেকে লেকচার দেখার এক্সেস বজায় থাকবে।'}
          </p>
        </div>

        {/* Refund Policy Summary */}
        <div className="space-y-1.5 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
            <FileText size={15} className="text-orange-500" />
            <span>রিফান্ড নীতিমালা</span>
          </h4>
          <p className="text-slate-600 leading-relaxed">
            {refundText ? (
              refundText
            ) : (
              <span>
                ডিজিটাল কন্টেন্ট সুরক্ষার জন্য কোর্স ফি পরিশোধ ও এক্সেস পাওয়ার পর প্রযোজ্য নীতিমালা অনুযায়ী আবেদন বিবেচনা করা হয়। বিস্তারিত জানতে আমাদের{' '}
                <button
                  onClick={() => onNavigate('/refund')}
                  className="text-orange-600 hover:underline font-bold cursor-pointer"
                >
                  রিফান্ড নীতিমালা পেজ
                </button>{' '}
                দেখুন।
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Free vs Premium Course Benefits Comparison */}
      <section id="course-comparison" aria-labelledby="comparison-heading" className="space-y-4">
        <div className="text-center space-y-1.5">
          <h2 id="comparison-heading" className="text-xl sm:text-2xl font-black text-slate-900">
            ফ্রি বনাম প্রিমিয়াম কোর্স সুবিধা
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            আপনার প্রয়োজন অনুযায়ী ফ্রি রিসোর্স দিয়ে শুরু করুন অথবা সম্পূর্ণ প্রিমিয়াম কোর্সে ভর্তি হন।
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          {/* Free Plan Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1 min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[11px] font-extrabold">
                    ফ্রি
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    ফ্রি অ্যাকাউন্ট সুবিধা
                  </h3>
                  <p className="text-xs text-slate-500">
                    অ্যাকাউন্ট খুলে যাচাই করে বিনামূল্যে শেখা শুরু করুন
                  </p>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 font-medium">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>নির্বাচিত ফ্রি ক্লাস</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>লাইব্রেরিতে ফ্রি বই</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>ফ্রি ভার্চুয়াল অ্যাবাকাস</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/demo')}
              className="w-full min-h-[48px] px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm rounded-2xl shadow-xs transition-colors inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <PlayCircle size={18} className="shrink-0" />
              <span>ডেমো ক্লাস দেখুন</span>
            </button>
          </div>

          {/* Premium Plan Card */}
          <div className="bg-gradient-to-b from-orange-50/80 via-white to-emerald-50/40 rounded-3xl border-2 border-orange-300 shadow-sm p-5 sm:p-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-orange-200/70 pb-4">
                <div className="space-y-1 min-w-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-orange-500 text-white text-[11px] font-extrabold">
                    প্রিমিয়াম
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    প্রিমিয়াম পূর্ণাঙ্গ কোর্স
                  </h3>
                  <p className="text-xs text-slate-600">
                    অভিভাবকদের জন্য সম্পূর্ণ ধারাবাহিক কোর্স ও সাপোর্ট
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-bold text-slate-500 block">এককালীন ফি</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 tabular-nums">
                    ৳ {fee}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 text-xs sm:text-sm text-slate-800 font-medium">
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>ফ্রি সুবিধাসহ সম্পূর্ণ ক্লাস</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>ধাপে ধাপে গাইডলাইন</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>প্র্যাকটিস শিট</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>বই ও ভার্চুয়াল অ্যাবাকাস</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>ফিজিক্যাল অ্যাবাকাস পাঠানো হবে</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <CheckCircle2 size={17} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    যেকোনো সমস্যায় সপ্তাহে ৭ দিন ইমেইল সাপোর্ট
                    {supportEmail && (
                      <>
                        {' ('}
                        <a
                          href={`mailto:${supportEmail}`}
                          className="font-bold text-orange-700 hover:underline break-all"
                        >
                          {supportEmail}
                        </a>
                        {')'}
                      </>
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <a
              href="#enroll-checkout"
              onClick={handleScrollToCheckout}
              className="w-full min-h-[48px] px-5 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-2xl shadow-md shadow-orange-500/20 transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
            >
              <span>পেমেন্ট ও ভর্তির অংশে যান</span>
              <ArrowDown size={17} className="shrink-0" />
            </a>
          </div>
        </div>
      </section>

      {/* Enrollment & Manual Payment Section */}
      <div
        id="enroll-checkout"
        className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-8 space-y-6 scroll-mt-20"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CreditCard size={20} className="text-orange-500 shrink-0" />
            <span>ভর্তি প্রক্রিয়া ও ম্যানুয়াল পেমেন্ট</span>
          </h3>
          <span className="text-xs font-extrabold text-slate-800 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full tabular-nums">
            কোর্স ফি: ৳ {activeProviderConfig?.price_bdt ?? fee}
          </span>
        </div>

        {/* Already Premium Notice */}
        {isAlreadyPremium && (
          <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-emerald-950">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-extrabold text-sm">
                  আপনার অ্যাকাউন্টে প্রিমিয়াম কোর্স এক্সেস সক্রিয় আছে
                </div>
                <p className="text-xs text-emerald-800">
                  আপনি সকল পেইড ক্লাস, প্র্যাকটিস শিট এবং ই-বুক ব্যবহার করতে পারবেন।
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="min-h-[44px] px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold rounded-xl cursor-pointer shrink-0"
            >
              ক্লাস ড্যাশবোর্ডে যান
            </button>
          </div>
        )}

        {/* Loading Providers */}
        {providersLoading ? (
          <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <RefreshCw size={15} className="animate-spin text-orange-500" />
            <span>পেমেন্ট অপশন লোড হচ্ছে...</span>
          </div>
        ) : configuredProviders.length === 0 ? (
          /* Keep unconfigured options completely closed */
          <div className="p-4 sm:p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-950 font-extrabold text-sm sm:text-base">
              <Clock size={18} className="text-amber-700 shrink-0" />
              <span>বিকাশ ও নগদ পেমেন্ট শীঘ্রই চালু হবে</span>
            </div>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
              অনলাইন বিকাশ ও নগদ পেমেন্ট মাধ্যম সেটআপের কাজ চলছে। ততক্ষণ ভর্তি বা পেমেন্ট সংক্রান্ত সহায়তার জন্য নিচের যেকোনো মাধ্যমে সরাসরি যোগাযোগ করুন।
            </p>
          </div>
        ) : !isAlreadyPremium ? (
          /* Configured & Enabled Providers */
          <div className="space-y-6">
            {/* Step 1: Select Configured Provider */}
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-slate-800">
                ধাপ ১: পেমেন্ট মাধ্যম নির্বাচন করুন
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {configuredProviders.map((cfg) => {
                  const isSelected = activeProviderConfig?.provider === cfg.provider;
                  const selectedStyle =
                    cfg.provider === 'bkash'
                      ? 'border-[#E2136E] bg-pink-50/50 ring-2 ring-[#E2136E]/20'
                      : 'border-[#F26522] bg-orange-50/60 ring-2 ring-orange-500/20';

                  return (
                    <button
                      key={cfg.provider}
                      type="button"
                      onClick={() => {
                        setSelectedProvider(cfg.provider);
                        setSubmitError(null);
                      }}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? selectedStyle
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <PaymentProviderLogo provider={cfg.provider} size="lg" />
                      <div className="text-right shrink-0">
                        <span className="block text-sm font-black text-slate-900 tabular-nums">
                          ৳ {cfg.price_bdt}
                        </span>
                        <span className="block text-[11px] font-bold text-slate-600">
                          {PAYMENT_METHOD_LABELS[cfg.payment_method as PaymentMethod]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Exact Instructions for Selected Provider */}
            {activeProviderConfig && (
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <PaymentProviderLogo provider={activeProviderConfig.provider} size="md" />
                  <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-extrabold">
                    {PAYMENT_METHOD_LABELS[activeProviderConfig.payment_method as PaymentMethod]}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[11px] text-slate-500 block">
                        রিসিভার নম্বর ({PAYMENT_PROVIDER_LABELS[activeProviderConfig.provider]})
                      </span>
                      <span className="font-mono text-sm sm:text-base font-black text-slate-900 select-all">
                        {activeProviderConfig.recipient_number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyNumber(activeProviderConfig.recipient_number)}
                      className="min-h-[38px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {copiedNumber === activeProviderConfig.recipient_number ? (
                        <>
                          <Check size={14} className="text-emerald-600" />
                          <span>কপি হয়েছে</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>কপি</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-[11px] text-slate-500 block">প্রদেয় কোর্স ফি</span>
                    <span className="text-sm sm:text-base font-black text-emerald-700 tabular-nums">
                      ৳ {activeProviderConfig.price_bdt} টাকা
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      পদ্ধতি: {PAYMENT_METHOD_LABELS[activeProviderConfig.payment_method as PaymentMethod]}
                    </span>
                  </div>
                </div>

                {activeProviderConfig.instructions && (
                  <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed whitespace-pre-line">
                    {activeProviderConfig.instructions}
                  </p>
                )}

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] sm:text-xs text-amber-950 flex items-start gap-2 font-medium">
                  <ShieldCheck size={16} className="text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    নিরাপত্তা সতর্কতা: কখনোই আপনার বিকাশ/নগদ পিন (PIN), ওটিপি (OTP) বা অ্যাকাউন্ট পাসওয়ার্ড এখানে লিখবেন না বা কারো সাথে শেয়ার করবেন না।
                  </span>
                </div>
              </div>
            )}

            {/* Step 3: Signed-in Claim Form OR Login/Register Prompt */}
            {!currentUser ? (
              <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <Lock size={20} className="text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm sm:text-base">
                      পেমেন্ট তথ্য জমা দিতে লগইন বা অ্যাকাউন্ট তৈরি করুন
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      আপনার অ্যাকাউন্টে কোর্স এক্সেস যুক্ত করার জন্য প্রথমে ইমেইল ও কোডের মাধ্যমে লগইন বা নিবন্ধন সম্পন্ন করুন। এরপর এখানে আপনার TrxID ও প্রেরকের নম্বর জমা দিতে পারবেন।
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenAuth('register')}
                    className="min-h-[44px] px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    নতুন অ্যাকাউন্ট খুলুন
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenAuth('login')}
                    className="min-h-[44px] px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl transition-colors cursor-pointer"
                  >
                    ইতিমধ্যে অ্যাকাউন্ট আছে? লগইন করুন
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmitClaim}
                className="p-4 sm:p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 space-y-4"
              >
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">
                    ধাপ ২: টাকা পাঠানোর পর তথ্য জমা দিন
                  </h4>
                  <p className="text-xs text-slate-600">
                    অ্যাকাউন্ট: <strong className="text-slate-900">{currentUser.email}</strong>
                  </p>
                </div>

                {submitError && (
                  <div
                    role="alert"
                    className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-start gap-2"
                  >
                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {submitSuccess && (
                  <div
                    role="status"
                    className="p-3.5 bg-emerald-100 border border-emerald-300 text-emerald-950 rounded-xl text-xs font-bold flex items-start gap-2"
                  >
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                    <span>{submitSuccess}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label htmlFor="payer-number-input" className="block font-bold text-slate-800 mb-1">
                      প্রেরকের নম্বর (যে নম্বর থেকে পাঠিয়েছেন) *
                    </label>
                    <input
                      id="payer-number-input"
                      type="tel"
                      inputMode="tel"
                      required
                      value={payerNumber}
                      onChange={(e) => setPayerNumber(e.target.value)}
                      placeholder="01XXXXXXXXX"
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="trx-id-input" className="block font-bold text-slate-800 mb-1">
                      ট্রানজ্যাকশন আইডি (TrxID) *
                    </label>
                    <input
                      id="trx-id-input"
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      placeholder="যেমন: 8N7A2B9C1D"
                      autoCapitalize="characters"
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold uppercase text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="amount-bdt-input" className="block font-bold text-slate-800 mb-1">
                      প্রেরিত টাকার পরিমাণ (BDT) *
                    </label>
                    <input
                      id="amount-bdt-input"
                      type="text"
                      inputMode="numeric"
                      required
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      placeholder={activeProviderConfig ? String(activeProviderConfig.price_bdt) : '2650'}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <span className="text-[11px] text-slate-500">
                    শুধুমাত্র প্রেরকের নম্বর, TrxID ও পরিমাণ দিন। কোনো PIN বা OTP দেবেন না।
                  </span>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto min-h-[46px] px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} />
                    <span>{submitting ? 'জমা হচ্ছে...' : 'পেমেন্ট তথ্য জমা দিন'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : null}

        {/* User's Own Payment Claim Status History (Private Self-Read) */}
        {currentUser && (claimsLoading || myClaims.length > 0) && (
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-black text-slate-900">
                আমার পেমেন্ট আবেদনের অবস্থা
              </h4>
              <button
                type="button"
                onClick={handleRefreshStatus}
                disabled={claimsLoading}
                className="min-h-[36px] px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw size={13} className={claimsLoading ? 'animate-spin' : ''} />
                <span>স্ট্যাটাস রিফ্রেশ</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {myClaims.map((claim) => (
                <div
                  key={claim.id}
                  className="p-3.5 sm:p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <PaymentProviderLogo provider={claim.provider} size="sm" />
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md font-semibold text-slate-700">
                        {PAYMENT_METHOD_LABELS[claim.payment_method] || claim.payment_method}
                      </span>
                      <span className="font-mono font-black text-slate-900">
                        TrxID: {claim.trx_id_normalized}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-extrabold ${
                        claim.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : claim.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {claim.status === 'approved' ? (
                        <CheckCircle2 size={13} />
                      ) : claim.status === 'rejected' ? (
                        <XCircle size={13} />
                      ) : (
                        <Clock size={13} />
                      )}
                      {PAYMENT_CLAIM_STATUS_LABELS[claim.status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                    <span>প্রেরকের নম্বর: <strong className="font-mono text-slate-800">{claim.payer_number}</strong></span>
                    <span>পরিমাণ: <strong className="text-slate-900">৳ {claim.submitted_amount_bdt}</strong></span>
                    <span>তারিখ: {new Date(claim.created_at).toLocaleString('bn-BD')}</span>
                  </div>

                  {claim.status === 'rejected' && claim.reject_reason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-semibold">
                      প্রত্যাখ্যানের কারণ: {claim.reject_reason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Help & Direct Support Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
          <a
            href={SUPPORT_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[52px] p-3.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessageCircle size={18} className="text-emerald-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-600 text-[11px] block">সরাসরি সহায়তা</span>
                <span className="font-extrabold text-slate-900">WhatsApp-এ মেসেজ দিন</span>
              </div>
            </div>
            <ExternalLink size={14} className="text-emerald-700 shrink-0" />
          </a>

          <a
            href={SUPPORT_MESSENGER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[52px] p-3.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-xl flex items-center justify-between gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
          >
            <div className="flex items-center gap-3 min-w-0">
              <MessagesSquare size={18} className="text-sky-700 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-600 text-[11px] block">ফেসবুক পেজ</span>
                <span className="font-extrabold text-slate-900">Messenger-এ বার্তা পাঠান</span>
              </div>
            </div>
            <ExternalLink size={14} className="text-sky-700 shrink-0" />
          </a>

          {supportEmail && (
            <a
              href={`mailto:${supportEmail}`}
              className="min-h-[52px] p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Mail size={18} className="text-orange-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-500 text-[11px] block">সাপোর্ট ইমেইল</span>
                <span className="font-bold text-slate-900 break-all">{supportEmail}</span>
              </div>
            </a>
          )}

          {supportPhone && (
            <a
              href={`tel:${supportPhone}`}
              className="min-h-[52px] p-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
            >
              <Phone size={18} className="text-orange-600 shrink-0" />
              <div className="min-w-0">
                <span className="text-slate-500 text-[11px] block">হটলাইন</span>
                <span className="font-bold text-slate-900">{supportPhone}</span>
              </div>
            </a>
          )}
        </div>

        {paymentInstructions && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-1.5">
            <div className="font-bold text-slate-900">পেমেন্ট ও ভর্তি নির্দেশিকা</div>
            <p className="leading-relaxed whitespace-pre-line text-slate-600">
              {paymentInstructions}
            </p>
          </div>
        )}

        <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
          <button
            type="button"
            onClick={() => onNavigate('/contact')}
            className="min-h-[44px] px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold rounded-xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send size={14} />
            <span>যোগাযোগ পেজে যান</span>
          </button>

          {!currentUser && (
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="min-h-[44px] px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer"
            >
              লগইন / রেজিস্ট্রেশন করুন
            </button>
          )}
        </div>
      </div>

      {/* Free Demo CTA */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-500">
          ভর্তির সিদ্ধান্ত নেওয়ার পূর্বে কোর্সের মান যাচাই করতে চান?{' '}
          <button
            onClick={() => onNavigate('/demo')}
            className="text-orange-600 hover:underline font-bold cursor-pointer"
          >
            ডেমো ক্লাস দেখুন
          </button>
        </p>
      </div>
    </div>
  );
};
