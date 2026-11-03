import { useSyncExternalStore } from 'react';

import { getAccessToken, getSession, subscribeSession } from '@/services/api';
import { isAwaitingApproval } from '@/services/tenant-review';
import { roleAreaFor } from '@/utils/role';

const isLoggedIn = () => getAccessToken() !== null;

// The same snapshot is used for web server rendering, where nobody is logged in yet.

/** True while the user has a valid session token. */
export function useIsLoggedIn() {
  return useSyncExternalStore(subscribeSession, isLoggedIn, isLoggedIn);
}

/** The signed-in user's details, or null when logged out. */
export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

/** The app area for the signed-in user's role, or null if logged out or the role isn't supported. */
export function useRoleArea() {
  return roleAreaFor(useSession()?.role);
}

/**
 * Which onboarding the signed-in user still has to finish, or null. It is set while the server's
 * `hasOnboarding` flag is true (the tenant's status is "onboarding"). Clients and guards have a
 * mobile onboarding; other roles go straight to their home screen.
 */
export function useOnboardingArea(): 'client' | 'guard' | null {
  const session = useSession();
  if (session?.hasOnboarding !== true) return null;
  const area = roleAreaFor(session.role);
  return area === 'client' || area === 'guard' ? area : null;
}

/** True while the signed-in user still has to finish onboarding (see useOnboardingArea). */
export function useNeedsOnboarding() {
  return useOnboardingArea() !== null;
}

/**
 * True for a guard who finished onboarding but whose profile an admin hasn't approved yet, or whose
 * status isn't known yet (it is loaded right after sign-in). The under-review screen shows meanwhile.
 */
export function useAwaitingApproval() {
  const session = useSession();
  if (roleAreaFor(session?.role) !== 'guard' || session?.hasOnboarding === true) return false;
  return session?.tenant === undefined || isAwaitingApproval(session.tenant.status);
}
