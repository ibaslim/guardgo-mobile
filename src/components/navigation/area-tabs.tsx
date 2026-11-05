import { Tabs } from 'expo-router';

import { TabDock } from '@/components/navigation/tab-dock';
import { AREA_CONFIGS } from '@/constants/roles';
import type { RoleArea } from '@/types/roles';

/**
 * Tab bar for a role area, built from its tabs in constants/roles.ts. Use as the area's _layout.
 * The bar itself is the floating TabDock.
 */
export function AreaTabs({ area }: { area: RoleArea }) {
  const { tabs } = AREA_CONFIGS[area];

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabDock {...props} tabs={tabs} />}>
      {tabs.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
