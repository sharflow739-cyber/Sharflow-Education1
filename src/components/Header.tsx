import React from 'react';
import { UserProfile } from '../types';
import { LogOut, User, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  activeView: 'dashboard' | 'class' | 'admin';
  setActiveView: (view: 'dashboard' | 'class' | 'admin') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  activeView,
  setActiveView,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Platform Name */}
          <div 
            onClick={() => setActiveView('dashboard')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              🧮
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-none block">
                অ্যাবাকাস Parent Training
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
                অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম
              </span>
            </div>
          </div>

          {/* Navigation Link for Parent */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'dashboard' || activeView === 'class'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ক্লাসসমূহ
              </button>
            </div>
          )}

          {/* Right Action Menu */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {currentUser.full_name}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name.charAt(0) || <User size={14} />}
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                  title="লগআউট করুন"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">লগআউট</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <BookOpen size={15} />
                লগইন
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

