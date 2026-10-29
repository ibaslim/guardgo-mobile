/**
 * Light/dark theme selection. Colours live in src/global.css; this only picks the active theme
 * and remembers the user's choice. Defaults to dark like the web app; mobile also offers "system".
 */
import { Uniwind } from 'uniwind';

import { STORAGE_KEYS } from '@/constants/storage-keys';
import { DEFAULT_THEME, THEME_OPTIONS } from '@/constants/theme';
import { readSetting, writeSetting } from '@/lib/storage';
import type { ThemePreference } from '@/types/theme';

const isThemePreference = (value: unknown): value is ThemePreference =>
  THEME_OPTIONS.some((option) => option.value === value);

/** Applies the saved theme. Call once at startup before the first screen renders. */
export async function loadThemePreference() {
  const saved = await readSetting<ThemePreference>(STORAGE_KEYS.theme);
  Uniwind.setTheme(isThemePreference(saved) ? saved : DEFAULT_THEME);
}

export async function setThemePreference(preference: ThemePreference) {
  Uniwind.setTheme(preference);
  await writeSetting(STORAGE_KEYS.theme, preference);
}
