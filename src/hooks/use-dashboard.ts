import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { dashboardErrorMessage } from '@/services/dashboard-data';

/**
 * A role's home dashboard. `load` fetches it (see the `*-dashboard` services); it runs when the tab comes
 * into view and on pull to refresh. A failed reload keeps the last figures and shows the error above them.
 */
export function useDashboard<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loading = useRef(false);

  const run = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      setData(await load());
      setError(null);
    } catch (failure) {
      setError(dashboardErrorMessage(failure));
    } finally {
      loading.current = false;
    }
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      run();
    }, [run])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run]);

  return { data, error, refreshing, refresh };
}
