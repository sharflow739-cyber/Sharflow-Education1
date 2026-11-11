import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { 
  ArrowLeft, CheckCircle2, Phone, Mail, Clock, ShieldCheck, 
  HelpCircle, CreditCard, AlertCircle, FileText, Sparkles, Send,
  ExternalLink, UserCheck, Info
} from 'lucide-react';

interface EnrollPageProps {
  onNavigate: (path: string) => void;
  onOpenAuth: () => void;
}

export const EnrollPage: React.FC<EnrollPageProps> = ({ onNavigate, onOpenAuth }) => {
  const { settings } = useSettings();

  // Set the displayed course fee to ৳২,৬৫০ (one-time). If owner sets custom in settings, allow it or default to ২,৬৫০.
  const fee = (settings.course_fee_bdt || '').trim() || '২,৬৫০';
  const duration = (settings.course_duration_access || '').trim();
  const includesText = (settings.course_includes_text || '').trim();
  const refundText = (settings.refund_policy_text || '').trim();
  const paymentEnabled = Boolean(settings.enable_direct_payment);
  const paymentInstructions = (settings.payment_instructions || '').trim();

  // Verified Live Lemon Squeezy USD 20.33 checkout URL (can be customized via settings.lemonsqueezy_checkout_url)
  const defaultLiveCheckoutUrl = 'https://sharflow.lemonsqueezy.com/checkout/buy/290414a1-f82a-4414-bb9b-23e406df5be4';
  const customCheckoutUrl = (settings.lemonsqueezy_checkout_url || '').trim();
  const activeCheckoutUrl = customCheckoutUrl || defaultLiveCheckoutUrl;

  const hasContact = Boolean(
    (settings.contact_phone && settings.contact_phone.trim()) ||
    (settings.contact_email && settings.contact_email.trim())
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      
      {/* Top Navigation */}
      <div className="flex items-center justify-between gap-3">
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
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

      {/* Enrollment Action Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <CreditCard size={20} className="text-orange-500" />
          <span>ভর্তি প্রক্রিয়া ও পেমেন্ট</span>
        </h3>

        {paymentEnabled ? (
          /* Payment is actively enabled in settings */
          <div className="space-y-5">
            
            {/* If Lemon Squeezy checkout URL is available (configurable setting or live fallback) */}
            {activeCheckoutUrl ? (
              <div className="space-y-4">
                
                {/* Lemon Squeezy Main Checkout Button */}
                <div className="p-5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">
                        নিরাপদ অনলাইন চেকআউট (Lemon Squeezy)
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        কার্ড বা আন্তর্জাতিক পেমেন্টের মাধ্যমে সরাসরি ফি পরিশোধ করুন।
                      </p>
                    </div>

                    <a
                      href={activeCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-md shadow-orange-500/25 transition-all inline-flex items-center justify-center gap-2 active:scale-98 cursor-pointer shrink-0"
                    >
                      <span>কার্ডে $20.33 দিয়ে ভর্তি হন</span>
                      <ExternalLink size={16} />
                    </a>
                  </div>

                  {/* USD Payment Note */}
                  <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-amber-950">
                      <Info size={14} className="text-amber-700 shrink-0" />
                      <span>ডলারে কার্ড পেমেন্ট সংক্রান্ত তথ্য:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800">
                      ডলারে কার্ডে পেমেন্ট করলে কিছুটা সাশ্রয় হতে পারে। ব্যাংকের বিনিময় হার, কার্ড ফি ও প্রযোজ্য কর অনুযায়ী মোট খরচ বদলাতে পারে।
                    </p>
                  </div>

                  {/* Crucial Instructions regarding email matching and manual verification */}
                  <div className="pt-3 border-t border-orange-200/70 space-y-2 text-xs text-slate-700">
                    <div className="p-3 bg-white/90 rounded-xl border border-orange-200/80 space-y-1.5">
                      <div className="font-bold text-orange-950 flex items-center gap-1.5">
                        <UserCheck size={15} className="text-orange-600 shrink-0" />
                        <span>গুরুত্বপূর্ণ নির্দেশনা (ইমেইল মিল রাখা আবশ্যক):</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        ১. পেমেন্ট করার সময় Lemon Squeezy চেকআউট ফর্মে যে <strong>ইমেইল এড্রেস</strong> ব্যবহার করবেন, আমাদের ওয়েবসাইটেও ঠিক একই ইমেইল দিয়ে অ্যাকাউন্ট তৈরি/লগইন করুন।
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        ২. পেমেন্ট সম্পন্ন হওয়ার পর আমাদের এডমিন Lemon Squeezy-র পেইড অর্ডার যাচাই করবেন এবং ম্যানুয়ালি আপনার অ্যাকাউন্টের পেইড অ্যাক্সেস উন্মুক্ত করে দেবেন।
                      </p>
                      <p className="text-[11px] text-slate-500 italic">
                        * দ্রষ্টব্য: চেকআউট পেজে যাওয়া বা রিডাইরেক্ট হওয়া মাত্রই স্বয়ংক্রিয়ভাবে ক্লাসের এক্সেস পাওয়া যাবে না; এডমিন অর্ডার ভেরিফাই করে অনুমোদন করবেন।
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional manual instructions if configured */}
                {paymentInstructions && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 space-y-2">
                    <div className="font-bold text-slate-900">অন্যান্য পেমেন্ট বিকল্প (বিকাশ/নগদ/ব্যাংক):</div>
                    <p className="leading-relaxed whitespace-pre-line text-slate-600">
                      {paymentInstructions}
                    </p>
                  </div>
                )}

                {/* Site Account Prompt */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <span className="text-slate-600 font-medium">
                    ইতিমধ্যে পেমেন্ট করেছেন বা ওয়েবসাইটে অ্যাকাউন্ট খুলতে চান?
                  </span>
                  <button
                    onClick={onOpenAuth}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all cursor-pointer shrink-0"
                  >
                    লগইন / রেজিস্ট্রেশন করুন
                  </button>
                </div>
              </div>
            ) : (
              /* Payment is enabled but no Lemon Squeezy URL configured: manual payment instructions */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-2">
                  <div className="font-bold text-sm">অনলাইন পেমেন্ট নির্দেশিকা</div>
                  <p className="leading-relaxed whitespace-pre-line text-emerald-900">
                    {paymentInstructions || 'নিচের নির্দেশিকা অনুসরণ করে পেমেন্ট সম্পন্ন করুন এবং আপনার ট্রানজ্যাকশন আইডি ও তথ্য জমা দিন।'}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={onOpenAuth}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    লগইন বা অ্যাকাউন্ট তৈরি করে ভর্তি সম্পন্ন করুন
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : hasContact ? (
          /* Payment is disabled by default, but verified contact details exist */
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-950 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle size={15} className="shrink-0" />
                <span>ভর্তির আগ্রহ জানান (Direct Assistance)</span>
              </div>
              <p className="leading-relaxed text-amber-800">
                স্বয়ংক্রিয় অনলাইন পেমেন্ট বর্তমানে প্রক্রিয়াধীন রয়েছে। কোর্সে ভর্তি হতে বা আসন সংরক্ষণ করতে সরাসরি আমাদের হটলাইন বা ইমেইলে যোগাযোগ করুন।
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {settings.contact_phone && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <Phone size={18} className="text-orange-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">ফোন বা হোয়াটসঅ্যাপ</span>
                    <a
                      href={`tel:${settings.contact_phone}`}
                      className="font-bold text-slate-900 hover:text-orange-600"
                    >
                      {settings.contact_phone}
                    </a>
                  </div>
                </div>
              )}

              {settings.contact_email && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3">
                  <Mail size={18} className="text-orange-500 shrink-0" />
                  <div>
                    <span className="text-slate-500 text-[11px] block">সাপোর্ট ইমেইল</span>
                    <a
                      href={`mailto:${settings.contact_email}`}
                      className="font-bold text-slate-900 hover:text-orange-600"
                    >
                      {settings.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('/contact')}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <Send size={14} />
                <span>যোগাযোগ পেজে বার্তা পাঠান</span>
              </button>
            </div>
          </div>
        ) : (
          /* Payment is disabled and no verified contact is provided */
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center font-bold">
              <Clock size={24} />
            </div>
            <h4 className="font-extrabold text-sm text-slate-800">
              ভর্তি এখনও আনুষ্ঠানিকভাবে খোলেনি
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              ১২ নভেম্বরের আনুষ্ঠানিক লঞ্চের পূর্বে কোর্স ফি ও পেমেন্ট মাধ্যম নির্ধারণের কাজ চলছে। শীঘ্রই এই পেজে বিস্তারিত প্রকাশ করা হবে।
            </p>
          </div>
        )}
      </div>

      {/* Free Demo CTA */}
      <div className="text-center pt-2">
        <p className="text-xs text-slate-500">
          ভর্তির সিদ্ধান্ত নেওয়ার পূর্বে কোর্সের মান যাচাই করতে চান?{' '}
          <button
            onClick={() => onNavigate('/demo')}
            className="text-orange-600 hover:underline font-bold cursor-pointer"
          >
            ফ্রি ডেমো ক্লাস দেখুন
          </button>
        </p>
      </div>
    </div>
  );
};
