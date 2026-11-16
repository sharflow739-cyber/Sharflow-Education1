import React from 'react';
import { UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { LogOut, User, BookOpen, ShieldAlert, Calculator, Sparkles, UserPlus, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
  pendingRequestsCount?: number;
  pendingStudentsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  activePath,
  onNavigate,
  pendingRequestsCount = 0,
  pendingStudentsCount = 0,
}) => {
  const { settings } = useSettings();
  const isAdmin = currentUser?.role === 'admin';
  const isPremium = isAdmin || currentUser?.enrollment_status === 'approved';

  const handleNavClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-2 gap-y-2 py-2.5 lg:py-0 lg:min-h-[64px]">
          
          {/* Row 1 Left: Logo & Platform Name */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="order-1 flex items-center gap-2 sm:gap-2.5 cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform shrink-0">
              {settings.logo_emoji || '🧮'}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-slate-900 text-sm sm:text-base lg:text-lg tracking-tight leading-tight block truncate">
                {settings.site_name || 'অ্যাবাকাস Parent Training'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 font-medium hidden sm:block truncate">
                {settings.site_subtitle || 'অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম'}
              </span>
            </div>
          </a>

          {/* Row 1 Right: Login / User & Logout Action */}
          <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-slate-200">
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
                <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.full_name.charAt(0) || <User size={14} />}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[38px] px-2.5 py-1.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer whitespace-nowrap"
                  title="লগআউট করুন"
                >
                  <LogOut size={16} />
                  <span className="hidden sm:inline">লগআউট</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="min-h-[40px] px-3 sm:px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <BookOpen size={15} className="shrink-0" />
                <span>{settings.login_button_label || 'লগইন করুন'}</span>
              </button>
            )}
          </div>

          {/* Row 2 on mobile (<lg) for guests, tablet/desktop (md+) for signed-in users */}
          <nav
            aria-label="প্রধান ন্যাভিগেশন"
            className={`${
              currentUser && currentUser.is_active ? 'hidden md:flex' : 'flex'
            } order-3 lg:order-2 w-full lg:w-auto flex-wrap items-center gap-1.5 sm:gap-2 pt-2 lg:pt-0 border-t border-orange-100/80 lg:border-t-0`}
          >
            {!currentUser ? (
              <>
                <a
                  href="/demo"
                  onClick={(e) => handleNavClick(e, '/demo')}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/demo'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <Sparkles size={14} className="text-orange-500 shrink-0" />
                  <span>ফ্রি ডেমো</span>
                </a>
                <a
                  href="/enroll"
                  onClick={(e) => handleNavClick(e, '/enroll')}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/enroll'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <UserPlus size={14} className="text-orange-500 shrink-0" />
                  <span>ভর্তির তথ্য</span>
                </a>
              </>
            ) : (
              <>
                <a
                  href="/"
                  onClick={(e) => handleNavClick(e, '/')}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center whitespace-nowrap ${
                    activePath === '/' || activePath === '/dashboard' || activePath.startsWith('/class')
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  ক্লাসসমূহ
                </a>

                <a
                  href="/ebooks"
                  onClick={(e) => handleNavClick(e, '/ebooks')}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/ebooks'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <BookOpen size={14} className={activePath === '/ebooks' ? 'text-orange-600 shrink-0' : 'text-slate-500 shrink-0'} />
                  <span>ই-বুক</span>
                </a>

                {/* 'কোর্স কিনুন' link for logged-in free users lacking premium access */}
                {!isPremium && (
                  <a
                    href="/enroll"
                    onClick={(e) => handleNavClick(e, '/enroll')}
                    className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activePath === '/enroll'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <ShoppingCart size={13} className={activePath === '/enroll' ? 'text-white shrink-0' : 'text-emerald-600 shrink-0'} />
                    <span>কোর্স কিনুন</span>
                  </a>
                )}

                <a
                  href="/abacus"
                  className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-50 whitespace-nowrap"
                >
                  <Calculator size={14} className="text-slate-500 shrink-0" />
                  <span>ভার্চুয়াল অ্যাবাকাস</span>
                </a>
              </>
            )}

            {/* Admin Button - ONLY visible to admins */}
            {isAdmin && (
              <a
                href="/admin"
                onClick={(e) => handleNavClick(e, '/admin')}
                className={`relative min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activePath === '/admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <ShieldAlert size={14} className={activePath === '/admin' ? 'text-amber-400 shrink-0' : 'text-slate-600 shrink-0'} />
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
              </a>
            )}
          </nav>

        </div>
      </div>
    </header>
  );
};
