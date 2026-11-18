import { router, type Href } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { NotificationGroupRow } from '@/components/notifications/notification-row';
import { TabScreen } from '@/components/ui/tab-screen';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { useJobStates } from '@/hooks/use-job-states';
import { useNotifications } from '@/hooks/use-notifications';
import { useRoleArea } from '@/hooks/use-session';
import { useUnreadCount } from '@/hooks/use-unread-count';
import { notificationTarget, type AppNotification, type NotificationFilter } from '@/services/notifications';
import { chipFor, detailLine, groupNotifications, isDead, kindOf, type NotificationGroup, type StateChip } from '@/utils/notification-view';

const EMPTY: Record<NotificationFilter, string> = {
  all: 'No alerts yet. Updates about your jobs and account show up here.',
  unread: "You're all caught up.",
};

/** The alerts that talk about a job, which are the ones worth looking the job up for. */
const jobAlert = (notification: AppNotification) => kindOf(notification) !== 'other' && notification.assignmentId !== '';

/** The Alerts tab of any role: the user's notifications, newest first, with all and unread views. */
export function NotificationsScreen() {
  const area = useRoleArea();
  const unread = useUnreadCount();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const { data, error, refreshing, loadingMore, refresh, loadMore, markRead, markAllRead } = useNotifications(filter);

  const options = [
    { value: 'all' as const, label: 'All' },
    { value: 'unread' as const, label: 'Unread', count: unread },
  ];

  const groups = useMemo(() => groupNotifications(data?.items ?? []), [data]);

  // Where each job is now. Only guards and providers can look their jobs up; a client's rows show no state.
  const lookupAllowed = area === 'guard' || area === 'provider';
  const ids = useMemo(() => groups.map((group) => group.latest).filter(jobAlert).map((item) => item.assignmentId), [groups]);
  const { jobFor } = useJobStates(ids, lookupAllowed, data);

  /** The chip of an older alert folded under a row: its job's state when known, otherwise that it was replaced. */
  const olderChip = (item: AppNotification): StateChip | null => {
    if (kindOf(item) !== 'offer') return null;
    return chipFor(jobFor(item.assignmentId)) ?? { label: 'Replaced', kind: 'secondary' };
  };

  const toggle = (key: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const open = (group: NotificationGroup) => {
    // Reading a row reads everything folded under it.
    group.unreadIds.forEach((id) => markRead(id));
    const target = notificationTarget(group.latest, area);
    if (target) router.push(target as Href);
  };

  return (
    <TabScreen title="Alerts" hideHeader refreshing={refreshing} onRefresh={refresh} onEndReached={loadMore}>
      <View className="h-2" />
      <Tabs options={options} value={filter} onChange={setFilter} />

      {unread > 0 ? (
        <View className="flex-row justify-end px-1">
          <Text variant="label" tone="link" accessibilityRole="button" onPress={markAllRead}>
            Mark all as read
          </Text>
        </View>
      ) : null}

      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {data === null && !error ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {data !== null && groups.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">{EMPTY[filter]}</Text>
        </View>
      ) : null}

      {groups.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {groups.map((group, index) => {
            const job = jobAlert(group.latest) ? jobFor(group.latest.assignmentId) : undefined;
            return (
              <NotificationGroupRow
                key={group.key}
                group={group}
                chip={chipFor(job)}
                detail={detailLine(job)}
                dim={isDead(job)}
                opens={notificationTarget(group.latest, area) !== null}
                first={index === 0}
                expanded={expanded.has(group.key)}
                onToggle={() => toggle(group.key)}
                onPress={() => open(group)}
                olderChip={olderChip}
              />
            );
          })}
        </View>
      ) : null}

      {loadingMore ? (
        <View className="items-center py-4" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}
    </TabScreen>
  );
}
