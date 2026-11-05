import { router } from 'expo-router';

import { AccountHeaderCard, ConfigurationsCard, ProfileCard } from '@/components/account/account-cards';
import { Button } from '@/components/ui/button';
import { TabScreen } from '@/components/ui/tab-screen';
import { ICONS } from '@/constants/icons';
import { useAccount } from '@/hooks/use-account';
import { useLogout } from '@/hooks/use-logout';
import { useSession } from '@/hooks/use-session';
import { accountKind } from '@/services/account';
import { accountName, profileRows } from '@/utils/account-profile';
import { roleLabelFor } from '@/utils/role';

/**
 * Account tab shared by every role area. The top card and the settings are the same for everyone;
 * the Profile card lists what fits the kind of account (guard, a provider's guard, service provider,
 * client). Pull down to reload.
 */
export function AccountScreen() {
  const session = useSession();
  const { account, photo, refreshing, refresh } = useAccount();
  const { logout, loggingOut } = useLogout();

  const kind = accountKind(session?.role, account);
  const username = session?.username ?? '';

  return (
    <TabScreen title="Account" hideHeader refreshing={refreshing} onRefresh={refresh}>
      <AccountHeaderCard
        name={accountName(kind, account, username)}
        role={roleLabelFor(session?.role)}
        status={session?.status}
        email={account?.user.email}
        photo={photo}
      />

      <ProfileCard rows={profileRows(kind, account, session)} />

      <ConfigurationsCard />

      <Button title="Log out" variant="danger" size="lg" icon={ICONS.logout} onPress={logout} loading={loggingOut} />

      {__DEV__ ? <Button title="Preview form components" variant="link" onPress={() => router.push('/form-preview')} /> : null}
    </TabScreen>
  );
}
