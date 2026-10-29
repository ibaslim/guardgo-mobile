import { View } from 'react-native';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';

export default function HomeScreen() {
  return (
    <Screen className="justify-center gap-6 p-6">
      <Text variant="title" className="text-center">
        GuardGo
      </Text>
      <View className="gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm">
        <Text variant="label" tone="secondary">
          Appearance
        </Text>
        <ThemeSwitcher />
      </View>
    </Screen>
  );
}
