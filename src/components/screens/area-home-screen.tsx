import { router, type Href } from 'expo-router';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { ListGroup, ListRow } from '@/components/ui/list';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { AREA_CONFIGS, AREA_HOME } from '@/constants/roles';
import { useSession } from '@/hooks/use-session';
import type { RoleArea } from '@/types/roles';
import { roleLabelFor } from '@/utils/role';

/** Home tab of a role area: who is signed in, the role's main item, and links to the other tabs. */
export function AreaHomeScreen({ area }: { area: RoleArea }) {
  const session = useSession();
  const config = AREA_CONFIGS[area];
  const [homeTab, ...otherTabs] = config.tabs;
  const sectionTabs = otherTabs.filter((tab) => tab.name !== 'account');

  // Builds in step by step when the user arrives after sign-in: name, role, main item, shortcuts.
  const header = (
    <View className="gap-2">
      <Entrance step={0}>
        <Text variant="title" accessibilityRole="header" numberOfLines={1}>
          {session?.username ?? 'Welcome'}
        </Text>
      </Entrance>
      <Entrance step={1}>
        <View className="flex-row items-center gap-2">
          <Text tone="secondary">{session ? roleLabelFor(session.role) : config.label}</Text>
          {session?.status ? <Badge label={session.status} /> : null}
        </View>
      </Entrance>
    </View>
  );

  return (
    <TabScreen title={homeTab.title} header={header}>
      <Entrance step={2}>
        <View className="gap-3 rounded-[14px] bg-primary-soft p-5">
          <View className="flex-row items-center gap-2">
            <Icon icon={homeTab.icon} size={18} tone="primary-soft" />
            <Text variant="label" tone="inherit" className="text-primary-soft-content">
              {config.focus.title}
            </Text>
          </View>
          <Text tone="inherit" className="text-primary-soft-content">
            {config.focus.empty}
          </Text>
        </View>
      </Entrance>

      <Entrance step={3}>
        <ListGroup>
          {sectionTabs.map((tab) => (
            <ListRow
              key={tab.name}
              title={tab.title}
              description={tab.description}
              icon={tab.icon}
              onPress={() => router.navigate(`${AREA_HOME[area]}/${tab.name}` as Href)}
            />
          ))}
        </ListGroup>
      </Entrance>
    </TabScreen>
  );
}
