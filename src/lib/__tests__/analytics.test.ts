import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCurrentUtmParams,
  getGaClientId,
  track,
  trackPageView,
} from '../analytics.js';
import enrollHandler from '../../../api/enroll.js';

function createMockRes() {
  const headers: Record<string, string> = {};
  let statusCode = 200;
  let body: unknown = null;
  let ended = false;

  const res = {
    setHeader(key: string, val: string) {
      headers[key.toLowerCase()] = val;
    },
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(payload: unknown) {
      body = payload;
      ended = true;
      return res;
    },
    end() {
      ended = true;
      return res;
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    get headers() {
      return headers;
    },
    get ended() {
      return ended;
    },
  };

  return res;
}

test('track and trackPageView are SSR-safe when window is undefined', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  delete (globalThis as { window?: unknown }).window;

  try {
    assert.doesNotThrow(() => track('enroll_view', { page: 'enroll' }));
    assert.doesNotThrow(() => trackPageView('/enroll'));
  } finally {
    if (prevWindow !== undefined) {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});

test('track invokes window.gtag and swallows runtime errors', () => {
  const calls: unknown[][] = [];
  const prevWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window?: unknown }).window = {
    location: { origin: 'https://sharflowbd.com', pathname: '/', search: '' },
    gtag: (...args: unknown[]) => {
      calls.push(args);
    },
  };

  try {
    track('form_submit', { form: 'enroll', plan: 'starter-package' });
    trackPageView('/demo');

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0], ['event', 'form_submit', { form: 'enroll', plan: 'starter-package' }]);
    assert.equal(calls[1][0], 'event');
    assert.equal(calls[1][1], 'page_view');
    assert.equal((calls[1][2] as Record<string, unknown>).page_path, '/demo');
    assert.equal((calls[1][2] as Record<string, unknown>).send_to, 'G-T6MR5VKW39');

    // Error resilience
    (globalThis as unknown as { window: { gtag: () => void } }).window.gtag = () => {
      throw new Error('gtag boom');
    };
    assert.doesNotThrow(() => track('whatsapp_click', { place: 'enroll' }));
  } finally {
    if (prevWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = prevWindow;
    }
  }
});

test('getGaClientId and getCurrentUtmParams parse browser context safely', () => {
  const prevWindow = (globalThis as { window?: unknown }).window;
  const prevDocument = (globalThis as { document?: unknown }).document;

  (globalThis as { window?: unknown }).window = {
    location: {
      origin: 'https://sharflowbd.com',
      pathname: '/enroll',
      search: '?utm_source=facebook&utm_campaign=abacus_parent&ignored=1',
    },
  };
  (globalThis as { document?: unknown }).document = {
    cookie: 'foo=bar; _ga=GA1.1.123456789.987654321; theme=dark',
  };

  try {
    assert.equal(getGaClientId(), '123456789.987654321');
    assert.deepEqual(getCurrentUtmParams(), {
      utm_source: 'facebook',
      utm_campaign: 'abacus_parent',
    });
  } finally {
    if (prevWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = prevWindow;
    if (prevDocument === undefined) delete (globalThis as { document?: unknown }).document;
    else (globalThis as { document?: unknown }).document = prevDocument;
  }
});

test('/api/enroll rejects cross-origin requests and validates name and phone', async () => {
  // 1. Cross-site sec-fetch-site -> 403
  const resCross = createMockRes();
  await enrollHandler(
    {
      method: 'POST',
      headers: { 'sec-fetch-site': 'cross-site', host: 'sharflowbd.com' },
      body: { name: 'Rafi', phone: '01712345678' },
    },
    resCross
  );
  assert.equal(resCross.statusCode, 403);

  // 2. Method not allowed -> 405
  const resGet = createMockRes();
  await enrollHandler(
    {
      method: 'GET',
      headers: { host: 'sharflowbd.com' },
    },
    resGet
  );
  assert.equal(resGet.statusCode, 405);

  // 3. Invalid short name -> 400
  const resBadName = createMockRes();
  await enrollHandler(
    {
      method: 'POST',
      headers: { host: 'sharflowbd.com', origin: 'https://sharflowbd.com' },
      body: { name: 'A', phone: '01712345678' },
    },
    resBadName
  );
  assert.equal(resBadName.statusCode, 400);
  assert.deepEqual(resBadName.body, { ok: false, error: 'অনুগ্রহ করে শিশুর সঠিক নাম লিখুন।' });

  // 4. Invalid phone -> 400
  const resBadPhone = createMockRes();
  await enrollHandler(
    {
      method: 'POST',
      headers: { host: 'sharflowbd.com', origin: 'https://sharflowbd.com' },
      body: { name: 'Ayan Rahman', phone: '123' },
    },
    resBadPhone
  );
  assert.equal(resBadPhone.statusCode, 400);
});
