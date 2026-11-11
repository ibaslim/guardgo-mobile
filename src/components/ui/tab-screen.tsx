import { BottomTabBarHeightContext } from 'expo-router/build/layouts/Tabs';
import { useContext, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export type TabScreenProps = {
  title: string;
  subtitle?: string;
  /** Replaces the default title block, e.g. for the home screen greeting. */
  header?: ReactNode;
  /** Leaves out the title block, for a screen whose first card says what it is. */
  hideHeader?: boolean;
  children?: ReactNode;
  /** With `onRefresh`, pulling the list down reloads it. */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Scrollable screen inside a tab bar, with a title block at the top. */
export function TabScreen({ title, subtitle, header, hideHeader = false, children, refreshing = false, onRefresh }: TabScreenProps) {
  // The tab bar floats over the screen, so the content keeps clear of it at the bottom.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;

  return (
    <Screen edges={['top']}>
      {/* "automatic" keeps content clear of the iOS tab bar, which floats over the screen. */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 pt-0"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>
        {hideHeader ? null : (header ?? (
          <View className="gap-1">
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
          </View>
        ))}
        {children}
      </ScrollView>
    </Screen>
  );
}
