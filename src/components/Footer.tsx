import React from 'react';
import { Phone, Mail, ShieldCheck, Award, Heart, Clock } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export const Footer: React.FC = () => {
  const { settings } = useSettings();

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
            <div className="flex items-center gap-4 text-slate-300 font-medium flex-wrap">
              {settings.show_secure_badge && (
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  {settings.secure_badge_label}
                </span>
              )}
              {settings.show_certified_badge && (
                <span className="flex items-center gap-1.5">
                  <Award size={14} className="text-amber-400" />
                  {settings.certified_badge_label}
                </span>
              )}
            </div>
          </div>

          {/* Col 2: Quick Contact */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">যোগাযোগ ও হেল্পডেস্ক</h4>
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
          </div>

          {/* Col 3: Notice */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">
              {settings.security_notice_title || 'কোর্স সিকিউরিটি তথ্য'}
            </h4>
            <p className="text-slate-400 text-[11px] leading-normal">
              {settings.security_notice_text}
            </p>
          </div>

        </div>

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
