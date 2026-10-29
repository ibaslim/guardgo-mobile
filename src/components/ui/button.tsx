import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';

import { Text } from '@/components/ui/text';

// Same variants as the web button.component.html. Theme-dependent colours come from global.css.
const variants = {
  primary: { container: 'bg-primary active:bg-primary-pressed', text: 'text-on-primary', spinner: 'accent-on-primary' },
  secondary: {
    container: 'border border-btn-secondary-border bg-btn-secondary active:bg-btn-secondary-pressed',
    text: 'text-btn-secondary-content',
    spinner: 'accent-btn-secondary-content',
  },
  success: { container: 'bg-green-600 active:bg-green-700', text: 'text-white', spinner: 'accent-white' },
  danger: { container: 'bg-red-600 active:bg-red-700', text: 'text-white', spinner: 'accent-white' },
  warning: { container: 'bg-yellow-400 active:bg-yellow-500', text: 'text-gray-900', spinner: 'accent-gray-900' },
  info: {
    container: 'bg-primary-soft active:bg-btn-info-pressed',
    text: 'text-primary-soft-content',
    spinner: 'accent-primary-soft-content',
  },
  outline: { container: 'border border-link active:bg-btn-outline-pressed', text: 'text-link', spinner: 'accent-link' },
  link: { container: 'min-h-10 active:opacity-70', text: 'text-link', spinner: 'accent-link' },
} as const;

const disabledStyle = {
  container: 'border border-btn-disabled-border bg-btn-disabled',
  text: 'text-btn-disabled-content',
  spinner: 'accent-btn-disabled-content',
};

export type ButtonVariant = keyof typeof variants;

export type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ title, variant = 'primary', loading = false, disabled, className, ...rest }: ButtonProps) {
  // While loading, keep the variant colours and only block presses.
  const looksDisabled = Boolean(disabled) && !loading;
  const style = looksDisabled && variant !== 'link' ? disabledStyle : variants[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) || loading, busy: loading }}
      disabled={disabled || loading}
      className={`min-h-12 flex-row items-center justify-center rounded-md px-4 ${style.container} ${
        looksDisabled && variant === 'link' ? 'opacity-50' : ''
      } ${className ?? ''}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator colorClassName={style.spinner} />
      ) : (
        <Text variant="label" tone="inherit" className={style.text}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
