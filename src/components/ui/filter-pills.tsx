import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

export type FilterPillsProps<T extends string> = {
  /** `count` floats a small number on the pill's top corner; leave it out (or 0) to hide it. */
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
};

/** A row of pills that filters a list: one is selected at a time, and they share the row's width equally. */
export function FilterPills<T extends string>({ options, value, onChange }: FilterPillsProps<T>) {
  return (
    <View className="flex-row gap-2">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <View key={option.value} className="flex-1">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={option.count ? `${option.label}, ${option.count}` : option.label}
              accessibilityState={{ selected: on }}
              onPress={() => onChange(option.value)}
              className={`h-9 items-center justify-center rounded-full border px-2 ${
                on ? 'border-primary bg-primary' : 'border-border bg-surface active:bg-surface-muted'
              }`}>
              <Text
                variant="label"
                tone="inherit"
                numberOfLines={1}
                className={on ? 'text-on-primary' : 'text-content-secondary'}>
                {option.label}
              </Text>
            </Pressable>
            {option.count ? (
              <View
                pointerEvents="none"
                accessible={false}
                className="absolute -right-1 -top-2 min-w-5 items-center rounded-full border-2 border-background bg-primary px-1">
                <Text variant="caption" tone="inherit" className="font-sans-semibold text-on-primary">
                  {option.count}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
