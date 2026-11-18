import { useEffect, useState } from 'react';

import { cachedJob, lookupJobs } from '@/services/job-state';

/**
 * Looks up the current state of the jobs behind a list of alerts, a few at a time, and re-renders as
 * answers arrive. `stamp` changes whenever the list reloads, so open jobs are checked again then.
 * `jobFor(id)` is undefined until looked up, and null when the job can't be seen by this user.
 * Pass `enabled` false for roles where the lookup isn't available.
 */
export function useJobStates(ids: readonly string[], enabled: boolean, stamp: unknown) {
  const [, setVersion] = useState(0);
  const key = enabled ? ids.join(',') : '';

  useEffect(() => {
    if (!key) return;
    let live = true;
    lookupJobs(key.split(',')).then((fetched) => {
      // Re-render only when something new arrived.
      if (live && fetched > 0) setVersion((count) => count + 1);
    });
    return () => {
      live = false;
    };
  }, [key, stamp]);

  return { jobFor: (id: string) => (enabled && id ? cachedJob(id) : undefined) };
}
