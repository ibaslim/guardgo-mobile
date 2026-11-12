import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listRequests, requestsErrorMessage, type RequestsPage } from '@/services/requests';
import { toast } from '@/services/toast';

const SEARCH_DELAY_MS = 350;

/**
 * The requests the signed-in user can see (a client's own, or a guard's and provider's offers), loaded
 * a page at a time. Reloads when `keyword` changes (after a short pause for typing), on pull to refresh,
 * and when the screen comes back into view.
 */
export function useRequests(keyword: string) {
  const [data, setData] = useState<RequestsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const latest = useRef(keyword);
  // Declared before the load effect below, so it holds the new search by the time that runs.
  useEffect(() => {
    latest.current = keyword;
  }, [keyword]);

  const load = useCallback(async () => {
    const asked = latest.current;
    try {
      const page = await listRequests({ page: 1, keyword: asked });
      // A slower answer to an older search must not replace the newer one.
      if (asked === latest.current) {
        setData(page);
        setError(null);
      }
    } catch (failure) {
      if (asked === latest.current) setError(requestsErrorMessage(failure, "Couldn't load your requests. Pull down to try again."));
    }
  }, []);

  // First load, and again when the search changes.
  useEffect(() => {
    const timer = setTimeout(load, keyword ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [keyword, load]);

  // Coming back from a request: show what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listRequests({ page: data.page + 1, keyword: latest.current });
      setData({ ...next, items: [...data.items, ...next.items] });
    } catch (failure) {
      toast.failure(requestsErrorMessage(failure, "Couldn't load more requests."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore]);

  return {
    items: data?.items ?? [],
    loading: data === null && !error,
    hasMore: Boolean(data && data.page < data.totalPages),
    error,
    refreshing,
    loadingMore,
    refresh,
    loadMore,
  };
}
