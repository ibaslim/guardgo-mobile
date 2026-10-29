import { TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';

export type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
};

export function TextField({ label, error, className, ...rest }: TextFieldProps) {
  return (
    <View className="gap-1.5">
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColorClassName="accent-content-muted"
        cursorColorClassName="accent-primary"
        selectionColorClassName="accent-primary"
        className={`min-h-12 rounded-md border bg-surface px-3 font-sans text-base text-content ${
          error ? 'border-danger' : 'border-border-strong focus:border-primary'
        } ${className ?? ''}`}
        {...rest}
      />
      {error ? (
        <Text variant="small" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
