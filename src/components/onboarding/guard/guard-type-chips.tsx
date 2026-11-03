import { Pressable, View } from 'react-native';
import { useController, type Control } from 'react-hook-form';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { GuardOnboardingValues } from '@/types/guard-onboarding';
import type { MetadataOption } from '@/types/onboarding';

/** Pick one or more kinds of guard work (armed, unarmed, tactical). Shows the form's error below. */
export function GuardTypeChips({
  control,
  options,
}: {
  control: Control<GuardOnboardingValues, unknown, GuardOnboardingValues>;
  options: readonly MetadataOption[];
}) {
  const { field, fieldState } = useController({ control, name: 'preferred_guard_types' });
  const selected: string[] = field.value ?? [];

  function toggle(value: string) {
    field.onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <View className="gap-2">
      <Text variant="label" tone="inherit" className="font-sans-bold text-[13px] uppercase tracking-wide text-field-label">
        Guard types
      </Text>
      <View className="flex-row flex-wrap gap-2.5">
        {options.map((option) => {
          const on = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(option.value)}
              className={`min-h-11 flex-row items-center gap-2 rounded-full border px-4 ${
                on ? 'border-primary bg-primary' : 'border-field-border bg-field active:bg-surface-muted'
              }`}>
              {on ? <Icon icon={ICONS.check} size={16} colorVar="--color-on-primary" /> : null}
              <Text variant="label" tone="inherit" className={on ? 'text-on-primary' : 'text-content'}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {fieldState.error?.message ? (
        <Text variant="small" tone="danger" accessibilityRole="alert">
          {fieldState.error.message}
        </Text>
      ) : null}
    </View>
  );
}
