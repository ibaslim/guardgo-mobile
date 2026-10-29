import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { AREA_CONFIGS } from '@/constants/roles';
import type { RoleArea } from '@/types/roles';

export type PlaceholderScreenProps = {
  area: RoleArea;
  /** Tab name from the area's config in constants/roles.ts. */
  tab: string;
};

/** Stand-in for a tab that isn't built yet. Replace the route file's content when the screen is ready. */
export function PlaceholderScreen({ area, tab }: PlaceholderScreenProps) {
  const config = AREA_CONFIGS[area].tabs.find((item) => item.name === tab);
  if (!config) {
    throw new Error(`No "${tab}" tab in the ${area} area config.`);
  }

  return (
    <TabScreen title={config.title} subtitle={config.description}>
      <View className="items-center gap-3 rounded-lg border border-dashed border-border-strong px-6 py-12">
        <Icon icon={config.icon} size={32} tone="muted" />
        <Text tone="muted" className="text-center">
          This screen is coming in a later update.
        </Text>
      </View>
    </TabScreen>
  );
}
