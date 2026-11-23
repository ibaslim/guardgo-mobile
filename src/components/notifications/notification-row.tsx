import { Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import type { AppNotification, NotificationCategory, NotificationGroup, StateChip } from '@/types/notification';
import { countLabel } from '@/utils/notification-view';
import { timeAgo } from '@/utils/time-ago';

/** The rail on the row's left edge: what kind of news it is. */
const RAILS: Record<NotificationCategory, string> = {
  info: 'bg-primary',
  success: 'bg-badge-success',
  warning: 'bg-badge-warning',
  error: 'bg-badge-danger',
};

export type NotificationGroupRowProps = {
  group: NotificationGroup;
  /** Where the job is now, when it could be looked up. */
  chip: StateChip | null;
  /** Site, pay and reply-by from the job lookup. */
  detail: string;
  /** True when the job can no longer be acted on: the row is shown faded, as history. */
  dim: boolean;
  /** True when tapping opens a screen, so the row says what it opens. */
  opens: boolean;
  first: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPress: () => void;
  /** The chip for an older alert folded under the row, e.g. "Replaced". */
  olderChip: (notification: AppNotification) => StateChip | null;
};

/**
 * One alert, or several of the same kind for one request folded into one. A rail by kind, the title (bold
 * while unread), the message, the job's site and pay, and a chip for where the job is now. A folded row
 * says how many it holds and opens to show the earlier ones.
 */
export function NotificationGroupRow({
  group,
  chip,
  detail,
  dim,
  opens,
  first,
  expanded,
  onToggle,
  onPress,
  olderChip,
}: NotificationGroupRowProps) {
  const { latest, older } = group;
  const unread = group.unreadIds.length > 0;
  const meta = [timeAgo(latest.createdAt), countLabel(group), opens ? latest.actionLabel : ''].filter(Boolean).join(' · ');

  return (
    <View className={first ? '' : 'border-t border-border'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${unread ? 'Unread. ' : ''}${latest.title}. ${latest.message}${chip ? `. ${chip.label}` : ''}`}
        onPress={onPress}
        className="active:bg-surface-muted">
        <View className={dim ? 'opacity-55' : ''}>
          <View className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${RAILS[latest.category]}`} />
          <View className="flex-row items-start gap-3 py-3 pl-4 pr-3">
            <View className="min-w-0 flex-1 gap-0.5">
              <Text variant="label" numberOfLines={2} className={unread ? 'font-sans-bold' : 'font-sans-medium'}>
                {latest.title}
              </Text>
              {latest.message ? (
                <Text variant="small" tone={unread ? 'secondary' : 'muted'} numberOfLines={3}>
                  {latest.message}
                </Text>
              ) : null}
              {detail ? (
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {detail}
                </Text>
              ) : null}
              {meta ? (
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
            </View>
            <View className="items-end gap-2">
              {chip ? <Badge label={chip.label} kind={chip.kind} /> : null}
              {unread ? <View accessible={false} className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
            </View>
          </View>
        </View>
      </Pressable>

      {older.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Hide earlier alerts' : `Show ${older.length} earlier`}
          onPress={onToggle}
          className="pb-2.5 pl-4 pr-3 active:opacity-60">
          <Text variant="caption" tone="link" className="font-sans-medium">
            {expanded ? 'Hide earlier' : `Show ${older.length} earlier`}
          </Text>
        </Pressable>
      ) : null}

      {expanded
        ? older.map((item) => {
            const itemChip = olderChip(item);
            return (
              <View key={item.id} className="flex-row items-center gap-3 border-t border-border bg-surface-muted py-2 pl-4 pr-3">
                <View className="min-w-0 flex-1">
                  <Text variant="small" tone="secondary" numberOfLines={1} className={item.read ? '' : 'font-sans-semibold'}>
                    {item.title}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={1}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {itemChip ? <Badge label={itemChip.label} kind={itemChip.kind} /> : null}
              </View>
            );
          })
        : null}
    </View>
  );
}
