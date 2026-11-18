import { getAccessToken, subscribeSession } from '@/services/api';

/**
 * How many notifications the signed-in user has not read. One number shared by the Alerts screen and
 * the badge on the Alerts tab, so reading a notification updates both at once. It is set by the
 * notifications calls (see services/notifications.ts) and cleared when the user signs out.
 */
let count = 0;
const listeners = new Set<() => void>();

export function getUnreadCount() {
  return count;
}

export function setUnreadCount(next: number) {
  const value = Math.max(0, Math.floor(next) || 0);
  if (value === count) return;
  count = value;
  listeners.forEach((listener) => listener());
}

export function subscribeUnreadCount(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// A different person must never see the last person's number.
subscribeSession(() => {
  if (getAccessToken() === null) setUnreadCount(0);
});
