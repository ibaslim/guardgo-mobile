import { Fragment } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export type DashboardMetricProps = {
  label: string;
  value: string | number;
  /** One short line under the figure; it is cut off after one line. */
  hint?: string;
  /** Marks a figure that needs action: the number turns red and the label gets a dot. */
  alert?: boolean;
};

// A long figure (money) has no room beside its label, so the label goes under it instead.
const isLong = (value: string | number) => String(value).length > 5;

function Cell({ label, value, hint, alert = false }: DashboardMetricProps) {
  const stacked = isLong(value);

  const number = (
    <Text
      variant="heading"
      tone={alert ? 'danger' : 'default'}
      numberOfLines={1}
      adjustsFontSizeToFit
      // Sized with `style`: a size class would lose to the variant's own size.
      style={{ fontSize: 26, lineHeight: 30 }}
      className="font-sans-bold">
      {value}
    </Text>
  );

  const caption = (
    <View className="min-w-0 flex-shrink flex-row items-center gap-1.5">
      {alert ? <View className="h-1.5 w-1.5 rounded-full bg-badge-danger" /> : null}
      <Text variant="small" tone="secondary" numberOfLines={1} className="min-w-0 flex-shrink">
        {label}
      </Text>
    </View>
  );

  return (
    <View accessible accessibilityLabel={`${label}: ${value}. ${hint ?? ''}`} className="min-w-0 flex-1 px-2 py-1.5">
      {stacked ? (
        <>
          {number}
          {caption}
        </>
      ) : (
        <View className="flex-row items-baseline gap-2">
          {number}
          {caption}
        </View>
      )}
      {hint ? (
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The dashboard's figures on one surface: two to a row, split by hairlines. A lone last figure
 * (usually money) takes the full width.
 */
export function MetricLedger({ metrics }: { metrics: DashboardMetricProps[] }) {
  const rows: DashboardMetricProps[][] = [];
  for (let index = 0; index < metrics.length; index += 2) rows.push(metrics.slice(index, index + 2));

  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-surface">
      {rows.map((row, index) => (
        <Fragment key={row[0].label}>
          {index > 0 ? <View className="h-px bg-border" /> : null}
          <View className="flex-row">
            <Cell {...row[0]} />
            {row[1] ? (
              <>
                <View className="w-px bg-border" />
                <Cell {...row[1]} />
              </>
            ) : null}
          </View>
        </Fragment>
      ))}
    </View>
  );
}
