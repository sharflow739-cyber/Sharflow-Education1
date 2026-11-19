import React from 'react';
import { Phone, Mail, Clock, ShieldCheck, Heart, FileText, Shield, RotateCcw } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

const BRAND_LOGO_PATH = '/assets/aistudio/sharflow-logo-1_4c5c869d.png';

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { settings } = useSettings();

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#141517] text-[#C8C3B8] text-xs border-t border-[#D4AF5F]/25 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Platform Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <div className="w-[100px] h-[56px] sm:w-[116px] sm:h-[65px] rounded-xl bg-[#18191C] border border-[#D4AF5F]/40 p-1 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={BRAND_LOGO_PATH}
                  alt="Shar Flow"
                  width={1000}
                  height={559}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-extrabold text-[#FAF7F0] text-base leading-snug">
                Shar Flow
              </span>
            </div>
            <p className="text-[#BDB6A8] leading-relaxed max-w-md">
              অ্যাবাকাস ব্যবহারের সহজ গাইড, বই ও অনুশীলন—এক জায়গায়।
            </p>
            {settings.show_secure_badge && (
              <div className="flex items-center gap-4 text-[#EAE4D7] font-medium flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#E0B960]" />
                  {settings.secure_badge_label || 'সুরক্ষিত এক্সেস'}
                </span>
              </div>
            )}
          </div>

          {/* Col 2: Quick Links / Policy Pages */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#FAF7F0] text-sm">গুরুত্বপূর্ণ লিংক ও নীতিমালা</h4>
            <ul className="space-y-2 text-[#C8C3B8]">
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="hover:text-[#F2D283] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone size={13} className="text-[#E0B960] shrink-0" />
                  <span>যোগাযোগ ও সহায়তা</span>
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLinkClick(e, '/terms')}
                  className="hover:text-[#F2D283] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={13} className="text-[#E0B960] shrink-0" />
                  <span>ব্যবহারের শর্তাবলি (Terms)</span>
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLinkClick(e, '/privacy')}
                  className="hover:text-[#F2D283] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield size={13} className="text-[#E0B960] shrink-0" />
                  <span>গোপনীয়তা নীতি (Privacy)</span>
                </a>
              </li>
              <li>
                <a
                  href="/refund"
                  onClick={(e) => handleLinkClick(e, '/refund')}
                  className="hover:text-[#F2D283] transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} className="text-[#E0B960] shrink-0" />
                  <span>রিফান্ড নীতিমালা (Refund)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Helpdesk (renders only verified details if provided) */}
          <div className="space-y-2">
            <h4 className="font-bold text-[#FAF7F0] text-sm">যোগাযোগ ও হেল্পডেস্ক</h4>
            {settings.contact_phone || settings.contact_email || settings.contact_hours ? (
              <ul className="space-y-2 text-[#C8C3B8]">
                {settings.contact_phone && (
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-[#E0B960] shrink-0" />
                    <span>হটলাইন: {settings.contact_phone}</span>
                  </li>
                )}
                {settings.contact_email && (
                  <li className="flex items-center gap-2">
                    <Mail size={14} className="text-[#E0B960] shrink-0" />
                    <span className="break-all">ইমেইল: {settings.contact_email}</span>
                  </li>
                )}
                {settings.contact_hours && (
                  <li className="flex items-center gap-2 text-[11px] text-[#ADA697]">
                    <Clock size={13} className="text-[#D4AF5F] shrink-0" />
                    <span>সময়সূচী: {settings.contact_hours}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-[#ADA697] text-[11px] leading-relaxed">
                জরুরি যোগাযোগের হটলাইন ও ইমেইল দ্রুত যুক্ত করা হবে। যেকোনো তথ্যের জন্য সরাসরি মেসেজ বা সাপোর্ট পেজে যোগাযোগ করুন।
              </p>
            )}
          </div>
        </div>

        {/* Security Notice */}
        <div className="py-4 border-t border-[#2B2924] text-[11px] text-[#BDB6A8] leading-relaxed">
          শেখার ভিডিও ব্যক্তিগত ব্যবহারের জন্য। অনুমতি ছাড়া কপি বা শেয়ার করা যাবে না।
        </div>

        {/* Bottom copyright & credit */}
        <div className="pt-6 border-t border-[#2B2924] flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-center sm:text-left">
          <p>© {new Date().getFullYear()} {settings.copyright_text}</p>
          <p className="flex items-center gap-1 text-[#ADA697]">
            {settings.footer_tagline} <Heart size={12} className="text-[#E0B960] fill-[#E0B960]" />
          </p>
        </div>
      </div>
    </footer>
  );
};
