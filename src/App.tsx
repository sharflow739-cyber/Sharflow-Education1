import React, { useState, useEffect } from 'react';
import { UserProfile, ClassItem, UserProgress, HomeworkSubmission } from './types';
import { 
  supabase, isSupabaseConfigured, getCurrentUser, setCurrentUser, 
  getStoredClasses, saveStoredClasses, getStoredProgress, saveStoredProgress, 
  getStoredUsers, saveStoredUsers, getStoredHomeworks, saveStoredHomeworks 
} from './lib/supabase';
import { DEFAULT_ANNOUNCEMENTS } from './data/defaultCourses';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { ClassView } from './components/ClassView';
import { AdminPanel } from './components/AdminPanel';
import { WorksheetsTab } from './components/WorksheetsTab';
import { QuizTab } from './components/QuizTab';
import { AuthModal } from './components/AuthModal';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AccessDeniedView } from './components/AccessDeniedView';

import { BookOpen, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'class' | 'admin' | 'worksheets' | 'quiz'>('dashboard');
  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);

  // App Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [userProgressMap, setUserProgressMap] = useState<Record<string, UserProgress>>({});
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [homeworks, setHomeworks] = useState<HomeworkSubmission[]>([]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isDbSetupModalOpen, setIsDbSetupModalOpen] = useState(false);

  // URL Path & Route Synchronization for Secret /admin Route
  useEffect(() => {
    const handleLocation = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setActiveView('admin');
      }
    };

    handleLocation();
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, []);

  // Sync route change to browser history URL
  const navigateToView = (view: 'dashboard' | 'class' | 'admin' | 'worksheets' | 'quiz') => {
    setActiveView(view);
    if (view === 'admin') {
      window.history.pushState({}, '', '/admin');
    } else {
      window.history.pushState({}, '', '/');
    }
  };

  // Initialize App Data
  useEffect(() => {
    const existing = getCurrentUser();
    if (existing) {
      setCurrentUserState(existing);
    } else {
      // Default to initial parent user for immediate demo preview
      const initialUsers = getStoredUsers();
      const defaultParent = initialUsers.find((u) => u.role === 'parent') || initialUsers[0];
      setCurrentUserState(defaultParent);
      setCurrentUser(defaultParent);
    }

    const loadedClasses = getStoredClasses();
    setClasses(loadedClasses);

    const loadedUsers = getStoredUsers();
    setAllUsers(loadedUsers);

    const loadedHw = getStoredHomeworks();
    setHomeworks(loadedHw);
  }, []);

  // Sync user progress whenever currentUser changes
  useEffect(() => {
    if (!currentUser) {
      setUserProgressMap({});
      return;
    }

    const prog = getStoredProgress(currentUser.id);
    setUserProgressMap(prog);
  }, [currentUser]);

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    navigateToView('dashboard');
    setCurrentClass(null);
  };

  // Handle Class Completion
  const handleCompleteClass = (classId: string, homeworkAnswer?: string) => {
    if (!currentUser) return;

    const updatedProg: Record<string, UserProgress> = {
      ...userProgressMap,
      [classId]: {
        user_id: currentUser.id,
        class_id: classId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        homework_submission: homeworkAnswer || userProgressMap[classId]?.homework_submission,
      },
    };

    setUserProgressMap(updatedProg);
    saveStoredProgress(currentUser.id, updatedProg);

    // Save homework if provided
    if (homeworkAnswer && homeworkAnswer.trim()) {
      const cls = classes.find((c) => c.id === classId);
      const newHw: HomeworkSubmission = {
        id: `hw-${Date.now()}`,
        user_id: currentUser.id,
        user_name: currentUser.full_name,
        class_id: classId,
        class_title: cls?.title || '',
        class_number: cls?.class_number || 1,
        answer_text: homeworkAnswer,
        submitted_at: new Date().toLocaleDateString('bn-BD'),
        status: 'pending',
      };

      const nextHwList = [newHw, ...homeworks];
      setHomeworks(nextHwList);
      saveStoredHomeworks(nextHwList);
    }

    // Also sync to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase.from('progress').upsert({
        user_id: currentUser.id,
        class_id: classId,
        is_completed: true,
        homework_submission: homeworkAnswer,
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Admin Actions
  const handleToggleUserActive = (userId: string) => {
    const updated = allUsers.map((u) => {
      if (u.id === userId) {
        return { ...u, is_active: !u.is_active };
      }
      return u;
    });
    setAllUsers(updated);
    saveStoredUsers(updated);
  };

  const handleSaveClass = (updatedClass: ClassItem) => {
    const exists = classes.some((c) => c.id === updatedClass.id);
    let nextList: ClassItem[] = [];
    if (exists) {
      nextList = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    } else {
      nextList = [...classes, updatedClass];
    }
    setClasses(nextList);
    saveStoredClasses(nextList);
  };

  const handleDeleteClass = (classId: string) => {
    const nextList = classes.filter((c) => c.id !== classId);
    setClasses(nextList);
    saveStoredClasses(nextList);
  };

  // Switch to admin account helper for easy verification
  const handleSwitchToAdminUser = () => {
    const adminUser = allUsers.find((u) => u.role === 'admin') || {
      id: 'user-admin-01',
      email: 'admin@abacus.bd',
      full_name: 'অধ্যাপক মো: শাহরিয়ার (এডমিন)',
      role: 'admin',
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setCurrentUserState(adminUser);
    setCurrentUser(adminUser);
    navigateToView('admin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      
      {/* Top Header - CLEAN PARENT NAVBAR (No Admin Mode, No Supabase SQL buttons) */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        activeView={activeView}
        setActiveView={(v) => {
          navigateToView(v);
          if (v !== 'class') setCurrentClass(null);
        }}
      />

      {/* MAIN BODY AREA */}
      <main className="flex-1">
        
        {/* LOGIN MANDATORY GUARD FOR PARENT PORTAL */}
        {!currentUser ? (
          /* UNAUTHENTICATED LANDING / LOGIN PROMPT */
          <div className="max-w-5xl mx-auto px-4 py-12 text-center space-y-8 animate-fade-in">
            
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-4">
              <span className="px-3.5 py-1 bg-white/20 text-white rounded-full font-bold text-xs inline-block">
                অ্যাবাকাস পেরেন্ট ট্রেনিং প্রোগ্রাম
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                আপনার সন্তানকে ঘরে বসেই প্রফেশনাল উপায়ে অ্যাবাকাস শেখান
              </h1>

              <p className="text-sm sm:text-base text-orange-100 max-w-2xl mx-auto leading-relaxed">
                কোর্স কন্টেন্ট ও ভিডিও লেসন দেখতে আপনার নিবন্ধিত অ্যাকাউন্ট দিয়ে লগইন করুন। নতুন অভিভাবক হলে সহজ নিবন্ধনের মাধ্যমে যুক্ত হন।
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 font-extrabold text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2"
                >
                  <BookOpen size={18} />
                  লগইন / রেজিস্টার করুন
                </button>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                  📹
                </div>
                <h3 className="font-bold text-slate-900 text-sm">প্রফেশনাল ভিডিও কোর্স</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  সহজ ভাষায় স্টেপ-বাই-স্টেপ প্র্যাকটিক্যাল অ্যাবাকাস লেসন।
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold">
                  🧮
                </div>
                <h3 className="font-bold text-slate-900 text-sm">ভার্চুয়াল সোবান টুল</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ওয়েবসাইটেই বিড নাড়িয়ে প্র্যাকটিস করার আধুনিক সুবিধা।
                </p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">সুরক্ষিত পেরেন্ট পোর্টালে এক্সেস</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  ব্যক্তিগত অগ্রগতি ও হোমওয়ার্ক ট্র্যাকিং সুবিধা।
                </p>
              </div>
            </div>

          </div>
        ) : (
          /* AUTHENTICATED USER VIEWS */
          <>
            {activeView === 'dashboard' && (
              <Dashboard
                currentUser={currentUser}
                classes={classes}
                userProgressMap={userProgressMap}
                announcements={DEFAULT_ANNOUNCEMENTS}
                onSelectClass={(cls) => {
                  setCurrentClass(cls);
                  navigateToView('class');
                }}
                onOpenWorksheets={() => navigateToView('worksheets')}
                onOpenQuiz={() => navigateToView('quiz')}
              />
            )}

            {activeView === 'class' && currentClass && (
              <ClassView
                currentClass={currentClass}
                allClasses={classes}
                userProgressMap={userProgressMap}
                onCompleteClass={handleCompleteClass}
                onNavigateToClass={(classId) => {
                  const target = classes.find((c) => c.id === classId);
                  if (target) setCurrentClass(target);
                }}
                onBackToDashboard={() => {
                  navigateToView('dashboard');
                  setCurrentClass(null);
                }}
              />
            )}

            {activeView === 'worksheets' && (
              <WorksheetsTab onBackToDashboard={() => navigateToView('dashboard')} />
            )}

            {activeView === 'quiz' && (
              <QuizTab onBackToDashboard={() => navigateToView('dashboard')} />
            )}

            {/* SECRET /admin ROUTE HANDLING */}
            {activeView === 'admin' && (
              currentUser.role === 'admin' ? (
                <AdminPanel
                  currentUser={currentUser}
                  allUsers={allUsers}
                  classes={classes}
                  userProgressMap={userProgressMap}
                  homeworks={homeworks}
                  onToggleUserActive={handleToggleUserActive}
                  onSaveClass={handleSaveClass}
                  onDeleteClass={handleDeleteClass}
                  onOpenDbSetupModal={() => setIsDbSetupModalOpen(true)}
                  onBackToDashboard={() => navigateToView('dashboard')}
                />
              ) : (
                /* ACCESS DENIED PAGE FOR NON-ADMIN PARENTS ATTEMPTING /admin */
                <AccessDeniedView
                  onGoHome={() => navigateToView('dashboard')}
                  onSwitchToAdmin={handleSwitchToAdminUser}
                  userRole={currentUser.role}
                />
              )
            )}
          </>
        )}

      </main>

      {/* Footer with secret 000 admin button */}
      <Footer onOpenAdmin={() => navigateToView('admin')} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUserState(user);
          navigateToView('dashboard');
        }}
      />

      {/* Database Schema Setup Modal */}
      <DatabaseSetupModal
        isOpen={isDbSetupModalOpen}
        onClose={() => setIsDbSetupModalOpen(false)}
      />

    </div>
  );
}
