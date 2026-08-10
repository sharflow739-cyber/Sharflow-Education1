import React from 'react';
import { Phone, Mail, ShieldCheck, Award, Heart } from 'lucide-react';

interface FooterProps {
  onOpenAdminSecret?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminSecret }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Col 1: Platform Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-lg">
                🧮
              </div>
              <span className="font-extrabold text-white text-base">
                অ্যাবাকাস Parent Training
              </span>
            </div>
            <p className="text-slate-400 leading-relaxed max-w-md">
              অভিভাবকদের জন্য তৈরি একটি স্ট্রাকচার্ড অনলাইন ট্রেনিং প্ল্যাটফর্ম। বিজ্ঞানসম্মত অ্যাবাকাস পদ্ধতির মাধ্যমে আপনার সন্তানকে মানসিকভাবে দ্রুত ও নির্ভুল গণিতে পারদর্শী করে তুলুন।
            </p>
            <div className="flex items-center gap-4 text-slate-300 font-medium">
              <span className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-emerald-400" /> সুরক্ষিত এক্সেস</span>
              <span className="flex items-center gap-1.5"><Award size={14} className="text-amber-400" /> সার্টিফাইড কোর্স</span>
            </div>
          </div>

          {/* Col 2: Quick Contact */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">যোগাযোগ ও হেল্পডেস্ক</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-orange-500" />
                <span>হটলাইন: +880 1712-345678</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-orange-500" />
                <span>ইমেইল: support@abacus.bd</span>
              </li>
              <li className="text-[11px] text-slate-500">
                সময়সূচী: সকাল ১০:০০ - রাত ৯:০০ (প্রতিদিন)
              </li>
            </ul>
          </div>

          {/* Col 3: Notice */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-200 text-sm">কোর্স সিকিউরিটি তথ্য</h4>
            <p className="text-slate-400 text-[11px] leading-normal">
              এই কোর্সের সকল ভিডিও কনটেন্ট নিবন্ধিত অভিভাবকের ব্যক্তিগত শিক্ষার উদ্দেশ্যে তৈরি। ভিডিও ডাউনলোড বা অনুমতি ব্যতীত প্রচার সম্পূর্ণ নিষিদ্ধ।
            </p>
          </div>

        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <p>© {new Date().getFullYear()} Abacus Parent Training Program. সর্বস্বত্ব সংরক্ষিত।</p>
          <div className="flex items-center gap-4">
            <p className="flex items-center gap-1 text-slate-500">
              শিক্ষার্থীদের ভবিষ্যতের জন্য তৈরি <Heart size={12} className="text-rose-500 fill-rose-500" />
            </p>
            {onOpenAdminSecret && (
              <button
                onClick={onOpenAdminSecret}
                className="text-slate-700 hover:text-slate-300 font-mono transition-colors px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px] cursor-pointer"
                title="Secret Admin Login (000)"
              >
                000
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

