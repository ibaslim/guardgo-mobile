import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  countGuardJobs,
  jobsErrorMessage,
  listGuardJobs,
  type GuardJobsPage,
  type JobStatus,
} from '@/services/guard-jobs';
import { useRealtimeRefresh, useScreenFocused } from '@/hooks/use-realtime';
import { toast } from '@/services/toast';

const SEARCH_DELAY_MS = 350;
const LOAD_ERROR = "Couldn't load your jobs. Pull down to try again.";

/** The tabs that wait on the guard to answer, with a count shown on them. */
const NEEDS_ANSWER = ['offered', 'reconfirmation_required'] as const satisfies readonly JobStatus[];
type Counts = Partial<Record<(typeof NEEDS_ANSWER)[number], number>>;

type Result = { key: string; page: GuardJobsPage };
type Failure = { key: string; message: string };

/**
 * The jobs of one status tab, searched by `keyword` (after a short pause for typing), a page at a time.
 * Reloads on pull to refresh and when the screen comes back into view, so a job answered on the details
 * screen shows its new state. `data` is null while the current tab and search load, so an answer to an
 * older one never shows under a newer one. `reload` refreshes quietly, e.g. after answering a job.
 */
export function useGuardJobs(status: JobStatus, keyword: string) {
  const term = keyword.trim();
  const [settled, setSettled] = useState(term);
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [counts, setCounts] = useState<Counts>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloads, setReloads] = useState(0);

  // Wait for a pause in typing. Clearing the box takes effect at once.
  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), term ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [term]);

  const settledKey = `${status}|${settled}`;
  const key = `${status}|${term}`;

  useEffect(() => {
    let live = true;
    listGuardJobs(1, { status, keyword: settled }).then(
      (page) => {
        if (!live) return;
        setResult({ key: settledKey, page });
        setFailure(null);
      },
      (error) => live && setFailure({ key: settledKey, message: jobsErrorMessage(error, LOAD_ERROR) })
    );
    return () => {
      live = false;
    };
  }, [status, settled, settledKey, reloads]);

  // The counts on the "needs an answer" tabs. A failure leaves the last numbers in place.
  useEffect(() => {
    let live = true;
    Promise.all(NEEDS_ANSWER.map((which) => countGuardJobs(which).then((total) => [which, total] as const))).then(
      (pairs) => live && setCounts(Object.fromEntries(pairs)),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [reloads]);

  const reload = useCallback(() => setReloads((count) => count + 1), []);

  // A job offered or changed on the server (or, without Pusher, a 10-second poll) refreshes the list.
  const focused = useScreenFocused();
  useRealtimeRefresh(reload, { sources: ['requests'], active: focused });

  // Coming back from a job's details: show what changed. The first focus is the first load above.
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
      setResult({ key: settledKey, page: await listGuardJobs(1, { status, keyword: settled }) });
      setFailure(null);
      reload();
    } catch (error) {
      setFailure({ key: settledKey, message: jobsErrorMessage(error, LOAD_ERROR) });
    } finally {
      setRefreshing(false);
    }
  }, [status, settled, settledKey, reload]);

  const data = result && result.key === key ? result.page : null;

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listGuardJobs(data.page + 1, { status, keyword: settled });
      // Keep the pages only if the tab and search are still the same.
      setResult((current) =>
        current && current.key === settledKey ? { key: settledKey, page: { ...next, items: [...current.page.items, ...next.items] } } : current
      );
    } catch (error) {
      toast.failure(jobsErrorMessage(error, "Couldn't load more jobs."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore, status, settled, settledKey]);

  return {
    data,
    error: failure && failure.key === key ? failure.message : null,
    counts,
    refreshing,
    loadingMore,
    refresh,
    reload,
    loadMore,
  };
}
