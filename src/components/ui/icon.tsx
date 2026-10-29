import { SymbolView } from 'expo-symbols';
import { useCSSVariable } from 'uniwind';

import type { SymbolIcon } from '@/types/ui';

const tones = {
  default: '--color-content',
  secondary: '--color-content-secondary',
  muted: '--color-content-muted',
  primary: '--color-primary',
  'primary-soft': '--color-primary-soft-content',
  danger: '--color-field-error',
  field: '--color-field-icon',
} as const;

export type IconTone = keyof typeof tones;

export type IconProps = {
  icon: SymbolIcon;
  size?: number;
  tone?: IconTone;
  /** A global.css colour variable (e.g. `--color-on-primary`), used instead of `tone`. */
  colorVar?: string;
};

/** SF Symbol on iOS, Material Symbol on Android and web, in a theme colour. */
export function Icon({ icon, size = 22, tone = 'default', colorVar }: IconProps) {
  const color = useCSSVariable(colorVar ?? tones[tone]);
  return (
    <SymbolView
      name={{ ios: icon.sf, android: icon.md, web: icon.md }}
      size={size}
      tintColor={typeof color === 'string' ? color : undefined}
    />
  );
}
