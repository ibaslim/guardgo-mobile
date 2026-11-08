import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { ICONS } from '@/constants/icons';

/**
 * Back arrow for a screen header. Goes back when there is a screen to return to, and otherwise to
 * the app's start (the router then picks the first screen the user is allowed to see), so the arrow
 * works even when the screen was opened as the first one.
 */
export function HeaderBackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      className="size-11 items-center justify-center rounded-full active:bg-surface-muted">
      <Icon icon={ICONS.chevronLeft} size={26} tone="default" />
    </Pressable>
  );
}
