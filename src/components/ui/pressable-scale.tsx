import type { ReactNode } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING = { damping: 18, stiffness: 420, mass: 0.6 };

export type PressableScaleProps = Omit<PressableProps, 'className' | 'children'> & {
  children: ReactNode;
  /** Positions the control (margins, flex, alignment). */
  className?: string;
  /** Styles the pressable surface itself. */
  contentClassName?: string;
  /** How far it shrinks while pressed. */
  scaleTo?: number;
};

/** Pressable that shrinks slightly while held, so every tap gets a physical response. */
export function PressableScale({
  children,
  className,
  contentClassName,
  scaleTo = 0.97,
  onPressIn,
  onPressOut,
  ...rest
}: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <View className={className}>
      <Animated.View style={animatedStyle}>
        <Pressable
          className={contentClassName}
          onPressIn={(event) => {
            if (!reduceMotion) scale.set(withSpring(scaleTo, SPRING));
            onPressIn?.(event);
          }}
          onPressOut={(event) => {
            scale.set(withSpring(1, SPRING));
            onPressOut?.(event);
          }}
          {...rest}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
