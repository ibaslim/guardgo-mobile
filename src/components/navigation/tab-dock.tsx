import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Pressable, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AreaTab } from '@/types/roles';

/** How the selected pill grows and the others make room: a short ease-out with no overshoot. */
const RESIZE = LinearTransition.duration(200).easing(Easing.out(Easing.cubic));

/** A tab's rounded shape. It clips what is inside, so nothing shows outside the frame while it resizes. */
const TAB_SHAPE = { borderRadius: 24, overflow: 'hidden' } as const;

type TabDockProps = BottomTabBarProps & {
  /** The area's tabs (constants/roles.ts), matched to the routes by name. */
  tabs: readonly AreaTab[];
};

/**
 * Floating tab bar. Quiet by default: a rounded capsule with muted icons. The one memorable thing
 * is the selected tab, which grows into a primary pill with its label, in the same blue (and glow)
 * as the primary button. It sits in the layout instead of over the content, so no screen needs to
 * leave room for it. Colours are theme tokens, so light and dark follow.
 */
export function TabDock({ state, descriptors, emitter, navigateToTab, insets, tabs }: TabDockProps) {
  const reduceMotion = useReducedMotion();
  const [shadow, glow, highlight, primary] = useCSSVariable([
    '--color-overlay',
    '--color-btn-primary-glow',
    '--color-btn-highlight',
    '--color-primary',
  ]);

  const dockShadow = typeof shadow === 'string' ? { boxShadow: `0 12px 28px -12px ${shadow}` } : undefined;
  // The pill is drawn on the animated wrapper, not on the button inside it, so its colour grows with the
  // wrapper's frame. Drawn on the button, it would be full width at once and stick out past the capsule
  // edge while the last tab is still resizing.
  const pillStyle = {
    backgroundColor: typeof primary === 'string' ? primary : undefined,
    ...(typeof glow === 'string' && typeof highlight === 'string'
      ? { boxShadow: `inset 0 1px 0 ${highlight}, 0 6px 14px -4px ${glow}` }
      : null),
  };

  return (
    <View className="bg-background px-4 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      <View
        accessibilityRole="tablist"
        className="flex-row items-center justify-between rounded-[32px] border border-border bg-surface p-1.5"
        style={dockShadow}>
        {state.routes.map((route, index) => {
          const tab = tabs.find((item) => item.name === route.name);
          if (!tab) return null;
          const focused = state.index === index;
          const title = descriptors[route.key]?.options.title ?? tab.title;

          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Animated.View
              key={route.key}
              layout={reduceMotion ? undefined : RESIZE}
              style={focused ? [TAB_SHAPE, pillStyle] : TAB_SHAPE}>
              <Pressable
                accessibilityRole="tab"
                accessibilityLabel={title}
                accessibilityState={{ selected: focused }}
                hitSlop={4}
                onPress={onPress}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                className={`h-12 flex-row items-center justify-center gap-2 active:opacity-80 ${focused ? 'px-4' : 'w-12'}`}>
                <Icon icon={tab.icon} size={22} colorVar={focused ? '--color-on-primary' : '--color-content-muted'} />
                {focused ? (
                  <Animated.View
                    entering={reduceMotion ? undefined : FadeIn.duration(160).delay(60)}
                    exiting={reduceMotion ? undefined : FadeOut.duration(70)}>
                    <Text variant="label" tone="inherit" numberOfLines={1} className="font-sans-semibold text-[14px] text-on-primary">
                      {title}
                    </Text>
                  </Animated.View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
