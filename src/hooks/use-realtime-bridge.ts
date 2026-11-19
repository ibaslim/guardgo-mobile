import { useEffect } from 'react';

import { fetchUnreadCount, listNotifications } from '@/services/notifications';
import { startRealtime, stopRealtime, subscribeRealtimeEvents } from '@/services/realtime';
import { toast } from '@/services/toast';

/** How often to try connecting again if the first attempt failed (the server was out of reach, for instance). */
const RECONNECT_MS = 30_000;

/** Shows the notification a "created" event is about, as a toast, so a new offer is noticed on any screen. */
async function announce(id: string) {
  try {
    const { items } = await listNotifications(1, 'all');
    const found = items.find((item) => item.id === id);
    if (!found) return;
    const text = found.message ? `${found.title}: ${found.message}` : found.title;
    if (found.category === 'warning' || found.category === 'error') toast.warning(text);
    else toast.success(text);
  } catch {
    // The alert is saved on the server; it will show in the Alerts tab.
  }
}

/**
 * Runs for the whole signed-in session, from the root layout: connects to Pusher after sign-in and
 * disconnects at sign-out, keeps the unread count on the Alerts tab current, and announces new alerts.
 * Individual screens refresh their own data with `useRealtimeRefresh`.
 */
export function useRealtimeBridge(isLoggedIn: boolean) {
  useEffect(() => {
    if (!isLoggedIn) return;
    startRealtime();
    const retry = setInterval(startRealtime, RECONNECT_MS);
    return () => {
      clearInterval(retry);
      stopRealtime();
    };
  }, [isLoggedIn]);

  useEffect(
    () =>
      subscribeRealtimeEvents((event) => {
        fetchUnreadCount().catch(() => undefined);
        if (event.type === 'created' && event.id) announce(event.id);
      }),
    []
  );
}
