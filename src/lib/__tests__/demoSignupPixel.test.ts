import test from 'node:test';
import assert from 'node:assert/strict';
import {
  META_PIXEL_ID,
  MARKETING_CONSENT_STORAGE_KEY,
  getMarketingConsent,
  setMarketingConsent,
  ensureSafeCanonicalDemoUrl,
  trackDemoPageView,
  trackDemoCompleteRegistration,
  resetMetaPixelStateForTests,
} from '../metaPixel.ts';
import {
  beginDemoSignupAttempt,
  cancelDemoSignupAttempt,
  getActiveDemoSignupAttempt,
  claimAndTrackDemoRegistration,
  resetDemoSignupTrackerForTests,
} from '../demoSignupPixel.ts';

interface ScriptStub {
  async: boolean;
  src: string;
  dataset: Record<string, string>;
}

function setupDomMock(initialPath = '/demo', initialSearch = '', initialHash = '') {
  const storage = new Map<string, string>();
  const appendedScripts: ScriptStub[] = [];
  const replaceStateCalls: Array<{ url: string }> = [];
  const fbqCalls: unknown[][] = [];

  const locationState = {
    origin: 'https://sharflow.example',
    pathname: initialPath,
    search: initialSearch,
    hash: initialHash,
  };

  const mockWindow = {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
    },
    location: locationState,
    history: {
      replaceState: (_state: unknown, _title: string, url: string) => {
        replaceStateCalls.push({ url });
        const [pathPart, hashPart = ''] = url.split('#');
        const [pathnamePart, searchPart = ''] = pathPart.split('?');
        locationState.pathname = pathnamePart || '/';
        locationState.search = searchPart ? `?${searchPart}` : '';
        locationState.hash = hashPart ? `#${hashPart}` : '';
      },
    },
    fbq: undefined as Window['fbq'],
    _fbq: undefined as Window['_fbq'],
  };

  const mockDocument = {
    querySelector: (selector: string) => {
      const match = selector.match(/^script\[src="(.+)"\]$/);
      if (!match) return null;
      return appendedScripts.find((s) => s.src === match[1]) ?? null;
    },
    createElement: (_tag: string): ScriptStub => ({
      async: false,
      src: '',
      dataset: {},
    }),
    head: {
      appendChild: (el: ScriptStub) => {
        appendedScripts.push(el);
        return el;
      },
    },
  };

  Object.defineProperty(globalThis, 'window', {
    value: mockWindow,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, 'document', {
    value: mockDocument,
    configurable: true,
    writable: true,
  });

  const installFbqRecorder = () => {
    const wrapped = function (...args: unknown[]) {
      fbqCalls.push(args);
    } as NonNullable<Window['fbq']>;
    wrapped.loaded = true;
    wrapped.version = '2.0';
    wrapped.queue = [];
    mockWindow.fbq = wrapped;
    mockWindow._fbq = wrapped;
  };

  return {
    storage,
    appendedScripts,
    replaceStateCalls,
    fbqCalls,
    locationState,
    mockWindow,
    installFbqRecorder,
    getCapturedFbqQueue: () => {
      if (fbqCalls.length > 0) return fbqCalls;
      return mockWindow.fbq?.queue ?? [];
    },
  };
}

function resetAll() {
  resetMetaPixelStateForTests();
  resetDemoSignupTrackerForTests();
}

test('Consent absent or denied blocks Meta Pixel loading, PageView, and CompleteRegistration', () => {
  resetAll();
  const dom = setupDomMock('/demo');

  assert.equal(getMarketingConsent(), 'unset');
  assert.equal(trackDemoPageView(1), false);
  assert.equal(trackDemoCompleteRegistration(), false);
  assert.equal(dom.appendedScripts.length, 0);
  assert.equal(dom.mockWindow.fbq, undefined);

  setMarketingConsent('denied');
  assert.equal(dom.storage.get(MARKETING_CONSENT_STORAGE_KEY), 'denied');
  assert.equal(trackDemoPageView(2), false);
  assert.equal(trackDemoCompleteRegistration(), false);
  assert.equal(dom.appendedScripts.length, 0);
  assert.equal(dom.mockWindow.fbq, undefined);
});

test('Withdrawing consent revokes Meta Pixel consent and blocks subsequent dispatches', () => {
  resetAll();
  const dom = setupDomMock('/demo');
  setMarketingConsent('granted');

  assert.equal(trackDemoPageView(1), true);
  assert.equal(dom.appendedScripts.length, 1);

  setMarketingConsent('denied');
  const queue = dom.getCapturedFbqQueue();
  assert.ok(queue.some((args) => args[0] === 'consent' && args[1] === 'revoke'));
  assert.equal(trackDemoCompleteRegistration(), false);
  assert.equal(trackDemoPageView(2), false);
});

test('/demo PageView loads fbevents.js once, disables autoConfig/pushState, uses no PII/advanced matching, and dedupes StrictMode', () => {
  resetAll();
  const dom = setupDomMock('/demo', '?email=leak@example.com&token=abc', '#extra');
  setMarketingConsent('granted');

  // First call (StrictMode mount 1)
  assert.equal(trackDemoPageView(1), true);
  // Second call for same visit (StrictMode mount 2)
  assert.equal(trackDemoPageView(1), false);

  assert.equal(dom.locationState.pathname, '/demo');
  assert.equal(dom.locationState.search, '');
  assert.equal(dom.locationState.hash, '');
  assert.equal(dom.replaceStateCalls.length, 1);
  assert.equal(dom.replaceStateCalls[0].url, '/demo');

  assert.equal(dom.appendedScripts.length, 1);
  assert.equal(dom.appendedScripts[0].src, 'https://connect.facebook.net/en_US/fbevents.js');
  assert.equal(dom.mockWindow.fbq?.disablePushState, true);

  const calls = dom.getCapturedFbqQueue();
  assert.deepEqual(calls, [
    ['set', 'autoConfig', false, META_PIXEL_ID],
    ['consent', 'grant'],
    ['init', META_PIXEL_ID],
    ['track', 'PageView'],
  ]);
});

test('/demo PageView is blocked on non-demo routes and when auth token hash is pending', () => {
  resetAll();
  const dom = setupDomMock('/enroll');
  setMarketingConsent('granted');

  assert.equal(trackDemoPageView(1), false);
  assert.equal(dom.appendedScripts.length, 0);

  dom.locationState.pathname = '/demo';
  dom.locationState.hash = '#access_token=secret_jwt&type=signup';
  assert.equal(ensureSafeCanonicalDemoUrl(), null);
  assert.equal(trackDemoPageView(2), false);
  assert.equal(dom.appendedScripts.length, 0);
});

test('Immediate-session demo-origin signup dispatches CompleteRegistration once with no custom PII', () => {
  resetAll();
  const dom = setupDomMock('/');
  setMarketingConsent('granted');

  const attempt = beginDemoSignupAttempt(true);
  assert.ok(attempt);

  const tracked = claimAndTrackDemoRegistration(
    attempt.id,
    { isNewUser: true },
    {
      onBeforeDispatch: () => {
        dom.locationState.pathname = '/demo';
        dom.locationState.search = '?ref=ad';
      },
    }
  );

  assert.equal(tracked, true);
  assert.equal(getActiveDemoSignupAttempt(), null);
  assert.equal(dom.locationState.pathname, '/demo');
  assert.equal(dom.locationState.search, '');

  const calls = dom.getCapturedFbqQueue();
  const completeRegCalls = calls.filter((c) => c[0] === 'track' && c[1] === 'CompleteRegistration');
  assert.equal(completeRegCalls.length, 1);
  assert.deepEqual(completeRegCalls[0], ['track', 'CompleteRegistration']);

  // Duplicate/concurrent replay must not fire again
  assert.equal(claimAndTrackDemoRegistration(attempt.id, { isNewUser: true }), false);
  assert.equal(
    dom.getCapturedFbqQueue().filter((c) => c[0] === 'track' && c[1] === 'CompleteRegistration').length,
    1
  );
});

test('Signup OTP branch: no event on submit, failed OTP, or resend; fires once after OTP verification succeeds', () => {
  resetAll();
  const dom = setupDomMock('/demo');
  setMarketingConsent('granted');

  // 1. User submits signup form -> Supabase returns session: null (OTP sent)
  const attempt = beginDemoSignupAttempt(true);
  assert.ok(attempt);
  assert.equal(dom.getCapturedFbqQueue().length, 0);

  // 2. Wrong OTP failure -> attempt remains unclaimed, no event fired
  assert.equal(getActiveDemoSignupAttempt()?.claimed, false);
  assert.equal(dom.getCapturedFbqQueue().length, 0);

  // 3. OTP Resend -> still unclaimed, no event fired
  assert.equal(getActiveDemoSignupAttempt()?.id, attempt.id);
  assert.equal(dom.getCapturedFbqQueue().length, 0);

  // 4. User enters valid OTP -> verification succeeds, claimed synchronously once
  const firstClaim = claimAndTrackDemoRegistration(attempt.id, { isNewUser: true });
  const concurrentClaim = claimAndTrackDemoRegistration(attempt.id, { isNewUser: true });

  assert.equal(firstClaim, true);
  assert.equal(concurrentClaim, false);

  const completeRegCalls = dom
    .getCapturedFbqQueue()
    .filter((c) => c[0] === 'track' && c[1] === 'CompleteRegistration');
  assert.equal(completeRegCalls.length, 1);
});

test('Negative cases: failure/cancel, reload, existing login (including unconfirmed OTP), and non-demo origin never dispatch', () => {
  resetAll();
  const dom = setupDomMock('/demo');
  setMarketingConsent('granted');

  // Case 1: Signup error cancels active attempt
  const failedAttempt = beginDemoSignupAttempt(true);
  assert.ok(failedAttempt);
  cancelDemoSignupAttempt(failedAttempt.id);
  assert.equal(claimAndTrackDemoRegistration(failedAttempt.id, { isNewUser: true }), false);

  // Case 2: Page reload (no active attempt in memory)
  assert.equal(claimAndTrackDemoRegistration('demo-signup-stale-id', { isNewUser: true }), false);

  // Case 3: Existing user login (e.g. email_not_confirmed -> OTP verify, isNewUser: false)
  const existingAttempt = beginDemoSignupAttempt(true);
  assert.ok(existingAttempt);
  assert.equal(claimAndTrackDemoRegistration(existingAttempt.id, { isNewUser: false }), false);
  cancelDemoSignupAttempt(existingAttempt.id);

  // Case 4: Non-demo origin (/enroll, Header on /)
  const nonDemoAttempt = beginDemoSignupAttempt(false);
  assert.equal(nonDemoAttempt, null);
  assert.equal(claimAndTrackDemoRegistration(undefined, { isNewUser: true }), false);

  assert.equal(dom.appendedScripts.length, 0);
  assert.equal(dom.getCapturedFbqQueue().length, 0);
});
