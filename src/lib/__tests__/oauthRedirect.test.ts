import test from 'node:test';
import assert from 'node:assert/strict';
import {
  claimAndTrackOAuthRegistration,
  clearPendingGoogleOAuthAttempt,
  consumePendingGoogleOAuthAttempt,
  isDemonstrablyNewOAuthUser,
  parseAuthCallbackError,
  resetOAuthRedirectStateForTests,
  sanitizeOAuthReturnPath,
  savePendingGoogleOAuthAttempt,
} from '../oauthRedirect.ts';

function setupSessionStorageMock() {
  const store = new Map<string, string>();
  const prevWindow = (globalThis as { window?: unknown }).window;

  (globalThis as { window?: unknown }).window = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  };

  return {
    store,
    restore: () => {
      resetOAuthRedirectStateForTests();
      if (prevWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = prevWindow;
      }
    },
  };
}

test('sanitizeOAuthReturnPath strictly enforces local allowlist and blocks open redirects', () => {
  assert.equal(sanitizeOAuthReturnPath('/'), '/');
  assert.equal(sanitizeOAuthReturnPath('/classes'), '/classes');
  assert.equal(sanitizeOAuthReturnPath('/classes/'), '/classes');
  assert.equal(sanitizeOAuthReturnPath('/ebooks'), '/ebooks');
  assert.equal(sanitizeOAuthReturnPath('/abacus'), '/abacus');
  assert.equal(sanitizeOAuthReturnPath('/abacus/'), '/abacus');
  assert.equal(sanitizeOAuthReturnPath('/enroll?ref=promo#top'), '/enroll');

  // Open redirects & unsupported paths must fall back to /
  assert.equal(sanitizeOAuthReturnPath('https://evil.com/classes'), '/');
  assert.equal(sanitizeOAuthReturnPath('http://localhost:3000/classes'), '/');
  assert.equal(sanitizeOAuthReturnPath('//evil.com'), '/');
  assert.equal(sanitizeOAuthReturnPath('javascript:alert(1)'), '/');
  assert.equal(sanitizeOAuthReturnPath('/\\evil.com'), '/');
  assert.equal(sanitizeOAuthReturnPath('/admin'), '/');
  assert.equal(sanitizeOAuthReturnPath('classes'), '/');
  assert.equal(sanitizeOAuthReturnPath(null), '/');
  assert.equal(sanitizeOAuthReturnPath(''), '/');
});

test('Pending Google OAuth attempt consumes once and clears on error/expiry', () => {
  const mock = setupSessionStorageMock();
  try {
    resetOAuthRedirectStateForTests();
    const now = 1_700_000_000_000;

    savePendingGoogleOAuthAttempt({
      returnPath: '/classes',
      signupOrigin: 'demo',
      nowMs: now,
    });

    const consumed = consumePendingGoogleOAuthAttempt(now + 5_000);
    assert.ok(consumed);
    assert.equal(consumed.returnPath, '/classes');
    assert.equal(consumed.signupOrigin, 'demo');

    // Second consume (e.g. reload or duplicate listener) returns null
    assert.equal(consumePendingGoogleOAuthAttempt(now + 6_000), null);

    // Expired attempt (> 15 min) returns null
    savePendingGoogleOAuthAttempt({
      returnPath: '/ebooks',
      signupOrigin: 'other',
      nowMs: now,
    });
    assert.equal(consumePendingGoogleOAuthAttempt(now + 16 * 60 * 1000), null);

    // Manual clear removes pending state
    savePendingGoogleOAuthAttempt({ returnPath: '/enroll', signupOrigin: 'demo', nowMs: now });
    clearPendingGoogleOAuthAttempt();
    assert.equal(consumePendingGoogleOAuthAttempt(now + 1_000), null);
  } finally {
    mock.restore();
  }
});

test('parseAuthCallbackError parses query and hash callback errors cleanly', () => {
  assert.equal(parseAuthCallbackError({ search: '?code=pkce_123', hash: '' }), null);

  const cancelled = parseAuthCallbackError({
    search: '?error=access_denied&error_description=User+denied+access',
    hash: '',
  });
  assert.ok(cancelled);
  assert.equal(cancelled.code, 'access_denied');
  assert.ok(cancelled.message.includes('Google লগইন বাতিল'));

  const hashOtp = parseAuthCallbackError({
    search: '',
    hash: '#error=access_denied&error_code=otp_expired',
  });
  assert.ok(hashOtp);
  assert.equal(hashOtp.code, 'otp_expired');
  assert.ok(hashOtp.message.includes('কোড'));

  const providerErr = parseAuthCallbackError({
    search: '?error=server_error&error_description=oauth+exchange+failed',
    hash: '',
  });
  assert.ok(providerErr);
  assert.ok(providerErr.message.includes('Google লগইন সম্পন্ন করা যায়নি'));
});

test('claimAndTrackOAuthRegistration fires once only for demonstrably new demo-origin Google users', () => {
  const mock = setupSessionStorageMock();
  try {
    resetOAuthRedirectStateForTests();
    const startMs = 1_700_000_000_000;
    const createdIso = new Date(startMs + 2_000).toISOString();
    const firstSignInIso = new Date(startMs + 2_200).toISOString();

    const pendingDemo = savePendingGoogleOAuthAttempt({
      returnPath: '/classes',
      signupOrigin: 'demo',
      nowMs: startMs,
    });

    const newUser = {
      id: 'user-new-google-1',
      created_at: createdIso,
      last_sign_in_at: firstSignInIso,
      identities: [{ provider: 'google', created_at: createdIso }],
    };

    let dispatched = 0;
    const first = claimAndTrackOAuthRegistration(newUser, pendingDemo, {
      nowMs: startMs + 3_000,
      isConsentGranted: () => true,
      dispatchCompleteRegistration: () => {
        dispatched += 1;
        return true;
      },
    });
    assert.equal(first, true);
    assert.equal(dispatched, 1);

    // Repeat / page refresh for same user NEVER fires again
    const replay = claimAndTrackOAuthRegistration(newUser, pendingDemo, {
      nowMs: startMs + 4_000,
      isConsentGranted: () => true,
      dispatchCompleteRegistration: () => {
        dispatched += 1;
        return true;
      },
    });
    assert.equal(replay, false);
    assert.equal(dispatched, 1);

    // Existing Google user signing in later -> blocked
    const existingUser = {
      id: 'user-existing-google-2',
      created_at: new Date(startMs - 86_400_000).toISOString(),
      last_sign_in_at: new Date(startMs + 2_000).toISOString(),
      identities: [{ provider: 'google', created_at: new Date(startMs - 86_400_000).toISOString() }],
    };
    assert.equal(isDemonstrablyNewOAuthUser(existingUser, startMs, startMs + 3_000), false);
    assert.equal(
      claimAndTrackOAuthRegistration(existingUser, pendingDemo, {
        nowMs: startMs + 3_000,
        isConsentGranted: () => true,
        dispatchCompleteRegistration: () => {
          dispatched += 1;
          return true;
        },
      }),
      false
    );

    // Auto-linked account (email + google identities) -> blocked
    const linkedUser = {
      id: 'user-linked-3',
      created_at: createdIso,
      last_sign_in_at: firstSignInIso,
      identities: [
        { provider: 'email', created_at: createdIso },
        { provider: 'google', created_at: firstSignInIso },
      ],
    };
    assert.equal(isDemonstrablyNewOAuthUser(linkedUser, startMs, startMs + 3_000), false);

    // Ambiguous/missing timestamps -> safe no-false-registration
    assert.equal(
      isDemonstrablyNewOAuthUser({ id: 'user-missing-ts-4' }, startMs, startMs + 3_000),
      false
    );

    // Non-demo origin -> never dispatches
    const nonDemoPending = savePendingGoogleOAuthAttempt({
      returnPath: '/ebooks',
      signupOrigin: 'other',
      nowMs: startMs,
    });
    const anotherNewUser = {
      id: 'user-new-other-5',
      created_at: createdIso,
      last_sign_in_at: firstSignInIso,
      identities: [{ provider: 'google', created_at: createdIso }],
    };
    assert.equal(
      claimAndTrackOAuthRegistration(anotherNewUser, nonDemoPending, {
        nowMs: startMs + 3_000,
        isConsentGranted: () => true,
        dispatchCompleteRegistration: () => {
          dispatched += 1;
          return true;
        },
      }),
      false
    );

    // Opt-out consent -> never dispatches
    const optedOutUser = {
      id: 'user-new-optout-6',
      created_at: createdIso,
      last_sign_in_at: firstSignInIso,
      identities: [{ provider: 'google', created_at: createdIso }],
    };
    assert.equal(
      claimAndTrackOAuthRegistration(optedOutUser, pendingDemo, {
        nowMs: startMs + 3_000,
        isConsentGranted: () => false,
        dispatchCompleteRegistration: () => {
          dispatched += 1;
          return true;
        },
      }),
      false
    );

    assert.equal(dispatched, 1);
  } finally {
    mock.restore();
  }
});
