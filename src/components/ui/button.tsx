import { useEffect, useState } from 'react';
import { ActivityIndicator, View, type PressableProps } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
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
  // A primary button with a light sweeping across it, copied from the tracking site's .btn::before.
  shine: {
    container: 'overflow-hidden bg-primary active:bg-primary-pressed',
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
  // A destructive answer that sits next to the primary one: red, but quieter than a filled danger button.
  // field-error is the red that stays readable on dark surfaces.
  dangerOutline: {
    container: 'border-[1.5px] border-field-error active:bg-danger-soft',
    text: 'text-field-error',
    spinner: 'accent-field-error',
    icon: '--color-field-error',
  },
  link: { container: 'active:opacity-60', text: 'text-link', spinner: 'accent-link', icon: '--color-link' },
} as const;

// The tracking site's sweep: a 45° white band on a background 220% of the button's width,
// moving from background-position 130% to -160% with CSS `ease`.
// 40% slower than the web's 2.8s: 2800 / 0.6.
const SWEEP_MS = 4667;
const SWEEP_SCALE = 2.2;
const CSS_EASE = Easing.bezier(0.25, 0.1, 0.25, 1);
// Clear stops are clear white, not `transparent` (clear black), so the band's edges don't go grey.
const SWEEP_GRADIENT =
  'linear-gradient(45deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.85) 50%, rgba(255, 255, 255, 0) 70%)';

function ShineSweep() {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion || width === 0) return;
    progress.set(0);
    progress.set(withRepeat(withTiming(1, { duration: SWEEP_MS, easing: CSS_EASE }), -1, false));
    return () => cancelAnimation(progress);
  }, [reduceMotion, width, progress]);

  const sweepStyle = useAnimatedStyle(() => {
    // A background-position of p puts the image at (width - imageWidth) * p.
    const position = 1.3 - progress.get() * 2.9;
    // Where the band's centre is across the button: 0 at the left edge, 1 at the right.
    const across = SWEEP_SCALE / 2 - (SWEEP_SCALE - 1) * position;
    return {
      // Faint as it comes in, brightest mid-button, faint again as it leaves.
      opacity: interpolate(across, [0, 0.5, 1], [0.25, 1, 0.25], Extrapolation.CLAMP),
      transform: [{ translateX: width * (1 - SWEEP_SCALE) * position }],
    };
  });

  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && !reduceMotion ? (
        <Animated.View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, width: width * SWEEP_SCALE, backgroundImage: SWEEP_GRADIENT },
            sweepStyle,
          ]}
        />
      ) : null}
    </View>
  );
}

const disabledStyle = {
  container: 'border border-field-border bg-surface-muted',
  text: 'text-content-disabled',
  spinner: 'accent-content-disabled',
  icon: '--color-content-disabled',
};

const sizes = {
  xs: { container: 'min-h-8 gap-1 rounded-lg px-2', text: 'text-xs', icon: 13 },
  sm: { container: 'min-h-9 gap-1.5 rounded-[10px] px-3.5', text: 'text-[13px]', icon: 15 },
  md: { container: 'min-h-11 gap-2 rounded-xl px-4', text: 'text-sm', icon: 18 },
  lg: { container: 'min-h-12 gap-2.5 rounded-xl px-5', text: 'text-[15px]', icon: 20 },
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
  /** Fully rounded ends, instead of the size's usual corner radius. */
  pill?: boolean;
  /** Positions the button (margins, flex, alignment). */
  className?: string;
};

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  pill = false,
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
  const shine = variant === 'shine' && !looksDisabled && !loading;

  // The primary button is the one call to action on a screen: give it depth.
  const depth =
    (variant === 'primary' || variant === 'shine') &&
    !looksDisabled &&
    typeof glow === 'string' &&
    typeof highlight === 'string'
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
        variant === 'link' ? 'min-h-10 gap-1.5 rounded-[10px] px-2' : pill ? sizing.container.replace(/rounded-\S+/, 'rounded-full') : sizing.container
      } ${look.container} ${looksDisabled && variant === 'link' ? 'opacity-50' : ''}`}
      {...rest}>
      {shine ? <ShineSweep /> : null}
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
