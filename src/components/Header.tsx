import React from 'react';
import { UserProfile } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { LogOut, User, BookOpen, ShieldAlert, Calculator, Sparkles, UserPlus, ShoppingCart } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenAbacusAuth?: () => void;
  activePath: string;
  onNavigate: (path: string) => void;
  pendingRequestsCount?: number;
  pendingStudentsCount?: number;
}

const BRAND_LOGO_PATH = '/assets/aistudio/sharflow-logo-1_4c5c869d.png';

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenAbacusAuth,
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
    <header className="sticky top-0 z-40 bg-[#FCFBF7]/95 backdrop-blur-md border-b border-[#E5DEC9] shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-2 gap-y-2 py-2.5 lg:py-0 lg:min-h-[68px]">
          
          {/* Row 1 Left: Logo & Platform Name */}
          <a
            href="/"
            onClick={(e) => handleNavClick(e, '/')}
            className="order-1 flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1 lg:flex-initial lg:shrink-0"
          >
            <div className="w-[66px] h-[38px] sm:w-[82px] sm:h-[46px] rounded-xl bg-[#151618] border border-[#C89D4A]/45 p-0.5 shadow-sm overflow-hidden flex items-center justify-center shrink-0 transition-transform group-hover:scale-[1.03]">
              <img
                src={BRAND_LOGO_PATH}
                alt="Shar Flow"
                width={1000}
                height={559}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[#18191C] text-sm sm:text-base lg:text-lg tracking-tight leading-tight block truncate">
                {settings.site_name || 'অ্যাবাকাস Parent Training'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-[#625D52] font-medium hidden sm:block truncate">
                {settings.site_subtitle || 'অনলাইন অভিভাবক ট্রেনিং প্ল্যাটফর্ম'}
              </span>
            </div>
          </a>

          {/* Row 1 Right: Login / User & Logout Action */}
          <div className="order-2 lg:order-3 flex items-center gap-2 shrink-0">
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 border-l border-[#E5DEC9]">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-[#18191C] line-clamp-1">
                    {currentUser.full_name}
                  </span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[10px] text-[#8A6118] font-semibold leading-none">
                      এডমিন
                    </span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-full bg-[#F3EDE0] border border-[#C89D4A]/60 text-[#755113] flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.full_name.charAt(0) || <User size={14} />}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="min-h-[38px] px-2.5 py-1.5 text-[#524E46] hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer whitespace-nowrap"
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
                className="min-h-[40px] px-3 sm:px-4 py-2 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] border border-[#B0832A]/40 rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#9E7324] focus-visible:ring-offset-2"
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
            } order-3 lg:order-2 w-full lg:w-auto flex-wrap items-center gap-1.5 sm:gap-2 pt-2 lg:pt-0 border-t border-[#E5DEC9]/90 lg:border-t-0`}
          >
            {!currentUser ? (
              <>
                <a
                  href="/demo"
                  onClick={(e) => handleNavClick(e, '/demo')}
                  aria-current={activePath === '/demo' ? 'page' : undefined}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/demo'
                      ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                      : 'text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent'
                  }`}
                >
                  <Sparkles
                    size={14}
                    className={activePath === '/demo' ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                  />
                  <span>ডেমো ক্লাস</span>
                </a>
                <a
                  href="/enroll"
                  onClick={(e) => handleNavClick(e, '/enroll')}
                  aria-current={activePath === '/enroll' ? 'page' : undefined}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/enroll'
                      ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                      : 'text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent'
                  }`}
                >
                  <UserPlus
                    size={14}
                    className={activePath === '/enroll' ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                  />
                  <span>ভর্তির তথ্য</span>
                </a>
                <button
                  type="button"
                  onClick={() => (onOpenAbacusAuth ? onOpenAbacusAuth() : onOpenAuth())}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    activePath.startsWith('/abacus')
                      ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                      : 'text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent'
                  }`}
                >
                  <Calculator
                    size={14}
                    className={activePath.startsWith('/abacus') ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                  />
                  <span>ভার্চুয়াল অ্যাবাকাস</span>
                </button>
              </>
            ) : (
              <>
                <a
                  href="/"
                  onClick={(e) => handleNavClick(e, '/')}
                  aria-current={
                    activePath === '/' || activePath === '/dashboard' || activePath.startsWith('/class')
                      ? 'page'
                      : undefined
                  }
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center whitespace-nowrap ${
                    activePath === '/' || activePath === '/dashboard' || activePath.startsWith('/class')
                      ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                      : 'text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent'
                  }`}
                >
                  ক্লাসসমূহ
                </a>

                <a
                  href="/ebooks"
                  onClick={(e) => handleNavClick(e, '/ebooks')}
                  aria-current={activePath === '/ebooks' ? 'page' : undefined}
                  className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                    activePath === '/ebooks'
                      ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                      : 'text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent'
                  }`}
                >
                  <BookOpen
                    size={14}
                    className={activePath === '/ebooks' ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                  />
                  <span>ই-বুক</span>
                </a>

                {/* 'কোর্স কিনুন' link for logged-in free users lacking premium access */}
                {!isPremium && (
                  <a
                    href="/enroll"
                    onClick={(e) => handleNavClick(e, '/enroll')}
                    aria-current={activePath === '/enroll' ? 'page' : undefined}
                    className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                      activePath === '/enroll'
                        ? 'bg-[#18191C] text-[#F2D283] border border-[#C89D4A]/55 shadow-2xs'
                        : 'bg-[#F3EDE0] text-[#755113] hover:bg-[#EAE0CA] border border-[#D4AF5F]/50'
                    }`}
                  >
                    <ShoppingCart
                      size={13}
                      className={activePath === '/enroll' ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                    />
                    <span>কোর্স কিনুন</span>
                  </a>
                )}

                <a
                  href="/abacus"
                  className="min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 text-[#3B3934] hover:text-[#141517] hover:bg-[#F3EDE0] border border-transparent whitespace-nowrap"
                >
                  <Calculator size={14} className="text-[#8B641E] shrink-0" />
                  <span>ভার্চুয়াল অ্যাবাকাস</span>
                </a>
              </>
            )}

            {/* Admin Button - ONLY visible to admins */}
            {isAdmin && (
              <a
                href="/admin"
                onClick={(e) => handleNavClick(e, '/admin')}
                aria-current={activePath === '/admin' ? 'page' : undefined}
                className={`relative min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activePath === '/admin'
                    ? 'bg-[#18191C] text-[#F2D283] border border-[#D4AF5F]/60 shadow-2xs'
                    : 'bg-[#F3EDE0] hover:bg-[#E9DFC8] text-[#18191C] border border-[#D8CBAF]'
                }`}
              >
                <ShieldAlert
                  size={14}
                  className={activePath === '/admin' ? 'text-[#E4BE67] shrink-0' : 'text-[#8B641E] shrink-0'}
                />
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
                    className="ml-0.5 px-1.5 py-0.2 bg-[#E4BE67] text-[#141517] rounded-full text-[10px] font-extrabold leading-tight"
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
