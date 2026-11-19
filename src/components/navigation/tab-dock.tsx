import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { useContext, useEffect, useState } from 'react';
import { AppState, Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useCSSVariable } from 'uniwind';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useRealtimeRefresh } from '@/hooks/use-realtime';
import { useUnreadCount } from '@/hooks/use-unread-count';
import { fetchUnreadCount } from '@/services/notifications';
import type { AreaTab } from '@/types/roles';

const EASE = Easing.out(Easing.cubic);
const MOVE_MS = 220;
/** The icons and labels make room for the pill with the same short ease-out, so nothing overshoots. */
const MAKE_ROOM = LinearTransition.duration(MOVE_MS).easing(EASE);

/** Space between the capsule edge and the tabs (p-1.5). The pill's top edge sits here. */
const DOCK_PADDING = 6;
/** h-9: keep in step with the tabs' height class below. */
const TAB_HEIGHT = 36;
/** The selected icon turns white once the pill has mostly arrived under it, not before. */
const RECOLOR_DELAY_MS = 100;

/** A small red dot that fades in and out. It stays solid when the person has reduced motion on. */
function UnreadDot() {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      opacity.set(1);
      return;
    }
    opacity.set(
      withRepeat(withSequence(withTiming(0.2, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false)
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const blink = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      accessible={false}
      className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-surface bg-badge-danger"
      style={blink}
    />
  );
}

type TabDockProps = BottomTabBarProps & {
  /** The area's tabs (constants/roles.ts), matched to the routes by name. */
  tabs: readonly AreaTab[];
};

/**
 * Floating tab bar. Quiet by default: a rounded capsule with muted icons. The one memorable thing
 * is the pill, in the same blue (and glow) as the primary button. It slides from the old tab to the
 * new one and resizes to fit the label, so it always travels in the direction of the tap. The pill is
 * one separate element behind the tabs, moved to the frame measured for the selected tab. It sits in
 * the content, with no background of its own, so a screen scrolls behind it; it reports its height
 * to the navigator (TabScreen reads it to leave room at the bottom). Colours are theme tokens, so
 * light and dark follow.
 */
export function TabDock({ state, descriptors, emitter, navigateToTab, insets, tabs }: TabDockProps) {
  const reduceMotion = useReducedMotion();
  const unread = useUnreadCount();
  const hasAlerts = tabs.some((tab) => tab.name === 'notifications');

  // While not connected to Pusher, ask for the count every 10 seconds. With Pusher up, the root bridge
  // (hooks/use-realtime-bridge.ts) updates it on each event, so only the polling is used here.
  useRealtimeRefresh(
    () => {
      fetchUnreadCount().catch(() => undefined);
    },
    { active: hasAlerts, events: false }
  );

  // Keep the Alerts badge current: on arrival, on every tab change, and when the app returns to the foreground.
  useEffect(() => {
    if (!hasAlerts) return;
    const refresh = () => {
      fetchUnreadCount().catch(() => undefined);
    };
    refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [hasAlerts, state.index]);

  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
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
    <View
      // box-none: touches in the gaps beside the capsule reach the screen underneath.
      pointerEvents="box-none"
      onLayout={(event) => reportHeight?.(event.nativeEvent.layout.height)}
      className="px-2 pt-2"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom + 8 }}>
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
                  className={`h-9 flex-row items-center justify-center gap-1 rounded-full active:opacity-80 ${
                    focused ? 'pl-1.5 pr-2' : 'w-10'
                  }`}>
                  <View>
                    <Icon
                      icon={tab.icon}
                      size={22}
                      colorVar={looksSelected === index ? '--color-on-primary' : '--color-content-muted'}
                    />
                    {/* Unread alerts: a blinking dot on the Alerts icon while that tab is not the open one. */}
                    {tab.name === 'notifications' && unread > 0 && !focused ? <UnreadDot /> : null}
                  </View>
                  {focused ? (
                    <Animated.View
                      entering={reduceMotion ? undefined : FadeIn.duration(160).delay(60)}
                      exiting={reduceMotion ? undefined : FadeOut.duration(70)}>
                      <Text variant="small" tone="inherit" numberOfLines={1} className="text-[14px] text-on-primary">
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
