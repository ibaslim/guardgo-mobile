import { useEffect } from 'react';
import Animated, { cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export type BlinkDotProps = {
  /** Size, colour and position, e.g. "size-2 rounded-full bg-primary". */
  className: string;
  /** False keeps the dot solid. */
  blinking?: boolean;
};

/**
 * A small dot that fades in and out, to say something is live or waiting: unread alerts on the tab dock,
 * the time left to answer an offer. It stays solid when the person has reduced motion on.
 */
export function BlinkDot({ className, blinking = true }: BlinkDotProps) {
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(1);
  const animate = blinking && !reduceMotion;

  useEffect(() => {
    if (!animate) {
      opacity.set(1);
      return;
    }
    opacity.set(withRepeat(withSequence(withTiming(0.2, { duration: 600 }), withTiming(1, { duration: 600 })), -1, false));
    return () => cancelAnimation(opacity);
  }, [animate, opacity]);

  const blink = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return <Animated.View pointerEvents="none" accessible={false} className={className} style={blink} />;
}
