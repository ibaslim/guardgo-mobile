import { Pressable, View } from 'react-native';
import { useUniwind } from 'uniwind';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { THEME_OPTIONS } from '@/constants/theme';
import { setThemePreference } from '@/services/theme';
import type { ThemePreference } from '@/types/theme';

/**
 * The two themes as they look, drawn with fixed colours (the same values as src/global.css). They
 * must not follow the active theme: each tile shows the theme it stands for. `bezel` is the phone's frame.
 */
const LOOKS = {
  light: { page: '#f3f4f6', surface: '#ffffff', border: '#e5e7eb', text: '#111827', muted: '#9ca3af', primary: '#3b82f6', bezel: '#1f2937' },
  dark: { page: '#111827', surface: '#1f2937', border: '#374151', text: '#f3f4f6', muted: '#9ca3af', primary: '#2563eb', bezel: '#4b5563' },
} as const;

/** A phone is about 9 to 19; the frame is 2 thick, so the screen inside is 56 by 116. */
const PHONE_WIDTH = 60;
const PHONE_HEIGHT = 120;
const BEZEL = 2;
const SCREEN_WIDTH = PHONE_WIDTH - BEZEL * 2;
const SCREEN_HEIGHT = PHONE_HEIGHT - BEZEL * 2;

type Look = (typeof LOOKS)[keyof typeof LOOKS];

/** A grey bar standing in for a line of text. */
const Bar = ({ width, height = 3, color }: { width: number | `${number}%`; height?: number; color: string }) => (
  <View style={{ width, height, borderRadius: height / 2, backgroundColor: color }} />
);

/** One list row: a round icon, two lines of text and an amount on the right. */
function MiniRow({ colors }: { colors: Look }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 13 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.border }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Bar width="75%" color={colors.text} />
        <Bar width="50%" height={2} color={colors.muted} />
      </View>
      <Bar width={9} color={colors.text} />
    </View>
  );
}

/** The app on a phone screen: status bar, header, a feature card, a short list and the floating tab bar. */
function MiniScreen({ look }: { look: keyof typeof LOOKS }) {
  const colors = LOOKS[look];
  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, backgroundColor: colors.page, paddingHorizontal: 5, paddingTop: 3, paddingBottom: 4 }}>
      {/* Status bar: the time on the left, signal and battery on the right. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 6 }}>
        <Bar width={8} height={2} color={colors.text} />
        <View style={{ width: 14, height: 3, borderRadius: 2, backgroundColor: colors.bezel }} />
        <View style={{ flexDirection: 'row', gap: 1.5 }}>
          <Bar width={3} height={2} color={colors.text} />
          <Bar width={5} height={2} color={colors.text} />
        </View>
      </View>

      {/* Header: a title with its caption, and the avatar. */}
      <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ gap: 2 }}>
          <Bar width={22} height={4} color={colors.text} />
          <Bar width={14} height={2} color={colors.muted} />
        </View>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary }} />
      </View>

      {/* The feature card: a label, a big figure and a button. */}
      <View
        style={{
          marginTop: 6,
          gap: 3,
          padding: 4,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}>
        <Bar width="35%" height={2} color={colors.muted} />
        <Bar width="70%" height={5} color={colors.text} />
        <View style={{ marginTop: 1, width: 16, height: 6, borderRadius: 3, backgroundColor: colors.primary }} />
      </View>

      {/* A short list on one surface. */}
      <View
        style={{
          marginTop: 4,
          gap: 2,
          paddingHorizontal: 4,
          paddingVertical: 3,
          borderRadius: 5,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}>
        <MiniRow colors={colors} />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <MiniRow colors={colors} />
      </View>

      {/* The floating tab bar: four icons, the first selected. */}
      <View
        style={{
          marginTop: 'auto',
          height: 12,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 2,
        }}>
        <View style={{ width: 14, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />
        {[0, 1, 2].map((icon) => (
          <View key={icon} style={{ width: 5, height: 5, borderRadius: 2, backgroundColor: colors.muted }} />
        ))}
      </View>
    </View>
  );
}

/** The phone decides, so the tile shows both: light on the left half of the screen, dark on the right. */
function SplitScreen() {
  return (
    <View style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}>
      <MiniScreen look="light" />
      <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: SCREEN_WIDTH / 2, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, right: 0 }}>
          <MiniScreen look="dark" />
        </View>
      </View>
    </View>
  );
}

/** A phone: a rounded frame around the screen. */
function MiniPhone({ look }: { look: ThemePreference }) {
  // The frame of the System phone is the light one's, so it reads as one device.
  const frame = LOOKS[look === 'dark' ? 'dark' : 'light'].bezel;
  return (
    <View
      style={{
        width: PHONE_WIDTH,
        height: PHONE_HEIGHT,
        borderRadius: 11,
        borderWidth: BEZEL,
        borderColor: frame,
        overflow: 'hidden',
        backgroundColor: frame,
      }}>
      {look === 'system' ? <SplitScreen /> : <MiniScreen look={look} />}
    </View>
  );
}

/** Light / Dark / System selector. Each option previews its look. The choice is saved and applied app-wide. */
export function ThemeSwitcher() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const current: ThemePreference = hasAdaptiveThemes ? 'system' : (theme as ThemePreference);

  return (
    <View accessibilityRole="radiogroup" className="flex-row gap-3">
      {THEME_OPTIONS.map((option) => {
        const selected = option.value === current;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            accessibilityState={{ checked: selected }}
            onPress={() => setThemePreference(option.value)}
            className="flex-1 gap-2 active:opacity-70">
            <View
              className={`items-center rounded-[14px] border-2 bg-surface-muted py-3 ${selected ? 'border-primary' : 'border-border'}`}>
              <MiniPhone look={option.value} />
              {selected ? (
                <View
                  accessible={false}
                  className="absolute right-2 top-2 size-5 items-center justify-center rounded-full bg-primary">
                  <Icon icon={ICONS.check} size={12} colorVar="--color-on-primary" />
                </View>
              ) : null}
            </View>
            <Text variant="label" tone={selected ? 'default' : 'muted'} className={`text-center ${selected ? 'font-sans-semibold' : ''}`}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
