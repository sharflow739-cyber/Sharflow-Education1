import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GA_MEASUREMENT_ID,
  SCROLL_DEPTH_THRESHOLDS,
  isAnalyticsPermitted,
  normalizeAnalyticsPath,
  sanitizeAnalyticsParams,
  track,
  trackPageView,
} from '../analytics.js';
import {
  MARKETING_CONSENT_STORAGE_KEY,
  resetMetaPixelStateForTests,
  setMarketingConsent,
} from '../metaPixel.ts';

function setupBrowserMock(options: { globalPrivacyControl?: boolean; gaDisable?: boolean } = {}) {
  const storage = new Map<string, string>();
  const calls: unknown[][] = [];

  const mockWindow: Record<string, unknown> = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    navigator: {
      globalPrivacyControl: options.globalPrivacyControl ?? false,
    },
    location: {
      origin: 'https://sharflowbd.com',
      pathname: '/enroll',
      search: '?token=secret123&email=parent@example.com',
      hash: '#access_token=jwt',
    },
    gtag: (...args: unknown[]) => {
      calls.push(args);
    },
  };

  if (options.gaDisable) {
    mockWindow[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  }

  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    configurable: true,
    writable: true,
  });

  return { storage, calls, mockWindow };
}

function clearBrowserMock(prevWindow: unknown) {
  resetMetaPixelStateForTests();
  if (prevWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = prevWindow;
  }
}

test('track and trackPageView are SSR-safe when window is undefined', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;

  try {
    assert.equal(isAnalyticsPermitted(), false);
    assert.doesNotThrow(() => track('enroll_view', { page_path: '/enroll' }));
    assert.doesNotThrow(() => trackPageView('/enroll'));
  } finally {
    clearBrowserMock(prevWindow);
  }
});

test('SCROLL_DEPTH_THRESHOLDS matches 25, 50, 75, 90', () => {
  assert.deepEqual(SCROLL_DEPTH_THRESHOLDS, [25, 50, 75, 90]);
});

test('normalizeAnalyticsPath and trackPageView strip query params and hashes', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  resetMetaPixelStateForTests();
  const { calls } = setupBrowserMock();

  try {
    assert.equal(normalizeAnalyticsPath('/enroll?fbclid=123&email=a@b.com#sec'), '/enroll');
    assert.equal(normalizeAnalyticsPath('/demo/'), '/demo');
    assert.equal(normalizeAnalyticsPath('invalid-path?x=1'), '/');

    trackPageView('/enroll?token=secret&phone=01700000000#access_token=xyz');
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], [
      'event',
      'page_view',
      {
        send_to: GA_MEASUREMENT_ID,
        page_path: '/enroll',
        page_location: 'https://sharflowbd.com/enroll',
        page_referrer: '',
      },
    ]);
  } finally {
    clearBrowserMock(prevWindow);
  }
});

test('sanitizeAnalyticsParams drops PII and sensitive fields while preserving safe metadata', () => {
  const cleaned = sanitizeAnalyticsParams({
    form_name: 'manual_payment_claim',
    place: 'enroll',
    target: 'checkout_anchor',
    percent: 75,
    provider: 'bkash',
    reason: 'validation_error',
    page_path: '/enroll?trx=123#hash',
    name: 'Parent Name',
    email: 'parent@example.com',
    phone: '01700000000',
    payer_number: '01711111111',
    trx_id: 'ABC123XYZ',
    otp: '654321',
    token: 'jwt_secret',
    message: 'Private note',
    child_age: 7,
    raw_query: '?x=1',
  });

  assert.deepEqual(cleaned, {
    form_name: 'manual_payment_claim',
    place: 'enroll',
    target: 'checkout_anchor',
    percent: 75,
    provider: 'bkash',
    reason: 'validation_error',
    page_path: '/enroll',
  });
});

test('track respects opt-out consent, GPC, and ga-disable flag', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;

  try {
    // 1. Saved opt-out in ConsentContext storage
    resetMetaPixelStateForTests();
    const denied = setupBrowserMock();
    setMarketingConsent('denied');
    assert.equal(denied.storage.get(MARKETING_CONSENT_STORAGE_KEY), 'denied');
    assert.equal(isAnalyticsPermitted(), false);
    track('cta_click', { place: 'home', target: 'enroll' });
    trackPageView('/enroll');
    assert.equal(denied.calls.length, 0);

    // 2. Browser Global Privacy Control
    resetMetaPixelStateForTests();
    const gpc = setupBrowserMock({ globalPrivacyControl: true });
    assert.equal(isAnalyticsPermitted(), false);
    track('scroll_depth', { percent: 50, page_path: '/' });
    assert.equal(gpc.calls.length, 0);

    // 3. ga-disable flag
    resetMetaPixelStateForTests();
    const disabledFlag = setupBrowserMock({ gaDisable: true });
    assert.equal(isAnalyticsPermitted(), false);
    track('whatsapp_click', { place: 'support_widget', page_path: '/' });
    assert.equal(disabledFlag.calls.length, 0);
  } finally {
    clearBrowserMock(prevWindow);
  }
});

test('track invokes window.gtag when permitted and swallows runtime errors', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  resetMetaPixelStateForTests();
  const { calls, mockWindow } = setupBrowserMock();

  try {
    track('form_submit', { form_name: 'contact' });
    assert.deepEqual(calls[0], ['event', 'form_submit', { form_name: 'contact' }]);

    mockWindow.gtag = () => {
      throw new Error('gtag failure');
    };
    assert.doesNotThrow(() => track('whatsapp_click', { place: 'enroll', page_path: '/enroll' }));
    assert.doesNotThrow(() => trackPageView('/demo'));
  } finally {
    clearBrowserMock(prevWindow);
  }
});
