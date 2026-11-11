import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  ArrowLeft, Phone, Mail, Clock, Shield, FileText, 
  RotateCcw, Send, CheckCircle2, AlertCircle 
} from 'lucide-react';

interface PolicyPagesProps {
  type: 'contact' | 'privacy' | 'terms' | 'refund';
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export const PolicyPages: React.FC<PolicyPagesProps> = ({ type, onNavigate }) => {
  const { settings } = useSettings();

  // Contact form submission state
  const [contactName, setContactName] = useState('');
  const [contactPhoneOrEmail, setContactPhoneOrEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhoneOrEmail.trim()) return;
    setSubmitted(true);
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
                <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                  <CheckCircle2 size={24} className="text-emerald-600 mx-auto" />
                  <h4 className="font-bold text-emerald-900 text-sm">আপনার বার্তা গ্রহণ করা হয়েছে</h4>
                  <p className="text-xs text-emerald-800">
                    আমাদের প্রতিনিধি শীঘ্রই আপনার সাথে যোগাযোগ করবেন। ধন্যবাদ।
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 max-w-lg">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">আপনার নাম *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="আপনার পূর্ণ নাম"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">মোবাইল নম্বর অথবা ইমেইল *</label>
                    <input
                      type="text"
                      required
                      value={contactPhoneOrEmail}
                      onChange={(e) => setContactPhoneOrEmail(e.target.value)}
                      placeholder="যেমন: 01712345678 বা yourname@email.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">আপনার জিজ্ঞাসা বা মন্তব্য</label>
                    <textarea
                      rows={3}
                      value={contactMsg}
                      onChange={(e) => setContactMsg(e.target.value)}
                      placeholder="কোর্স বা ভর্তি বিষয়ে যেকোনো প্রশ্ন লিখুন..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-orange-500 font-medium"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Send size={14} />
                    <span>বার্তা পাঠান</span>
                  </button>
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
