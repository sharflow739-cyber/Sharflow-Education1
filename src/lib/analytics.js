import { isMarketingTrackingPermitted } from './metaPixel.ts';

export const GA_MEASUREMENT_ID = 'G-T6MR5VKW39';
export const SCROLL_DEPTH_THRESHOLDS = [25, 50, 75, 90];

const ALLOWED_EXACT_KEYS = new Set([
  'send_to',
  'page_path',
  'page_location',
  'page_referrer',
  'form_name',
  'place',
  'target',
  'percent',
  'provider',
  'reason',
  'page',
]);

const SENSITIVE_KEY_PATTERN =
  /(?:^|_)(?:name|email|mail|phone|mobile|tel|payer|trx|trxid|otp|token|pass|password|secret|msg|message|query|search|address|note|child|age|cookie|client_id)(?:$|_)/i;

/**
 * Strip query params and URL hashes so tokens, form inputs, or raw query params
 * never leak into GA4 page_path or page_location.
 *
 * @param {string} [rawPath]
 * @returns {string}
 */
export function normalizeAnalyticsPath(rawPath) {
  let candidate = typeof rawPath === 'string' ? rawPath.trim() : '';
  if (!candidate && typeof window !== 'undefined') {
    candidate = window.location.pathname || '/';
  }
  const withoutQuery = candidate.split('?')[0].split('#')[0].trim();
  if (!withoutQuery || !withoutQuery.startsWith('/')) {
    return '/';
  }
  if (withoutQuery.length > 1 && withoutQuery.endsWith('/')) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
}

/**
 * Scrub potentially sensitive keys and raw query strings from GA4 event parameters.
 *
 * @param {Record<string, unknown>} [params]
 * @returns {Record<string, string | number | boolean>}
 */
export function sanitizeAnalyticsParams(params) {
  /** @type {Record<string, string | number | boolean>} */
  const safe = {};
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return safe;
  }

  for (const [key, value] of Object.entries(params)) {
    if (!key) continue;
    if (!ALLOWED_EXACT_KEYS.has(key) && SENSITIVE_KEY_PATTERN.test(key)) {
      continue;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      safe[key] = value;
    } else if (typeof value === 'boolean') {
      safe[key] = value;
    } else if (typeof value === 'string') {
      const cleaned = value.trim().slice(0, 180);
      if (key === 'page_path') {
        safe[key] = normalizeAnalyticsPath(cleaned);
      } else if (key === 'page_location') {
        safe[key] = cleaned.split('?')[0].split('#')[0];
      } else {
        safe[key] = cleaned;
      }
    }
  }

  return safe;
}

/**
 * Check whether GA4 tracking is currently allowed under privacy/consent and route rules.
 *
 * @returns {boolean}
 */
export function isAnalyticsPermitted() {
  try {
    if (typeof window === 'undefined') return false;
    if (window[`ga-disable-${GA_MEASUREMENT_ID}`] === true) return false;
    return isMarketingTrackingPermitted();
  } catch {
    return false;
  }
}

/**
 * Safely send a custom GA4 event via window.gtag.
 * Respects opt-out/GPC consent, strips sensitive keys, never throws, and is SSR/build safe.
 *
 * @param {string} name
 * @param {Record<string, unknown>} [params]
 */
export function track(name, params = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (!name || typeof name !== 'string') return;
    if (!isAnalyticsPermitted()) return;
    const gtag = window.gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', name, sanitizeAnalyticsParams(params));
  } catch {
    // Ignore analytics errors so user flows never break
  }
}

/**
 * Safely send a GA4 page_view event with normalized page_path (no query params or hashes).
 *
 * @param {string} [path]
 */
export function trackPageView(path) {
  try {
    if (typeof window === 'undefined') return;
    const normalizedPath = normalizeAnalyticsPath(path);
    const origin = window.location?.origin || '';

    track('page_view', {
      send_to: GA_MEASUREMENT_ID,
      page_path: normalizedPath,
      page_location: origin ? `${origin}${normalizedPath}` : normalizedPath,
      page_referrer: '',
    });
  } catch {
    // Ignore analytics errors
  }
}
