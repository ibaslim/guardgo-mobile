import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError } from '@/services/api';
import { lower, type Raw } from '@/services/dashboard-data';
import { setUnreadCount } from '@/services/unread-count';
import { parseServerTimestamp } from '@/utils/dates';
import type { RoleArea } from '@/types/roles';

export const NOTIFICATIONS_PAGE_SIZE = 20;

export type NotificationCategory = 'info' | 'success' | 'warning' | 'error';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  /** Which part of the product it came from, e.g. "requests" or "leaves". */
  sourceModule: string;
  /** The web page the server links to. The app maps it to its own screens, see `notificationTarget`. */
  actionUrl: string;
  actionLabel: string;
  /** The request and job (assignment) it is about, when it names them. */
  requestId: string;
  assignmentId: string;
  read: boolean;
  createdAt: Date | null;
};

export type NotificationsPage = {
  items: AppNotification[];
  page: number;
  totalPages: number;
  totalItems: number;
};

type RawPage = {
  items?: Raw[];
  pagination?: { page?: number; total_pages?: number; total_items?: number };
  unread_count?: number;
};

const CATEGORIES: readonly string[] = ['info', 'success', 'warning', 'error'];

export function parseNotification(raw: Raw): AppNotification {
  const category = lower(raw.category);
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    category: (CATEGORIES.includes(category) ? category : 'info') as NotificationCategory,
    sourceModule: lower(raw.source_module),
    actionUrl: String(raw.action_url ?? ''),
    actionLabel: String(raw.action_label ?? ''),
    requestId: String(raw.metadata?.request_id ?? ''),
    assignmentId: String(raw.metadata?.assignment_id ?? ''),
    read: Boolean(raw.is_read),
    createdAt: parseServerTimestamp(raw.created_at),
  };
}

export type NotificationFilter = 'all' | 'unread';

/** One page of the user's notifications, newest first. Also refreshes the unread count the tab shows. */
export async function listNotifications(page: number, filter: NotificationFilter = 'all'): Promise<NotificationsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.notifications.list, {
    query: { page, rows: NOTIFICATIONS_PAGE_SIZE, status: filter },
  });
  if (typeof response.unread_count === 'number') setUnreadCount(response.unread_count);
  return {
    items: (response.items ?? []).filter((item) => item.id).map(parseNotification),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

/** Asks the server how many notifications are unread and updates the count the tab shows. */
export async function fetchUnreadCount(): Promise<number> {
  const response = await api.get<{ unread_count?: number }>(ENDPOINTS.notifications.unreadCount);
  const count = Number(response.unread_count ?? 0);
  setUnreadCount(count);
  return count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch<unknown>(`${ENDPOINTS.notifications.list}/${id}/read`);
}

/** Marks everything read; the server answers with the new unread count (zero). */
export async function markAllNotificationsRead(): Promise<void> {
  const response = await api.patch<{ unread_count?: number }>(ENDPOINTS.notifications.readAll);
  setUnreadCount(Number(response.unread_count ?? 0));
}

/** The value of `name` in a web link's query string, or ''. */
function queryParam(url: string, name: string) {
  const query = url.split('?')[1] ?? '';
  for (const pair of query.split('&')) {
    const [key, value = ''] = pair.split('=');
    if (key === name) return decodeURIComponent(value);
  }
  return '';
}

/**
 * The app screen a notification opens, or null when there is none to open. Offers name their job and
 * request in `metadata`, which is used first; otherwise the server's web link is read for what it points
 * at. Screens that don't exist yet in the app give null, so a tap still marks the notification read.
 */
export function notificationTarget(notification: AppNotification, area: RoleArea | null): string | null {
  const { actionUrl, assignmentId, requestId, sourceModule } = notification;
  const job = assignmentId || queryParam(actionUrl, 'job');
  const request = requestId || queryParam(actionUrl, 'request');

  switch (area) {
    case 'guard':
      if (job) return `/job/${job}`;
      if (actionUrl.includes('/leaves') || sourceModule === 'leaves') return '/guard/leaves';
      if (actionUrl.includes('invoices')) return '/guard/invoices';
      return sourceModule === 'requests' ? '/guard/jobs' : null;
    case 'client':
      if (request) return `/request/${request}`;
      if (actionUrl.includes('invoices')) return null;
      return sourceModule === 'requests' ? '/client/requests' : null;
    case 'provider':
      if (actionUrl.includes('/tenants')) return '/provider/guards';
      if (actionUrl.includes('invoices')) return '/provider/invoices';
      return sourceModule === 'requests' ? '/provider/requests' : null;
    default:
      return null;
  }
}

/** A readable reason for a failed notifications call. */
export function notificationsErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.message && !error.message.startsWith('Request failed')) return error.message;
  }
  return fallback;
}
