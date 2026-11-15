import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ClassItem } from './types';
import { supabase, isSupabaseConfigured, OWNER_EMAIL } from './lib/supabase';
import { useSettings } from './contexts/SettingsContext';
import { useConsent } from './contexts/ConsentContext';
import { trackDemoPageView } from './lib/metaPixel';
import { SignupOrigin } from './lib/demoSignupPixel';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { DemoPage } from './components/DemoPage';
import { EbookLibrary } from './components/EbookLibrary';
import { EnrollPage } from './components/EnrollPage';
import { PolicyPages } from './components/PolicyPages';
import { Dashboard } from './components/Dashboard';
import { ClassView } from './components/ClassView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { SetupRequiredView } from './components/SetupRequiredView';
import { MarketingConsentBanner } from './components/MarketingConsentBanner';

import { AlertOctagon, LogOut, AlertCircle, X } from 'lucide-react';

export default function App() {
  const { settings } = useSettings();
  const { marketingConsent } = useConsent();

  // Auth & Profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Routing State
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.pathname || '/';
    }
    return '/';
  });
  const prevPathRef = useRef<string>(currentPath);
  const [demoVisitSeq, setDemoVisitSeq] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/demo') {
      return 1;
    }
    return 0;
  });

  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);

  // App Data (Loaded from Supabase)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState<string | null>(null);

  // Pending Admin Requests (Owner only) & Pending Students Count (All Admins)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [pendingStudentsCount, setPendingStudentsCount] = useState(0);

  // Modals & Notices
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<'login' | 'register'>('login');
  const [postAuthRedirect, setPostAuthRedirect] = useState<string | null>(null);
  const [authOrigin, setAuthOrigin] = useState<SignupOrigin>('other');
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [legacyLinkNotice, setLegacyLinkNotice] = useState<string | null>(null);

  const openAuthModal = useCallback(
    (
      tab: 'login' | 'register' = 'login',
      redirectPath: string | null = null,
      origin: SignupOrigin = 'other'
    ) => {
      setAuthInitialTab(tab);
      setPostAuthRedirect(redirectPath);
      setAuthOrigin(origin);
      setIsAuthModalOpen(true);
    },
    []
  );

  // Clean URL Hash after Supabase extracts token, or handle expired old link error
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('error_code=otp_expired') || hash.includes('error=') || hash.includes('error_code='))) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      setLegacyLinkNotice('লিংকের বদলে ইমেইলের কোড ব্যবহার করুন।');
    } else if (hash && (hash.includes('access_token') || hash.includes('type='))) {
      const timer = setTimeout(() => {
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname || '/';
      const prevPath = prevPathRef.current;
      prevPathRef.current = path;
      setCurrentPath(path);
      if (path === '/demo' && prevPath !== '/demo') {
        setDemoVisitSeq((seq) => seq + 1);
      }
      // Support class deep links (e.g. /class/class-01 or /class-01)
      if (path.startsWith('/class/')) {
        const classId = path.replace('/class/', '').trim();
        const found = classes.find((c) => c.id === classId);
        if (found) setCurrentClass(found);
      } else if (path === '/' || path === '/dashboard') {
        setCurrentClass(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [classes]);

  // Safe SPA navigation
  const navigateTo = useCallback((path: string) => {
    const prevPath = prevPathRef.current;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    prevPathRef.current = path;
    setCurrentPath(path);
    if (path === '/demo' && prevPath !== '/demo') {
      setDemoVisitSeq((seq) => seq + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Track Meta Pixel PageView strictly on /demo when marketing consent is granted
  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (currentPath !== '/demo' || demoVisitSeq <= 0) return;
    if (marketingConsent !== 'granted') return;
    trackDemoPageView(demoVisitSeq);
  }, [authLoading, currentPath, demoVisitSeq, marketingConsent]);

  // Fetch User Profile by Auth ID
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!isSupabaseConfigured || !supabase) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, []);

  // Fetch Pending Admin Requests Count (Owner only)
  const fetchPendingRequestsCount = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser) return;
    if (currentUser.email.toLowerCase() !== OWNER_EMAIL) return;

    try {
      const { count, error } = await supabase
        .from('admin_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (!error && count !== null) {
        setPendingRequestsCount(count);
      }
    } catch (err) {
      console.error('Error fetching pending requests count:', err);
    }
  }, [currentUser]);

  // Fetch Pending Students Count (All admins)
  const fetchPendingStudentsCount = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase || !currentUser) return;
    if (currentUser.role !== 'admin') return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, enrollment_status')
        .eq('role', 'parent');

      if (!error && data) {
        const pendingCount = data.filter(
          (s) => !s.enrollment_status || s.enrollment_status === 'pending'
        ).length;
        setPendingStudentsCount(pendingCount);
      }
    } catch (err) {
      console.error('Error fetching pending students count:', err);
    }
  }, [currentUser]);

  // Fetch Classes from Supabase
  const fetchClasses = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setClassesLoading(true);
      setClassesError(null);
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('class_number', { ascending: true });

      if (error) {
        setClassesError(error.message);
        console.error('Error fetching classes:', error);
      } else {
        setClasses(data || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ক্লাস লোড করতে ব্যর্থ হয়েছে';
      setClassesError(msg);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  // Subscribe to real Supabase Auth State
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id).then((profile) => {
          setCurrentUser(profile);
          setAuthLoading(false);
        });
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordModalOpen(true);
      }
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        setCurrentUser(profile);
        // Clean URL hash if present
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        setCurrentUser(null);
        setCurrentClass(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Re-read profile and queues on window focus
  useEffect(() => {
    const handleFocus = async () => {
      if (currentUser?.id) {
        const updated = await fetchUserProfile(currentUser.id);
        if (updated) setCurrentUser(updated);
      }
      if (currentUser?.role === 'admin') {
        fetchPendingStudentsCount();
        if (currentUser.email.toLowerCase() === OWNER_EMAIL) {
          fetchPendingRequestsCount();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [currentUser?.id, currentUser?.role, currentUser?.email, fetchUserProfile, fetchPendingStudentsCount, fetchPendingRequestsCount]);

  // Load Classes whenever any active user is logged in
  useEffect(() => {
    if (currentUser?.is_active) {
      fetchClasses();
    } else {
      setClasses([]);
    }
  }, [currentUser?.id, currentUser?.is_active, fetchClasses]);

  // Load pending counts for admin
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchPendingStudentsCount();
      if (currentUser.email.toLowerCase() === OWNER_EMAIL) {
        fetchPendingRequestsCount();
      }
    }
  }, [currentUser, fetchPendingStudentsCount, fetchPendingRequestsCount]);

  // Handle Logout
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setCurrentUser(null);
    setCurrentClass(null);
    navigateTo('/');
  };

  // If Supabase credentials are not configured, display clear setup screen
  if (!isSupabaseConfigured) {
    return <SetupRequiredView />;
  }

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin"></div>
          <span>লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // If User is logged in but deactivated
  if (currentUser && !currentUser.is_active) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAuth={() =>
            openAuthModal(
              'login',
              currentPath === '/demo' ? '/demo' : null,
              currentPath === '/demo' ? 'demo' : 'other'
            )
          }
          activePath={currentPath}
          onNavigate={navigateTo}
          pendingRequestsCount={pendingRequestsCount}
          pendingStudentsCount={0}
        />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-rose-200 shadow-xl text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center font-bold">
              <AlertOctagon size={32} />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900">
              অ্যাকাউন্ট নিষ্ক্রিয় (Account Deactivated)
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              আপনার অ্যাকাউন্টটি বর্তমানে নিষ্ক্রিয় করা আছে। পুনরায় সক্রিয় করতে অনুগ্রহ করে হেল্পডেস্ক বা প্রধান এডমিনের সাথে যোগাযোগ করুন।
            </p>
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <LogOut size={16} />
                লগআউট করুন
              </button>
            </div>
          </div>
        </main>
        <Footer onNavigate={navigateTo} />
      </div>
    );
  }

  // Calculate published classes count for homepage trust indicator
  const publishedClassesCount = classes.filter((c) => c.is_published).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() =>
          openAuthModal(
            'login',
            currentPath === '/demo' ? '/demo' : null,
            currentPath === '/demo' ? 'demo' : 'other'
          )
        }
        activePath={currentPath}
        onNavigate={navigateTo}
        pendingRequestsCount={pendingRequestsCount}
        pendingStudentsCount={0}
      />

      {/* Notice for visitors arriving from legacy email links */}
      {legacyLinkNotice && (
        <div className="bg-amber-500 text-white px-4 py-3 flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{legacyLinkNotice}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  openAuthModal('login');
                  setLegacyLinkNotice(null);
                }}
                className="bg-white text-amber-900 px-3 py-1 rounded-lg text-xs font-black hover:bg-amber-50 cursor-pointer shadow-xs"
              >
                কোড দিন
              </button>
              <button
                onClick={() => setLegacyLinkNotice(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer"
                title="বন্ধ করুন"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        
        {/* ======================================================== */}
        {/* ROUTE 1: GATED DEMO (/demo) */}
        {/* ======================================================== */}
        {currentPath === '/demo' && (
          <DemoPage
            currentUser={currentUser}
            onNavigate={navigateTo}
            onOpenAuth={(tab = 'register') => openAuthModal(tab, '/demo', 'demo')}
          />
        )}

        {/* ======================================================== */}
        {/* ROUTE 1B: AUTHENTICATED E-BOOK LIBRARY (/ebooks) */}
        {/* ======================================================== */}
        {currentPath === '/ebooks' && (
          <EbookLibrary
            currentUser={currentUser}
            onNavigate={navigateTo}
            onOpenAuth={(tab = 'login') => openAuthModal(tab, '/ebooks', 'other')}
          />
        )}

        {/* ======================================================== */}
        {/* ROUTE 2: PUBLIC ENROLL (/enroll) */}
        {/* ======================================================== */}
        {currentPath === '/enroll' && (
          <EnrollPage
            onNavigate={navigateTo}
            onOpenAuth={() => openAuthModal('login', null, 'other')}
          />
        )}

        {/* ======================================================== */}
        {/* ROUTE 3: POLICY & CONTACT PAGES (/contact, /terms, /privacy, /refund) */}
        {/* ======================================================== */}
        {currentPath === '/contact' && (
          <PolicyPages
            type="contact"
            onNavigate={navigateTo}
            onOpenAuth={() => openAuthModal('login')}
          />
        )}
        {currentPath === '/terms' && (
          <PolicyPages
            type="terms"
            onNavigate={navigateTo}
            onOpenAuth={() => openAuthModal('login')}
          />
        )}
        {currentPath === '/privacy' && (
          <PolicyPages
            type="privacy"
            onNavigate={navigateTo}
            onOpenAuth={() => openAuthModal('login')}
          />
        )}
        {currentPath === '/refund' && (
          <PolicyPages
            type="refund"
            onNavigate={navigateTo}
            onOpenAuth={() => openAuthModal('login')}
          />
        )}

        {/* ======================================================== */}
        {/* ROUTE 4: /admin ROUTE (Protected) */}
        {/* ======================================================== */}
        {currentPath === '/admin' && (
          !currentUser ? (
            /* Admin path requires login */
            <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
              <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 mx-auto flex items-center justify-center font-bold">
                  <AlertOctagon size={24} />
                </div>
                <h2 className="text-lg font-black text-slate-900">এডমিন প্যানেলে লগইন প্রয়োজন</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  এডমিন প্যানেল এক্সেস করতে অনুগ্রহ করে আপনার এডমিন ক্রেডেনশিয়াল দিয়ে লগইন করুন।
                </p>
                <button
                  onClick={() => openAuthModal('login', '/admin')}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  লগইন করুন
                </button>
              </div>
            </div>
          ) : currentUser.role === 'admin' ? (
            <AdminPanel
              currentUser={currentUser}
              classes={classes}
              onReloadClasses={fetchClasses}
              onBackToDashboard={() => navigateTo('/')}
              pendingRequestsCount={pendingRequestsCount}
              onRefreshPendingCount={fetchPendingRequestsCount}
              pendingStudentsCount={0}
              onRefreshPendingStudentsCount={fetchPendingStudentsCount}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              onGoHome={() => navigateTo('/')}
              onRefreshProfile={async () => {
                const updated = await fetchUserProfile(currentUser.id);
                if (updated) setCurrentUser(updated);
              }}
            />
          )
        )}

        {/* ======================================================== */}
        {/* ROUTE 5: ROOT (/) or /dashboard */}
        {/* ======================================================== */}
        {currentPath !== '/demo' &&
          currentPath !== '/ebooks' &&
          currentPath !== '/enroll' &&
          currentPath !== '/contact' &&
          currentPath !== '/terms' &&
          currentPath !== '/privacy' &&
          currentPath !== '/refund' &&
          currentPath !== '/admin' && (
            !currentUser ? (
              /* Public Mobile-First Homepage */
              <HomePage
                onNavigate={navigateTo}
                onOpenAuth={(tab = 'login') => openAuthModal(tab, '/demo', 'demo')}
                onOpenDemoAuth={() => openAuthModal('register', '/demo', 'demo')}
                onOpenFreeResourcesAuth={(redirectPath = '/', tab = 'register') =>
                  openAuthModal(tab, redirectPath, 'other')
                }
                publishedClassesCount={publishedClassesCount}
              />
            ) : currentClass ? (
              /* Single Class View for Logged-In User */
              <ClassView
                currentClass={currentClass}
                allClasses={classes}
                currentUser={currentUser}
                onBackToDashboard={() => {
                  setCurrentClass(null);
                  navigateTo('/');
                }}
                onNavigate={navigateTo}
              />
            ) : (
              /* Member Dashboard for Logged-In User */
              <>
                {classesLoading && (
                  <div className="py-16 text-center text-xs text-slate-400">
                    ক্লাস লোড হচ্ছে...
                  </div>
                )}
                {classesError && (
                  <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
                      {classesError}
                    </div>
                  </div>
                )}
                {!classesLoading && !classesError && (
                  <Dashboard
                    classes={classes}
                    currentUser={currentUser}
                    onSelectClass={(cls) => {
                      setCurrentClass(cls);
                    }}
                    onNavigate={navigateTo}
                  />
                )}
              </>
            )
          )}
      </main>

      {/* Clean Footer with Site Settings and Policy links */}
      <Footer onNavigate={navigateTo} />

      {/* Minimal Marketing Consent Opt-In Banner */}
      <MarketingConsentBanner />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authInitialTab}
        signupOrigin={authOrigin}
        onBeforeDemoCompleteRegistration={() => {
          if (authOrigin === 'demo') {
            navigateTo('/demo');
          }
        }}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPostAuthRedirect(null);
          setAuthOrigin('other');
        }}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          const targetPath = postAuthRedirect || (currentPath === '/demo' ? '/demo' : '/');
          setPostAuthRedirect(null);
          setAuthOrigin('other');
          navigateTo(targetPath);
        }}
      />

      {/* Password Recovery Modal */}
      <ResetPasswordModal
        isOpen={isResetPasswordModalOpen}
        onClose={() => setIsResetPasswordModalOpen(false)}
        onSuccess={() => {
          setIsResetPasswordModalOpen(false);
          navigateTo('/');
        }}
      />
    </div>
  );
}
