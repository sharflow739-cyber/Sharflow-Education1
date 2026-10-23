import React from 'react';
import { Database, AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';

export const SetupRequiredView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-orange-100 space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              সেটআপ অসম্পূর্ণ (Supabase Setup Required)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              নিরাপদ অথেনটিকেশন ও ডাটাবেজ পরিচালনার জন্য Supabase কনফিগারেশন প্রয়োজন।
            </p>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle size={16} className="text-amber-600 shrink-0" />
            <span>পরিবেশ ভেরিয়েবল (Environment Variables) পাওয়া যায়নি:</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed pl-6">
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> এবং{' '}
            <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code>{' '}
            সেট করা হয়নি। কোনো ফেক বা ডেমো মোড চালু নেই যাতে সাইটের নিরাপত্তা শতভাগ নিশ্চিত থাকে।
          </p>
        </div>

        {/* Setup Steps Checklist */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            সেটআপ নির্দেশিকা (৫টি সহজ ধাপ)
          </h2>

          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">১</span>
                <span>ইমেইল নিশ্চিতকরণ চালু করুন (Confirm Email: ON)</span>
              </div>
              <p className="text-slate-500 pl-7 text-[11px] leading-relaxed">
                Supabase → <strong>Authentication</strong> → <strong>Providers</strong> → <strong>Email</strong>: 
                <span className="text-orange-600 font-semibold"> Confirm email ON </span> করুন (যাতে কেউ অনুমোদন ছাড়া ওনার ইমেইল দিয়ে অ্যাকাউন্ট দাবি করতে না পারে)।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">২</span>
                <span>সাইট ও রিডাইরেক্ট ইউআরএল সেট করুন</span>
              </div>
              <p className="text-slate-500 pl-7 text-[11px] leading-relaxed">
                Supabase → <strong>Authentication</strong> → <strong>URL Configuration</strong>: Site URL এবং Redirect URLs এ আপনার Vercel ডোমেইন লিংক যুক্ত করুন।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">৩</span>
                <span>SQL স্কিমা রান করুন</span>
              </div>
              <p className="text-slate-500 pl-7 text-[11px] leading-relaxed">
                <code className="bg-slate-200 px-1 rounded font-mono">src/lib/supabase-schema.sql</code> ফাইলের সম্পূর্ণ SQL কোডটি কপি করে Supabase এর <strong>SQL Editor</strong>-এ পেস্ট করে রান (RUN) করুন।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">৪</span>
                <span>Vercel Environment Variables যোগ করুন</span>
              </div>
              <p className="text-slate-500 pl-7 text-[11px] leading-relaxed">
                Vercel → Project → <strong>Settings</strong> → <strong>Environment Variables</strong>:<br />
                - <code className="bg-slate-200 px-1 rounded font-mono">VITE_SUPABASE_URL</code><br />
                - <code className="bg-slate-200 px-1 rounded font-mono">VITE_SUPABASE_ANON_KEY</code><br />
                - <code className="bg-slate-200 px-1 rounded font-mono">VITE_OWNER_EMAIL</code> (ডিফল্ট: rssharifu@gmail.com)<br />
                এরপর Vercel-এ Redeploy করুন।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px]">৫</span>
                <span>ওনার অ্যাকাউন্ট ও ক্লাস সেটআপ</span>
              </div>
              <p className="text-slate-500 pl-7 text-[11px] leading-relaxed">
                <strong className="text-orange-600">rssharifu@gmail.com</strong> দিয়ে সাইটে রেজিস্ট্রেশন/লগইন করুন (এটি স্বয়ংক্রিয়ভাবে প্রধান এডমিন হবে)। এরপর এডমিন প্যানেলের "ক্লাস" ট্যাবে <strong>"নমুনা ক্লাস ইমপোর্ট"</strong> বাটনে ক্লিক করে পূর্ববর্তী ক্লাসগুলো যুক্ত করে নিন।
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম</span>
          <span className="flex items-center gap-1 font-semibold text-orange-600">
            <CheckCircle2 size={14} /> সুরক্ষিত প্রোডাকশন আর্কিটেকচার
          </span>
        </div>

      </div>
    </div>
  );
};
