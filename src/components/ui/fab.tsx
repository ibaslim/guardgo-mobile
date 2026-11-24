import { useEffect, useState } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ICONS } from '@/constants/icons';
import type { SymbolIcon } from '@/types/ui';

const SIZE = 56;
const MARGIN = 20;
/** A finger that moves less than this is still a tap. */
const DRAG_SLOP = 6;

/** Where the button rests (x, y) and how big the area it moves in is. Changes with every drag, so it is not render state. */
type Drag = { x: number; y: number; width: number; height: number };

const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);

function createResponder(position: Animated.ValueXY, drag: Drag) {
  return PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > DRAG_SLOP || Math.abs(gesture.dy) > DRAG_SLOP,
    onPanResponderMove: (_event, gesture) => {
      position.setValue({ x: clamp(drag.x + gesture.dx, drag.width - SIZE), y: clamp(drag.y + gesture.dy, drag.height - SIZE) });
    },
    onPanResponderRelease: (_event, gesture) => {
      const y = clamp(drag.y + gesture.dy, drag.height - SIZE);
      // Settles against whichever side it is nearer to.
      const x = drag.x + gesture.dx + SIZE / 2 < drag.width / 2 ? MARGIN : drag.width - SIZE - MARGIN;
      drag.x = x;
      drag.y = y;
      Animated.spring(position, { toValue: { x, y }, useNativeDriver: true, bounciness: 4 }).start();
    },
  });
}

/** Starts in the bottom right corner, and keeps its place when the area changes size. */
function place(position: Animated.ValueXY, drag: Drag, width: number, height: number) {
  const first = drag.width === 0;
  drag.width = width;
  drag.height = height;
  drag.x = first ? width - SIZE - MARGIN : Math.min(drag.x, width - SIZE - MARGIN);
  drag.y = first ? height - SIZE : Math.min(drag.y, height - SIZE);
  position.setValue({ x: drag.x, y: drag.y });
}

export type FabProps = {
  /** What it does, read aloud: "New request". */
  label: string;
  onPress: () => void;
  icon?: SymbolIcon;
};

/**
 * The one round button that floats over a list for its main "add" action. It can be dragged anywhere in the free area
 * and settles against the nearest side, so it can be moved off whatever it covers. Put it in `TabScreen`'s `floating`,
 * which gives it that area.
 */
export function Fab({ label, onPress, icon = ICONS.plus }: FabProps) {
  const [ready, setReady] = useState(false);
  const [position] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [drag] = useState<Drag>(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  const [responder] = useState(() => createResponder(position, drag));

  useEffect(() => () => position.stopAnimation(), [position]);

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0"
      onLayout={({ nativeEvent: { layout } }) => {
        place(position, drag, layout.width, layout.height);
        setReady(true);
      }}>
      {ready ? (
        <Animated.View
          {...responder.panHandlers}
          style={{ position: 'absolute', left: 0, top: 0, transform: position.getTranslateTransform() }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityHint="Drag to move"
            onPress={onPress}
            className="size-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90">
            <Icon icon={icon} size={26} colorVar="--color-on-primary" />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}
