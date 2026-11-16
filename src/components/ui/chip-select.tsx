import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

export type ChipSelectProps = {
  options: readonly { value: string; label: string }[];
  /** The chosen values. */
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** Names the group for screen readers, e.g. "Weekdays". */
  accessibilityLabel: string;
  error?: string;
};

/** Small toggles in a row, any number of which can be on, e.g. the weekdays a job repeats on. */
export function ChipSelect({ options, value, onChange, accessibilityLabel, error }: ChipSelectProps) {
  const toggle = (item: string) =>
    onChange(value.includes(item) ? value.filter((chosen) => chosen !== item) : [...value, item]);

  return (
    <View className="gap-2" accessibilityLabel={accessibilityLabel}>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: on }}
              onPress={() => toggle(option.value)}
              className={`h-10 min-w-[3.25rem] items-center justify-center rounded-full border px-3 ${
                on ? 'border-primary bg-primary' : 'border-border bg-surface active:bg-surface-muted'
              }`}>
              <Text variant="label" tone="inherit" className={on ? 'text-on-primary' : 'text-content-secondary'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
