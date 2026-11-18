import { formatDate } from '@/utils/format';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "Just now", "5 min ago", "3 h ago", "Yesterday", then the date. An empty string when there is no date. */
export function timeAgo(date: Date | null, now = Date.now()) {
  if (!date) return '';
  const elapsed = now - date.getTime();
  // Under a minute, or slightly in the future (the phone's clock a little behind the server's).
  if (elapsed < MINUTE) return 'Just now';
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} min ago`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} h ago`;
  if (elapsed < 2 * DAY) return 'Yesterday';
  return formatDate(date);
}
