import { useState } from 'react';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TextField, type TextFieldProps } from '@/components/ui/text-field';
import { ICONS } from '@/constants/icons';

export type PasswordFieldProps = Omit<TextFieldProps, 'secureTextEntry' | 'trailing' | 'multiline'>;

/** Text field that hides the password, with a button to show it. */
export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      icon={ICONS.lock}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="current-password"
      textContentType="password"
      {...props}
      secureTextEntry={!visible}
      trailing={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          disabled={props.disabled}
          hitSlop={6}
          onPress={() => setVisible((value) => !value)}
          className="-mr-2 size-10 items-center justify-center rounded-full active:bg-surface-muted">
          <Icon icon={visible ? ICONS.eyeOff : ICONS.eye} size={20} tone={visible ? 'primary' : 'field'} />
        </Pressable>
      }
    />
  );
}
