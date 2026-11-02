import { Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

export type StepProgressProps = {
  /** Zero-based index of the current step. */
  step: number;
  total: number;
  /** Shown beside the count, e.g. "Billing". */
  title: string;
  /** Goes to the previous step. Leave out on the first step. */
  onBack?: () => void;
};

/** Top of every onboarding step after the first: back button, "Step 2 of 5" and a progress bar. */
export function StepProgress({ step, total, title, onBack }: StepProgressProps) {
  return (
    <View className="gap-3 px-6 pb-2 pt-3">
      <View className="min-h-9 flex-row items-center gap-2">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous step"
            hitSlop={8}
            onPress={onBack}
            className="-ml-2 size-9 items-center justify-center rounded-full active:bg-surface-muted">
            <View className="rotate-180">
              <Icon icon={ICONS.chevronRight} size={18} tone="secondary" />
            </View>
          </Pressable>
        ) : null}
        <Text variant="label" tone="muted" accessibilityLabel={`Step ${step + 1} of ${total}: ${title}`}>
          Step {step + 1} of {total} · {title}
        </Text>
      </View>
      <View className="flex-row gap-1.5" accessible={false}>
        {Array.from({ length: total }, (_, index) => (
          <View key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-primary' : 'bg-segment'}`} />
        ))}
      </View>
    </View>
  );
}
