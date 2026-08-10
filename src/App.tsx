import React, { useState, useEffect } from 'react';
import { UserProfile, ClassItem } from './types';
import { 
  supabase, isSupabaseConfigured, getCurrentUser, setCurrentUser, 
  getStoredClasses, saveStoredClasses, getStoredUsers 
} from './lib/supabase';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Dashboard } from './components/Dashboard';
import { ClassView } from './components/ClassView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { AccessDeniedView } from './components/AccessDeniedView';

import { BookOpen, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUserState] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'class' | 'admin'>('dashboard');
  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);

  // App Data
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync URL Path for Secret /admin Route
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

  // Sync view navigation to window history
  const navigateToView = (view: 'dashboard' | 'class' | 'admin') => {
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
      // Default to initial parent user for immediate preview
      const initialUsers = getStoredUsers();
      const defaultParent = initialUsers.find((u) => u.role === 'parent') || initialUsers[0];
      setCurrentUserState(defaultParent);
      setCurrentUser(defaultParent);
    }

    const loadedClasses = getStoredClasses();
    setClasses(loadedClasses);

    const loadedUsers = getStoredUsers();
    setAllUsers(loadedUsers);

    // Fetch classes from Supabase if configured
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('classes')
        .select('*')
        .order('class_number', { ascending: true })
        .then(({ data, error }) => {
          if (data && !error && data.length > 0) {
            setClasses(data);
            saveStoredClasses(data);
          }
        });
    }
  }, []);

  // Handle Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserState(null);
    navigateToView('dashboard');
    setCurrentClass(null);
  };

  // Admin Actions: Save Class
  const handleSaveClass = (updatedClass: ClassItem) => {
    const exists = classes.some((c) => c.id === updatedClass.id);
    let nextList: ClassItem[] = [];
    if (exists) {
      nextList = classes.map((c) => (c.id === updatedClass.id ? updatedClass : c));
    } else {
      nextList = [...classes, updatedClass];
    }

    // Sort by class_number
    nextList.sort((a, b) => a.class_number - b.class_number);

    setClasses(nextList);
    saveStoredClasses(nextList);

    // Sync to Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.from('classes').upsert(updatedClass);
    }
  };

  // Admin Actions: Delete Class
  const handleDeleteClass = (classId: string) => {
    const nextList = classes.filter((c) => c.id !== classId);
    setClasses(nextList);
    saveStoredClasses(nextList);

    if (isSupabaseConfigured && supabase) {
      supabase.from('classes').delete().eq('id', classId);
    }
  };

  // Admin Actions: Reorder Classes
  const handleReorderClasses = (reorderedList: ClassItem[]) => {
    setClasses(reorderedList);
    saveStoredClasses(reorderedList);

    if (isSupabaseConfigured && supabase) {
      supabase.from('classes').upsert(reorderedList);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      
      {/* Minimal Header (No Admin links or buttons) */}
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

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* LOGIN GUARD FOR PARENT PORTAL */}
        {!currentUser ? (
          <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 sm:p-12 text-white shadow-xl space-y-4">
              <span className="px-3.5 py-1 bg-white/20 text-white rounded-full font-bold text-xs inline-block">
                অ্যাবাকাস Parent Training
              </span>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                আপনার সন্তানকে ঘরে বসেই প্রফেশনাল উপায়ে অ্যাবাকাস শেখান
              </h1>

              <p className="text-sm text-orange-100 max-w-xl mx-auto leading-relaxed">
                কোর্স কন্টেন্ট ও ভিডিও লেসন দেখতে আপনার নিবন্ধিত অ্যাকাউন্ট দিয়ে লগইন করুন।
              </p>

              <div className="pt-4 flex items-center justify-center">
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-3 bg-white text-orange-600 hover:bg-orange-50 font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <BookOpen size={18} />
                  লগইন করুন
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* VIEW 1: DASHBOARD (Class List) */}
            {activeView === 'dashboard' && (
              <Dashboard
                classes={classes}
                onSelectClass={(cls) => {
                  setCurrentClass(cls);
                  navigateToView('class');
                }}
              />
            )}

            {/* VIEW 2: CLASS PAGE (Title, Description, Video Player) */}
            {activeView === 'class' && currentClass && (
              <ClassView
                currentClass={currentClass}
                allClasses={classes}
                onBackToDashboard={() => {
                  navigateToView('dashboard');
                  setCurrentClass(null);
                }}
              />
            )}

            {/* SECRET /admin ROUTE HANDLING */}
            {activeView === 'admin' && (
              currentUser.role === 'admin' ? (
                <AdminPanel
                  currentUser={currentUser}
                  classes={classes}
                  onSaveClass={handleSaveClass}
                  onDeleteClass={handleDeleteClass}
                  onReorderClasses={handleReorderClasses}
                  onBackToDashboard={() => navigateToView('dashboard')}
                />
              ) : (
                /* ACCESS DENIED FOR NON-ADMIN PARENTS */
                <AccessDeniedView
                  onGoHome={() => navigateToView('dashboard')}
                />
              )
            )}
          </>
        )}

      </main>

      {/* Clean Footer */}
      <Footer />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          setCurrentUserState(user);
          navigateToView('dashboard');
        }}
      />

    </div>
  );
}
