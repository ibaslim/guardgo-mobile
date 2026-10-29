import { useState, type ComponentRef, type ReactNode, type Ref } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { FieldFrame, FieldIcon, fieldBoxClassName } from '@/components/ui/field';
import type { FieldMeta, SymbolIcon } from '@/types/ui';

export type TextFieldProps = Omit<TextInputProps, 'editable'> &
  FieldMeta & {
    ref?: Ref<ComponentRef<typeof TextInput>>;
    /** Icon at the start of the field, e.g. ICONS.mail for an email field. */
    icon?: SymbolIcon;
    /** Shown inside the box after the text, e.g. a button. */
    trailing?: ReactNode;
  };

export function TextField({
  label,
  hint,
  error,
  optional,
  disabled,
  icon,
  trailing,
  multiline,
  className,
  onFocus,
  onBlur,
  ref,
  ...rest
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const state = { focused, error, disabled };

  return (
    <FieldFrame label={label} hint={hint} error={error} optional={optional}>
      <View className={`${fieldBoxClassName(state)} ${multiline ? 'items-start' : ''}`}>
        {icon ? (
          <View className={multiline ? 'pt-4' : ''}>
            <FieldIcon icon={icon} {...state} />
          </View>
        ) : null}
        <TextInput
          ref={ref}
          editable={!disabled}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          accessibilityState={{ disabled }}
          placeholderTextColorClassName="accent-content-muted"
          cursorColorClassName="accent-primary"
          selectionColorClassName="accent-primary"
          className={`flex-1 font-sans text-base text-content ${multiline ? 'min-h-28 py-4' : 'min-h-14'} ${
            className ?? ''
          }`}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
        {trailing}
      </View>
    </FieldFrame>
  );
}
