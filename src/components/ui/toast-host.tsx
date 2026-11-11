import { useEffect, useSyncExternalStore } from 'react';
import { Pressable } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Toast } from '@/components/ui/toast';
import { getToast, hideToast, subscribeToast } from '@/services/toast';
import type { ToastVariant } from '@/types/ui';

const BOTTOM_GAP = 54;
const DURATION_MS: Record<ToastVariant, number> = { success: 1500, warning: 2000, failure: 2500 };

/**
 * Shows the current toast (see `toast` in services/toast.ts) centred at the bottom of the screen,
 * above everything else. Mount it once, at the app root. Tap the toast to dismiss it early.
 */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  const current = useSyncExternalStore(subscribeToast, getToast, getToast);
  const id = current?.id;
  const variant = current?.variant;

  useEffect(() => {
    if (id === undefined || variant === undefined) return;
    const timer = setTimeout(() => hideToast(id), DURATION_MS[variant]);
    return () => clearTimeout(timer);
  }, [id, variant]);

  if (!current) return null;

  return (
    <Animated.View
      key={current.id}
      entering={FadeInDown.duration(220).reduceMotion(ReduceMotion.System)}
      exiting={FadeOutDown.duration(180).reduceMotion(ReduceMotion.System)}
      style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + BOTTOM_GAP, alignItems: 'center', zIndex: 9999, elevation: 9999 }}
      pointerEvents="box-none">
      <Pressable accessibilityRole="button" accessibilityLabel="Dismiss message" onPress={() => hideToast(current.id)}>
        <Toast message={current.message} variant={current.variant} />
      </Pressable>
    </Animated.View>
  );
}
