import type { ThemePreference } from '@/types/theme';

/** Same default as the web app (client/src/app/services/theme/theme.service.ts). */
export const DEFAULT_THEME: ThemePreference = 'dark';

export const THEME_OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];
