import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { AreaTab } from '@/types/roles';

const EASE = Easing.out(Easing.cubic);
const MOVE_MS = 220;
/** The icons and labels make room for the pill with the same short ease-out, so nothing overshoots. */
const MAKE_ROOM = LinearTransition.duration(MOVE_MS).easing(EASE);

/** Space between the capsule edge and the tabs (p-1.5). The pill's top edge sits here. */
const DOCK_PADDING = 6;
const TAB_HEIGHT = 48;
/** The selected icon turns white once the pill has mostly arrived under it, not before. */
const RECOLOR_DELAY_MS = 100;

type TabDockProps = BottomTabBarProps & {
  /** The area's tabs (constants/roles.ts), matched to the routes by name. */
  tabs: readonly AreaTab[];
};

/**
 * Floating tab bar. Quiet by default: a rounded capsule with muted icons. The one memorable thing
 * is the pill, in the same blue (and glow) as the primary button. It slides from the old tab to the
 * new one and resizes to fit the label, so it always travels in the direction of the tap. The pill is
 * one separate element behind the tabs, moved to the frame measured for the selected tab. It sits in
 * the layout instead of over the content, so no screen needs to leave room for it. Colours are theme
 * tokens, so light and dark follow.
 */
export function TabDock({ state, descriptors, emitter, navigateToTab, insets, tabs }: TabDockProps) {
  const reduceMotion = useReducedMotion();
  const [shadow, glow, highlight, primary] = useCSSVariable([
    '--color-overlay',
    '--color-btn-primary-glow',
    '--color-btn-highlight',
    '--color-primary',
  ]);

  // The pill's frame follows the selected tab's measured frame.
  const left = useSharedValue(0);
  const width = useSharedValue(0);
  const shown = useSharedValue(0);
  const pillMotion = useAnimatedStyle(() => ({ left: left.get(), width: width.get(), opacity: shown.get() }));

  function movePillTo({ nativeEvent }: LayoutChangeEvent) {
    const { x, width: tabWidth } = nativeEvent.layout;
    if (shown.get() === 0) {
      // First measurement: appear in place instead of flying in from the corner.
      left.set(x);
      width.set(tabWidth);
      shown.set(1);
      return;
    }
    const timing = { duration: reduceMotion ? 0 : MOVE_MS, easing: EASE };
    left.set(withTiming(x, timing));
    width.set(withTiming(tabWidth, timing));
  }

  // The tab that looks selected (white icon) trails the real selection a little, so a white icon is
  // never left alone on the white capsule while the pill is still on its way.
  const [looksSelected, setLooksSelected] = useState(state.index);
  useEffect(() => {
    const timer = setTimeout(() => setLooksSelected(state.index), reduceMotion ? 0 : RECOLOR_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.index, reduceMotion]);

  const dockShadow = typeof shadow === 'string' ? { boxShadow: `0 12px 28px -12px ${shadow}` } : undefined;
  const pillLook = {
    backgroundColor: typeof primary === 'string' ? primary : undefined,
    ...(typeof glow === 'string' && typeof highlight === 'string'
      ? { boxShadow: `inset 0 1px 0 ${highlight}, 0 6px 14px -4px ${glow}` }
      : null),
  };

  return (
    <View className="bg-background px-4 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
      <View className="rounded-[32px] border border-border bg-surface" style={dockShadow}>
        {/* No border on this view, so the tabs' measured positions are the pill's positions. */}
        <View accessibilityRole="tablist" className="flex-row items-center justify-between p-1.5">
          <Animated.View
            pointerEvents="none"
            style={[{ position: 'absolute', top: DOCK_PADDING, height: TAB_HEIGHT, borderRadius: TAB_HEIGHT / 2 }, pillLook, pillMotion]}
          />
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
                layout={reduceMotion ? undefined : MAKE_ROOM}
                // On every tab, not only the selected one: a view that gets onLayout after it was created can miss layout events.
                onLayout={(event) => {
                  if (focused) movePillTo(event);
                }}>
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={title}
                  accessibilityState={{ selected: focused }}
                  hitSlop={4}
                  onPress={onPress}
                  onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                  className={`h-12 flex-row items-center justify-center gap-2 rounded-full active:opacity-80 ${
                    focused ? 'px-4' : 'w-12'
                  }`}>
                  <Icon
                    icon={tab.icon}
                    size={22}
                    colorVar={looksSelected === index ? '--color-on-primary' : '--color-content-muted'}
                  />
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
    </View>
  );
}
