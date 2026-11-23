import type { BadgeKind } from '@/types/ui';

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

export type NotificationFilter = 'all' | 'unread';

/** What an alert is about, read from its title. Offers, reconfirmations and status updates concern a job. */
export type NotificationKind = 'offer' | 'reconfirm' | 'status' | 'other';

/**
 * One row in the list: the latest alert of a kind for one request, with the earlier ones folded under
 * it. A request that was re-sent six times is one row with "6 offers", not six rows.
 */
export type NotificationGroup = {
  key: string;
  kind: NotificationKind;
  latest: AppNotification;
  /** The earlier alerts of the same kind for the same request, newest first. */
  older: AppNotification[];
  /** Every alert in the group, the latest included. */
  count: number;
  /** The ids still unread, so reading the row can mark them all. */
  unreadIds: string[];
};

export type StateChip = { label: string; kind: BadgeKind };
