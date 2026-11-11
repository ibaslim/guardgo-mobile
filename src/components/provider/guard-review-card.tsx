import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';

export type GuardReviewCardProps = {
  /** The guard's name, or their email while they have no name yet. */
  title: string;
  /** The email under the name. Leave out when the title already is the email. */
  email?: string;
  /** True while this guard is being approved: the actions wait. */
  busy?: boolean;
  onDetails: () => void;
  onApprove: () => void;
};

/**
 * A guard waiting for approval: who they are on top, and a footer split in two, Details on the left
 * and Approve on the right. The footer's actions are flat and share the full width, divided by one line.
 */
export function GuardReviewCard({ title, email, busy, onDetails, onApprove }: GuardReviewCardProps) {
  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <View className="flex-row items-center gap-3 px-4 py-3.5">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text variant="label" className="font-sans-semibold" numberOfLines={1}>
            {title}
          </Text>
          {email ? (
            <Text variant="small" tone="muted" numberOfLines={1}>
              {email}
            </Text>
          ) : null}
        </View>
        <Badge label="In review" kind="warning" />
      </View>

      <View className="flex-row border-t border-border">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Details for ${title}`}
          disabled={busy}
          onPress={onDetails}
          className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
          <Text variant="label" tone="secondary" className={busy ? 'opacity-50' : ''}>
            Details
          </Text>
        </Pressable>

        <View className="w-px bg-border" accessible={false} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Approve ${title}`}
          accessibilityState={{ busy: Boolean(busy) }}
          disabled={busy}
          onPress={onApprove}
          className="h-10 flex-1 items-center justify-center active:bg-primary-soft">
          {busy ? (
            <ActivityIndicator colorClassName="accent-primary" />
          ) : (
            <Text variant="label" tone="inherit" className="font-sans-semibold text-primary">
              Approve
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
