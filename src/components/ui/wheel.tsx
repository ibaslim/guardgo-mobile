import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Text as NativeText, PixelRatio, Platform, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCSSVariable } from 'uniwind';

// A whole number of screen pixels, so that rows, snapping and text lines all land on the same grid.
const ITEM_HEIGHT = PixelRatio.roundToNearestPixel(44);
// Android rounds a line height up to the next whole pixel. Staying just under one keeps every line
// exactly one row tall, so a long column of lines does not drift away from the rows.
const LINE_HEIGHT = Platform.OS === 'android' ? ITEM_HEIGHT - 0.01 : ITEM_HEIGHT;
// Rows above and below the chosen one. The chosen row sits in the middle of the wheel.
const SIDE_ROWS = 2;
const WHEEL_HEIGHT = ITEM_HEIGHT * (SIDE_ROWS * 2 + 1);
// A looping wheel scrolls over about this many rows, starts in the middle, and is put back in the
// middle when it stops, so it never seems to end.
const LOOP_ROWS = 120;
const RECENTER_ROWS = 30;
// A looping column repeats this many values before its first and after its last, so the ends join
// up when the wheel wraps.
const LEAD_ROWS = SIDE_ROWS;
const TRAIL_ROWS = SIDE_ROWS + 1;
// A column is drawn as texts of at most this many lines each, so a long one (a hundred years) never
// becomes a single view taller than a phone can draw.
const CHUNK_ROWS = 40;

// Worklets, because the animated style below calls it on the UI thread.
function mod(value: number, size: number) {
  'worklet';
  return ((value % size) + size) % size;
}

type Look = {
  /** Rows shown above and below the middle one: 1 is the middle three rows, 0 is just the chosen row. */
  half: number;
  fontFamily: string;
  fontSize: number;
  /** The theme colour of the values. */
  token: '--color-content-disabled' | '--color-content-secondary' | '--color-content';
  fallback: string;
  className: string;
};

// The values grow and darken toward the middle like a drum. Three layers are stacked for that:
//   - all five rows: small and grey,
//   - the middle three rows: larger and darker,
//   - the middle row: largest and darkest, on the highlighted band.
// Each layer is a text with one value per line, moved in step with the scroll. The scroll view under
// them is empty and only tracks the finger. So a wheel costs a few text elements however many values
// it has. (One element per row, a few hundred in all, took seconds to build each time a sheet opened.)
const LOOKS: readonly Look[] = [
  {
    half: SIDE_ROWS,
    fontFamily: 'IBMPlexSans_400Regular',
    fontSize: 14,
    token: '--color-content-disabled',
    fallback: '#9ca3af',
    className: '',
  },
  {
    half: 1,
    fontFamily: 'IBMPlexSans_500Medium',
    fontSize: 19,
    token: '--color-content-secondary',
    fallback: '#374151',
    className: 'bg-surface',
  },
  {
    half: 0,
    fontFamily: 'IBMPlexSans_600SemiBold',
    fontSize: 26,
    token: '--color-content',
    fallback: '#374151',
    className: 'rounded-xl bg-surface-muted',
  },
];

type LayerProps = {
  look: Look;
  /** The column, cut into texts with one value per line. */
  chunks: readonly { text: string; rows: number }[];
  /** Values in one turn of the wheel. */
  count: number;
  loop: boolean;
  scroll: SharedValue<number>;
};

function Layer({ look, chunks, count, loop, scroll }: LayerProps) {
  const { half, fontFamily, fontSize, token, fallback, className } = look;
  const cycle = count * ITEM_HEIGHT;
  const lead = loop ? LEAD_ROWS : 0;
  const themeColor = useCSSVariable(token);
  const color = typeof themeColor === 'string' ? themeColor : fallback;

  const style = useMemo<TextStyle>(
    () => ({ lineHeight: LINE_HEIGHT, textAlign: 'center', includeFontPadding: false, fontFamily, fontSize, color }),
    [fontFamily, fontSize, color],
  );

  const moving = useAnimatedStyle(() => {
    const offset = loop ? mod(scroll.get(), cycle) : scroll.get();
    return { transform: [{ translateY: (half - lead) * ITEM_HEIGHT - offset }] };
  });

  return (
    <View
      pointerEvents="none"
      className={`absolute inset-x-0 overflow-hidden ${className}`}
      style={{ top: (SIDE_ROWS - half) * ITEM_HEIGHT, height: (half * 2 + 1) * ITEM_HEIGHT }}>
      <Animated.View style={moving}>
        {chunks.map((chunk, index) => (
          // Each text gets its full height spelled out. Left to size itself, it is measured against
          // the layer's few rows and every line after those is cut off.
          // Font scaling is off: it would also scale the line height, and the lines must match the rows.
          <NativeText key={index} allowFontScaling={false} numberOfLines={chunk.rows} style={[style, { height: chunk.rows * ITEM_HEIGHT }]}>
            {chunk.text}
          </NativeText>
        ))}
      </Animated.View>
    </View>
  );
}

export type WheelProps = {
  labels: readonly string[];
  /** Index in `labels` of the chosen value. When it changes from outside, the wheel turns to it. */
  selected: number;
  onSelect: (index: number) => void;
  /** Wraps around: after the last value comes the first again. */
  loop?: boolean;
  accessibilityLabel: string;
};

/**
 * One scrolling column of a wheel picker, like the iPhone's: five rows, the chosen one in the middle.
 * Put a few side by side in a row (each takes an equal share of the width). See `WheelTimePickerField`
 * and `WheelDateField`.
 */
export function Wheel({ labels, selected, onSelect, loop = false, accessibilityLabel }: WheelProps) {
  const count = labels.length;
  const repeats = loop ? Math.ceil(LOOP_ROWS / count) : 1;
  const middle = loop ? Math.floor(repeats / 2) * count : 0;
  const rows = count * repeats;

  // The column every layer draws: one value per line.
  const chunks = useMemo(() => {
    const lines = loop
      ? Array.from({ length: LEAD_ROWS + count + TRAIL_ROWS }, (_, position) => labels[mod(position - LEAD_ROWS, count)])
      : labels;
    const result: { text: string; rows: number }[] = [];
    for (let start = 0; start < lines.length; start += CHUNK_ROWS) {
      const part = lines.slice(start, start + CHUNK_ROWS);
      result.push({ text: part.join('\n'), rows: part.length });
    }
    return result;
  }, [labels, count, loop]);

  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  // Only the first value is used, to place the wheel when it opens.
  const [initial] = useState(selected);
  const scroll = useSharedValue((middle + initial) * ITEM_HEIGHT);
  // The row the wheel rests on, or is turning to.
  const restRow = useRef(middle + initial);

  // The latest choice and callback, so the handlers below can stay the same between renders.
  const latest = useRef({ selected, onSelect });
  useEffect(() => {
    latest.current = { selected, onSelect };
  });

  // The choice can change from outside: a screen reader's step, or a date picker moving 31 back to
  // 30 in a shorter month. Turn the wheel to it, the short way round. Checked after every render
  // and not only when `selected` changes: a wheel left on 31 must go back even when the choice was
  // 30 before and after.
  useEffect(() => {
    const row = restRow.current;
    const shown = loop ? mod(row, count) : Math.min(Math.max(row, 0), count - 1);
    if (shown === selected) return;
    let step = selected - shown;
    if (loop) {
      step = mod(step, count);
      if (step > count / 2) step -= count;
    }
    restRow.current = row + step;
    scrollRef.current?.scrollTo({ y: restRow.current * ITEM_HEIGHT, animated: true });
  });

  const settle = useCallback(
    (offset: number) => {
      const row = Math.round(offset / ITEM_HEIGHT);
      const index = loop ? mod(row, count) : Math.min(Math.max(row, 0), count - 1);
      restRow.current = row;
      // Put a looping wheel back in the middle, only once it has stopped (moving it mid-fling stutters).
      if (loop && (row < RECENTER_ROWS || row > rows - RECENTER_ROWS)) {
        restRow.current = middle + index;
        scrollRef.current?.scrollTo({ y: restRow.current * ITEM_HEIGHT, animated: false });
      }
      latest.current.onSelect(index);
    },
    [loop, count, rows, middle],
  );

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scroll.set(event.contentOffset.y);
    },
    onMomentumEnd: (event) => {
      scheduleOnRN(settle, event.contentOffset.y);
    },
    // A drag that ends without a fling never reaches onMomentumEnd. One that flings must not settle
    // here, or the choice would change while the wheel is still spinning.
    onEndDrag: (event) => {
      if (Math.abs(event.velocity?.y ?? 0) < 0.05) scheduleOnRN(settle, event.contentOffset.y);
    },
  });

  return (
    <View
      className="flex-1"
      style={{ height: WHEEL_HEIGHT }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: labels[selected] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        onSelect(loop ? mod(selected + step, count) : Math.min(Math.max(selected + step, 0), count - 1));
      }}>
      <Animated.ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: (middle + initial) * ITEM_HEIGHT }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}>
        {/* Nothing to draw, only the distance to scroll: a row per value, plus room for the first and last to reach the middle. */}
        <View style={{ height: (rows + SIDE_ROWS * 2) * ITEM_HEIGHT }} />
      </Animated.ScrollView>

      {LOOKS.map((look) => (
        <Layer key={look.half} look={look} chunks={chunks} count={count} loop={loop} scroll={scroll} />
      ))}
    </View>
  );
}
