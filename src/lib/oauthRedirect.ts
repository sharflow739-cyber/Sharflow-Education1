import { isMarketingTrackingPermitted, trackDemoCompleteRegistration } from './metaPixel';
import { SignupOrigin } from './demoSignupPixel';

export const ALLOWED_OAUTH_RETURN_PATHS = [
  '/',
  '/classes',
  '/ebooks',
  '/abacus',
  '/enroll',
] as const;

export type OAuthReturnPath = (typeof ALLOWED_OAUTH_RETURN_PATHS)[number];

const ALLOWED_OAUTH_RETURN_SET = new Set<string>(ALLOWED_OAUTH_RETURN_PATHS);
export const PENDING_GOOGLE_OAUTH_KEY = 'sharflow_pending_google_oauth_v1';
export const CLAIMED_OAUTH_REG_KEY = 'sharflow_claimed_oauth_reg_v1';
const PENDING_OAUTH_MAX_AGE_MS = 15 * 60 * 1000;
const NEW_USER_TIMESTAMP_TOLERANCE_MS = 5 * 1000;
const NEW_USER_MAX_CLOCK_SKEW_MS = 30 * 1000;

export interface PendingGoogleOAuthAttempt {
  id: string;
  returnPath: OAuthReturnPath;
  signupOrigin: SignupOrigin;
  startedAt: number;
}

export interface OAuthUserIdentitySnapshot {
  id?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  identities?: Array<{
    provider?: string | null;
    created_at?: string | null;
    last_sign_in_at?: string | null;
  }> | null;
}

const inMemoryClaimedOAuthUserIds = new Set<string>();

/**
 * Strictly validates and normalizes an OAuth return path against an explicit local allowlist.
 * Rejects external origins, protocol-relative URLs, backslashes, query/hash smuggling, and unknown paths.
 */
export function sanitizeOAuthReturnPath(rawPath?: string | null): OAuthReturnPath {
  if (typeof rawPath !== 'string') return '/';
  const trimmed = rawPath.trim();
  if (!trimmed) return '/';

  // Reject scheme URLs (http:, https:, javascript:, data:) and protocol-relative // or backslash paths
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/';
  }

  const withoutQueryOrHash = trimmed.split('?')[0].split('#')[0].trim();
  if (!withoutQueryOrHash.startsWith('/')) {
    return '/';
  }

  const normalized =
    withoutQueryOrHash.length > 1 && withoutQueryOrHash.endsWith('/')
      ? withoutQueryOrHash.slice(0, -1)
      : withoutQueryOrHash;

  return ALLOWED_OAUTH_RETURN_SET.has(normalized) ? (normalized as OAuthReturnPath) : '/';
}

export function savePendingGoogleOAuthAttempt(options: {
  returnPath?: string | null;
  signupOrigin?: SignupOrigin;
  nowMs?: number;
}): PendingGoogleOAuthAttempt {
  const nowMs = options.nowMs ?? Date.now();
  const attempt: PendingGoogleOAuthAttempt = {
    id: `oauth-google-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    returnPath: sanitizeOAuthReturnPath(options.returnPath),
    signupOrigin: options.signupOrigin === 'demo' ? 'demo' : 'other',
    startedAt: nowMs,
  };

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(PENDING_GOOGLE_OAUTH_KEY, JSON.stringify(attempt));
    } catch {
      // Ignore storage access errors in private browsing
    }
  }

  return attempt;
}

export function consumePendingGoogleOAuthAttempt(
  nowMs = Date.now()
): PendingGoogleOAuthAttempt | null {
  if (typeof window === 'undefined') return null;

  let raw: string | null = null;
  try {
    raw = window.sessionStorage.getItem(PENDING_GOOGLE_OAUTH_KEY);
    window.sessionStorage.removeItem(PENDING_GOOGLE_OAUTH_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<PendingGoogleOAuthAttempt> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.startedAt !== 'number' || !Number.isFinite(parsed.startedAt)) {
      return null;
    }
    if (nowMs - parsed.startedAt > PENDING_OAUTH_MAX_AGE_MS) {
      return null;
    }
    if (parsed.startedAt > nowMs + NEW_USER_MAX_CLOCK_SKEW_MS) {
      return null;
    }

    return {
      id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `oauth-${parsed.startedAt}`,
      returnPath: sanitizeOAuthReturnPath(parsed.returnPath),
      signupOrigin: parsed.signupOrigin === 'demo' ? 'demo' : 'other',
      startedAt: parsed.startedAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingGoogleOAuthAttempt(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(PENDING_GOOGLE_OAUTH_KEY);
  } catch {
    // Ignore storage access errors
  }
}

/**
 * Extracts Supabase OAuth or email-link callback error details from search or hash params
 * and translates them into safe localized Bengali notices without leaking raw URL parameters.
 */
export function parseAuthCallbackError(
  loc?: { search?: string; hash?: string } | null
): { code: string; message: string } | null {
  if (!loc) return null;

  const searchParams = new URLSearchParams(
    loc.search ? (loc.search.startsWith('?') ? loc.search.slice(1) : loc.search) : ''
  );
  const hashStr = loc.hash ? (loc.hash.startsWith('#') ? loc.hash.slice(1) : loc.hash) : '';
  const hashParams = new URLSearchParams(hashStr);

  const errorCode = (
    searchParams.get('error_code') ||
    hashParams.get('error_code') ||
    searchParams.get('error') ||
    hashParams.get('error') ||
    ''
  )
    .trim()
    .toLowerCase();

  const errorDesc = (
    searchParams.get('error_description') ||
    hashParams.get('error_description') ||
    ''
  )
    .trim()
    .toLowerCase();

  if (!errorCode && !errorDesc) {
    return null;
  }

  if (errorCode === 'otp_expired') {
    return {
      code: errorCode,
      message: 'লিংকের বদলে ইমেইলের কোড ব্যবহার করুন।',
    };
  }

  if (
    errorCode === 'access_denied' ||
    errorDesc.includes('access_denied') ||
    errorDesc.includes('cancel') ||
    errorDesc.includes('denied')
  ) {
    return {
      code: errorCode || 'access_denied',
      message:
        'Google লগইন বাতিল করা হয়েছে। চাইলে আবার চেষ্টা করুন অথবা ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।',
    };
  }

  if (
    errorCode.includes('oauth') ||
    errorCode.includes('provider') ||
    errorDesc.includes('oauth') ||
    errorDesc.includes('provider') ||
    errorDesc.includes('exchange')
  ) {
    return {
      code: errorCode || 'oauth_error',
      message: 'Google লগইন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
    };
  }

  return {
    code: errorCode || 'auth_callback_error',
    message: 'লগইন প্রক্রিয়া সম্পন্ন হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
  };
}

function readClaimedOAuthUserIds(): Set<string> {
  const result = new Set<string>(inMemoryClaimedOAuthUserIds);
  if (typeof window === 'undefined') return result;
  try {
    const raw = window.sessionStorage.getItem(CLAIMED_OAUTH_REG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const id of parsed) {
          if (typeof id === 'string' && id) result.add(id);
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return result;
}

function markOAuthUserIdClaimed(userId: string): void {
  inMemoryClaimedOAuthUserIds.add(userId);
  if (typeof window === 'undefined') return;
  try {
    const existing = Array.from(readClaimedOAuthUserIds());
    window.sessionStorage.setItem(CLAIMED_OAUTH_REG_KEY, JSON.stringify(existing.slice(-20)));
  } catch {
    // Ignore storage write errors
  }
}

/**
 * Strictly establishes whether an authenticated OAuth user was newly created during this flow.
 * If timestamps or provider identities are missing/ambiguous, returns false to avoid false conversions.
 */
export function isDemonstrablyNewOAuthUser(
  user: OAuthUserIdentitySnapshot | null | undefined,
  oauthStartedAtMs: number,
  nowMs = Date.now()
): boolean {
  if (!user || !user.id) return false;
  if (!Number.isFinite(oauthStartedAtMs) || oauthStartedAtMs <= 0) return false;
  if (nowMs - oauthStartedAtMs > PENDING_OAUTH_MAX_AGE_MS) return false;

  const createdAtMs = user.created_at ? Date.parse(user.created_at) : Number.NaN;
  const lastSignInMs = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Number.NaN;

  if (!Number.isFinite(createdAtMs) || !Number.isFinite(lastSignInMs)) {
    return false;
  }

  // Brand-new Supabase OAuth user creation sets created_at and last_sign_in_at within milliseconds.
  // Existing users signing in later will have last_sign_in_at significantly after created_at.
  if (Math.abs(lastSignInMs - createdAtMs) > NEW_USER_TIMESTAMP_TOLERANCE_MS) {
    return false;
  }

  // Must not predate the current OAuth login initiation beyond minimal clock skew.
  if (createdAtMs < oauthStartedAtMs - NEW_USER_MAX_CLOCK_SKEW_MS) {
    return false;
  }

  if (nowMs - createdAtMs > PENDING_OAUTH_MAX_AGE_MS) {
    return false;
  }

  // Must have a single fresh Google identity (avoid firing when an existing email account links Google).
  if (Array.isArray(user.identities) && user.identities.length > 0) {
    if (user.identities.length !== 1) return false;
    const identity = user.identities[0];
    if (identity.provider !== 'google') return false;
    if (identity.created_at) {
      const idCreatedMs = Date.parse(identity.created_at);
      if (
        !Number.isFinite(idCreatedMs) ||
        Math.abs(idCreatedMs - createdAtMs) > NEW_USER_TIMESTAMP_TOLERANCE_MS
      ) {
        return false;
      }
    }
  }

  return true;
}

export interface ClaimOAuthRegistrationDeps {
  isConsentGranted?: () => boolean;
  dispatchCompleteRegistration?: () => boolean | void;
  nowMs?: number;
}

/**
 * Fires Meta CompleteRegistration AT MOST ONCE when all strict guarantees hold:
 * - Initiated from an active demo-origin OAuth flow in this browser session
 * - User is demonstrably newly created (never existing login, identity-link, or refresh)
 * - User ID has not already been claimed in memory or sessionStorage
 * - Marketing tracking consent is permitted
 */
export function claimAndTrackOAuthRegistration(
  user: OAuthUserIdentitySnapshot | null | undefined,
  pendingAttempt: PendingGoogleOAuthAttempt | null | undefined,
  deps: ClaimOAuthRegistrationDeps = {}
): boolean {
  if (!user?.id || !pendingAttempt) return false;
  if (pendingAttempt.signupOrigin !== 'demo') return false;

  const nowMs = deps.nowMs ?? Date.now();
  if (!isDemonstrablyNewOAuthUser(user, pendingAttempt.startedAt, nowMs)) {
    return false;
  }

  const claimedIds = readClaimedOAuthUserIds();
  if (claimedIds.has(user.id)) {
    return false;
  }

  // Claim synchronously before checking consent/dispatching to prevent races
  markOAuthUserIdClaimed(user.id);

  const checkConsent = deps.isConsentGranted ?? isMarketingTrackingPermitted;
  if (!checkConsent()) {
    return false;
  }

  const dispatch = deps.dispatchCompleteRegistration ?? trackDemoCompleteRegistration;
  const result = dispatch();
  return result !== false;
}

export function resetOAuthRedirectStateForTests(): void {
  inMemoryClaimedOAuthUserIds.clear();
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(PENDING_GOOGLE_OAUTH_KEY);
      window.sessionStorage.removeItem(CLAIMED_OAUTH_REG_KEY);
    } catch {
      // Ignore storage access errors
    }
  }
}
