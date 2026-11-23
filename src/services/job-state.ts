import { getAccessToken, subscribeSession } from '@/services/api';
import { getGuardJob } from '@/services/guard-jobs';
import type { GuardJob } from '@/types/job';

/**
 * Where a job is now, for the alerts that talk about it. An alert is a snapshot of an event ("a new offer
 * is available"), so a weeks-old one can point at a job that has long since expired or been replaced.
 * This looks each job up (GET /api/jobs/<id>) and remembers the answer.
 *
 * A job that is finished for good (completed, declined, cancelled, expired, filled, replaced) is
 * remembered for the whole session. An open one is looked up again after a short while, since the guard
 * or the client can still change it. A job that can't be looked up is left alone for a few minutes.
 */

const TERMINAL: ReadonlySet<string> = new Set(['completed', 'declined', 'cancelled', 'expired', 'closed_filled', 'superseded']);
const OPEN_TTL_MS = 30_000;
const FAILED_TTL_MS = 5 * 60_000;
const PARALLEL = 4;

type Entry = { job: GuardJob | null; at: number };
const cache = new Map<string, Entry>();

// The cache must not outlive the signed-in user.
subscribeSession(() => {
  if (getAccessToken() === null) cache.clear();
});

/** The job as last looked up, or undefined when it hasn't been, or null when it couldn't be. */
export function cachedJob(id: string): GuardJob | null | undefined {
  return cache.get(id)?.job;
}

function isFresh(id: string, now: number) {
  const entry = cache.get(id);
  if (!entry) return false;
  if (entry.job === null) return now - entry.at < FAILED_TTL_MS;
  return TERMINAL.has(entry.job.status) || now - entry.at < OPEN_TTL_MS;
}

/** Looks up the jobs that aren't remembered yet (or are due again). Resolves with how many were fetched. */
export async function lookupJobs(ids: readonly string[]): Promise<number> {
  const now = Date.now();
  const pending = [...new Set(ids)].filter((id) => id && !isFresh(id, now));
  let next = 0;

  const worker = async () => {
    while (next < pending.length) {
      const id = pending[next++];
      try {
        cache.set(id, { job: await getGuardJob(id), at: Date.now() });
      } catch {
        // Not allowed to see it, or gone: remember that, so every reload doesn't ask again.
        cache.set(id, { job: null, at: Date.now() });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(PARALLEL, pending.length) }, worker));
  return pending.length;
}
