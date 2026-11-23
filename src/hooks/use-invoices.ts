import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useRealtimeRefresh, useScreenFocused } from '@/hooks/use-realtime';
import { invoicesErrorMessage, listInvoicesPage, type InvoicesPage } from '@/services/invoices';
import { toast } from '@/services/toast';

const LOAD_ERROR = "Couldn't load your invoices. Pull down to try again.";

/**
 * The user's payout invoices, newest first, a page at a time. Reloads on pull to refresh, when the
 * screen comes back into view, and when the server pushes a change. `data` is null until the first load.
 */
export function useInvoices() {
  const [data, setData] = useState<InvoicesPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let live = true;
    listInvoicesPage(1).then(
      (page) => {
        if (!live) return;
        setData(page);
        setError(null);
      },
      (failure) => live && setError(invoicesErrorMessage(failure, LOAD_ERROR))
    );
    return () => {
      live = false;
    };
  }, [reloads]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);

  const focused = useScreenFocused();
  useRealtimeRefresh(reload, { active: focused });

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
      setData(await listInvoicesPage(1));
      setError(null);
    } catch (failure) {
      setError(invoicesErrorMessage(failure, LOAD_ERROR));
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listInvoicesPage(data.page + 1);
      setData((current) => (current ? { ...next, items: [...current.items, ...next.items] } : current));
    } catch (failure) {
      toast.failure(invoicesErrorMessage(failure, "Couldn't load more invoices."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore]);

  return { data, error, refreshing, loadingMore, refresh, loadMore };
}
