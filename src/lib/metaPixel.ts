export const META_PIXEL_ID = '1511821274218046';
export const MARKETING_CONSENT_STORAGE_KEY = 'abacus_marketing_consent';
const META_FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

export type MarketingConsentStatus = 'unset' | 'granted' | 'denied';

let inMemoryConsent: MarketingConsentStatus | null = null;
let pixelInitialized = false;
const claimedPageViewVisitKeys = new Set<string>();

function hasPendingAuthHash(hash: string): boolean {
  return Boolean(hash && (hash.includes('access_token') || hash.includes('type=')));
}

export function getMarketingConsent(): MarketingConsentStatus {
  if (inMemoryConsent !== null) {
    return inMemoryConsent;
  }
  if (typeof window === 'undefined') {
    return 'unset';
  }
  try {
    const stored = window.localStorage.getItem(MARKETING_CONSENT_STORAGE_KEY);
    if (stored === 'granted' || stored === 'denied') {
      inMemoryConsent = stored;
      return stored;
    }
  } catch {
    // Ignore storage access restrictions
  }
  inMemoryConsent = 'unset';
  return 'unset';
}

export function isMarketingConsentGranted(): boolean {
  return getMarketingConsent() === 'granted';
}

export function setMarketingConsent(status: 'granted' | 'denied'): void {
  inMemoryConsent = status;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MARKETING_CONSENT_STORAGE_KEY, status);
    } catch {
      // Ignore storage access restrictions
    }
  }

  if (status === 'denied') {
    revokeMetaConsentIfLoaded();
  } else if (status === 'granted' && pixelInitialized && typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq('consent', 'grant');
  }
}

export function revokeMetaConsentIfLoaded(): void {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    try {
      window.fbq('consent', 'revoke');
    } catch {
      // Ignore revoke errors
    }
  }
}

/**
 * Ensures any PII/token query parameters or non-auth hashes are stripped from /demo
 * before Meta Pixel reads window.location.href.
 */
export function ensureSafeCanonicalDemoUrl(): string | null {
  if (typeof window === 'undefined') return null;
  if (window.location.pathname !== '/demo') return null;
  if (hasPendingAuthHash(window.location.hash)) return null;

  if (window.location.search || window.location.hash) {
    window.history.replaceState(null, '', '/demo');
  }

  return `${window.location.origin}/demo`;
}

function ensureMetaPixelLoaded(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (!isMarketingConsentGranted()) {
    return false;
  }

  if (!pixelInitialized || typeof window.fbq !== 'function') {
    if (typeof window.fbq !== 'function') {
      const fbqFn = function (...args: unknown[]) {
        if (fbqFn.callMethod) {
          fbqFn.callMethod(...args);
        } else {
          fbqFn.queue = fbqFn.queue || [];
          fbqFn.queue.push(args);
        }
      } as NonNullable<Window['fbq']>;

      fbqFn.push = fbqFn;
      fbqFn.loaded = true;
      fbqFn.version = '2.0';
      fbqFn.queue = [];
      fbqFn.disablePushState = true;

      window.fbq = fbqFn;
      if (!window._fbq) {
        window._fbq = fbqFn;
      }
    } else {
      window.fbq.disablePushState = true;
    }

    // Disable automatic event collection and initialize WITHOUT advanced matching user data
    window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
    window.fbq('consent', 'grant');
    window.fbq('init', META_PIXEL_ID);
    pixelInitialized = true;
  }

  // Prevent duplicate fbevents.js tags
  const existingScript = document.querySelector<HTMLScriptElement>(
    `script[src="${META_FBEVENTS_SRC}"]`
  );
  if (!existingScript) {
    const script = document.createElement('script');
    script.async = true;
    script.src = META_FBEVENTS_SRC;
    script.dataset.metaPixelId = META_PIXEL_ID;
    document.head.appendChild(script);
  }

  return true;
}

export function trackDemoPageView(visitNumber: number): boolean {
  if (!isMarketingConsentGranted()) return false;
  if (typeof window === 'undefined') return false;
  if (window.location.pathname !== '/demo') return false;
  if (hasPendingAuthHash(window.location.hash)) return false;

  const visitKey = `demo-visit-${visitNumber}`;
  if (claimedPageViewVisitKeys.has(visitKey)) {
    return false;
  }
  claimedPageViewVisitKeys.add(visitKey);

  const canonicalUrl = ensureSafeCanonicalDemoUrl();
  if (!canonicalUrl) {
    claimedPageViewVisitKeys.delete(visitKey);
    return false;
  }

  if (!ensureMetaPixelLoaded() || typeof window.fbq !== 'function') {
    return false;
  }

  window.fbq('track', 'PageView');
  return true;
}

export function trackDemoCompleteRegistration(): boolean {
  if (!isMarketingConsentGranted()) return false;
  if (typeof window === 'undefined') return false;
  if (hasPendingAuthHash(window.location.hash)) return false;

  ensureSafeCanonicalDemoUrl();

  if (!ensureMetaPixelLoaded() || typeof window.fbq !== 'function') {
    return false;
  }

  // Standard CompleteRegistration event with NO custom personal data or PII
  window.fbq('track', 'CompleteRegistration');
  return true;
}

export function resetMetaPixelStateForTests(): void {
  inMemoryConsent = null;
  pixelInitialized = false;
  claimedPageViewVisitKeys.clear();
}
