import { router } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { RequestSchedule } from '@/types/request';
import { describeSchedule, isClientPlan } from '@/utils/request-schedule';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

export type ShiftPlanCardProps = {
  requestId: string;
  /** The request's schedule; null when it has none, undefined when it couldn't be loaded. */
  schedule: RequestSchedule | null | undefined;
};

/**
 * How a live request turns into shifts: the plan the client set, or a line saying it runs as a single
 * shift. Opens the plan screen to set one up or change it.
 */
export function ShiftPlanCard({ requestId, schedule }: ShiftPlanCardProps) {
  const planned = schedule && isClientPlan(schedule) ? schedule : null;
  const summary = planned ? describeSchedule(planned) : null;
  const rows = [
    { label: 'Repeats', value: summary?.pattern },
    { label: 'Dates', value: summary?.dates },
    { label: 'Hours', value: summary?.hours },
    { label: 'Status', value: planned && !planned.active ? 'Paused: no new shifts are made' : '' },
  ].filter((row) => row.value);

  const open = () => router.push({ pathname: '/request-schedule/[id]', params: { id: requestId } });

  return (
    <Card title="Shift plan">
      {planned ? (
        rows.map((row, index) => (
          <Fragment key={row.label}>
            {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
            <View className="min-h-11 flex-row items-center justify-between gap-4 px-4 py-3">
              <Text variant="small" tone="muted" className="shrink-0">
                {row.label}
              </Text>
              <Text variant="label" className="min-w-0 flex-1 text-right" style={TABULAR}>
                {row.value}
              </Text>
            </View>
          </Fragment>
        ))
      ) : (
        <View className="px-4 pt-3">
          <Text variant="small" tone="secondary">
            {schedule === undefined
              ? "Couldn't load the shift plan."
              : 'This job runs as a single shift. Plan shifts to repeat it on more days, or to change its attendance rules.'}
          </Text>
        </View>
      )}
      <View className="p-4">
        <Button title={planned ? 'Edit shift plan' : 'Plan ongoing shifts'} variant="secondary" onPress={open} />
      </View>
    </Card>
  );
}
