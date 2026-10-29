import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { FieldMeta, SymbolIcon } from '@/types/ui';

export type FieldBoxState = { focused?: boolean; error?: string; disabled?: boolean };

/** Classes for a field's box. Every field type uses this, so a form reads as one even column. */
export function fieldBoxClassName({ focused, error, disabled }: FieldBoxState) {
  const border = error ? 'border-field-error' : focused ? 'border-primary' : 'border-field-border';
  const background = disabled ? 'bg-surface-muted opacity-60' : 'bg-field';
  return `min-h-14 flex-row items-center gap-3 rounded-[14px] border px-4 ${border} ${background}`;
}

/** Icon at the start of a field box. Turns blue while the field is focused. */
export function FieldIcon({ icon, focused, error }: FieldBoxState & { icon: SymbolIcon }) {
  return <Icon icon={icon} size={20} tone={error ? 'danger' : focused ? 'primary' : 'field'} />;
}

export type FieldFrameProps = Omit<FieldMeta, 'disabled'> & { children: ReactNode };

/** Label above the field, hint or error below it. */
export function FieldFrame({ label, hint, error, optional, children }: FieldFrameProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-baseline justify-between gap-2 px-0.5">
        <Text variant="label" tone="secondary" className="text-[13px]">
          {label}
        </Text>
        {optional ? (
          <Text variant="caption" tone="muted">
            Optional
          </Text>
        ) : null}
      </View>
      {children}
      {error ? (
        <View className="flex-row gap-1.5 px-0.5" accessibilityLiveRegion="polite">
          <View className="pt-px">
            <Icon icon={ICONS.error} size={15} tone="danger" />
          </View>
          <Text variant="small" tone="inherit" className="flex-1 text-[13px] text-field-error">
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="small" tone="muted" className="px-0.5 text-[13px]">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
