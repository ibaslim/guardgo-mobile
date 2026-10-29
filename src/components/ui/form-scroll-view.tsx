import { KeyboardAwareScrollView, type KeyboardAwareScrollViewProps } from 'react-native-keyboard-controller';

// Space kept between the keyboard and the focused field, so its label and error stay visible too.
const KEYBOARD_GAP = 32;

/**
 * Scroll view for screens with inputs. When a field is focused it scrolls it above the keyboard,
 * on iOS and on edge-to-edge Android, where the window no longer resizes for the keyboard.
 */
export function FormScrollView({ children, ...props }: KeyboardAwareScrollViewProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={KEYBOARD_GAP}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      {...props}>
      {children}
    </KeyboardAwareScrollView>
  );
}
