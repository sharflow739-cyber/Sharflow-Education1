const GA_MEASUREMENT_ID = 'G-T6MR5VKW39';

/**
 * Safely send a custom GA4 event via window.gtag.
 * Never throws and never breaks SSR or build environments.
 *
 * @param {string} name
 * @param {Record<string, unknown>} [params]
 */
export function track(name, params = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (!name || typeof name !== 'string') return;
    const gtag = window.gtag;
    if (typeof gtag !== 'function') return;
    gtag('event', name, params && typeof params === 'object' ? params : {});
  } catch {
    // Ignore analytics errors so user flows never break
  }
}

/**
 * Safely send a GA4 page_view event with page_path for SPA route transitions.
 *
 * @param {string} path
 */
export function trackPageView(path) {
  try {
    if (typeof window === 'undefined') return;
    const normalizedPath =
      typeof path === 'string' && path.trim()
        ? path.trim()
        : window.location.pathname || '/';

    track('page_view', {
      send_to: GA_MEASUREMENT_ID,
      page_path: normalizedPath,
      page_location: window.location.origin + normalizedPath,
      page_referrer: '',
    });
  } catch {
    // Ignore analytics errors
  }
}

/**
 * Extract GA4 client_id from the standard _ga cookie when available in the browser.
 *
 * @returns {string | undefined}
 */
export function getGaClientId() {
  try {
    if (typeof document === 'undefined' || !document.cookie) return undefined;
    const match = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.([^;]+)/);
    return match && match[1] ? match[1].trim() : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract standard UTM query parameters from the current browser URL.
 *
 * @returns {Record<string, string>}
 */
export function getCurrentUtmParams() {
  try {
    if (typeof window === 'undefined' || !window.location.search) return {};
    const searchParams = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    /** @type {Record<string, string>} */
    const result = {};
    for (const key of utmKeys) {
      const value = searchParams.get(key);
      if (value && value.trim()) {
        result[key] = value.trim().slice(0, 120);
      }
    }
    return result;
  } catch {
    return {};
  }
}
