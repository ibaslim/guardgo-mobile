import { ActivityIndicator, View, type PressableProps } from 'react-native';
import { useCSSVariable } from 'uniwind';

import { Icon } from '@/components/ui/icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import type { SymbolIcon } from '@/types/ui';

// Same variants as the web button.component.html. Theme-dependent colours come from global.css.
// `icon` is the colour variable for the button's icon, matching its text.
const variants = {
  primary: {
    container: 'bg-primary active:bg-primary-pressed',
    text: 'text-on-primary',
    spinner: 'accent-on-primary',
    icon: '--color-on-primary',
  },
  secondary: {
    container: 'border border-field-border bg-field active:bg-surface-muted',
    text: 'text-content',
    spinner: 'accent-content',
    icon: '--color-content',
  },
  success: { container: 'bg-green-600 active:bg-green-700', text: 'text-white', spinner: 'accent-white', icon: '--color-white' },
  danger: { container: 'bg-red-600 active:bg-red-700', text: 'text-white', spinner: 'accent-white', icon: '--color-white' },
  warning: {
    container: 'bg-yellow-400 active:bg-yellow-500',
    text: 'text-gray-900',
    spinner: 'accent-gray-900',
    icon: '--color-gray-900',
  },
  info: {
    container: 'bg-primary-soft active:bg-btn-info-pressed',
    text: 'text-primary-soft-content',
    spinner: 'accent-primary-soft-content',
    icon: '--color-primary-soft-content',
  },
  outline: {
    container: 'border-[1.5px] border-primary active:bg-btn-outline-pressed',
    text: 'text-link',
    spinner: 'accent-link',
    icon: '--color-link',
  },
  link: { container: 'active:opacity-60', text: 'text-link', spinner: 'accent-link', icon: '--color-link' },
} as const;

const disabledStyle = {
  container: 'border border-field-border bg-surface-muted',
  text: 'text-content-disabled',
  spinner: 'accent-content-disabled',
  icon: '--color-content-disabled',
};

const sizes = {
  sm: { container: 'min-h-9 gap-1.5 rounded-[10px] px-3.5', text: 'text-[13px]', icon: 15 },
  md: { container: 'min-h-[52px] gap-2 rounded-[14px] px-5', text: 'text-[15px]', icon: 18 },
  lg: { container: 'min-h-14 gap-2.5 rounded-[14px] px-6', text: 'text-base', icon: 20 },
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export type ButtonProps = Omit<PressableProps, 'children' | 'className'> & {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shown before the title. */
  icon?: SymbolIcon;
  loading?: boolean;
  /** Positions the button (margins, flex, alignment). */
  className?: string;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled,
  className,
  style,
  ...rest
}: ButtonProps) {
  const [glow, highlight] = useCSSVariable(['--color-btn-primary-glow', '--color-btn-highlight']);
  // While loading, keep the variant colours and only block presses.
  const looksDisabled = Boolean(disabled) && !loading;
  const look = looksDisabled && variant !== 'link' ? disabledStyle : variants[variant];
  const sizing = sizes[size];

  // The primary button is the one call to action on a screen: give it depth.
  const depth =
    variant === 'primary' && !looksDisabled && typeof glow === 'string' && typeof highlight === 'string'
      ? { boxShadow: `inset 0 1px 0 ${highlight}, 0 8px 20px -6px ${glow}` }
      : undefined;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: Boolean(disabled) || loading, busy: loading }}
      disabled={disabled || loading}
      className={className}
      scaleTo={variant === 'link' ? 1 : 0.97}
      style={[depth, typeof style === 'function' ? undefined : style]}
      contentClassName={`flex-row items-center justify-center ${
        variant === 'link' ? 'min-h-10 gap-1.5 rounded-[10px] px-2' : sizing.container
      } ${look.container} ${looksDisabled && variant === 'link' ? 'opacity-50' : ''}`}
      {...rest}>
      {loading ? (
        <ActivityIndicator colorClassName={look.spinner} />
      ) : (
        <>
          {icon ? (
            <View accessible={false}>
              <Icon icon={icon} size={sizing.icon} colorVar={look.icon} />
            </View>
          ) : null}
          <Text variant="label" tone="inherit" className={`font-sans-semibold ${sizing.text} ${look.text}`}>
            {title}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
