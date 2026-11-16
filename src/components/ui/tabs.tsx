import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useCSSVariable } from 'uniwind';

import { Text } from '@/components/ui/text';

const SLIDE_MS = 240;
/** How wide the soft fade at each end of a scrolling row is (dp). */
const FADE_WIDTH = 44;
/** Scrolled less than this from an end counts as being at that end (dp). */
const END_SLACK = 4;

/** "#f3f4f6" with an alpha, as rgba(). Null when the colour isn't a hex value. */
function withAlpha(color: unknown, alpha: number) {
  if (typeof color !== 'string') return null;
  const hex = color.trim().replace('#', '');
  const full = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(full.slice(at, at + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type TabsProps<T extends string> = {
  /** `count` floats a small number beside the label; leave it out (or 0) to hide it. */
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  /**
   * Sizes each tab to its label and lets the row scroll sideways, bringing the selected tab into view.
   * Use it when the labels don't fit side by side (about five tabs or more); otherwise the tabs share the width equally.
   */
  scrollable?: boolean;
  /**
   * For `scrollable` tabs: how far (in dp) to run the row past the screen's side padding, to the screen edge.
   * Pass the padding the screen puts around its content (TabScreen uses 20). Tabs that scroll off then slide
   * off the screen, not off an invisible line at the margin; the first tab still starts at the margin.
   */
  bleed?: number;
};

type Box = { x: number; width: number };

/** A soft edge on one side of a scrolling row: the page colour fading out to nothing. Taps pass through it. */
function Fade({ side, color }: { side: 'left' | 'right'; color: unknown }) {
  const solid = withAlpha(color, 1);
  const clear = withAlpha(color, 0);
  if (!solid || !clear) return null;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [side]: 0,
        width: FADE_WIDTH,
        backgroundImage: `linear-gradient(to ${side === 'left' ? 'right' : 'left'}, ${solid}, ${clear})`,
      }}
    />
  );
}

/**
 * A row of tabs on a hairline, with an underline that slides to the selected one.
 * Use it to switch between views of one list; for a short filter inside a form use `FilterPills`.
 */
export function Tabs<T extends string>({ options, value, onChange, scrollable = false, bleed = 0 }: TabsProps<T>) {
  const [boxes, setBoxes] = useState<Partial<Record<T, Box>>>({});
  const [rowWidth, setRowWidth] = useState(0);
  const scroller = useRef<ScrollViewInstance>(null);
  const placed = useRef(false);

  // The fades show only on the side that has more tabs to scroll to.
  const [fade, setFade] = useState({ left: false, right: false });
  const contentWidth = useRef(0);
  const offset = useRef(0);
  const background = useCSSVariable('--color-background');

  const updateFades = (nextRowWidth = rowWidth) => {
    const left = offset.current > END_SLACK;
    const right = offset.current + nextRowWidth < contentWidth.current - END_SLACK;
    setFade((current) => (current.left === left && current.right === right ? current : { left, right }));
  };

  const box = boxes[value];
  const x = useSharedValue(0);
  const width = useSharedValue(0);

  useEffect(() => {
    if (!box) return;
    // The first measurement places the underline without sliding in from the left edge.
    const duration = placed.current ? SLIDE_MS : 0;
    placed.current = true;
    const timing = { duration, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System };
    x.value = withTiming(box.x, timing);
    width.value = withTiming(box.width, timing);
    if (scrollable && rowWidth > 0) {
      // Centre the selected tab when the row is wider than the screen.
      scroller.current?.scrollTo({ x: Math.max(0, box.x + box.width / 2 - rowWidth / 2), animated: duration > 0 });
    }
  }, [box, rowWidth, scrollable, x, width]);

  const underline = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));

  const tabs = options.map((option) => {
    const on = option.value === value;
    return (
      <Pressable
        key={option.value}
        accessibilityRole="tab"
        accessibilityLabel={option.count ? `${option.label}, ${option.count}` : option.label}
        accessibilityState={{ selected: on }}
        onPress={() => onChange(option.value)}
        onLayout={(event) => {
          const { x: left, width: wide } = event.nativeEvent.layout;
          setBoxes((current) => {
            const known = current[option.value];
            return known && known.x === left && known.width === wide ? current : { ...current, [option.value]: { x: left, width: wide } };
          });
        }}
        className={`h-11 items-center justify-center active:bg-surface-muted ${scrollable ? 'px-4' : 'flex-1'}`}>
        <View className="flex-row items-center gap-1.5">
          <Text
            variant="label"
            tone="inherit"
            numberOfLines={1}
            className={on ? 'font-sans-semibold text-primary' : 'text-content-muted'}>
            {option.label}
          </Text>
          {option.count ? (
            // Inside the tab, beside the label, so it is never clipped by the row's edge or covered by a neighbour.
            // In the equal-width mode there is no room beside the label, so the badge floats on its corner there.
            <View
              pointerEvents="none"
              accessible={false}
              className={`min-w-4 items-center rounded-full bg-primary px-1 ${scrollable ? '' : 'absolute -right-5 -top-1.5'}`}>
              <Text variant="caption" tone="inherit" className="font-sans-semibold text-[10px] leading-4 text-on-primary">
                {option.count}
              </Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  });

  const indicator = box ? (
    <Animated.View pointerEvents="none" style={underline} className="absolute -bottom-px left-0 h-0.5 bg-primary" />
  ) : null;

  if (scrollable) {
    return (
      <View
        accessibilityRole="tablist"
        onLayout={(event) => {
          setRowWidth(event.nativeEvent.layout.width);
          updateFades(event.nativeEvent.layout.width);
        }}
        style={{ marginHorizontal: -bleed }}
        className="border-b border-border">
        <ScrollView
          ref={scroller}
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(event) => {
            offset.current = event.nativeEvent.contentOffset.x;
            updateFades();
          }}
          onContentSizeChange={(wide) => {
            contentWidth.current = wide;
            updateFades();
          }}
          contentContainerStyle={{ paddingHorizontal: bleed }}
          contentContainerClassName="flex-row">
          {tabs}
          {indicator}
        </ScrollView>
        {fade.left ? <Fade side="left" color={background} /> : null}
        {fade.right ? <Fade side="right" color={background} /> : null}
      </View>
    );
  }

  return (
    <View accessibilityRole="tablist" className="flex-row border-b border-border">
      {tabs}
      {indicator}
    </View>
  );
}
