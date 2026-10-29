import { Pressable, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { Text } from '@/components/ui/text';
import { THEME_OPTIONS } from '@/constants/theme';
import { setThemePreference } from '@/services/theme';
import type { ThemePreference } from '@/types/theme';

/** Light / Dark / System selector. The choice is saved and applied app-wide. */
export function ThemeSwitcher() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const current: ThemePreference = hasAdaptiveThemes ? 'system' : (theme as ThemePreference);

  return (
    <View accessibilityRole="radiogroup" className="flex-row rounded-lg bg-surface-muted p-1">
      {THEME_OPTIONS.map((option) => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => setThemePreference(option.value)}
            className={`min-h-9 flex-1 items-center justify-center rounded-md ${selected ? 'bg-surface shadow-sm' : ''}`}>
            <Text variant="label" tone={selected ? 'default' : 'muted'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
