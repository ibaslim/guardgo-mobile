import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export type LeaderRowProps = {
  label: string;
  value: string;
  /** The total of a statement: larger, with no dots. */
  strong?: boolean;
};

/** Enough dots to fill any row; the extra is cut off at the edge. */
const DOTS = '. '.repeat(60);

/**
 * A label and its amount joined by a dotted line, the way a ledger or pay stub sets a figure. The
 * dots are text so they look the same on iOS and Android.
 */
export function LeaderRow({ label, value, strong = false }: LeaderRowProps) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} className="flex-row items-baseline gap-2 py-1.5">
      <Text variant={strong ? 'label' : 'small'} tone={strong ? 'default' : 'secondary'} className={strong ? 'font-sans-semibold' : ''}>
        {label}
      </Text>
      {strong ? (
        <View className="flex-1" />
      ) : (
        <Text variant="small" tone="muted" numberOfLines={1} accessible={false} className="min-w-0 flex-1 overflow-hidden">
          {DOTS}
        </Text>
      )}
      <Text variant={strong ? 'heading' : 'small'} className={`tabular-nums ${strong ? 'font-sans-bold' : 'font-sans-medium'}`}>
        {value}
      </Text>
    </View>
  );
}
