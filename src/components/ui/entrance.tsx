import type { ReactNode } from 'react';
import Animated, { Easing, Keyframe, ReduceMotion } from 'react-native-reanimated';

const DURATION_MS = 420;
const FIRST_DELAY_MS = 60;
const STEP_MS = 80;

const rise = (step: number) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ translateY: 16 }] },
    100: { opacity: 1, transform: [{ translateY: 0 }], easing: Easing.out(Easing.cubic) },
  })
    .duration(DURATION_MS)
    .delay(FIRST_DELAY_MS + step * STEP_MS)
    .reduceMotion(ReduceMotion.System);

export type EntranceProps = {
  /** Position in the screen's build-in sequence: 0 comes in first, then 1, 2, ... */
  step?: number;
  children: ReactNode;
};

/**
 * Rises and fades its content in when it first mounts. Give a screen's sections increasing steps
 * so they arrive in order. Used once per screen for the arrival after sign-in, not on every list.
 */
export function Entrance({ step = 0, children }: EntranceProps) {
  return <Animated.View entering={rise(step)}>{children}</Animated.View>;
}
