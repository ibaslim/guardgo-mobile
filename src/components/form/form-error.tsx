import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';

/** The form-level error from the last submit (`serverError` from useApiForm). Renders nothing without one. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <View
      className="flex-row items-start gap-3 rounded-[14px] bg-danger-soft px-4 py-3.5"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite">
      <Icon icon={ICONS.error} size={18} colorVar="--color-danger-soft-content" />
      <Text variant="small" tone="inherit" className="flex-1 font-sans-medium text-danger-soft-content">
        {message}
      </Text>
    </View>
  );
}
