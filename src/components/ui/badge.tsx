import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { BadgeKind } from '@/types/ui';
import { badgeKindFor } from '@/utils/badge';

const kinds: Record<BadgeKind, { container: string; text: string }> = {
  primary: { container: 'bg-badge-primary', text: 'text-white' },
  secondary: { container: 'bg-badge-secondary', text: 'text-white' },
  success: { container: 'bg-badge-success', text: 'text-white' },
  danger: { container: 'bg-badge-danger', text: 'text-white' },
  warning: { container: 'bg-badge-warning', text: 'text-black' },
};

export type BadgeProps = {
  label: string;
  /** Defaults to the colour matching the label's keywords. */
  kind?: BadgeKind;
};

export function Badge({ label, kind = badgeKindFor(label) }: BadgeProps) {
  const style = kinds[kind];
  return (
    <View className={`self-start rounded-full px-2.5 py-0.5 ${style.container}`}>
      <Text variant="caption" tone="inherit" className={`font-sans-medium ${style.text}`}>
        {label.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}
