import { SymbolView } from 'expo-symbols';
import { useCSSVariable } from 'uniwind';

import type { AreaIcon } from '@/types/roles';

const tones = {
  default: '--color-content',
  muted: '--color-content-muted',
  primary: '--color-primary',
  'primary-soft': '--color-primary-soft-content',
} as const;

export type IconProps = {
  icon: AreaIcon;
  size?: number;
  tone?: keyof typeof tones;
};

/** SF Symbol on iOS, Material Symbol on Android and web, in a theme colour. */
export function Icon({ icon, size = 22, tone = 'default' }: IconProps) {
  const color = useCSSVariable(tones[tone]);
  return (
    <SymbolView
      name={{ ios: icon.sf, android: icon.md, web: icon.md }}
      size={size}
      tintColor={typeof color === 'string' ? color : undefined}
    />
  );
}
