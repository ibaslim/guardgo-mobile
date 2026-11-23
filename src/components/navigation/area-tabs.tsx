import { Tabs } from 'expo-router';

import { TabDock } from '@/components/navigation/tab-dock';
import { AREA_CONFIGS } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';
import type { RoleArea } from '@/types/roles';

/**
 * Tab bar for a role area, built from its tabs in constants/roles.ts. Use as the area's _layout.
 * The bar itself is the floating TabDock.
 */
export function AreaTabs({ area }: { area: RoleArea }) {
  // A guard owned by a service provider is paid through the provider, so it has no invoices of its own
  // (the web hides the page the same way).
  const providerOwned = useSession()?.tenant?.providerOwned ?? false;
  const tabs = AREA_CONFIGS[area].tabs.filter((tab) => !(area === 'guard' && providerOwned && tab.name === 'invoices'));

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabDock {...props} tabs={tabs} />}>
      {AREA_CONFIGS[area].tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.title, ...(tabs.includes(tab) ? null : { href: null }) }}
        />
      ))}
    </Tabs>
  );
}
