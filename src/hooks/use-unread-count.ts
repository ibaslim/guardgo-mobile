import { useSyncExternalStore } from 'react';

import { getUnreadCount, subscribeUnreadCount } from '@/services/unread-count';

/** The number of unread notifications, kept current wherever it is shown. */
export function useUnreadCount() {
  return useSyncExternalStore(subscribeUnreadCount, getUnreadCount, getUnreadCount);
}
