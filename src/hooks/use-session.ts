import { useSyncExternalStore } from 'react';

import { getAccessToken, getSession, subscribeSession } from '@/services/api';
import { roleAreaFor } from '@/utils/role';

/** True while the user has a valid session token. */
export function useIsLoggedIn() {
  return useSyncExternalStore(subscribeSession, () => getAccessToken() !== null);
}

/** The signed-in user's details, or null when logged out. */
export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession);
}

/** The app area for the signed-in user's role, or null if logged out or the role isn't supported. */
export function useRoleArea() {
  return roleAreaFor(useSession()?.role);
}
