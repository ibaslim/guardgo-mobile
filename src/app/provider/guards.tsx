import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { ActiveGuardCard } from '@/components/provider/active-guard-card';
import { DeactivateGuardSheet } from '@/components/provider/deactivate-guard-sheet';
import { GuardReviewCard } from '@/components/provider/guard-review-card';
import { InviteGuardSheet } from '@/components/provider/invite-guard-sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListGroup, ListRow } from '@/components/ui/list';
import { SearchBar } from '@/components/ui/search-bar';
import { TabScreen } from '@/components/ui/tab-screen';
import { Tabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { useGuardSearch } from '@/hooks/use-guard-search';
import { approveGuard, deleteExpiredInvite, guardsErrorMessage, listProviderGuards } from '@/services/provider-guards';
import { toast } from '@/services/toast';
import type { GuardsQuery, InviteState, ProviderGuard, ProviderGuardsPage } from '@/types/provider-guard';
import { formatDate } from '@/utils/format';

const INVITE_LABELS: Record<InviteState, string> = {
  pending: 'Invite pending',
  expired: 'Invite expired',
  accepted: 'Joined',
};

type Filter = 'active' | 'pending' | 'joined' | 'review' | 'inactive' | 'banned';

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'joined', label: 'Joined' },
  { value: 'review', label: 'In review' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'banned', label: 'Banned' },
];

const EMPTY_FILTERED: Record<Filter, string> = {
  active: 'No active guards yet. Approved guards show up here.',
  pending: 'No guards are waiting to verify. Invite a guard with their email address.',
  joined: 'No guards are setting up their profile right now.',
  review: 'No guards are waiting for approval.',
  inactive: 'No inactive guards.',
  banned: 'No banned guards.',
};

/** The one `status` each tab asks the server for, so a long list is paged by status and never loaded whole. */
const QUERIES: Record<Filter, GuardsQuery> = {
  active: { status: 'active' },
  pending: { status: 'pending_verification' },
  joined: { status: 'onboarding' },
  review: { status: 'pending_activation' },
  inactive: { status: 'inactive' },
  banned: { status: 'banned' },
};

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

const LOAD_ERROR = "Couldn't load your guards. Pull down to try again.";

/** The provider's guards: who was invited, who joined, who is active, and invites that ran out. */
export default function ProviderGuardsScreen() {
  // One page list per tab, each fetched from the server by status when the tab is first opened.
  const [pages, setPages] = useState<Partial<Record<Filter, ProviderGuardsPage>>>({});
  const [reviewTotal, setReviewTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('active');
  const [query, setQuery] = useState('');
  const search = useGuardSearch(query);
  // While the search box holds text, one list of matches replaces the tabs.
  const showTabs = !search.searching;
  const [deactivating, setDeactivating] = useState<ProviderGuard | null>(null);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  const data = pages[filter] ?? null;

  /** Fetches the first page of one tab, and the review count with it. */
  const fetchFirst = useCallback(async (which: Filter) => {
    const [page, review] = await Promise.all([
      listProviderGuards(1, QUERIES[which]),
      which === 'review' ? null : listProviderGuards(1, { ...QUERIES.review, rows: 1 }),
    ]);
    return { which, page, reviewTotal: (review ?? page).totalItems };
  }, []);

  const apply = useCallback((result: { which: Filter; page: ProviderGuardsPage; reviewTotal: number }) => {
    setPages((current) => ({ ...current, [result.which]: result.page }));
    setReviewTotal(result.reviewTotal);
    setError(null);
  }, []);

  const load = useCallback(
    (which: Filter) =>
      fetchFirst(which).then(apply, (failure) => setError(guardsErrorMessage(failure, LOAD_ERROR))),
    [fetchFirst, apply]
  );

  // Opening a tab for the first time fetches it. Tabs already loaded keep their pages.
  const loaded = Boolean(pages[filter]);
  useEffect(() => {
    if (loaded) return;
    let active = true;
    fetchFirst(filter)
      .then((result) => active && apply(result))
      .catch((failure) => active && setError(guardsErrorMessage(failure, LOAD_ERROR)));
    return () => {
      active = false;
    };
  }, [filter, loaded, fetchFirst, apply]);

  // Coming back from a guard's details: show what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setPages({});
    }, [])
  );

  const refresh = async () => {
    setRefreshing(true);
    setPages({});
    await load(filter);
    setRefreshing(false);
  };

  const loadMore = useCallback(async () => {
    if (!data || loadingMore || data.page >= data.totalPages) return;
    setLoadingMore(true);
    try {
      const next = await listProviderGuards(data.page + 1, QUERIES[filter]);
      setPages((current) => ({ ...current, [filter]: { ...next, items: [...data.items, ...next.items] } }));
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't load more guards."));
    } finally {
      setLoadingMore(false);
    }
  }, [data, filter, loadingMore]);

  /** What the confirmation dialog is asking about. Kept after it closes so the text doesn't blank during the fade. */
  const [ask, setAsk] = useState<{ kind: 'approve' | 'delete'; guard: ProviderGuard } | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const question = (kind: 'approve' | 'delete', guard: ProviderGuard) => {
    setAsk({ kind, guard });
    setAskOpen(true);
  };

  const reloadAll = async () => {
    setPages({});
    await load(filter);
  };

  const approve = async (guard: ProviderGuard) => {
    const who = guard.name || guard.email;
    setBusyId(guard.id);
    try {
      await approveGuard(guard.id);
      toast.success(`${who} approved.`);
      await reloadAll();
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
      await reloadAll();
    } catch (failure) {
      toast.failure(guardsErrorMessage(failure, "Couldn't delete the invite."));
    } finally {
      setBusyId(null);
    }
  };

  // Only the review tab shows a count: those are the guards waiting on an admin.
  const filters = FILTERS.map((item) => (item.value === 'review' ? { ...item, count: reviewTotal } : item));

  const guards = data?.items ?? [];

  return (
    <TabScreen
      title="Guards"
      hideHeader
      refreshing={refreshing}
      onRefresh={refresh}
      onEndReached={showTabs ? loadMore : search.loadMore}>
      <View className="h-2" />
      <View className="flex-row items-center gap-1.5">
        <View className="min-w-0 flex-1">
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search guards" />
        </View>
        <Button title="Invite" size="md" pill onPress={() => setInviteOpen(true)} />
      </View>

      {showTabs ? <Tabs scrollable bleed={20} options={filters} value={filter} onChange={setFilter} /> : null}

      {showTabs && error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {showTabs && data === null && !error ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {showTabs && data !== null && guards.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">
            {EMPTY_FILTERED[filter]}
          </Text>
        </View>
      ) : null}

      {showTabs && guards.length > 0 && filter === 'review' ? (
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

      {showTabs && guards.length > 0 && filter === 'active' ? (
        <View className="gap-3">
          {guards.map((guard) => (
            <ActiveGuardCard
              key={guard.id}
              id={guard.id}
              title={showsName(guard) ? guard.name : guard.email}
              email={showsName(guard) ? guard.email : undefined}
              phone={guard.phone}
              busy={busyId === guard.id}
              onDetails={() => router.push({ pathname: '/review-guard/[id]', params: { id: guard.id } })}
              onDeactivate={() => {
                setDeactivating(guard);
                setDeactivateOpen(true);
              }}
            />
          ))}
        </View>
      ) : null}

      {showTabs && guards.length > 0 && filter !== 'review' && filter !== 'active' ? (
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

      {!showTabs && search.error ? (
        <Text tone="danger" accessibilityRole="alert">
          {search.error}
        </Text>
      ) : null}

      {!showTabs && search.data === null && !search.error ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {!showTabs && search.data !== null && search.data.items.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">{`No guards match "${query.trim()}". Search by name or email.`}</Text>
        </View>
      ) : null}

      {!showTabs && search.data !== null && search.data.items.length > 0 ? (
        <ListGroup>
          {search.data.items.map((guard) => (
            <ListRow
              key={guard.id}
              title={showsName(guard) ? guard.name : guard.email}
              description={describe(guard)}
              value={<Badge {...badgeFor(guard)} />}
              onPress={() => router.push({ pathname: '/review-guard/[id]', params: { id: guard.id } })}
            />
          ))}
        </ListGroup>
      ) : null}

      {(showTabs ? loadingMore : search.loadingMore) ? (
        <View className="items-center py-4" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
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

      <DeactivateGuardSheet
        visible={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        guardId={deactivating?.id ?? ''}
        guardName={deactivating ? deactivating.name || deactivating.email : ''}
        onDeactivated={async () => {
          setDeactivateOpen(false);
          toast.success(`${deactivating?.name || deactivating?.email || 'Guard'} deactivated.`);
          await reloadAll();
        }}
      />

      <InviteGuardSheet
        visible={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={async (email) => {
          setInviteOpen(false);
          // Switch to Pending so a tab can't hide the new invite, then fetch the list from the server.
          setFilter('pending');
          toast.success(`Invite sent to ${email}.`);
          await refresh();
        }}
      />
    </TabScreen>
  );
}
