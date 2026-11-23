import { useState, type ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { RequestCard } from '@/components/requests/request-card';
import { Button } from '@/components/ui/button';
import { FilterPills } from '@/components/ui/filter-pills';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { ICONS } from '@/constants/icons';
import { useRequests } from '@/hooks/use-requests';
import type { RequestGroup, RequestSummary } from '@/types/request';
import { inGroup } from '@/utils/request-status';

const GROUPS: readonly { value: RequestGroup; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'draft', label: 'Drafts' },
  { value: 'done', label: 'Done' },
];

export type RequestsScreenProps = {
  title: string;
  subtitle?: string;
  /** Opens one request. */
  onOpen: (request: RequestSummary) => void;
  /** Above the filters, e.g. a "New request" button for a client. */
  action?: ReactNode;
  /** Shown above the action and the list, e.g. a banner that needs the user right now. */
  banner?: ReactNode;
  /** What to say when a group has nothing in it, per group. */
  empty?: Partial<Record<RequestGroup, string>>;
};

const DEFAULT_EMPTY: Record<RequestGroup, string> = {
  live: 'Nothing is running right now.',
  draft: 'No drafts. Unfinished requests are kept here.',
  done: 'Cancelled and closed requests will show here.',
};

/**
 * The list of requests with a search box and Live, Drafts and Done filters. A client, a guard and a
 * service provider all use it; each passes its own title, what a tap opens and an optional action.
 */
export function RequestsScreen({ title, subtitle, onOpen, action, banner, empty }: RequestsScreenProps) {
  const [keyword, setKeyword] = useState('');
  const [group, setGroup] = useState<RequestGroup>('live');
  const { items, loading, hasMore, error, refreshing, loadingMore, refresh, loadMore } = useRequests(keyword);

  const shown = items.filter((request) => inGroup(request, group));
  const emptyText = keyword.trim() ? 'No requests match your search.' : { ...DEFAULT_EMPTY, ...empty }[group];

  return (
    <TabScreen title={title} subtitle={subtitle} refreshing={refreshing} onRefresh={refresh}>
      {banner}
      {action}

      <TextField
        label="Search"
        icon={ICONS.search}
        value={keyword}
        onChangeText={setKeyword}
        placeholder="Search by title or site"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <FilterPills options={GROUPS} value={group} onChange={setGroup} />

      {error ? (
        <Text tone="danger" accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <View className="items-center py-10" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
        </View>
      ) : null}

      {!loading && !error && shown.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-surface-muted p-5">
          <Text tone="secondary">{emptyText}</Text>
        </View>
      ) : null}

      {shown.length > 0 ? (
        <View className="gap-3">
          {shown.map((request) => (
            <RequestCard key={request.id} request={request} onPress={() => onOpen(request)} />
          ))}
        </View>
      ) : null}

      {hasMore ? <Button title="Load more" variant="secondary" loading={loadingMore} onPress={loadMore} /> : null}
    </TabScreen>
  );
}
