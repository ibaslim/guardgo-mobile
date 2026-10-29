import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export type TabScreenProps = {
  title: string;
  subtitle?: string;
  /** Replaces the default title block, e.g. for the home screen greeting. */
  header?: ReactNode;
  children?: ReactNode;
};

/** Scrollable screen inside a tab bar, with a title block at the top. */
export function TabScreen({ title, subtitle, header, children }: TabScreenProps) {
  return (
    <Screen edges={['top']}>
      {/* "automatic" keeps content clear of the iOS tab bar, which floats over the screen. */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 px-5 pb-8 pt-4">
        {header ?? (
          <View className="gap-1">
            <Text variant="title" accessibilityRole="header">
              {title}
            </Text>
            {subtitle ? <Text tone="muted">{subtitle}</Text> : null}
          </View>
        )}
        {children}
      </ScrollView>
    </Screen>
  );
}
