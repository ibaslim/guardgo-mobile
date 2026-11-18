import { within24Hours } from '@/services/dashboard-data';
import type { GuardJob } from '@/services/guard-jobs';
import type { BadgeKind } from '@/types/ui';
import { formatDate, formatTime } from '@/utils/format';

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

export type JobRail = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** How urgent a job is, for the rail on its card: an offer that expires soon, or one to reconfirm, stands out. */
export function jobRail(job: GuardJob): JobRail {
  switch (job.status) {
    case 'offered':
      return within24Hours(job.dueAt) ? 'warning' : 'primary';
    case 'reconfirmation_required':
      return 'warning';
    case 'accepted':
      return 'primary';
    case 'in_progress':
    case 'completed':
      return 'success';
    case 'declined':
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** "12 Mar 2026, 9:30 AM", or `empty` when there is no date. */
export const stamp = (date: Date | null, empty = '') => (date ? `${formatDate(date)}, ${formatTime(date)}` : empty);

/** "reconfirmation_required" -> "Reconfirmation required" */
export const sentenceCase = (code: string) => {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
