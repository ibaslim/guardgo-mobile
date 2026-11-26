import type { GuardJob } from '@/types/job';
import type { BadgeKind } from '@/types/ui';
import { formatCountdown, formatDate, formatTime } from '@/utils/format';

/** The badge colour for a job's status. */
export function jobBadgeKind(status: string): BadgeKind {
  switch (status) {
    case 'offered':
    case 'in_progress':
      return 'primary';
    case 'reconfirmation_required':
      return 'warning';
    case 'accepted':
      return 'success';
    case 'declined':
    case 'cancelled':
      return 'danger';
    default:
      return 'secondary';
  }
}

/** "12 Mar 2026, 9:30 AM", or `empty` when there is no date. */
export const stamp = (date: Date | null, empty = '') => (date ? `${formatDate(date)}, ${formatTime(date)}` : empty);

/** "reconfirmation_required" -> "Reconfirmation required" */
export const sentenceCase = (code: string) => {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** True while the job still waits on an answer with a deadline, so its countdown has to keep running. */
export const awaitingAnswer = (job: Pick<GuardJob, 'dueAt' | 'status'>) =>
  Boolean(job.dueAt) && (job.status === 'offered' || job.status === 'reconfirmation_required');

/** "Reply in 1d 4h" at the time `now`, and whether less than a day is left. Null when no answer is due. */
export function replyCountdown(job: Pick<GuardJob, 'dueAt' | 'status'>, now: number): { text: string; urgent: boolean } | null {
  if (!job.dueAt || !awaitingAnswer(job)) return null;
  const left = job.dueAt.getTime() - now;
  const verb = job.status === 'reconfirmation_required' ? 'Reconfirm' : 'Reply';
  return left > 0 ? { text: `${verb} in ${formatCountdown(left)}`, urgent: left < DAY_MS } : { text: 'Reply time is up', urgent: true };
}

/** Like `replyCountdown`, with the deadline itself in front: "Reply by 12 Mar, 9:30 AM · 1d 4h left". */
export function replyDeadline(job: Pick<GuardJob, 'dueAt' | 'status'>, now: number): { text: string; urgent: boolean } | null {
  if (!job.dueAt) return null;
  if (job.status === 'expired') return { text: `Reply was due ${stamp(job.dueAt)}`, urgent: false };
  if (!awaitingAnswer(job)) return null;
  const left = job.dueAt.getTime() - now;
  const verb = job.status === 'reconfirmation_required' ? 'Reconfirm by' : 'Reply by';
  if (left <= 0) return { text: `${verb} ${stamp(job.dueAt)}, the time is up`, urgent: true };
  return { text: `${verb} ${stamp(job.dueAt)} · ${formatCountdown(left)} left`, urgent: left < DAY_MS };
}
