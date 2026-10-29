import { DarkTheme, DefaultTheme, type Theme } from 'expo-router';
import { useMemo } from 'react';
import { useCSSVariable, useUniwind } from 'uniwind';

/** React Navigation theme (headers, screen backgrounds) built from the global.css colours. */
export function useNavigationTheme(): Theme {
  const { theme } = useUniwind();
  const [background, card, text, border, primary, danger] = useCSSVariable([
    '--color-background',
    '--color-surface',
    '--color-content',
    '--color-border',
    '--color-primary',
    '--color-danger',
  ]);

  return useMemo(() => {
    const base = theme === 'dark' ? DarkTheme : DefaultTheme;
    const color = <T,>(value: string | number | undefined, fallback: T) => (value ? String(value) : fallback);
    return {
      ...base,
      colors: {
        ...base.colors,
        background: color(background, base.colors.background),
        card: color(card, base.colors.card),
        text: color(text, base.colors.text),
        border: color(border, base.colors.border),
        primary: color(primary, base.colors.primary),
        notification: color(danger, base.colors.notification),
      },
    };
  }, [theme, background, card, text, border, primary, danger]);
}
