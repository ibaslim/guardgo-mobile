import { JOB_STATUS_LABELS } from '@/services/guard-jobs';
import type { GuardJob } from '@/types/job';
import type { AppNotification, NotificationGroup, NotificationKind, StateChip } from '@/types/notification';
import { formatMoney } from '@/utils/format';
import { jobBadgeKind, stamp } from '@/utils/job-status';

const OFFER_TITLES: readonly string[] = ['New request offer', 'Shift replacement offer', 'New job offer'];

export function kindOf(notification: AppNotification): NotificationKind {
  if (OFFER_TITLES.includes(notification.title)) return 'offer';
  if (notification.title === 'Request update requires reconfirmation') return 'reconfirm';
  if (notification.title === 'Job status updated') return 'status';
  return 'other';
}

/** Groups a newest-first list. A group sits where its latest alert is, so the order stays by time. */
export function groupNotifications(items: readonly AppNotification[]): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const byKey = new Map<string, NotificationGroup>();

  for (const item of items) {
    const kind = kindOf(item);
    const groupable = kind !== 'other' && item.requestId !== '';
    const key = groupable ? `${kind}:${item.requestId}` : `single:${item.id}`;
    const existing = byKey.get(key);

    if (existing) {
      existing.older.push(item);
      existing.count += 1;
      if (!item.read) existing.unreadIds.push(item.id);
      continue;
    }
    const group: NotificationGroup = { key, kind, latest: item, older: [], count: 1, unreadIds: item.read ? [] : [item.id] };
    byKey.set(key, group);
    groups.push(group);
  }
  return groups;
}

/** "6 offers", "Updated 5 times", "3 updates": what the folded alerts of a group are called. */
export function countLabel(group: NotificationGroup) {
  if (group.count < 2) return '';
  switch (group.kind) {
    case 'offer':
      return `${group.count} offers`;
    case 'reconfirm':
      return `Updated ${group.count} times`;
    default:
      return `${group.count} updates`;
  }
}

/** The chip showing where the job is now, or null when it isn't known. */
export function chipFor(job: GuardJob | null | undefined): StateChip | null {
  if (!job) return null;
  return { label: JOB_STATUS_LABELS[job.status] ?? job.status, kind: jobBadgeKind(job.status) };
}

/** True for a job that can no longer be answered or acted on, whose alert is only history now. */
export function isDead(job: GuardJob | null | undefined) {
  return Boolean(job) && ['expired', 'superseded', 'cancelled', 'closed_filled'].includes(job!.status);
}

/** True for a job still waiting on the guard. */
export function isLive(job: GuardJob | null | undefined) {
  return Boolean(job) && ['offered', 'reconfirmation_required'].includes(job!.status);
}

/** Site, pay and reply-by for a job, from its lookup. Empty when the job isn't known. */
export function detailLine(job: GuardJob | null | undefined) {
  if (!job) return '';
  const parts = [job.siteName, job.hourlyPay === null ? '' : `${formatMoney(job.hourlyPay)} / hr`];
  if (isLive(job) && job.dueAt) parts.push(`Reply by ${stamp(job.dueAt)}`);
  return parts.filter(Boolean).join(' · ');
}
