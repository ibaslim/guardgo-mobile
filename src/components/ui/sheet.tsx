import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useKeyboardHeight } from '@/hooks/use-keyboard-height';

const OPEN_MS = 280;
const CLOSE_MS = 200;
// Gap kept above the sheet so the screen behind stays visible.
const TOP_GAP = 24;

export type SheetProps = {
  visible: boolean;
  /** Called when the user taps outside, presses the close button or uses the back gesture. */
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pinned under the content, e.g. action buttons. */
  footer?: ReactNode;
  /** `tall` uses most of the screen height, for long or searchable lists. */
  size?: 'auto' | 'tall';
  /** Called once the sheet has fully closed. Use it to open another native screen, like the image picker. */
  onDismissed?: () => void;
};

/** Bottom sheet over the current screen. */
export function Sheet({ visible, onClose, title, children, footer, size = 'auto', onDismissed }: SheetProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardHeight = useKeyboardHeight();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const panelHeight = useSharedValue(windowHeight);

  // Mount as soon as the sheet opens; it unmounts after the close animation.
  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      progress.set(withTiming(1, { duration: reduceMotion ? 0 : OPEN_MS, easing: Easing.out(Easing.cubic) }));
      return;
    }
    const finishClose = () => {
      setMounted(false);
      // iOS reports this from the Modal's onDismiss instead, once the native modal is gone.
      if (Platform.OS !== 'ios') onDismissed?.();
    };
    progress.set(
      withTiming(0, { duration: reduceMotion ? 0 : CLOSE_MS, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finishClose);
      })
    );
  }, [visible, mounted, reduceMotion, progress, onDismissed]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * panelHeight.get() }],
  }));

  const maxHeight = windowHeight - insets.top - TOP_GAP - keyboardHeight;
  const tallHeight = Math.min(maxHeight, windowHeight * 0.85);

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
      // iOS can only present another screen (image picker, ...) once the modal is gone.
      onDismiss={Platform.OS === 'ios' ? onDismissed : undefined}>
      <View className="flex-1 justify-end" style={{ paddingBottom: keyboardHeight }}>
        <Animated.View style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, backdropStyle]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            className="flex-1 bg-overlay"
          />
        </Animated.View>

        <Animated.View
          style={[panelStyle, { maxHeight, height: size === 'tall' ? tallHeight : undefined }]}
          onLayout={(event) => panelHeight.set(event.nativeEvent.layout.height)}>
          {/* Auto-size sheets take their content's height: `flex-1` here would collapse them to nothing. */}
          <View
            accessibilityViewIsModal
            className={`rounded-t-[28px] bg-surface ${size === 'tall' ? 'flex-1' : 'shrink'}`}
            style={{ paddingBottom: keyboardHeight > 0 ? 12 : insets.bottom + 12 }}>
            <View className="items-center pb-2 pt-3">
              <View className="h-[5px] w-10 rounded-full bg-field-border" />
            </View>

            {title ? (
              <View className="flex-row items-center gap-3 pb-4 pl-6 pr-4 pt-1">
                <Text variant="heading" accessibilityRole="header" numberOfLines={1} className="flex-1">
                  {title}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={6}
                  onPress={onClose}
                  className="size-8 items-center justify-center rounded-full bg-surface-muted active:opacity-70">
                  <Icon icon={ICONS.close} size={14} tone="secondary" />
                </Pressable>
              </View>
            ) : null}

            <View className={size === 'tall' ? 'flex-1' : 'shrink'}>{children}</View>
            {footer ? <View className="gap-2 px-6 pt-3">{footer}</View> : null}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
