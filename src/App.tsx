import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, ClassItem, CourseChapter } from './types';
import { supabase, isSupabaseConfigured, OWNER_EMAIL } from './lib/supabase';
import { DEFAULT_COURSE_CHAPTERS, sortChapters } from './lib/courseChapters';
import { useSettings } from './contexts/SettingsContext';
import { useConsent } from './contexts/ConsentContext';
import {
  trackPublicPageView,
  isPublicPixelPath,
  hasAuthCallbackOrResetUrl,
} from './lib/metaPixel';
import { SignupOrigin } from './lib/demoSignupPixel';
import {
  claimAndTrackOAuthRegistration,
  clearPendingGoogleOAuthAttempt,
  consumePendingGoogleOAuthAttempt,
  parseAuthCallbackError,
  sanitizeOAuthReturnPath,
} from './lib/oauthRedirect';
import {
  SCROLL_DEPTH_THRESHOLDS,
  normalizeAnalyticsPath,
  track,
  trackPageView,
} from './lib/analytics.js';

import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Footer } from './components/Footer';
import { HomePage } from './components/HomePage';
import { DemoPage } from './components/DemoPage';
import { EbookLibrary } from './components/EbookLibrary';
import { EnrollPage } from './components/EnrollPage';
import { PolicyPages } from './components/PolicyPages';
import { StudentHomeHub } from './components/StudentHomeHub';
import { Dashboard } from './components/Dashboard';
import { ClassView } from './components/ClassView';
import { AdminPanel } from './components/AdminPanel';
import { AuthModal } from './components/AuthModal';
import { AccessDeniedView } from './components/AccessDeniedView';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { SetupRequiredView } from './components/SetupRequiredView';
import { SupportWidget } from './components/SupportWidget';

import { AlertOctagon, LogOut, AlertCircle, X, Calculator, Lock, LogIn, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';

const analyticsId = 'G-T6MR5VKW39';
const analyticsPublicPaths = new Set(['/', '/demo', '/enroll', '/contact', '/privacy', '/terms', '/refund']);

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  'ga-disable-G-T6MR5VKW39'?: boolean;
};

function usePublicPageAnalytics(
  path: string,
  permitted: boolean,
  initialPageViewFiredRef: React.MutableRefObject<boolean>,
  lastTrackedPathRef: React.MutableRefObject<string | null>
) {
  const normalizedPath = path ? normalizeAnalyticsPath(path) : '';
  const publicPage = analyticsPublicPaths.has(normalizedPath);

  useEffect(() => {
    const analytics = window as AnalyticsWindow;
    const enabled = publicPage && permitted;
    analytics['ga-disable-G-T6MR5VKW39'] = !enabled;
    if (!enabled) {
      return;
    }

    const location = window.location.origin + normalizedPath;
    if (!analytics.gtag) {
      const dataLayer = (analytics.dataLayer ??= []);
      analytics.gtag = function () { dataLayer.push(arguments); };
      analytics.gtag('js', new Date());
      analytics.gtag('config', analyticsId, {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        page_path: normalizedPath,
        page_location: location,
        page_referrer: '',
      });
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + analyticsId;
      document.head.appendChild(tag);
    }

    if (!initialPageViewFiredRef.current) {
      initialPageViewFiredRef.current = true;
      lastTrackedPathRef.current = normalizedPath;
      analytics.gtag('event', 'page_view', {
        send_to: analyticsId,
        page_path: normalizedPath,
        page_location: location,
        page_referrer: '',
      });
    }
  }, [normalizedPath, publicPage, permitted, initialPageViewFiredRef, lastTrackedPathRef]);
}

function useSpaPageTracking(
  path: string,
  permitted: boolean,
  initialPageViewFiredRef: React.MutableRefObject<boolean>,
  lastTrackedPathRef: React.MutableRefObject<string | null>
) {
  const normalizedPath = path ? normalizeAnalyticsPath(path) : '';
  const publicPage = analyticsPublicPaths.has(normalizedPath);

  useEffect(() => {
    if (!publicPage) {
      lastTrackedPathRef.current = null;
      return;
    }
    if (!permitted || !initialPageViewFiredRef.current) {
      return;
    }
    if (lastTrackedPathRef.current === normalizedPath) {
      return;
    }
    lastTrackedPathRef.current = normalizedPath;
    trackPageView(normalizedPath);
  }, [normalizedPath, publicPage, permitted, initialPageViewFiredRef, lastTrackedPathRef]);
}

function usePublicScrollDepth(path: string, visitSeq: number, permitted: boolean) {
  const normalizedPath = path ? normalizeAnalyticsPath(path) : '';
  const publicPage = analyticsPublicPaths.has(normalizedPath) && permitted;

  useEffect(() => {
    if (!publicPage) return;

    const triggered = new Set<number>();
    const handleScroll = () => {
      const doc = document.documentElement;
      const scrollableHeight = doc.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0 || window.scrollY <= 0) return;

      const percentScrolled = Math.min(
        100,
        Math.round((window.scrollY / scrollableHeight) * 100)
      );

      for (const threshold of SCROLL_DEPTH_THRESHOLDS) {
        if (percentScrolled >= threshold && !triggered.has(threshold)) {
          triggered.add(threshold);
          track('scroll_depth', {
            percent: threshold,
            page_path: normalizedPath,
          });
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [normalizedPath, visitSeq, publicPage]);
}

export default function App() {
  const { settings } = useSettings();
  const { isMarketingPermitted } = useConsent();

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
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [legacyLinkNotice, setLegacyLinkNotice] = useState<string | null>(null);
  const initialAuthCallbackOrResetRef = useRef<boolean>(
    typeof window !== 'undefined' && hasAuthCallbackOrResetUrl(window.location)
  );
  const [publicVisitSeq, setPublicVisitSeq] = useState<number>(1);
  const initialPageViewFiredRef = useRef<boolean>(false);
  const lastTrackedPathRef = useRef<string | null>(null);

  const isGaPermitted =
    isMarketingPermitted &&
    !authLoading &&
    !isResetPasswordModalOpen &&
    !legacyLinkNotice &&
    !initialAuthCallbackOrResetRef.current &&
    !(currentUser && !currentUser.is_active);

  const publicAnalyticsPath =
    authLoading ||
    ((currentPath === '/' || currentPath === '/dashboard') && Boolean(currentUser))
      ? ''
      : currentPath;

  usePublicPageAnalytics(
    publicAnalyticsPath,
    isGaPermitted,
    initialPageViewFiredRef,
    lastTrackedPathRef
  );
  useSpaPageTracking(
    publicAnalyticsPath,
    isGaPermitted,
    initialPageViewFiredRef,
    lastTrackedPathRef
  );
  usePublicScrollDepth(publicAnalyticsPath, publicVisitSeq, isGaPermitted);

  const prevPathRef = useRef<string>(currentPath);

  const [currentClass, setCurrentClass] = useState<ClassItem | null>(null);

  // App Data (Loaded from Supabase)
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [chapters, setChapters] = useState<CourseChapter[]>(DEFAULT_COURSE_CHAPTERS);
  const [chaptersSupported, setChaptersSupported] = useState<boolean>(false);
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

  // Handle OAuth / email callback errors in search/hash & clean residual token hashes
  useEffect(() => {
    const callbackErr = parseAuthCallbackError(window.location);
    if (callbackErr) {
      clearPendingGoogleOAuthAttempt();
      window.history.replaceState(null, '', window.location.pathname || '/');
      setLegacyLinkNotice(callbackErr.message);
      return;
    }

    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('type='))) {
      const timer = setTimeout(() => {
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname || '/');
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
      initialAuthCallbackOrResetRef.current = hasAuthCallbackOrResetUrl(window.location);
      if (path !== prevPath) {
        setPublicVisitSeq((seq) => seq + 1);
      }
      // Support class deep links (e.g. /class/class-01)
      if (path.startsWith('/class/')) {
        const classId = path.replace('/class/', '').trim();
        const found = classes.find((c) => c.id === classId);
        setCurrentClass(found || null);
      } else {
        setCurrentClass(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [classes]);

  // Resolve deep-linked class once classes finish loading
  useEffect(() => {
    if (!currentUser || !currentPath.startsWith('/class/')) return;
    const classId = currentPath.replace('/class/', '').trim();
    if (!classId) return;
    const found = classes.find((c) => c.id === classId);
    if (found && currentClass?.id !== found.id) {
      setCurrentClass(found);
    }
  }, [currentUser, currentPath, classes, currentClass?.id]);

  // Safe SPA navigation (and full browser navigation for /abacus rewrite)
  const navigateTo = useCallback((path: string) => {
    if (path === '/abacus' || path === '/abacus/') {
      window.location.assign('/abacus');
      return;
    }
    if (!path.startsWith('/class/')) {
      setCurrentClass(null);
    }
    const prevPath = prevPathRef.current;
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    prevPathRef.current = path;
    setCurrentPath(path);
    initialAuthCallbackOrResetRef.current = hasAuthCallbackOrResetUrl(window.location);
    if (path !== prevPath) {
      setPublicVisitSeq((seq) => seq + 1);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Track Meta Pixel PageView once per public page visit when privacy requirements permit.
  // Excludes /admin, /ebooks, /classes, /class/*, member home (/ while signed in), password reset, and auth callbacks.
  useEffect(() => {
    if (!isSupabaseConfigured || authLoading) return;
    if (!isMarketingPermitted) return;
    if (isResetPasswordModalOpen || legacyLinkNotice) return;
    if (initialAuthCallbackOrResetRef.current) return;
    if (currentUser && !currentUser.is_active) return;
    if (currentUser && (currentPath === '/' || currentPath === '/dashboard')) return;
    if (!isPublicPixelPath(currentPath)) return;

    trackPublicPageView(currentPath, publicVisitSeq);
  }, [
    authLoading,
    currentPath,
    currentUser,
    isMarketingPermitted,
    isResetPasswordModalOpen,
    legacyLinkNotice,
    publicVisitSeq,
  ]);

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

  // Fetch Course Chapters from Supabase (with safe fallback prior to migration)
  const fetchChapters = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('course_chapters')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        setChaptersSupported(false);
        setChapters(DEFAULT_COURSE_CHAPTERS);
      } else {
        setChaptersSupported(true);
        setChapters(
          data && data.length > 0 ? sortChapters(data as CourseChapter[]) : DEFAULT_COURSE_CHAPTERS
        );
      }
    } catch {
      setChaptersSupported(false);
      setChapters(DEFAULT_COURSE_CHAPTERS);
    }
  }, []);

  // Fetch Classes from Supabase
  const fetchClasses = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    try {
      setClassesLoading(true);
      setClassesError(null);
      await fetchChapters();
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
  }, [fetchChapters]);

  // Subscribe to real Supabase Auth State (including Google OAuth PKCE/hash completion)
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    const loadProfileWithOAuthRetry = async (userId: string): Promise<UserProfile | null> => {
      const firstTry = await fetchUserProfile(userId);
      if (firstTry) return firstTry;
      await new Promise((resolve) => setTimeout(resolve, 250));
      return fetchUserProfile(userId);
    };

    const handleAuthenticatedSession = async (session: {
      user: {
        id: string;
        created_at?: string;
        last_sign_in_at?: string;
        identities?: Array<{ provider?: string; created_at?: string; last_sign_in_at?: string }>;
      };
    }) => {
      if (!isMounted) return;

      // Scrub PKCE ?code= / ?state= or #access_token= before tracking or navigating
      if (hasAuthCallbackOrResetUrl(window.location)) {
        window.history.replaceState(null, '', window.location.pathname || '/');
      }

      const profile = await loadProfileWithOAuthRetry(session.user.id);
      if (!isMounted) return;

      const pendingOAuth = consumePendingGoogleOAuthAttempt();
      if (pendingOAuth && profile?.is_active !== false) {
        claimAndTrackOAuthRegistration(session.user, pendingOAuth);
      }

      setCurrentUser(profile);
      setAuthLoading(false);

      if (pendingOAuth && profile?.is_active !== false) {
        const safeTarget = sanitizeOAuthReturnPath(pendingOAuth.returnPath);
        const currentPathname = window.location.pathname || '/';
        if (safeTarget && safeTarget !== currentPathname) {
          navigateTo(safeTarget);
        }
      }
    };

    // Initial session check (waits for Supabase URL code exchange if returning from Google OAuth)
    supabase.auth.getSession().then(({ data: { session }, error: sessionErr }) => {
      if (!isMounted) return;
      if (session?.user) {
        handleAuthenticatedSession(session);
      } else {
        if (sessionErr || (window.location.search && window.location.search.includes('code='))) {
          clearPendingGoogleOAuthAttempt();
          window.history.replaceState(null, '', window.location.pathname || '/');
          setLegacyLinkNotice((prev) =>
            prev || 'Google লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
          );
        }
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    // Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        initialAuthCallbackOrResetRef.current = true;
        setIsResetPasswordModalOpen(true);
      }
      if (session?.user) {
        await handleAuthenticatedSession(session);
      } else {
        setCurrentUser(null);
        setCurrentClass(null);
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, navigateTo]);

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
    const wasOnDashboardRoot = prevPathRef.current === '/';
    setCurrentUser(null);
    setCurrentClass(null);
    navigateTo('/');
    if (wasOnDashboardRoot) {
      setPublicVisitSeq((seq) => seq + 1);
    }
  };

  // If Supabase credentials are not configured, display clear setup screen
  if (!isSupabaseConfigured) {
    return <SetupRequiredView />;
  }

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F0] text-[#575247] text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#B88930] border-t-transparent animate-spin"></div>
          <span>লোড হচ্ছে...</span>
        </div>
      </div>
    );
  }

  // If User is logged in but deactivated
  if (currentUser && !currentUser.is_active) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAF7F0] text-[#18191C]">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenAuth={() =>
            openAuthModal(
              'login',
              currentPath === '/demo' ? '/' : null,
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
        <SupportWidget
          showMobileBottomNav={false}
          isHidden={isAuthModalOpen || isResetPasswordModalOpen}
          activePath={currentPath}
        />
      </div>
    );
  }

  // Calculate published classes count for homepage trust indicator
  const publishedClassesCount = classes.filter((c) => c.is_published).length;
  const showMobileBottomNav = Boolean(currentUser && currentUser.is_active);

  return (
    <div
      className={`min-h-screen overflow-x-clip flex flex-col bg-[#FAF7F0] text-[#18191C] selection:bg-[#D4AF5F] selection:text-[#141517] ${
        showMobileBottomNav ? 'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0' : ''
      }`}
    >
      
      {/* Header */}
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={() =>
          openAuthModal(
            'login',
            currentPath === '/abacus' || currentPath === '/abacus/' ? '/abacus' : '/',
            'demo'
          )
        }
        onOpenAbacusAuth={() => openAuthModal('login', '/abacus', 'demo')}
        activePath={currentPath}
        onNavigate={navigateTo}
        pendingRequestsCount={pendingRequestsCount}
        pendingStudentsCount={0}
      />

      {/* Notice for visitors arriving from OAuth callback errors or legacy email links */}
      {legacyLinkNotice && (
        <div
          role="alert"
          className="bg-amber-600 text-white px-4 py-3 flex items-center justify-between text-xs font-bold shadow-sm"
        >
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{legacyLinkNotice}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  openAuthModal('login');
                  setLegacyLinkNotice(null);
                }}
                className="bg-white text-amber-950 px-3 py-1 rounded-lg text-xs font-black hover:bg-amber-50 cursor-pointer shadow-xs whitespace-nowrap"
              >
                {legacyLinkNotice.includes('কোড') ? 'কোড দিন' : 'লগইন করুন'}
              </button>
              <button
                type="button"
                onClick={() => setLegacyLinkNotice(null)}
                className="text-white/85 hover:text-white p-1 cursor-pointer"
                title="বন্ধ করুন"
                aria-label="নোটিশ বন্ধ করুন"
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
        {/* ROUTE 1: FREE CLASS ENTRY (/demo - login gated) */}
        {/* ======================================================== */}
        {currentPath === '/demo' && !currentUser && (
          <DemoPage
            currentUser={currentUser}
            onNavigate={navigateTo}
            onOpenAuth={(tab = 'register') => openAuthModal(tab, '/', 'demo')}
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
        {/* ROUTE 1C: AUTHENTICATED VIRTUAL ABACUS (/abacus) */}
        {/* ======================================================== */}
        {(currentPath === '/abacus' || currentPath === '/abacus/') && (
          !currentUser ? (
            <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-[#141517] via-[#1B1C20] to-[#23201A] text-[#FAF7F0] rounded-3xl border border-[#D4AF5F]/35 shadow-xl text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#222328] border border-[#C89D4A]/45 text-[#E4BE67] mx-auto flex items-center justify-center">
                  <Lock size={26} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">
                    ভার্চুয়াল অ্যাবাকাস ব্যবহার করতে লগইন করুন
                  </h1>
                  <p className="text-xs sm:text-sm text-[#D8D1C2] leading-relaxed">
                    পূর্ণাঙ্গ ইন্টারঅ্যাক্টিভ ভার্চুয়াল অ্যাবাকাস টুল ব্যবহার করতে অনুগ্রহ করে লগইন করুন অথবা নতুন ফ্রি অ্যাকাউন্ট তৈরি করুন।
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login', '/abacus', 'demo')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs sm:text-sm rounded-xl shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn size={16} />
                    <span>লগইন করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register', '/abacus', 'demo')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={16} className="text-[#E4BE67]" />
                    <span>নতুন অ্যাকাউন্ট তৈরি করুন (OTP)</span>
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('/')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CFC7B7] hover:text-[#E8C778] cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>মূল পাতায় ফিরে যান</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => navigateTo('/')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#575247] hover:text-[#18191C] cursor-pointer"
                >
                  <ArrowLeft size={16} />
                  <span>ড্যাশবোর্ডে ফিরে যান</span>
                </button>
                <a
                  href="https://sharflow-education2.vercel.app/"
                  className="min-h-[38px] px-4 py-2 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
                >
                  <Calculator size={15} />
                  <span>পূর্ণ স্ক্রিনে ভার্চুয়াল অ্যাবাকাস খুলুন</span>
                  <ArrowRight size={14} />
                </a>
              </div>
              <div className="rounded-2xl overflow-hidden border border-[#D4AF5F]/40 bg-[#18191C] shadow-lg">
                <iframe
                  src="https://sharflow-education2.vercel.app/"
                  title="ভার্চুয়াল সোরোবান অ্যাবাকাস"
                  className="w-full h-[72dvh] min-h-[480px] border-0 bg-white"
                />
              </div>
            </div>
          )
        )}

        {/* ======================================================== */}
        {/* ROUTE 1D: CLASSES ACCORDION SCREEN (/classes) */}
        {/* ======================================================== */}
        {(currentPath === '/classes' || currentPath === '/classes/') && (
          !currentUser ? (
            <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-[#141517] via-[#1B1C20] to-[#23201A] text-[#FAF7F0] rounded-3xl border border-[#D4AF5F]/35 shadow-xl text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#222328] border border-[#C89D4A]/45 text-[#E4BE67] mx-auto flex items-center justify-center">
                  <Lock size={26} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">
                    ক্লাসসমূহ দেখতে লগইন করুন
                  </h1>
                  <p className="text-xs sm:text-sm text-[#D8D1C2] leading-relaxed">
                    ফ্রি ও অধ্যায়ভিত্তিক সব ক্লাস দেখতে অনুগ্রহ করে লগইন করুন অথবা নতুন ফ্রি অ্যাকাউন্ট তৈরি করুন।
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login', '/classes', 'other')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs sm:text-sm rounded-xl shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn size={16} />
                    <span>লগইন করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register', '/classes', 'demo')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={16} className="text-[#E4BE67]" />
                    <span>নতুন অ্যাকাউন্ট তৈরি করুন (OTP)</span>
                  </button>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => navigateTo('/')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#CFC7B7] hover:text-[#E8C778] cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>মূল পাতায় ফিরে যান</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                  chapters={chapters}
                  chaptersSupported={chaptersSupported}
                  currentUser={currentUser}
                  onSelectClass={(cls) => {
                    setCurrentClass(cls);
                    navigateTo(`/class/${cls.id}`);
                  }}
                  onNavigate={navigateTo}
                  onBackHome={() => navigateTo('/')}
                />
              )}
            </>
          )
        )}

        {/* ======================================================== */}
        {/* ROUTE 1E: SINGLE CLASS VIEW (/class/:id) */}
        {/* ======================================================== */}
        {currentPath.startsWith('/class/') && (
          !currentUser ? (
            <div className="max-w-lg mx-auto px-4 py-12 sm:py-16">
              <div className="p-6 sm:p-8 bg-gradient-to-br from-[#141517] via-[#1B1C20] to-[#23201A] text-[#FAF7F0] rounded-3xl border border-[#D4AF5F]/35 shadow-xl text-center space-y-5">
                <div className="w-14 h-14 rounded-2xl bg-[#222328] border border-[#C89D4A]/45 text-[#E4BE67] mx-auto flex items-center justify-center">
                  <Lock size={26} />
                </div>
                <div className="space-y-2">
                  <h1 className="text-xl sm:text-2xl font-black text-[#FAF7F0]">
                    ক্লাস দেখতে লগইন করুন
                  </h1>
                  <p className="text-xs sm:text-sm text-[#D8D1C2] leading-relaxed">
                    এই ক্লাস ভিডিও ও রিসোর্স দেখতে অনুগ্রহ করে লগইন করুন।
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login', currentPath, 'other')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-gradient-to-r from-[#E4BE67] to-[#CFA242] hover:from-[#ECC978] hover:to-[#DBB052] text-[#141517] font-extrabold text-xs sm:text-sm rounded-xl shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn size={16} />
                    <span>লগইন করুন</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register', currentPath, 'demo')}
                    className="w-full sm:w-auto min-h-[46px] px-5 py-2.5 bg-[#24252B] hover:bg-[#2F3138] text-[#FAF7F0] border border-[#D4AF5F]/45 font-bold text-xs sm:text-sm rounded-xl inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus size={16} className="text-[#E4BE67]" />
                    <span>নতুন অ্যাকাউন্ট তৈরি করুন (OTP)</span>
                  </button>
                </div>
              </div>
            </div>
          ) : currentClass ? (
            <ClassView
              currentClass={currentClass}
              allClasses={classes}
              currentUser={currentUser}
              onBackToDashboard={() => {
                setCurrentClass(null);
                navigateTo('/classes');
              }}
              onNavigate={navigateTo}
            />
          ) : classesLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">
              ক্লাস লোড হচ্ছে...
            </div>
          ) : (
            <div className="max-w-md mx-auto px-4 py-14 text-center space-y-4">
              <div className="p-6 bg-white rounded-2xl border border-[#E5DEC9] shadow-sm space-y-3">
                <p className="text-sm font-bold text-[#18191C]">
                  ক্লাসটি খুঁজে পাওয়া যায়নি।
                </p>
                <button
                  type="button"
                  onClick={() => navigateTo('/classes')}
                  className="px-4 py-2 bg-[#18191C] text-[#F2D283] font-bold text-xs rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>ক্লাসসমূহে ফিরে যান</span>
                </button>
              </div>
            </div>
          )
        )}

        {/* ======================================================== */}
        {/* ROUTE 2: PUBLIC ENROLL (/enroll) */}
        {/* ======================================================== */}
        {currentPath === '/enroll' && (
          <EnrollPage
            currentUser={currentUser}
            onNavigate={navigateTo}
            onOpenAuth={(tab = 'login') => openAuthModal(tab, '/enroll', 'other')}
            onOpenFreeClassAuth={(tab = 'register') => openAuthModal(tab, '/', 'demo')}
            onRefreshProfile={async () => {
              if (!currentUser?.id) return;
              const updated = await fetchUserProfile(currentUser.id);
              if (updated) setCurrentUser(updated);
            }}
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
              chapters={chapters}
              chaptersSupported={chaptersSupported}
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
        {(currentPath !== '/demo' || Boolean(currentUser)) &&
          currentPath !== '/ebooks' &&
          currentPath !== '/abacus' &&
          currentPath !== '/abacus/' &&
          currentPath !== '/classes' &&
          currentPath !== '/classes/' &&
          !currentPath.startsWith('/class/') &&
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
                onOpenFreeResourcesAuth={(redirectPath = '/', tab = 'login') =>
                  openAuthModal(tab, redirectPath, 'demo')
                }
                onOpenAbacusAuth={(tab = 'login') =>
                  openAuthModal(tab, '/abacus', 'demo')
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
                  navigateTo('/classes');
                }}
                onNavigate={navigateTo}
              />
            ) : (
              /* Signed-in Resource Hub at / */
              <>
                {classesError && (
                  <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs">
                      {classesError}
                    </div>
                  </div>
                )}
                <StudentHomeHub
                  currentUser={currentUser}
                  classes={classes}
                  classesLoading={classesLoading}
                  onNavigate={navigateTo}
                  onLogout={handleLogout}
                  pendingRequestsCount={pendingRequestsCount}
                />
              </>
            )
          )}
      </main>

      {/* Clean Footer with Site Settings and Policy links */}
      <Footer onNavigate={navigateTo} />

      {/* Fixed Mobile Bottom Navigation for Signed-in Active Users */}
      {showMobileBottomNav && currentUser && (
        <MobileBottomNav
          currentUser={currentUser}
          activePath={currentClass ? `/class/${currentClass.id}` : currentPath}
          onNavigate={navigateTo}
          onOpenDashboard={() => {
            setCurrentClass(null);
            navigateTo('/');
          }}
          onLogout={handleLogout}
          pendingRequestsCount={pendingRequestsCount}
          pendingStudentsCount={0}
        />
      )}

      {/* Sitewide Mobile-Safe Support Widget */}
      <SupportWidget
        showMobileBottomNav={showMobileBottomNav}
        isHidden={isAuthModalOpen || isResetPasswordModalOpen}
        activePath={currentClass ? `/class/${currentClass.id}` : currentPath}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        initialTab={authInitialTab}
        signupOrigin={authOrigin}
        redirectPath={postAuthRedirect}
        onBeforeDemoCompleteRegistration={() => {
          if (authOrigin === 'demo' && postAuthRedirect === '/demo') {
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
          const targetPath =
            postAuthRedirect ||
            (currentPath === '/abacus' || currentPath === '/abacus/'
              ? '/abacus'
              : '/');
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
