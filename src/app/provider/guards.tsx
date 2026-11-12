import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { GuardReviewCard } from '@/components/provider/guard-review-card';
import { InviteGuardSheet } from '@/components/provider/invite-guard-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FilterPills } from '@/components/ui/filter-pills';
import { ListGroup, ListRow } from '@/components/ui/list';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import {
  approveGuard,
  deleteExpiredInvite,
  guardsErrorMessage,
  listProviderGuards,
  type InviteState,
  type ProviderGuard,
  type ProviderGuardsPage,
} from '@/services/provider-guards';
import { toast } from '@/services/toast';
import { formatDate } from '@/utils/format';

const INVITE_LABELS: Record<InviteState, string> = {
  pending: 'Invite pending',
  expired: 'Invite expired',
  accepted: 'Joined',
};

type Filter = 'pending' | 'joined' | 'review';

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'joined', label: 'Joined' },
  { value: 'review', label: 'In review' },
];

const EMPTY_FILTERED: Record<Filter, string> = {
  pending: 'No pending invites. Invite a guard with their email address.',
  joined: 'No guards have joined yet.',
  review: 'No guards are waiting for approval.',
};

/** A guard who finished onboarding and waits for an admin to approve their profile. */
const inReview = (guard: ProviderGuard) => guard.status.replace(/_/g, ' ') === 'pending activation';

/**
 * Pending: invites not accepted yet, including expired ones (so they can be deleted).
 * In review: waiting for approval. Joined: everyone else who accepted, including guards still onboarding.
 */
function matches(guard: ProviderGuard, filter: Filter) {
  const invited = guard.invite === 'pending' || guard.invite === 'expired';
  if (filter === 'pending') return invited;
  if (invited) return false;
  return filter === 'review' ? inReview(guard) : !inReview(guard);
}

// A guard who is still onboarding is shown by email only: their name is not final yet.
const showsName = (guard: ProviderGuard) => Boolean(guard.name) && guard.status !== 'onboarding';

// The email is the title until the guard has a name, so it is only repeated underneath once they do.
function describe(guard: ProviderGuard) {
  const parts = [
    showsName(guard) ? guard.email : null,
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
  const [filter, setFilter] = useState<Filter>('pending');

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

  // Coming back from a guard's details: show what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      load();
    }, [load])
  );

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
      toast.failure(guardsErrorMessage(failure, "Couldn't load more guards."));
    } finally {
      setLoadingMore(false);
    }
  };

  /** What the confirmation dialog is asking about. Kept after it closes so the text doesn't blank during the fade. */
  const [ask, setAsk] = useState<{ kind: 'approve' | 'delete'; guard: ProviderGuard } | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const question = (kind: 'approve' | 'delete', guard: ProviderGuard) => {
    setAsk({ kind, guard });
    setAskOpen(true);
  };

  const approve = async (guard: ProviderGuard) => {
    const who = guard.name || guard.email;
    setBusyId(guard.id);
    try {
      await approveGuard(guard.id);
      toast.success(`${who} approved.`);
      await load();
    } catch (failure) {
      // The server refuses until the work area and weekly availability are set; its message says which.
      toast.failure(guardsErrorMessage(failure, "Couldn't approve this guard."));
    } finally {
      setBusyId(null);
    }
  };

  const removeInvite = async (guard: ProviderGuard) => {
    setBusyId(guard.id);
    try {
      await deleteExpiredInvite(guard.id);
      toast.success('Expired invite deleted.');
      await load();
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't delete the invite."));
    } finally {
      setBusyId(null);
    }
  };

  // Only the review pill shows a count: those are the guards waiting on an admin.
  const reviewCount = (data?.items ?? []).filter((guard) => matches(guard, 'review')).length;
  const filters = FILTERS.map((item) => (item.value === 'review' ? { ...item, count: reviewCount } : item));

  const guards = (data?.items ?? []).filter((guard) => matches(guard, filter));

  return (
    <TabScreen
      title="My guards"
      subtitle="Invite guards to your company"
      refreshing={refreshing}
      onRefresh={refresh}>
      <Button title="Invite a guard" icon={ICONS.mail} onPress={() => setInviteOpen(true)} />

      <FilterPills options={filters} value={filter} onChange={setFilter} />

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
          <Text tone="secondary">
            {EMPTY_FILTERED[filter]}
          </Text>
        </View>
      ) : null}

      {guards.length > 0 && filter === 'review' ? (
        <View className="gap-3">
          {guards.map((guard) => (
            <GuardReviewCard
              key={guard.id}
              title={showsName(guard) ? guard.name : guard.email}
              email={showsName(guard) ? guard.email : undefined}
              busy={busyId === guard.id}
              onDetails={() => router.push({ pathname: '/review-guard/[id]', params: { id: guard.id } })}
              onApprove={() => question('approve', guard)}
            />
          ))}
        </View>
      ) : null}

      {guards.length > 0 && filter !== 'review' ? (
        <ListGroup>
          {guards.map((guard) => (
            <ListRow
              key={guard.id}
              title={showsName(guard) ? guard.name : guard.email}
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
                      onPress={() => question('delete', guard)}
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

      <ConfirmDialog
        visible={askOpen}
        onClose={() => setAskOpen(false)}
        tone={ask?.kind === 'delete' ? 'danger' : 'primary'}
        title={ask?.kind === 'delete' ? 'Delete expired invite?' : 'Approve guard?'}
        message={
          ask?.kind === 'delete'
            ? `${ask.guard.email} can be invited again afterwards.`
            : ask
              ? `${ask.guard.name || ask.guard.email} will become active and can be rostered on shifts.`
              : undefined
        }
        confirmLabel={ask?.kind === 'delete' ? 'Delete' : 'Approve'}
        onConfirm={() => (ask ? (ask.kind === 'delete' ? removeInvite(ask.guard) : approve(ask.guard)) : undefined)}
      />

      <InviteGuardSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={async (email) => {
          setInviteOpen(false);
          // Switch to Pending so a filter can't hide the new invite, then fetch the list from the server.
          setFilter('pending');
          toast.success(`Invite sent to ${email}.`);
          await refresh();
        }}
      />
    </TabScreen>
  );
}
