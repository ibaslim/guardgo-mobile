import { NativeTabs } from 'expo-router/native-tabs';
import { useCSSVariable } from 'uniwind';

import { AREA_CONFIGS } from '@/constants/roles';
import type { RoleArea } from '@/types/roles';

const color = (value: string | number | undefined) => (typeof value === 'string' ? value : undefined);

/** Native tab bar for a role area, built from its tabs in constants/roles.ts. Use as the area's _layout. */
export function AreaTabs({ area }: { area: RoleArea }) {
  const [primary, surface] = useCSSVariable(['--color-primary', '--color-surface']);

  return (
    <NativeTabs
      tintColor={color(primary)}
      backgroundColor={color(surface)}
      labelStyle={{ fontFamily: 'Inter_500Medium' }}>
      {AREA_CONFIGS[area].tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <NativeTabs.Trigger.Label>{tab.title}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={tab.icon.sf} md={tab.icon.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
