import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Text as NativeText, View, type TextStyle } from 'react-native';
import Animated, { useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useCSSVariable } from 'uniwind';

import { TimeFieldShell, type TimeFieldProps } from '@/components/ui/time-field-shell';
import { twoDigits } from '@/utils/time-draft';

const ITEM_HEIGHT = 44;
// Rows above and below the chosen one. The chosen row sits in the middle of the wheel.
const SIDE_ROWS = 2;
const WHEEL_HEIGHT = ITEM_HEIGHT * (SIDE_ROWS * 2 + 1);
// A looping wheel is its values repeated until it has about this many rows, started in the middle,
// and put back in the middle when it stops, so it never seems to end. All rows are drawn up front,
// so a fast swipe never shows blank space.
const LOOP_ROWS = 120;
const RECENTER_ROWS = 30;

// One row is a single plain text, as tall as the row. Its style is a ready-made object and not a
// class name: resolving class names is slow in a dev build, and a wheel has hundreds of rows.
const rowStyle = (fontFamily: string, fontSize: number, color: string): TextStyle => ({
  height: ITEM_HEIGHT,
  lineHeight: ITEM_HEIGHT,
  textAlign: 'center',
  fontFamily,
  fontSize,
  color,
});

const HOUR_LABELS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const MINUTE_LABELS = Array.from({ length: 60 }, (_, index) => twoDigits(index));
const PERIOD_LABELS = ['AM', 'PM'];

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
  /** The theme colour of the numbers. */
  token: string;
  className: string;
};

// The rows of the wheel are small and grey. Two more layers on top make the numbers grow and darken
// toward the middle like a drum, without any work per row while scrolling:
//   - the middle three rows: larger and darker,
//   - the middle row: largest and darkest, on the highlighted band.
// Each layer shows one run of the values, moved in step with the scroll.
// Set to false to draw only the small grey rows. It builds about a third fewer elements, so the
// sheet opens faster, but the numbers no longer grow toward the middle.
const DRUM_LAYERS = true;

const LOOKS: readonly Look[] = [
  { half: 1, fontFamily: 'IBMPlexSans_500Medium', fontSize: 19, token: '--color-content-secondary', className: 'bg-surface' },
  { half: 0, fontFamily: 'IBMPlexSans_600SemiBold', fontSize: 26, token: '--color-content', className: 'rounded-xl bg-surface-muted' },
];

type LayerProps = {
  look: Look;
  color: string;
  labels: readonly string[];
  loop: boolean;
  scroll: SharedValue<number>;
};

function Layer({ look, color, labels, loop, scroll }: LayerProps) {
  const { half, fontFamily, fontSize, className } = look;
  const count = labels.length;
  const cycle = count * ITEM_HEIGHT;

  const style = useMemo(() => rowStyle(fontFamily, fontSize, color), [fontFamily, fontSize, color]);

  // One run of the values plus two rows on each side, so the ends join up when a looping wheel wraps.
  const rows = useMemo(
    () =>
      Array.from({ length: count + 4 }, (_, position) => {
        const index = position - 2;
        const label = loop ? labels[mod(index, count)] : labels[index];
        return (
          <NativeText key={position} style={style}>
            {label ?? ''}
          </NativeText>
        );
      }),
    [count, loop, labels, style],
  );

  const moving = useAnimatedStyle(() => {
    const offset = loop ? mod(scroll.get(), cycle) : scroll.get();
    return { transform: [{ translateY: (half - SIDE_ROWS) * ITEM_HEIGHT - offset }] };
  });

  return (
    <View
      pointerEvents="none"
      className={`absolute inset-x-0 overflow-hidden ${className}`}
      style={{ top: (SIDE_ROWS - half) * ITEM_HEIGHT, height: (half * 2 + 1) * ITEM_HEIGHT }}>
      <Animated.View style={moving}>{rows}</Animated.View>
    </View>
  );
}

type WheelProps = {
  labels: readonly string[];
  /** Index in `labels` of the chosen value. */
  selected: number;
  onSelect: (index: number) => void;
  /** Wraps around: after 12 comes 1 again. */
  loop?: boolean;
  accessibilityLabel: string;
};

function Wheel({ labels, selected, onSelect, loop = false, accessibilityLabel }: WheelProps) {
  const count = labels.length;
  const repeats = loop ? Math.ceil(LOOP_ROWS / count) : 1;
  const middle = loop ? Math.floor(repeats / 2) * count : 0;
  const rows = count * repeats;

  const dimColor = useCSSVariable('--color-content-disabled');
  const secondaryColor = useCSSVariable('--color-content-secondary');
  const contentColor = useCSSVariable('--color-content');
  const colors = [secondaryColor, contentColor].map((value) => (typeof value === 'string' ? value : '#374151'));
  const rowTextStyle = useMemo(
    () => rowStyle('IBMPlexSans_400Regular', 14, typeof dimColor === 'string' ? dimColor : '#9ca3af'),
    [dimColor],
  );

  // The wheel's own rows: small and grey. They never change while the wheel is open, so they are made once.
  const items = useMemo(
    () =>
      Array.from({ length: rows }, (_, row) => (
        <NativeText key={row} style={rowTextStyle}>
          {labels[row % count]}
        </NativeText>
      )),
    [rows, labels, count, rowTextStyle],
  );

  const scrollRef = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  // Only the first value is used, to place the wheel when it opens.
  const [initial] = useState(selected);
  const scroll = useSharedValue((middle + initial) * ITEM_HEIGHT);

  // The latest choice and callback, so the handlers below can stay the same between renders.
  const latest = useRef({ selected, onSelect });
  useEffect(() => {
    latest.current = { selected, onSelect };
  });

  const settle = useCallback(
    (offset: number) => {
      const row = Math.round(offset / ITEM_HEIGHT);
      const index = loop ? mod(row, count) : Math.min(Math.max(row, 0), count - 1);
      if (index !== latest.current.selected) latest.current.onSelect(index);
      // Put a looping wheel back in the middle, only once it has stopped (moving it mid-fling stutters).
      if (loop && (row < RECENTER_ROWS || row > rows - RECENTER_ROWS)) {
        scrollRef.current?.scrollTo({ y: (middle + index) * ITEM_HEIGHT, animated: false });
      }
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
        const next = loop ? mod(selected + step, count) : Math.min(Math.max(selected + step, 0), count - 1);
        onSelect(next);
        scrollRef.current?.scrollTo({ y: (middle + next) * ITEM_HEIGHT, animated: true });
      }}>
      <Animated.ScrollView
        ref={scrollRef}
        contentOffset={{ x: 0, y: (middle + initial) * ITEM_HEIGHT }}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * SIDE_ROWS }}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={onScroll}>
        {items}
      </Animated.ScrollView>

      {(DRUM_LAYERS ? LOOKS : []).map((look) => (
        <Layer key={look.half} look={look} color={colors[LOOKS.indexOf(look)]} labels={labels} loop={loop} scroll={scroll} />
      ))}
    </View>
  );
}

export type WheelTimePickerFieldProps = TimeFieldProps;

/**
 * A time field with a scrolling wheel picker like the iPhone's: one wheel for hours and one for
 * minutes, both going round without an end, and one for AM or PM. Always 12-hour, whatever the
 * phone's clock setting. For a picker made of buttons, see `TimePickerField`.
 */
export function WheelTimePickerField(props: WheelTimePickerFieldProps) {
  return (
    <TimeFieldShell {...props}>
      {(draft, setDraft) => (
        <View className="flex-row gap-2">
          <Wheel
            loop
            labels={HOUR_LABELS}
            selected={draft.hour - 1}
            onSelect={(index) => setDraft({ ...draft, hour: index + 1 })}
            accessibilityLabel="Hour"
          />
          <Wheel
            loop
            labels={MINUTE_LABELS}
            selected={draft.minute}
            onSelect={(index) => setDraft({ ...draft, minute: index })}
            accessibilityLabel="Minutes"
          />
          <Wheel
            labels={PERIOD_LABELS}
            selected={draft.period === 'AM' ? 0 : 1}
            onSelect={(index) => setDraft({ ...draft, period: index === 0 ? 'AM' : 'PM' })}
            accessibilityLabel="AM or PM"
          />
        </View>
      )}
    </TimeFieldShell>
  );
}
