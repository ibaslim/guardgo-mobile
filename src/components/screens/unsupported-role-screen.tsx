import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';
import { roleLabelFor } from '@/utils/role';

/** Shown when the signed-in role has no area in the mobile app (see ROLE_AREAS). */
export function UnsupportedRoleScreen() {
  const session = useSession();
  const { logout, loggingOut } = useLogout();
  const role = session?.role ? roleLabelFor(session.role) : null;

  return (
    <Screen className="justify-center gap-6 p-6">
      <View className="gap-2">
        <Text variant="heading" accessibilityRole="header">
          Use the web app for this account
        </Text>
        <Text tone="secondary">
          {role
            ? `The mobile app doesn't support the ${role} role yet. Sign in on the GuardGo website instead.`
            : "We couldn't find a role for this account. Sign in on the GuardGo website instead."}
        </Text>
      </View>
      <Button title="Log out" variant="secondary" onPress={logout} loading={loggingOut} />
    </Screen>
  );
}
