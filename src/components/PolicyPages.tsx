import React, { useRef, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useConsent } from '../contexts/ConsentContext';
import {
  CONTACT_FALLBACK_EMAIL,
  CONTACT_LIMITS,
  validateContactForm,
} from '../lib/contactForm';
import { 
  ArrowLeft, Phone, Mail, Clock, 
  Send, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface PolicyPagesProps {
  type: 'contact' | 'privacy' | 'terms' | 'refund';
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export const PolicyPages: React.FC<PolicyPagesProps> = ({ type, onNavigate }) => {
  const { settings } = useSettings();
  const {
    isMarketingPermitted,
    isBrowserOptOut,
    grantMarketingConsent,
    withdrawMarketingConsent,
  } = useConsent();

  // Contact form submission state
  const [contactName, setContactName] = useState('');
  const [contactPhoneOrEmail, setContactPhoneOrEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);

  const directFallbackEmail = (settings.contact_email || '').trim() || CONTACT_FALLBACK_EMAIL;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submittingRef.current) return;

    setSubmitError(null);

    const validation = validateContactForm({
      name: contactName,
      contact: contactPhoneOrEmail,
      message: contactMsg,
      website: honeypot,
    });

    if ('error' in validation) {
      setSubmitError(validation.error);
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: validation.value.name,
          contact: validation.value.contact,
          message: validation.value.message,
          website: honeypot,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: string }
        | null;

      if (!response.ok || data?.success !== true) {
        setSubmitError(
          data?.error ||
            'বার্তা পাঠানো যায়নি। অনুগ্রহ করে নিচের সরাসরি ইমেইলে যোগাযোগ করুন।'
        );
        return;
      }

      setSubmitted(true);
      setContactName('');
      setContactPhoneOrEmail('');
      setContactMsg('');
      setHoneypot('');
    } catch {
      setSubmitError(
        'নেটওয়ার্ক সমস্যার কারণে বার্তা পাঠানো যায়নি। অনুগ্রহ করে নিচের সরাসরি ইমেইল ব্যবহার করুন।'
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const titles: Record<typeof type, string> = {
    contact: 'যোগাযোগ ও হেল্পডেস্ক',
    privacy: 'গোপনীয়তা নীতিমালা (Privacy Policy)',
    terms: 'ব্যবহারের শর্তাবলি (Terms of Service)',
    refund: 'রিফান্ড নীতিমালা (Refund Policy)',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Back button */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => onNavigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>মূল পাতায় ফিরে যান</span>
        </button>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-extrabold">
          {titles[type]}
        </span>
      </div>

      {/* Page Title */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
          {titles[type]}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          {settings.site_name || 'অ্যাবাকাস Parent Training'} প্ল্যাটফর্মের প্রাতিষ্ঠানিক ও আইনি তথ্যাবলি।
        </p>
      </div>

      {/* Main Content Body */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-10 space-y-6 text-xs text-slate-700 leading-relaxed">
        
        {/* ======================================================== */}
        {/* 1. CONTACT PAGE */}
        {/* ======================================================== */}
        {type === 'contact' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-orange-900 font-bold text-sm">
                  <Phone size={16} className="text-orange-600" />
                  <span>হটলাইন</span>
                </div>
                {settings.contact_phone ? (
                  <a
                    href={`tel:${settings.contact_phone}`}
                    className="font-extrabold text-slate-900 text-sm hover:text-orange-600 block"
                  >
                    {settings.contact_phone}
                  </a>
                ) : (
                  <p className="text-slate-500 text-xs">শীঘ্রই হটলাইন নম্বর প্রকাশ করা হবে।</p>
                )}
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-100 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                  <Mail size={16} className="text-amber-600" />
                  <span>ইমেইল</span>
                </div>
                {settings.contact_email ? (
                  <a
                    href={`mailto:${settings.contact_email}`}
                    className="font-extrabold text-slate-900 text-sm hover:text-orange-600 block break-all"
                  >
                    {settings.contact_email}
                  </a>
                ) : (
                  <p className="text-slate-500 text-xs">শীঘ্রই সাপোর্ট ইমেইল প্রকাশ করা হবে।</p>
                )}
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-100 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <Clock size={16} className="text-emerald-600" />
                  <span>সময়সূচী</span>
                </div>
                <p className="font-bold text-slate-800 text-xs">
                  {settings.contact_hours || 'সকাল ১০:০০ - রাত ৮:০০ (প্রতিদিন)'}
                </p>
              </div>
            </div>

            {/* Message Box */}
            <div className="border-t border-slate-100 pt-6 space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm">আমাদের কাছে সরাসরি বার্তা পাঠান</h3>
              {submitted ? (
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2.5">
                  <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">আপনার বার্তা সফলভাবে পাঠানো হয়েছে</h4>
                  <p className="text-xs text-emerald-800">
                    আমাদের প্রতিনিধি আপনার বার্তা পেয়েছেন এবং শীঘ্রই যোগাযোগ করবেন।
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubmitted(false)}
                    className="mt-1 px-4 py-2 bg-white border border-emerald-300 text-emerald-900 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
                  >
                    নতুন বার্তা পাঠান
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 max-w-lg relative">
                  {/* Honeypot field for automated bot filtering */}
                  <div
                    aria-hidden="true"
                    className="absolute -left-[9999px] w-px h-px overflow-hidden"
                  >
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </div>

                  {submitError && (
                    <div
                      role="alert"
                      className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1.5"
                    >
                      <div className="font-bold flex items-start gap-2">
                        <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                        <span>{submitError}</span>
                      </div>
                      <p className="text-[11px] text-rose-800 pl-5">
                        সরাসরি ইমেইল করতে পারেন:{' '}
                        <a
                          href={`mailto:${directFallbackEmail}`}
                          className="font-extrabold underline break-all"
                        >
                          {directFallbackEmail}
                        </a>
                      </p>
                    </div>
                  )}

                  <div>
                    <label htmlFor="contact-name-input" className="block font-bold text-slate-700 mb-1">
                      আপনার নাম *
                    </label>
                    <input
                      id="contact-name-input"
                      type="text"
                      required
                      minLength={CONTACT_LIMITS.NAME_MIN}
                      maxLength={CONTACT_LIMITS.NAME_MAX}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="আপনার পূর্ণ নাম"
                      className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-identifier-input" className="block font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর অথবা ইমেইল *
                    </label>
                    <input
                      id="contact-identifier-input"
                      type="text"
                      required
                      minLength={CONTACT_LIMITS.CONTACT_MIN}
                      maxLength={CONTACT_LIMITS.CONTACT_MAX}
                      value={contactPhoneOrEmail}
                      onChange={(e) => setContactPhoneOrEmail(e.target.value)}
                      placeholder="যেমন: 01712345678 বা yourname@email.com"
                      className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message-input" className="block font-bold text-slate-700 mb-1">
                      আপনার জিজ্ঞাসা বা মন্তব্য *
                    </label>
                    <textarea
                      id="contact-message-input"
                      rows={4}
                      required
                      minLength={CONTACT_LIMITS.MESSAGE_MIN}
                      maxLength={CONTACT_LIMITS.MESSAGE_MAX}
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      placeholder="কোর্স বা ভর্তি বিষয়ে আপনার প্রশ্ন বিস্তারিত লিখুন (কমপক্ষে ১০ অক্ষর)..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="min-h-[44px] px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Send size={14} />
                      <span>{submitting ? 'পাঠানো হচ্ছে...' : 'বার্তা পাঠান'}</span>
                    </button>

                    <span className="text-[11px] text-slate-500">
                      সরাসরি ইমেইল:{' '}
                      <a
                        href={`mailto:${directFallbackEmail}`}
                        className="font-bold text-slate-700 hover:text-orange-600 underline break-all"
                      >
                        {directFallbackEmail}
                      </a>
                    </span>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. PRIVACY POLICY */}
        {/* ======================================================== */}
        {type === 'privacy' && (
          <div className="space-y-5">
            {settings.privacy_policy_text ? (
              <div className="whitespace-pre-line leading-relaxed">
                {settings.privacy_policy_text}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">১. তথ্যের গোপনীয়তা ও সংগ্রহ</h3>
                  <p className="text-slate-600">
                    {settings.site_name || 'অ্যাবাকাস Parent Training'} প্ল্যাটফর্ম ব্যবহারকারীদের তথ্যের সুরক্ষায় প্রতিশ্রুতিবদ্ধ। অ্যাকাউন্টে লগইন, কোর্স এক্সেস প্রদান এবং যোগাযোগ নিশ্চিত করার উদ্দেশ্যে কেবল প্রয়োজনীয় তথ্য (যেমন: নাম, ইমেইল ও মোবাইল নম্বর) সংগ্রহ করা হয়।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">২. তথ্যের ব্যবহার</h3>
                  <p className="text-slate-600">
                    সংগৃহীত তথ্য কেবলমাত্র কোর্স পরিচালনা, ভেরিফিকেশন কোড প্রেরণ এবং জরুরি নোটিশ প্রদানের উদ্দেশ্যে ব্যবহার করা হয়। কোনো তৃতীয় পক্ষের কাছে ব্যবহারকারীর ব্যক্তিগত তথ্য বিক্রয় বা হস্তান্তর করা হয় না।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">৩. সিকিউরিটি ও ভিডিও নিরাপত্তা</h3>
                  <p className="text-slate-600">
                    কোর্সের কন্টেন্ট ও অ্যাকাউন্টের নিরাপত্তা নিশ্চিত করতে আধুনিক এনক্রিপশন ও সিকিউর সেশন ব্যবস্থা ব্যবহৃত হয়। অননুমোদিত প্রচার রোধে ভিডিও স্ক্রিনে নিরাপদ ওয়াটারমার্ক প্রদর্শন করা হতে পারে।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
                  সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬। প্ল্যাটফর্ম কর্তৃপক্ষ প্রয়োজনানুসারে নীতিমালা হালনাগাদ করার অধিকার সংরক্ষণ করে।
                </div>
              </>
            )}

            {/* Visitor Tracking Control (accessible on Privacy page without cluttering footer) */}
            <div className="p-4 sm:p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">
                    পাবলিক পেজ অ্যানালিটিক্স ও মার্কেটিং ট্র্যাকিং পছন্দসমূহ
                  </h3>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    পাবলিক পেজ ভিজিট এবং ফ্রি ডেমো নিবন্ধন পরিসংখ্যানের জন্য নিরাপদ Meta Pixel ব্যবহৃত হয়। কোনো ব্যক্তিগত নাম, ইমেইল, ফোন নম্বর, পাসওয়ার্ড বা লগইন টোকেন পাঠানো হয় না এবং ব্রাউজারের গোপনীয়তা সংকেত (GPC) সম্মান করা হয়।
                  </p>
                </div>
                <div className="shrink-0 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 px-2.5 py-1 bg-white border border-slate-200 rounded-lg">
                    অবস্থা:{' '}
                    <strong className="text-slate-900">
                      {isMarketingPermitted
                        ? 'চালু'
                        : isBrowserOptOut
                        ? 'বন্ধ (ব্রাউজার গোপনীয়তা)'
                        : 'বন্ধ'}
                    </strong>
                  </span>
                  {isMarketingPermitted ? (
                    <button
                      type="button"
                      onClick={withdrawMarketingConsent}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
                    >
                      ট্র্যাকিং বন্ধ করুন (Opt-out)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={grantMarketingConsent}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
                    >
                      ট্র্যাকিং চালু করুন
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. TERMS OF SERVICE */}
        {/* ======================================================== */}
        {type === 'terms' && (
          <div className="space-y-5">
            {settings.terms_policy_text ? (
              <div className="whitespace-pre-line leading-relaxed">
                {settings.terms_policy_text}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">১. সেবার শর্তাবলি গ্রহণ</h3>
                  <p className="text-slate-600">
                    এই প্ল্যাটফর্মে অ্যাকাউন্ট তৈরি বা কোর্স ব্যবহারের মাধ্যমে আপনি এই শর্তাবলি মেনে নিচ্ছেন। এই কোর্সটি সম্পূর্ণ অভিভাবকের ব্যক্তিগত শিক্ষা ও সন্তানকে ঘরে প্রশিক্ষণের উদ্দেশ্যে তৈরি।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">২. মেধা সম্পদ ও স্বত্বাধিকার</h3>
                  <p className="text-slate-600">
                    কোর্সের সকল ভিডিও লেকচার, পাঠ্যক্রম, ওয়ার্কশিট এবং ভার্চুয়াল টুল {settings.site_name || 'প্ল্যাটফর্ম কর্তৃপক্ষের'} স্বত্বাধিকারভুক্ত। প্ল্যাটফর্মের কোনো ভিডিও ডাউনলোড, কপি, অননুমোদিত রি-আপলোড বা বাণিজ্যিক উদ্দেশ্যে প্রচার আইনত দণ্ডনীয় অপরাধ।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">৩. একাউন্ট ও এক্সেস নিয়মাবলি</h3>
                  <p className="text-slate-600">
                    এক অ্যাকাউন্টের ক্রেডেনশিয়াল একাধিক ব্যক্তির সাথে ভাগাভাগি করা বা অননুমোদিত উপায়ে এক্সেসের চেষ্টা করা হলে সংশ্লিষ্ট অ্যাকাউন্টটি তাৎক্ষণিকভাবে নিষ্ক্রিয় করা হতে পারে।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
                  সর্বশেষ হালনাগাদ: নভেম্বর ২০২৬।
                </div>
              </>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. REFUND POLICY */}
        {/* ======================================================== */}
        {type === 'refund' && (
          <div className="space-y-5">
            {settings.refund_policy_text ? (
              <div className="whitespace-pre-line leading-relaxed">
                {settings.refund_policy_text}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">১. ডিজিটাল কোর্স রিফান্ড নিয়মাবলি</h3>
                  <p className="text-slate-600">
                    যেহেতু এটি একটি সম্পূর্ণ ডিজিটাল ও অবিলম্বে প্রবেশাধিকারযোগ্য ভিডিও কোর্স, তাই কোনো কোর্স কেনার আগে ফ্রি ডেমো ক্লাস ও কোর্সের বিশদ বিবরণ দেখে নেওয়ার অনুরোধ করা হচ্ছে।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">২. বিশেষ ক্ষেত্র ও আবেদন পদ্ধতি</h3>
                  <p className="text-slate-600">
                    প্রযুক্তিগত কোনো জটিলতার কারণে যদি কোনো শিক্ষার্থী পেমেন্ট করার পরও কোর্স এক্সেস করতে অসমর্থ হন এবং আমাদের সাপোর্ট টিম ৭২ ঘণ্টার মধ্যে সমস্যার সমাধান দিতে ব্যর্থ হয়, তবে যাচাই সাপেক্ষে রিফান্ড আবেদন বিবেচনা করা হবে।
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-slate-900 text-sm">৩. রিফান্ডের যোগাযোগ</h3>
                  <p className="text-slate-600">
                    রিফান্ড সংক্রান্ত যেকোনো আবেদনের জন্য ট্রানজ্যাকশন স্লিপ ও অ্যাকাউন্টের ইমেইল সহ সরাসরি আমাদের সাপোর্ট ইমেইল বা হেল্পডেস্কে যোগাযোগ করতে হবে।
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
                  কর্তৃপক্ষ যাচাইকরণ শেষে ৩-৭ কার্যদিবসের মধ্যে সিদ্ধান্ত অবগত করবে।
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
