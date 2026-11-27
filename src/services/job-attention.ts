import { getAccessToken, subscribeSession } from '@/services/api';
import { countGuardJobs, listGuardJobs } from '@/services/guard-jobs';
import { isOpenShift, listGuardShifts } from '@/services/guard-shifts';
import { monthOf, shiftMonth } from '@/utils/calendar';

/**
 * Whether the signed-in guard or service provider has work waiting: an offer or reconfirmation to
 * answer, a job under way, or an accepted job or shift still to come. Both read the same job and shift
 * lists. One flag shared by the tab dock, which blinks a dot on the Jobs tab while it is set. Cleared when the user signs out.
 */
let pending = false;
const listeners = new Set<() => void>();

export function getJobAttention() {
  return pending;
}

function setJobAttention(next: boolean) {
  if (next === pending) return;
  pending = next;
  listeners.forEach((listener) => listener());
}

export function subscribeJobAttention(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Enough to find one accepted job that hasn't ended; accepted jobs that have ended are left behind on the server. */
const ACCEPTED_ROWS = 50;

const notOver = (start: Date | null, end: Date | null, now: number) => {
  const until = end ?? start;
  return until !== null && until.getTime() > now;
};

async function hasWaitingJobs() {
  const [offered, reconfirm, inProgress] = await Promise.all([
    countGuardJobs('offered'),
    countGuardJobs('reconfirmation_required'),
    countGuardJobs('in_progress'),
  ]);
  if (offered + reconfirm + inProgress > 0) return true;
  const now = Date.now();
  const accepted = await listGuardJobs(1, { status: 'accepted', rows: ACCEPTED_ROWS });
  return accepted.items.some((job) => notOver(job.start, job.end, now));
}

/** A shift this month or next that is still open and hasn't ended. Repeating jobs and rostered guards work through these. */
async function hasUpcomingShift() {
  const now = Date.now();
  const thisMonth = monthOf(new Date());
  const months = await Promise.all([listGuardShifts(thisMonth), listGuardShifts(shiftMonth(thisMonth, 1))]);
  return months.some((shifts) => shifts.some((shift) => isOpenShift(shift) && notOver(shift.start, shift.end, now)));
}

let inFlight: Promise<boolean> | null = null;

/**
 * Asks the server again and updates the flag. Calls made while one is running share it. Either half
 * failing (a guard owned by a provider can't read jobs, for instance) leaves it to the other; both
 * failing keeps the last answer.
 */
export function fetchJobAttention(): Promise<boolean> {
  inFlight ??= Promise.allSettled([hasWaitingJobs(), hasUpcomingShift()])
    .then(([jobs, shifts]) => {
      if (jobs.status === 'rejected' && shifts.status === 'rejected') return pending;
      const next = (jobs.status === 'fulfilled' && jobs.value) || (shifts.status === 'fulfilled' && shifts.value);      if (getAccessToken() !== null) setJobAttention(next);
      return next;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

// A different person must never see the last person's dot.
subscribeSession(() => {
  if (getAccessToken() === null) setJobAttention(false);
});
