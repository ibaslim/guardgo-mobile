import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { PendingArrivalsState } from '@/hooks/use-pending-arrivals';
import type { PendingArrival } from '@/services/pending-arrivals';
import { distanceText } from '@/utils/distance';
import { formatTime } from '@/utils/format';

/** "Checked in 2:02 PM · 40 m from the site". */
const meta = (arrival: PendingArrival) =>
  [
    arrival.arrivedAt ? `Checked in ${formatTime(arrival.arrivedAt)}` : 'Checked in',
    arrival.distanceMeters === null ? '' : `${distanceText(arrival.distanceMeters)} from the site`,
  ]
    .filter(Boolean)
    .join(' · ');

/**
 * One loud card for each guard who has checked in and is waiting for the client to confirm they have
 * arrived: the guard can't start the shift until then. Nothing is shown when no one is waiting.
 */
export function ArrivalsBanner({ arrivals }: { arrivals: PendingArrivalsState }) {
  if (arrivals.items.length === 0) return null;
  return (
    <View className="gap-3" accessibilityLiveRegion="polite">
      {arrivals.items.map((arrival) => (
        <View key={arrival.slotId} className="gap-3 rounded-2xl bg-primary-soft p-4">
          <View className="flex-row items-center gap-3">
            <View className="size-2.5 rounded-full bg-success" />
            <View className="flex-1 gap-0.5">
              <Text variant="caption" tone="inherit" className="text-primary-soft-content">
                Waiting for your confirmation
              </Text>
              <Text variant="label" tone="inherit" className="text-primary-soft-content" numberOfLines={2}>
                {arrival.guardName} is on site
              </Text>
            </View>
          </View>
          <View className="gap-0.5">
            <Text variant="small" tone="inherit" className="text-primary-soft-content" numberOfLines={1}>
              {arrival.title} at {arrival.siteName}
            </Text>
            <Text variant="caption" tone="inherit" className="text-primary-soft-content opacity-80">
              {meta(arrival)}
            </Text>
          </View>
          <Button
            title="Confirm arrival"
            loading={arrivals.busyId === arrival.slotId}
            disabled={arrivals.busyId !== null}
            onPress={() => arrivals.confirm(arrival)}
          />
        </View>
      ))}
    </View>
  );
}
