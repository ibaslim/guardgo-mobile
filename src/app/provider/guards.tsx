import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { InviteGuardSheet } from '@/components/provider/invite-guard-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListGroup, ListRow } from '@/components/ui/list';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import {
  deleteExpiredInvite,
  guardsErrorMessage,
  listProviderGuards,
  type InviteState,
  type ProviderGuard,
  type ProviderGuardsPage,
} from '@/services/provider-guards';
import { formatDate } from '@/utils/format';

const INVITE_LABELS: Record<InviteState, string> = {
  pending: 'Invite pending',
  expired: 'Invite expired',
  accepted: 'Joined',
};

// The email is the title until the guard has a name, so it is only repeated underneath once they do.
function describe(guard: ProviderGuard) {
  const parts = [
    guard.name ? guard.email : null,
    guard.invite === 'pending' && guard.inviteExpiresAt ? `Expires ${formatDate(guard.inviteExpiresAt)}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : undefined;
}

function badgeFor(guard: ProviderGuard) {
  if (guard.invite && guard.invite !== 'accepted') {
    return { label: INVITE_LABELS[guard.invite], kind: guard.invite === 'expired' ? ('danger' as const) : ('warning' as const) };
  }
  return { label: guard.status || 'unknown', kind: undefined };
}

/** The provider's guards: who was invited, who joined, and invites that ran out. */
export default function ProviderGuardsScreen() {
  const [data, setData] = useState<ProviderGuardsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await listProviderGuards(1));
      setError(null);
    } catch (failure) {
      setError(guardsErrorMessage(failure, "Couldn't load your guards. Pull down to try again."));
    }
  }, []);

  // First load. Later reloads (pull to refresh, after an invite) go through `load`.
  useEffect(() => {
    let active = true;
    listProviderGuards(1)
      .then((page) => active && setData(page))
      .catch((failure) => active && setError(guardsErrorMessage(failure, "Couldn't load your guards. Pull down to try again.")));
    return () => {
      active = false;
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listProviderGuards(data.page + 1);
      setData({ ...next, items: [...data.items, ...next.items] });
    } catch (failure) {
      setError(guardsErrorMessage(failure, "Couldn't load more guards."));
    } finally {
      setLoadingMore(false);
    }
  };

  const removeInvite = (guard: ProviderGuard) => {
    Alert.alert('Delete expired invite?', `${guard.email} can be invited again afterwards.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(guard.id);
          try {
            await deleteExpiredInvite(guard.id);
            setNotice('Expired invite deleted.');
            await load();
          } catch (failure) {
            setError(guardsErrorMessage(failure, "Couldn't delete the invite."));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const guards = data?.items ?? [];

  return (
    <TabScreen
      title="My guards"
      subtitle="Invite guards to your company and see who has joined."
      refreshing={refreshing}
      onRefresh={refresh}>
      <Button title="Invite a guard" icon={ICONS.mail} onPress={() => setInviteOpen(true)} />

      {notice ? (
        <Text tone="secondary" accessibilityLiveRegion="polite">
          {notice}
        </Text>
      ) : null}
      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {data === null && !error ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {data !== null && guards.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">No guards yet. Invite one with their email address.</Text>
        </View>
      ) : null}

      {guards.length > 0 ? (
        <ListGroup>
          {guards.map((guard) => (
            <ListRow
              key={guard.id}
              title={guard.name || guard.email}
              description={describe(guard)}
              value={
                <View className="items-end gap-1.5">
                  <Badge {...badgeFor(guard)} />
                  {guard.invite === 'expired' ? (
                    <Button
                      title="Delete"
                      variant="danger"
                      size="sm"
                      icon={ICONS.trash}
                      loading={busyId === guard.id}
                      onPress={() => removeInvite(guard)}
                    />
                  ) : null}
                </View>
              }
            />
          ))}
        </ListGroup>
      ) : null}

      {data && data.page < data.totalPages ? (
        <Button title="Load more" variant="secondary" loading={loadingMore} onPress={loadMore} />
      ) : null}

      <InviteGuardSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={(email) => {
          setInviteOpen(false);
          setNotice(`Invite sent to ${email}.`);
          load();
        }}
      />
    </TabScreen>
  );
}
