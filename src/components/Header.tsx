import React from 'react';
import { UserProfile } from '../types';
import { LogOut, Shield, User, Database, Sparkles, BookOpen } from 'lucide-react';

interface HeaderProps {
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenDbSetup: () => void;
  onToggleDemoRole?: () => void;
  activeView: 'dashboard' | 'class' | 'admin' | 'worksheets' | 'quiz';
  setActiveView: (view: 'dashboard' | 'class' | 'admin' | 'worksheets' | 'quiz') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenDbSetup,
  onToggleDemoRole,
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
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-none">
                  অ্যাবাকাস পেরেন্ট
                </span>
                <span className="bg-orange-100 text-orange-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  PRO
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                Professional Parent Training Program
              </span>
            </div>
          </div>

          {/* Center Navigation Links (if logged in) */}
          {currentUser && (
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'dashboard' || activeView === 'class'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ড্যাশবোর্ড (Dashboard)
              </button>

              <button
                onClick={() => setActiveView('worksheets')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'worksheets'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ওয়ার্কশিট (Worksheets)
              </button>

              <button
                onClick={() => setActiveView('quiz')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeView === 'quiz'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                কুইজ টেস্ট (Quiz)
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveView('admin')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    activeView === 'admin'
                      ? 'bg-orange-500 text-white shadow-2xs'
                      : 'text-orange-700 bg-orange-100/60 hover:bg-orange-100'
                  }`}
                >
                  <Shield size={13} />
                  এডমিন প্যানেল
                </button>
              )}
            </nav>
          )}

          {/* Right Action Menu */}
          <div className="flex items-center gap-2">
            
            {/* Database Setup Modal Trigger */}
            <button
              onClick={onOpenDbSetup}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Supabase Database SQL Schema"
            >
              <Database size={14} className="text-orange-600" />
              <span className="hidden sm:inline">Supabase SQL</span>
            </button>

            {/* Quick Demo Role Switcher button (for easy testing) */}
            {onToggleDemoRole && currentUser && (
              <button
                onClick={onToggleDemoRole}
                className="px-2.5 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
                title="Switch between Parent and Admin mode for testing"
              >
                <Sparkles size={13} className="text-orange-600" />
                <span className="hidden sm:inline">
                  {currentUser.role === 'admin' ? 'Parent মোড' : 'Admin মোড'}
                </span>
              </button>
            )}

            {/* User Account / Auth Section */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">
                    {currentUser.full_name}
                  </span>
                  <span className="text-[10px] text-orange-600 font-semibold uppercase">
                    {currentUser.role === 'admin' ? 'এডমিন (Admin)' : 'অভিভাবক (Parent)'}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-bold text-xs">
                  {currentUser.full_name.charAt(0) || <User size={14} />}
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="লগআউট করুন"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <BookOpen size={15} />
                লগইন / রেজিস্টার
              </button>
            )}

          </div>
        </div>
      </div>
    </header>
  );
};
