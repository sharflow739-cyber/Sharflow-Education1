import { isMarketingConsentGranted, trackDemoCompleteRegistration } from './metaPixel';

export type SignupOrigin = 'demo' | 'other';

export interface DemoSignupAttempt {
  id: string;
  origin: SignupOrigin;
  claimed: boolean;
}

export interface DemoSignupDispatchDeps {
  isConsentGranted?: () => boolean;
  onBeforeDispatch?: () => void;
  dispatchCompleteRegistration?: () => boolean | void;
}

let attemptSequence = 0;
let activeAttempt: DemoSignupAttempt | null = null;
const claimedAttemptIds = new Set<string>();

export function beginDemoSignupAttempt(isDemoOrigin: boolean): DemoSignupAttempt | null {
  if (!isDemoOrigin) {
    activeAttempt = null;
    return null;
  }

  const attempt: DemoSignupAttempt = {
    id: `demo-signup-${++attemptSequence}-${Date.now()}`,
    origin: 'demo',
    claimed: false,
  };
  activeAttempt = attempt;
  return attempt;
}

export function cancelDemoSignupAttempt(attemptId?: string): void {
  if (!attemptId || activeAttempt?.id === attemptId) {
    activeAttempt = null;
  }
}

export function getActiveDemoSignupAttempt(): DemoSignupAttempt | null {
  return activeAttempt ? { ...activeAttempt } : null;
}

/**
 * Claims the demo signup attempt synchronously BEFORE dispatching CompleteRegistration.
 * Guarantees at-most-once dispatch across retries, concurrent submits, StrictMode, and reloads.
 */
export function claimAndTrackDemoRegistration(
  attemptId: string | null | undefined,
  options: { isNewUser: boolean },
  deps: DemoSignupDispatchDeps = {}
): boolean {
  if (!attemptId) return false;
  if (!options.isNewUser) return false;
  if (!activeAttempt || activeAttempt.id !== attemptId) return false;
  if (activeAttempt.origin !== 'demo') return false;
  if (activeAttempt.claimed || claimedAttemptIds.has(attemptId)) return false;

  // Claim synchronously immediately before dispatch
  activeAttempt.claimed = true;
  claimedAttemptIds.add(attemptId);
  activeAttempt = null;

  const checkConsent = deps.isConsentGranted ?? isMarketingConsentGranted;
  if (!checkConsent()) {
    return false;
  }

  deps.onBeforeDispatch?.();

  const dispatch = deps.dispatchCompleteRegistration ?? trackDemoCompleteRegistration;
  const result = dispatch();
  return result !== false;
}

export function resetDemoSignupTrackerForTests(): void {
  attemptSequence = 0;
  activeAttempt = null;
  claimedAttemptIds.clear();
}
