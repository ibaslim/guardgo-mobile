import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { ToastVariant } from '@/types/ui';

const textColors: Record<ToastVariant, string> = {
  success: 'text-toast-success',
  warning: 'text-toast-warning',
  failure: 'text-toast-failure',
};

export type ToastProps = {
  message: string;
  variant?: ToastVariant;
};

/** A small tooltip-style pill (light in light mode, dark in dark mode), sized to its text; the text colour shows success, warning or failure. */
export function Toast({ message, variant = 'failure' }: ToastProps) {
  return (
    <View
      className="max-w-[88%] self-center rounded-md border border-border bg-toast px-2 py-1 shadow-md"
      accessibilityRole={variant === 'success' ? undefined : 'alert'}
      accessibilityLiveRegion="polite">
      <Text variant="caption" tone="inherit" className={`font-sans ${textColors[variant]}`}>
        {message}
      </Text>
    </View>
  );
}
