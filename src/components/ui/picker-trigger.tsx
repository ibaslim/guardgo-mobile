import { Pressable } from 'react-native';

import { FieldFrame, FieldIcon, fieldBoxClassName } from '@/components/ui/field';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { FieldMeta, SymbolIcon } from '@/types/ui';

export type PickerTriggerProps = FieldMeta & {
  /** The chosen value as text, or null when nothing is chosen. */
  valueLabel: string | null;
  placeholder: string;
  /** Icon at the start of the field, showing what kind of value it holds. */
  icon?: SymbolIcon;
  /** Highlights the box while its picker is open. */
  open?: boolean;
  onPress: () => void;
};

/** A field that opens a picker (date, time, select) instead of taking typed text. */
export function PickerTrigger({
  label,
  hint,
  error,
  optional,
  disabled,
  valueLabel,
  placeholder,
  icon,
  open,
  onPress,
}: PickerTriggerProps) {
  const state = { focused: open, error, disabled };

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: valueLabel ?? placeholder }}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={onPress}
        className={`${fieldBoxClassName(state)} active:opacity-80`}>
        {icon ? <FieldIcon icon={icon} {...state} /> : null}
        <Text tone={valueLabel ? 'default' : 'muted'} numberOfLines={1} className="flex-1">
          {valueLabel ?? placeholder}
        </Text>
        <Icon icon={ICONS.chevronUpDown} size={16} tone={open ? 'primary' : 'field'} />
      </Pressable>
    </FieldFrame>
  );
}
