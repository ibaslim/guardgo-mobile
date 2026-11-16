import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { CoverageStrip } from '@/components/requests/coverage-strip';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import type { RequestSummary } from '@/services/requests';
import { coverageText, formatWindow, STAFFING_LABELS, STATUS_KINDS, STATUS_LABELS } from '@/utils/request-status';

export type RequestCardProps = {
  request: RequestSummary;
  /** Opens the request. Leave out for a card that only shows. */
  onPress?: () => void;
  /** Shown under the card's content, split off by a line, e.g. a row of actions (see `GuardReviewCard`). */
  footer?: ReactNode;
};

/**
 * A job request in a list: what it is and where, when it runs, and how many of its guard positions
 * are covered. Takes the same summary for a client, a guard and a service provider, so every list looks alike.
 */
export function RequestCard({ request, onPress, footer }: RequestCardProps) {
  const place = [request.siteName, request.city].filter(Boolean).join(', ');
  const staffing = request.staffing && request.status !== 'draft' ? STAFFING_LABELS[request.staffing] : null;

  const body = (
    <View className="gap-3.5 px-4 py-3.5">
      <View className="flex-row items-start gap-3">
        <Text variant="label" numberOfLines={2} className="min-w-0 flex-1 font-sans-semibold">
          {request.title}
        </Text>
        <Badge label={STATUS_LABELS[request.status]} kind={STATUS_KINDS[request.status]} />
      </View>

      <View className="gap-1.5">
        <View className="flex-row items-center gap-2">
          <Icon icon={ICONS.location} size={14} tone="muted" />
          <Text variant="small" tone="secondary" numberOfLines={1} className="min-w-0 flex-1">
            {place || 'No site yet'}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Icon icon={ICONS.calendar} size={14} tone="muted" />
          <Text variant="small" tone="secondary" numberOfLines={2} className="min-w-0 flex-1">
            {formatWindow(request.start, request.end)}
          </Text>
        </View>
      </View>

      <View className="gap-1.5">
        <CoverageStrip filled={request.filled} required={request.guardsRequired} />
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="caption" tone="muted">
            {coverageText(request.filled, request.guardsRequired)}
          </Text>
          {staffing ? (
            <Text variant="caption" tone="muted" numberOfLines={1} className="shrink">
              {staffing}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${request.title}, ${STATUS_LABELS[request.status]}`}
          onPress={onPress}
          className="active:bg-surface-muted">
          {body}
        </Pressable>
      ) : (
        body
      )}
      {footer ? <View className="border-t border-border">{footer}</View> : null}
    </View>
  );
}
