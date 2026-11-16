export const META_PIXEL_ID = '1511821274218046';
export const MARKETING_CONSENT_STORAGE_KEY = 'abacus_marketing_consent';
const META_FBEVENTS_SRC = 'https://connect.facebook.net/en_US/fbevents.js';

export type MarketingConsentStatus = 'unset' | 'granted' | 'denied';

export const PUBLIC_PIXEL_PATHS = new Set<string>([
  '/',
  '/demo',
  '/enroll',
  '/contact',
  '/privacy',
  '/terms',
  '/refund',
]);

const AUTH_CALLBACK_OR_RESET_PATH_PREFIXES = [
  '/auth',
  '/callback',
  '/reset-password',
  '/update-password',
];

const AUTH_CALLBACK_OR_RESET_HASH_MARKERS = [
  'access_token',
  'refresh_token',
  'id_token',
  'provider_token',
  'type=',
  'error_code=',
  'error=',
  'recovery',
];

const AUTH_CALLBACK_OR_RESET_QUERY_KEYS = new Set([
  'code',
  'token_hash',
  'access_token',
  'refresh_token',
  'id_token',
  'provider_token',
  'recovery_token',
  'type',
  'error',
  'error_code',
  'error_description',
]);

let inMemoryConsent: MarketingConsentStatus | null = null;
let pixelInitialized = false;
const claimedPageViewVisitKeys = new Set<string>();

export function isPublicPixelPath(path: string): boolean {
  return PUBLIC_PIXEL_PATHS.has(path);
}

export function hasAuthCallbackOrResetUrl(
  loc?: { pathname?: string; search?: string; hash?: string } | null
): boolean {
  if (!loc) return false;
  const pathname = (loc.pathname || '').toLowerCase();
  if (
    AUTH_CALLBACK_OR_RESET_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  ) {
    return true;
  }

  const hash = (loc.hash || '').toLowerCase();
  if (hash && AUTH_CALLBACK_OR_RESET_HASH_MARKERS.some((marker) => hash.includes(marker))) {
    return true;
  }

  const search = loc.search || '';
  if (search) {
    const cleanSearch = search.startsWith('?') ? search.slice(1) : search;
    const pairs = cleanSearch.split('&');
    for (const pair of pairs) {
      if (!pair) continue;
      const eqIdx = pair.indexOf('=');
      const rawKey = eqIdx >= 0 ? pair.slice(0, eqIdx) : pair;
      let decodedKey = rawKey;
      try {
        decodedKey = decodeURIComponent(rawKey);
      } catch {
        // Ignore malformed encoding and match raw key
      }
      if (AUTH_CALLBACK_OR_RESET_QUERY_KEYS.has(decodedKey.toLowerCase())) {
        return true;
      }
    }
  }

  return false;
}

export function isBrowserPrivacyOptOut(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = (window as unknown as { navigator?: { globalPrivacyControl?: boolean } }).navigator;
  return Boolean(nav && nav.globalPrivacyControl === true);
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

/**
 * Checks whether Meta Pixel tracking is permitted under the site's privacy rules:
 * - Any saved refusal ('denied') is strictly preserved and NEVER turned into consent.
 * - Browser Global Privacy Control (GPC) opt-out is respected unless explicitly overridden by user consent.
 * - Unset visitors permit direct initialization on public pages when privacy signals do not opt out.
 */
export function isMarketingTrackingPermitted(): boolean {
  const status = getMarketingConsent();
  if (status === 'denied') {
    return false;
  }
  if (status === 'granted') {
    return true;
  }
  return !isBrowserPrivacyOptOut();
}

export function isMarketingConsentGranted(): boolean {
  return isMarketingTrackingPermitted();
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
  } else if (
    status === 'granted' &&
    pixelInitialized &&
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function'
  ) {
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
 * Ensures any PII/token query parameters or hashes are stripped from a public route
 * before Meta Pixel reads window.location.href, and blocks non-public/callback/reset URLs.
 */
export function ensureSafeCanonicalPublicUrl(expectedPath?: string): string | null {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '/';
  if (expectedPath && pathname !== expectedPath) return null;
  if (!isPublicPixelPath(pathname)) return null;
  if (hasAuthCallbackOrResetUrl(window.location)) return null;

  if (window.location.search || window.location.hash) {
    window.history.replaceState(null, '', pathname);
  }

  return `${window.location.origin}${pathname}`;
}

export function ensureSafeCanonicalDemoUrl(): string | null {
  return ensureSafeCanonicalPublicUrl('/demo');
}

function ensureMetaPixelLoaded(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  if (!isMarketingTrackingPermitted()) {
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

export function trackPublicPageView(path: string, visitNumber: number): boolean {
  if (!isMarketingTrackingPermitted()) return false;
  if (typeof window === 'undefined') return false;
  if (!isPublicPixelPath(path)) return false;
  const currentPathname = window.location.pathname || '/';
  if (currentPathname !== path) return false;
  if (hasAuthCallbackOrResetUrl(window.location)) return false;

  const visitKey = `${path}::visit-${visitNumber}`;
  if (claimedPageViewVisitKeys.has(visitKey)) {
    return false;
  }
  claimedPageViewVisitKeys.add(visitKey);

  const canonicalUrl = ensureSafeCanonicalPublicUrl(path);
  if (!canonicalUrl) {
    claimedPageViewVisitKeys.delete(visitKey);
    return false;
  }

  if (!ensureMetaPixelLoaded() || typeof window.fbq !== 'function') {
    claimedPageViewVisitKeys.delete(visitKey);
    return false;
  }

  window.fbq('track', 'PageView');
  return true;
}

export function trackDemoPageView(visitNumber: number): boolean {
  return trackPublicPageView('/demo', visitNumber);
}

export function trackDemoCompleteRegistration(): boolean {
  if (!isMarketingTrackingPermitted()) return false;
  if (typeof window === 'undefined') return false;
  if (hasAuthCallbackOrResetUrl(window.location)) return false;

  const canonicalUrl = ensureSafeCanonicalPublicUrl();
  if (!canonicalUrl) return false;

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
