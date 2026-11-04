import { Pressable, View } from 'react-native';
import { useController, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { MetadataOption } from '@/types/onboarding';

/**
 * Pick one or more kinds of guard work (armed, unarmed, tactical). Shows the form's error below.
 * `name` is the form field holding the list: a guard's preferred types, or a provider's categories.
 */
export function GuardTypeChips<T extends FieldValues>({
  control,
  options,
  name = 'preferred_guard_types' as FieldPath<T>,
  label = 'Guard types',
}: {
  // `any` for the context and parsed-output types, like the other connected fields.
  control: Control<T, any, any>;
  options: readonly MetadataOption[];
  name?: FieldPath<T>;
  label?: string;
}) {
  const { field, fieldState } = useController({ control, name });
  const selected: string[] = field.value ?? [];

  function toggle(value: string) {
    field.onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  }

  return (
    <View className="gap-2">
      <Text variant="label" tone="inherit" className="font-sans-bold text-[13px] uppercase tracking-wide text-field-label">
        {label}
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
