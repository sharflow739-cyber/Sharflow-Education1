import React from 'react';
import { Phone, Mail, Clock, ShieldCheck, Heart, FileText, Shield, RotateCcw } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface FooterProps {
  onNavigate?: (path: string) => void;
}

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
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Platform Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-lg">
                {settings.logo_emoji || '🧮'}
              </div>
              <span className="font-extrabold text-white text-base">
                {settings.site_name || 'অ্যাবাকাস Parent Training'}
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md">
              {settings.footer_description}
            </p>
            {settings.show_secure_badge && (
              <div className="flex items-center gap-4 text-slate-300 font-medium flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  {settings.secure_badge_label || 'সুরক্ষিত এক্সেস'}
                </span>
              </div>
            )}
          </div>

          {/* Col 2: Quick Links / Policy Pages */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">গুরুত্বপূর্ণ লিংক ও নীতিমালা</h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, '/contact')}
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone size={13} className="text-orange-500 shrink-0" />
                  <span>যোগাযোগ ও সহায়তা</span>
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  onClick={(e) => handleLinkClick(e, '/terms')}
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText size={13} className="text-orange-500 shrink-0" />
                  <span>ব্যবহারের শর্তাবলি (Terms)</span>
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  onClick={(e) => handleLinkClick(e, '/privacy')}
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield size={13} className="text-orange-500 shrink-0" />
                  <span>গোপনীয়তা নীতি (Privacy)</span>
                </a>
              </li>
              <li>
                <a
                  href="/refund"
                  onClick={(e) => handleLinkClick(e, '/refund')}
                  className="hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={13} className="text-orange-500 shrink-0" />
                  <span>রিফান্ড নীতিমালা (Refund)</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact & Helpdesk (renders only verified details if provided) */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">যোগাযোগ ও হেল্পডেস্ক</h4>
            {settings.contact_phone || settings.contact_email || settings.contact_hours ? (
              <ul className="space-y-2 text-slate-400">
                {settings.contact_phone && (
                  <li className="flex items-center gap-2">
                    <Phone size={14} className="text-orange-500 shrink-0" />
                    <span>হটলাইন: {settings.contact_phone}</span>
                  </li>
                )}
                {settings.contact_email && (
                  <li className="flex items-center gap-2">
                    <Mail size={14} className="text-orange-500 shrink-0" />
                    <span>ইমেইল: {settings.contact_email}</span>
                  </li>
                )}
                {settings.contact_hours && (
                  <li className="flex items-center gap-2 text-[11px] text-slate-500">
                    <Clock size={13} className="text-slate-400 shrink-0" />
                    <span>সময়সূচী: {settings.contact_hours}</span>
                  </li>
                )}
              </ul>
            ) : (
              <p className="text-slate-500 text-[11px] leading-relaxed">
                জরুরি যোগাযোগের হটলাইন ও ইমেইল দ্রুত যুক্ত করা হবে। যেকোনো তথ্যের জন্য সরাসরি মেসেজ বা সাপোর্ট পেজে যোগাযোগ করুন।
              </p>
            )}
          </div>
        </div>

        {/* Security Notice */}
        {settings.security_notice_text && (
          <div className="py-4 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
            <span className="font-bold text-slate-300">
              {settings.security_notice_title || 'কোর্স সিকিউরিটি তথ্য'}:{' '}
            </span>
            {settings.security_notice_text}
          </div>
        )}

        {/* Bottom copyright & credit */}
        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} {settings.copyright_text}</p>
          <div className="flex items-center gap-4">
            <p className="flex items-center gap-1 text-slate-500">
              {settings.footer_tagline} <Heart size={12} className="text-rose-500 fill-rose-500" />
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
