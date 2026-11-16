import { Pressable, View } from 'react-native';

import { MetricLedger, type DashboardMetricProps } from '@/components/dashboard/dashboard-metric';
import { Badge } from '@/components/ui/badge';
import { Entrance } from '@/components/ui/entrance';
import { Icon } from '@/components/ui/icon';
import { TabScreen } from '@/components/ui/tab-screen';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { BadgeKind } from '@/types/ui';

/** How urgent a row is. It colours the rail on the row's left edge. */
export type RowTone = 'neutral' | 'success' | 'warning' | 'danger';

export type DashboardRowView = {
  key: string;
  title: string;
  /** Where, or who: the second line. */
  subtitle: string;
  /** When, or how many: the muted third line. */
  meta?: string;
  tone?: RowTone;
  /** A status label shown on the right instead of the chevron. */
  badge?: string;
  onPress: () => void;
};

export type DashboardSectionView = {
  key: string;
  title: string;
  /** Shown instead of the rows when there are none. */
  empty: string;
  action: { label: string; onPress: () => void };
  rows: DashboardRowView[];
};

/** What needs the user's action right now: a total, and what it is made of. */
export type DashboardAttention = { count: number; items: string[] };

export type DashboardView = {
  attention: DashboardAttention;
  metrics: DashboardMetricProps[];
  sections: DashboardSectionView[];
};

export type DashboardScreenProps = {
  view: DashboardView | null;
  error: string | null;
  refreshing: boolean;
  onRefresh: () => void;
};

const RAILS: Record<RowTone, string> = {
  neutral: 'bg-border-strong',
  success: 'bg-badge-success',
  warning: 'bg-badge-warning',
  danger: 'bg-badge-danger',
};

/** A row's tone from a status label, the same way badges pick their colour. */
export function toneOf(kind: BadgeKind): RowTone {
  return kind === 'success' || kind === 'warning' || kind === 'danger' ? kind : 'neutral';
}

/** The one loud thing on the screen: how many items want action, and which. Calm when there are none. */
function AttentionPanel({ count, items }: DashboardAttention) {
  if (count === 0) {
    return (
      <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-2 py-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-badge-success">
          <Icon icon={ICONS.check} size={20} colorVar="--color-on-primary" />
        </View>
        <View className="min-w-0 flex-1">
          <Text variant="heading">All clear</Text>
          <Text variant="small" tone="muted">
            Nothing needs your action right now.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View accessible accessibilityLabel={`Needs attention: ${count}. ${items.join(', ')}`} className="overflow-hidden rounded-2xl bg-primary">
      <View className="flex-row items-center gap-2 px-2 pt-2">
        <View className="h-2 w-2 rounded-full bg-on-primary" />
        <Text variant="label" tone="inherit" className="text-on-primary opacity-90">
          Needs your attention
        </Text>
      </View>
      <View className="flex-row items-center gap-3 px-2 pb-2 pt-1">
        {/* Sized with `style`: a size class would lose to the variant's own size. */}
        <Text tone="inherit" numberOfLines={1} style={{ fontSize: 64, lineHeight: 72 }} className="font-sans-bold text-on-primary">
          {count}
        </Text>
        <View className="w-px self-stretch bg-on-primary opacity-30" />
        <View className="min-w-0 flex-1 gap-1">
          {items.map((item) => (
            <Text key={item} variant="body" tone="inherit" className="font-sans-medium text-on-primary">
              {item}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}

function Row({ row, first }: { row: DashboardRowView; first: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${row.title}. ${row.subtitle}. ${row.meta ?? ''}`}
      onPress={row.onPress}
      className={`flex-row items-center gap-3 py-2 pl-2.5 pr-2 active:bg-surface-muted ${first ? '' : 'border-t border-border'}`}>
      <View className={`absolute bottom-2 left-0 top-2 w-1 rounded-r-full ${RAILS[row.tone ?? 'neutral']}`} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text variant="label" numberOfLines={1} className="font-sans-semibold text-base">
          {row.title}
        </Text>
        <Text variant="small" tone="secondary" numberOfLines={1}>
          {row.subtitle}
        </Text>
        {row.meta ? (
          <Text variant="caption" tone="muted" numberOfLines={2}>
            {row.meta}
          </Text>
        ) : null}
      </View>
      {row.badge ? <Badge label={row.badge} /> : <Icon icon={ICONS.chevronRight} size={16} tone="muted" />}
    </Pressable>
  );
}

function Section({ title, empty, action, rows }: Omit<DashboardSectionView, 'key'>) {
  return (
    <View className="gap-2.5">
      <View className="flex-row items-center gap-2 px-1">
        <Text variant="heading" accessibilityRole="header" numberOfLines={2} className="min-w-0 flex-shrink">
          {title}
        </Text>
        {rows.length ? (
          <View className="min-w-6 items-center rounded-full bg-primary-soft px-2 py-0.5">
            <Text variant="caption" tone="inherit" className="font-sans-semibold text-primary-soft-content">
              {rows.length}
            </Text>
          </View>
        ) : null}
        <View className="flex-1" />
        <Text variant="label" tone="link" accessibilityRole="link" numberOfLines={1} className="shrink-0" onPress={action.onPress}>
          {action.label}
        </Text>
      </View>
      {rows.length ? (
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          {rows.map((row, index) => (
            <Row key={row.key} row={row} first={index === 0} />
          ))}
        </View>
      ) : (
        <View className="rounded-2xl border border-dashed border-border-strong px-4 py-6">
          <Text tone="muted">{empty}</Text>
        </View>
      )}
    </View>
  );
}

/**
 * Home tab of any role: what needs action right now, the figures behind it, then lists of what to
 * open next. It has no title block, so the attention panel is the first thing on screen. Each role
 * builds its `view` from its own dashboard data.
 */
export function DashboardScreen({ view, error, refreshing, onRefresh }: DashboardScreenProps) {
  return (
    <TabScreen title="Home" hideHeader refreshing={refreshing} onRefresh={onRefresh}>
      <View className="h-2" />
      {error ? (
        <View className="rounded-2xl border border-danger-soft-content bg-danger-soft p-4" accessibilityRole="alert">
          <Text tone="inherit" className="text-danger-soft-content">
            {error}
          </Text>
        </View>
      ) : null}

      {view ? (
        <>
          <Entrance step={0}>
            <AttentionPanel {...view.attention} />
          </Entrance>
          <Entrance step={1}>
            <MetricLedger metrics={view.metrics} />
          </Entrance>
          {view.sections.map((section, index) => (
            <Entrance key={section.key} step={index + 2}>
              <Section title={section.title} empty={section.empty} action={section.action} rows={section.rows} />
            </Entrance>
          ))}
        </>
      ) : error ? null : (
        <Text tone="muted">Loading your dashboard…</Text>
      )}
    </TabScreen>
  );
}
