import React, { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import {
  Home,
  BookOpen,
  Calculator,
  User,
  LogOut,
  ShieldAlert,
  ShoppingCart,
  X,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentUser: UserProfile;
  activePath: string;
  onNavigate: (path: string) => void;
  onOpenDashboard: () => void;
  onLogout: () => void;
  pendingRequestsCount?: number;
  pendingStudentsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  activePath,
  onNavigate,
  onOpenDashboard,
  onLogout,
  pendingRequestsCount = 0,
  pendingStudentsCount = 0,
}) => {
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const isAdmin = currentUser.role === 'admin';
  const isPremium = isAdmin || currentUser.enrollment_status === 'approved';

  // Close account drawer automatically when route changes
  useEffect(() => {
    setIsAccountOpen(false);
  }, [activePath]);

  // Allow Escape key to close account drawer
  useEffect(() => {
    if (!isAccountOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAccountOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAccountOpen]);

  const isHomeActive =
    !isAccountOpen && (activePath === '/' || activePath === '/dashboard');
  const isEbooksActive = !isAccountOpen && activePath === '/ebooks';
  const isAbacusActive = !isAccountOpen && activePath.startsWith('/abacus');
  const isAccountActive = isAccountOpen || activePath === '/admin';

  return (
    <>
      {/* Mobile Account Sheet / Drawer */}
      {isAccountOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden flex items-end justify-center bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-account-title"
          onClick={() => setIsAccountOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-black text-base shrink-0">
                  {currentUser.full_name?.charAt(0) || <User size={18} />}
                </div>
                <div className="min-w-0">
                  <h2
                    id="mobile-account-title"
                    className="font-extrabold text-slate-900 text-sm truncate"
                  >
                    {currentUser.full_name || 'অভিভাবক'}
                  </h2>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAccountOpen(false)}
                aria-label="অ্যাকাউন্ট মেনু বন্ধ করুন"
                className="min-h-[40px] min-w-[40px] rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Profile Summary */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 font-semibold">অ্যাক্সেসের ধরন</span>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-bold text-[11px]">
                    <ShieldAlert size={12} className="text-amber-400" />
                    এডমিন
                  </span>
                ) : isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    <CheckCircle2 size={12} />
                    প্রিমিয়াম মেম্বার
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px]">
                    <Sparkles size={12} />
                    ফ্রি অ্যাকাউন্ট
                  </span>
                )}
              </div>

              {currentUser.phone && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold">মোবাইল</span>
                  <span className="font-bold text-slate-800">{currentUser.phone}</span>
                </div>
              )}

              {currentUser.child_name && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-500 font-semibold">সন্তানের নাম</span>
                  <span className="font-bold text-slate-800 truncate">
                    {currentUser.child_name}
                    {currentUser.child_age ? ` (${currentUser.child_age} বছর)` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Account Actions */}
            <div className="space-y-2.5">
              {!isPremium && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen(false);
                    onNavigate('/enroll');
                  }}
                  className="w-full min-h-[46px] px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingCart size={16} />
                  <span>প্যাকেজ নিন</span>
                </button>
              )}

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountOpen(false);
                    onNavigate('/admin');
                  }}
                  className={`w-full min-h-[46px] px-4 py-2.5 font-extrabold text-xs rounded-2xl border transition-colors inline-flex items-center justify-center gap-2 cursor-pointer ${
                    activePath === '/admin'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-200'
                  }`}
                >
                  <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                  <span>এডমিন প্যানেল</span>
                  {pendingStudentsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-extrabold leading-none">
                      {pendingStudentsCount}
                    </span>
                  )}
                  {pendingRequestsCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded-full text-[10px] font-extrabold leading-none">
                      {pendingRequestsCount}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsAccountOpen(false);
                  onLogout();
                }}
                className="w-full min-h-[46px] px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs rounded-2xl transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                <span>লগআউট করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (Mobile <md for Signed-in Active Users) */}
      <nav
        aria-label="মোবাইল নিচের ন্যাভিগেশন"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-[#FCFBF7]/95 backdrop-blur-md border-t border-[#E5DEC9] shadow-[0_-4px_20px_-6px_rgba(20,21,23,0.12)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="grid grid-cols-4 max-w-lg mx-auto">
          <button
            type="button"
            onClick={() => {
              setIsAccountOpen(false);
              onOpenDashboard();
            }}
            aria-current={isHomeActive ? 'page' : undefined}
            className={`relative min-h-[58px] py-1.5 px-1 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9E7324] ${
              isHomeActive
                ? 'text-[#141517] bg-[#F3EDE0]'
                : 'text-[#524E46] hover:text-[#141517] hover:bg-[#F7F3EA]'
            }`}
          >
            {isHomeActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#B88930]" aria-hidden="true" />
            )}
            <Home
              size={20}
              strokeWidth={isHomeActive ? 2.4 : 2}
              className={isHomeActive ? 'text-[#855E18] shrink-0' : 'shrink-0'}
            />
            <span className="text-[11px] font-extrabold leading-tight whitespace-nowrap">
              হোম
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAccountOpen(false);
              onNavigate('/ebooks');
            }}
            aria-current={isEbooksActive ? 'page' : undefined}
            className={`relative min-h-[58px] py-1.5 px-1 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9E7324] ${
              isEbooksActive
                ? 'text-[#141517] bg-[#F3EDE0]'
                : 'text-[#524E46] hover:text-[#141517] hover:bg-[#F7F3EA]'
            }`}
          >
            {isEbooksActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#B88930]" aria-hidden="true" />
            )}
            <BookOpen
              size={20}
              strokeWidth={isEbooksActive ? 2.4 : 2}
              className={isEbooksActive ? 'text-[#855E18] shrink-0' : 'shrink-0'}
            />
            <span className="text-[11px] font-extrabold leading-tight whitespace-nowrap">
              বই
            </span>
          </button>

          <a
            href="/abacus"
            onClick={() => setIsAccountOpen(false)}
            aria-current={isAbacusActive ? 'page' : undefined}
            className={`relative min-h-[58px] py-1.5 px-1 flex flex-col items-center justify-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9E7324] ${
              isAbacusActive
                ? 'text-[#141517] bg-[#F3EDE0]'
                : 'text-[#524E46] hover:text-[#141517] hover:bg-[#F7F3EA]'
            }`}
          >
            {isAbacusActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#B88930]" aria-hidden="true" />
            )}
            <Calculator
              size={20}
              strokeWidth={isAbacusActive ? 2.4 : 2}
              className={isAbacusActive ? 'text-[#855E18] shrink-0' : 'shrink-0'}
            />
            <span className="text-[11px] font-extrabold leading-tight whitespace-nowrap">
              অ্যাবাকাস
            </span>
          </a>

          <button
            type="button"
            onClick={() => setIsAccountOpen((prev) => !prev)}
            aria-expanded={isAccountOpen}
            className={`relative min-h-[58px] py-1.5 px-1 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#9E7324] ${
              isAccountActive
                ? 'text-[#141517] bg-[#F3EDE0]'
                : 'text-[#524E46] hover:text-[#141517] hover:bg-[#F7F3EA]'
            }`}
          >
            {isAccountActive && (
              <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-[#B88930]" aria-hidden="true" />
            )}
            <User
              size={20}
              strokeWidth={isAccountActive ? 2.4 : 2}
              className={isAccountActive ? 'text-[#855E18] shrink-0' : 'shrink-0'}
            />
            <span className="text-[11px] font-extrabold leading-tight whitespace-nowrap">
              অ্যাকাউন্ট
            </span>
          </button>
        </div>
      </nav>
    </>
  );
};
