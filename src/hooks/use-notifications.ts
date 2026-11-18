import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsErrorMessage,
  type NotificationFilter,
  type NotificationsPage,
} from '@/services/notifications';
import { getUnreadCount, setUnreadCount } from '@/services/unread-count';
import { toast } from '@/services/toast';

const LOAD_ERROR = "Couldn't load your alerts. Pull down to try again.";

type Result = { filter: NotificationFilter; page: NotificationsPage };
type Failure = { filter: NotificationFilter; message: string };

/**
 * The user's notifications for one filter (all, or unread only), a page at a time. Reloads on pull to
 * refresh and when the screen comes back into view. `data` is null while the current filter loads.
 * Reading one marks it at once on screen and tells the server; if the server refuses, it goes back.
 */
export function useNotifications(filter: NotificationFilter) {
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let live = true;
    listNotifications(1, filter).then(
      (page) => {
        if (!live) return;
        setResult({ filter, page });
        setFailure(null);
      },
      (error) => live && setFailure({ filter, message: notificationsErrorMessage(error, LOAD_ERROR) })
    );
    return () => {
      live = false;
    };
  }, [filter, reloads]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);


  // Coming back to the screen: show what arrived meanwhile. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setResult({ filter, page: await listNotifications(1, filter) });
      setFailure(null);
    } catch (error) {
      setFailure({ filter, message: notificationsErrorMessage(error, LOAD_ERROR) });
    } finally {
      setRefreshing(false);
    }
  }, [filter]);

  const data = result && result.filter === filter ? result.page : null;

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listNotifications(data.page + 1, filter);
      setResult((current) =>
        current && current.filter === filter ? { filter, page: { ...next, items: [...current.page.items, ...next.items] } } : current
      );
    } catch (error) {
      toast.failure(notificationsErrorMessage(error, "Couldn't load more alerts."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, filter, loadingMore]);

  const setRead = useCallback((ids: ReadonlySet<string> | 'all', read: boolean) => {
    setResult((current) =>
      current
        ? {
            ...current,
            page: {
              ...current.page,
              items: current.page.items.map((item) => (ids === 'all' || ids.has(item.id) ? { ...item, read } : item)),
            },
          }
        : current
    );
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const was = getUnreadCount();
      setRead(new Set([id]), true);
      setUnreadCount(was - 1);
      try {
        await markNotificationRead(id);
      } catch (error) {
        setRead(new Set([id]), false);
        setUnreadCount(was);
        toast.failure(notificationsErrorMessage(error, "Couldn't mark this alert as read."));
      }
    },
    [setRead]
  );

  const markAllRead = useCallback(async () => {
    const was = getUnreadCount();
    setRead('all', true);
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
      // On the unread-only tab, everything just read leaves the list.
      reload();
    } catch (error) {
      // Don't guess which ones were already read: put the server's list and count back.
      setUnreadCount(was);
      reload();
      toast.failure(notificationsErrorMessage(error, "Couldn't mark your alerts as read."));
    }
  }, [setRead, reload]);

  return {
    data,
    error: failure && failure.filter === filter ? failure.message : null,
    refreshing,
    loadingMore,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };
}
