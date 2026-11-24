import { Fragment, type ReactNode } from 'react';
import { View } from 'react-native';

import { RequestCard } from '@/components/requests/request-card';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { RequestDetail, RequestWave } from '@/types/request';
import { formatDate, formatMoney, formatTime } from '@/utils/format';
import { FULFILLMENT_LABELS, WAVE_LABELS } from '@/utils/request-status';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

const stamp = (date: Date | null) => (date ? `${formatDate(date)}, ${formatTime(date)}` : '');
const sentenceCase = (code: string) => {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const BILLING_LABELS: Record<string, string> = {
  per_request: 'One invoice for this request',
  weekly: 'Weekly, a week ahead',
};

type Fact = { label: string; value?: string | null };

/** Facts as quiet labels with the value leading. Rows with no value are left out, and so is a card with none. */
function Facts({ title, rows, lead, foot }: { title: string; rows: Fact[]; lead?: ReactNode; foot?: ReactNode }) {
  const shown = rows.filter((row) => row.value);
  if (shown.length === 0 && !lead) return null;

  return (
    <Card title={title}>
      {lead}
      {shown.map((row, index) => (
        <Fragment key={row.label}>
          {index > 0 || lead ? <View className="ml-4 h-px bg-border" /> : null}
          <View className="min-h-11 flex-row items-center justify-between gap-4 px-4 py-3">
            <Text variant="small" tone="muted" className="shrink-0">
              {row.label}
            </Text>
            <Text variant="label" className="min-w-0 flex-1 text-right" style={TABULAR}>
              {row.value}
            </Text>
          </View>
        </Fragment>
      ))}
      {foot}
    </Card>
  );
}

/**
 * What is going on with the request right now, in a sentence, from the fields the server sends for it:
 * its lock reason, the review note on a round that was sent back, and how many guards fit the job.
 */
function statusNote(request: RequestDetail, waves: RequestWave[] | undefined): { headline: string; detail?: string } | null {
  const returned = waves?.find((wave) => wave.status === 'returned');

  if (request.staffing === 'review_returned') {
    return { headline: 'Sent back for changes', detail: returned?.reviewNote || 'Update the request and send it again.' };
  }
  if (request.lockReason === 'review_pending') {
    return { headline: 'In review', detail: 'Guards see this request once it is approved.' };
  }
  if (request.status === 'cancelled') {
    return { headline: 'Cancelled', detail: request.endedAt ? stamp(request.endedAt) : undefined };
  }
  if (request.status === 'closed') {
    return { headline: 'Closed', detail: request.endedAt ? stamp(request.endedAt) : undefined };
  }
  if (request.staffing === 'expired') {
    return { headline: 'Offers ran out of time', detail: 'No one filled every position before the deadline.' };
  }
  if (request.staffing === 'filled') {
    return { headline: 'Every position is covered' };
  }
  if ((request.staffing === 'open' || request.staffing === 'partially_filled') && request.eligibleGuards !== null && request.candidateTotal) {
    return { headline: `${request.eligibleGuards} of ${request.candidateTotal} guards fit this job` };
  }
  return null;
}

function StatusNote({ note }: { note: { headline: string; detail?: string } }) {
  return (
    <View className="gap-0.5 rounded-xl border border-border bg-surface-muted px-4 py-3" accessibilityRole="summary">
      <Text variant="label">{note.headline}</Text>
      {note.detail ? (
        <Text variant="small" tone="secondary">
          {note.detail}
        </Text>
      ) : null}
    </View>
  );
}

type PriceLeadProps = {
  total: number | null;
  rate: number | null;
  hours: number | null;
  currency?: string;
};

/** The estimate as one figure, with the rate and hours it comes from beneath it. */
function PriceLead({ total, rate, hours, currency }: PriceLeadProps) {
  if (total === null) return null;
  const working = rate !== null && hours !== null ? `${formatMoney(rate, currency)} per hour × ${hours} hours` : null;

  return (
    <View className="gap-1 p-4">
      <Text variant="caption" tone="muted">
        Estimated total
      </Text>
      <Text variant="title" style={TABULAR}>
        {formatMoney(total, currency)}
      </Text>
      {working ? (
        <Text variant="small" tone="secondary" style={TABULAR}>
          {working}
        </Text>
      ) : null}
    </View>
  );
}

/** Offer rounds, newest first: a dot per round on a line, so the sequence reads at a glance. */
function RoundsTimeline({ waves }: { waves: RequestWave[] }) {
  return (
    <Card title="Offer rounds">
      <View className="px-4 py-3">
        {waves.map((wave, index) => {
          const active = wave.status === 'active';
          const last = index === waves.length - 1;
          const counts = [
            `${wave.offers} ${wave.offers === 1 ? 'offer' : 'offers'} sent`,
            wave.accepted > 0 ? `${wave.accepted} accepted` : null,
          ]
            .filter(Boolean)
            .join(', ');
          // A live round says when it closes; a sent-back one says why.
          const extra = active && wave.expiresAt ? `Closes ${stamp(wave.expiresAt)}` : wave.status === 'returned' ? wave.reviewNote : '';

          return (
            <View key={wave.id} className="flex-row gap-3">
              <View className="w-3 items-center">
                <View className={`mt-1.5 size-3 rounded-full ${active ? 'bg-primary' : 'bg-border-strong'}`} />
                {last ? null : <View className="w-px flex-1 bg-border" />}
              </View>
              <View className={`min-w-0 flex-1 gap-0.5 ${last ? '' : 'pb-4'}`}>
                <Text variant="label">{`Round ${wave.number}, ${WAVE_LABELS[wave.status] ?? sentenceCase(wave.status)}`}</Text>
                <Text variant="small" tone="muted" style={TABULAR}>
                  {counts}
                </Text>
                {extra ? (
                  <Text variant="small" tone="secondary" style={TABULAR}>
                    {extra}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export type RequestDetailsProps = {
  request: RequestDetail;
  /** Offer rounds, newest first. Leave out when the viewer isn't shown them. */
  waves?: RequestWave[];
  /**
   * Show the price and billing. Only the client who owns the request should see them: the server sends the
   * price breakdown (including what guards and providers are paid) to guards and providers too.
   */
  showPrice?: boolean;
};

/**
 * Everything about one request, read-only: the summary card on top, a line on where it stands, then job,
 * site, instructions, price and offer rounds. Shared by every role's request screen.
 */
export function RequestDetails({ request, waves, showPrice = false }: RequestDetailsProps) {
  const price = showPrice ? request.pricing : null;
  const currency = price?.currency;
  const note = statusNote(request, waves);
  const manyGuards = request.guardsRequired > 1;

  return (
    <View className="gap-4">
      <RequestCard request={request} />

      {note ? <StatusNote note={note} /> : null}

      <Facts
        title="Job"
        rows={[
          { label: 'Respond by', value: stamp(request.expiresAt) },
          { label: 'Open to', value: request.fulfillment ? FULFILLMENT_LABELS[request.fulfillment] : '' },
          { label: 'Guard type', value: sentenceCase(request.guardType) },
          { label: 'Posted', value: stamp(request.publishedAt) },
          { label: 'Created', value: request.createdAt ? formatDate(request.createdAt) : '' },
          { label: 'Revision', value: request.revision > 1 ? String(request.revision) : '' },
        ]}
      />

      <Facts
        title="Site"
        rows={[
          { label: 'Name', value: request.siteName },
          { label: 'Address', value: request.site.address },
          { label: 'Manager', value: request.site.contact },
          { label: 'Manager email', value: request.site.email },
        ]}
      />

      {request.instructions ? (
        <Card title="Special instructions">
          <View className="p-4">
            <Text variant="small">{request.instructions}</Text>
          </View>
        </Card>
      ) : null}

      {price ? (
        <Facts
          title="Price"
          lead={<PriceLead total={price.estimatedTotal} rate={price.hourlyRate} hours={price.estimatedHours} currency={currency} />}
          rows={[
            // Without a total there is no figure to lead with, so the parts stay as rows.
            ...(price.estimatedTotal === null
              ? [
                  { label: 'Hourly rate', value: price.hourlyRate !== null ? formatMoney(price.hourlyRate, currency) : '' },
                  { label: 'Estimated hours', value: price.estimatedHours !== null ? String(price.estimatedHours) : '' },
                ]
              : []),
            { label: 'Rate', value: price.hourlyRate !== null ? (price.weekend ? 'Weekend' : 'Standard') : '' },
            { label: 'Hours per guard', value: manyGuards && price.hoursEach !== null ? String(price.hoursEach) : '' },
            { label: 'Billing', value: BILLING_LABELS[request.billingCycle] ?? sentenceCase(request.billingCycle) },
            { label: 'Invoice', value: sentenceCase(request.invoiceStatus) },
            { label: 'Invoices sent to', value: request.invoiceEmail },
          ]}
          foot={
            request.invoiceNote ? (
              <View className="border-t border-border px-4 py-3">
                <Text variant="small" tone="muted">
                  {request.invoiceNote}
                </Text>
              </View>
            ) : null
          }
        />
      ) : null}

      {waves && waves.length > 0 ? <RoundsTimeline waves={waves} /> : null}
    </View>
  );
}
