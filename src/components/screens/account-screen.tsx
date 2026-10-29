import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { ThemeSwitcher } from '@/components/ui/theme-switcher';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';
import { roleLabelFor } from '@/utils/role';

function formatDate(value: string | null) {
  if (!value) return 'Not verified';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

/** Account tab shared by every role area. */
export function AccountScreen() {
  const session = useSession();
  const { logout, loggingOut } = useLogout();

  return (
    <TabScreen title="Account">
      {session ? (
        <ListGroup title="Profile">
          <ListRow title="Username" value={session.username} />
          <ListRow title="Role" value={roleLabelFor(session.role)} />
          <ListRow title="Status" value={<Badge label={session.status} />} />
          <ListRow title="Verified" value={formatDate(session.verificationDate)} />
          {session.licenses.length > 0 ? (
            <ListRow
              title="Licenses"
              value={
                <View className="shrink flex-row flex-wrap justify-end gap-1">
                  {session.licenses.map((license) => (
                    <Badge key={license} label={license} kind="secondary" />
                  ))}
                </View>
              }
            />
          ) : null}
        </ListGroup>
      ) : null}

      <View className="gap-2">
        <Text variant="label" tone="muted" className="px-1">
          Appearance
        </Text>
        <ThemeSwitcher />
      </View>

      <Button title="Log out" variant="secondary" onPress={logout} loading={loggingOut} />
    </TabScreen>
  );
}
