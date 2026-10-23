import React from 'react';
import { UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { LogOut, User, BookOpen, ShieldAlert } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  activeView: 'dashboard' | 'class' | 'admin';
  setActiveView: (view: 'dashboard' | 'class' | 'admin') => void;
  pendingRequestsCount?: number;
  pendingStudentsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  activeView,
  setActiveView,
  pendingRequestsCount = 0,
  pendingStudentsCount = 0,
}) => {
  const { settings } = useSettings();
  const isAdmin = currentUser?.role === 'admin';

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
              {settings.logo_emoji || '🧮'}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-none block">
                {settings.site_name || 'অ্যাবাকাস Parent Training'}
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline-block">
                {settings.site_subtitle || 'অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'dashboard' || activeView === 'class'
                    ? 'bg-orange-50 text-orange-600 border border-orange-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ক্লাসসমূহ
              </button>
            )}

            {/* Admin Button - ONLY visible to admins */}
            {isAdmin && (
              <button
                onClick={() => setActiveView('admin')}
                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <ShieldAlert size={14} className={activeView === 'admin' ? 'text-amber-400' : 'text-slate-600'} />
                <span>এডমিন</span>
                {pendingStudentsCount > 0 && (
                  <span 
                    className="ml-1 px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-extrabold leading-tight"
                    title={`${pendingStudentsCount} জন শিক্ষার্থী অনুমোদনের অপেক্ষায়`}
                  >
                    {pendingStudentsCount}
                  </span>
                )}
                {pendingRequestsCount > 0 && (
                  <span 
                    className="ml-0.5 px-1.5 py-0.2 bg-amber-500 text-slate-900 rounded-full text-[10px] font-extrabold leading-tight"
                    title={`${pendingRequestsCount} টি এডমিন অনুরোধ`}
                  >
                    {pendingRequestsCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2">
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {currentUser.full_name}
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] text-orange-600 font-semibold leading-none">
                      এডমিন
                    </span>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name.charAt(0) || <User size={14} />}
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                  title="লগআউট করুন"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">লগআউট</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <BookOpen size={15} />
                {settings.login_button_label || 'লগইন'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
