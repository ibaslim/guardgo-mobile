import { Fragment } from 'react';
import { View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { AnswerButtons, ReplyTimer } from '@/components/jobs/offer-answer';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { JOB_STATUS_LABELS } from '@/services/guard-jobs';
import type { GuardJob, JobAction } from '@/types/job';
import { formatMoney } from '@/utils/format';
import { awaitingAnswer, jobBadgeKind, replyDeadline, stamp } from '@/utils/job-status';

const TABULAR = { fontVariant: ['tabular-nums' as const] };
export type OfferPanelProps = {
  job: GuardJob;
};

/**
 * The viewer's own part in a request, at the top of its details: what it pays, the status of the offer,
 * when it has to be answered and how it went so far. The answers themselves sit in `OfferActionBar`.
 */
export function OfferPanel({ job }: OfferPanelProps) {
  const now = useNow(awaitingAnswer(job));
  const due = replyDeadline(job, now);
  const throughShifts = job.scope === 'shift_replacement' || (job.scope === 'request' && job.hasSchedule);
  const progress = [
    { label: 'Offered', value: stamp(job.offeredAt) },
    { label: 'Accepted', value: stamp(job.acceptedAt) },
    { label: 'Started', value: stamp(job.startedAt) },
    { label: 'Completed', value: stamp(job.completedAt) },
    { label: 'Positions you cover', value: job.forProvider && job.committed > 0 ? String(job.committed) : '' },
  ].filter((row) => row.value);

  return (
    <Card>
      <View className="gap-3 px-4 pb-4 pt-3.5">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="caption" tone="muted">
            {job.scope === 'shift_replacement' ? 'Your replacement offer' : 'Your offer'}
          </Text>
          <Badge label={JOB_STATUS_LABELS[job.status] ?? job.status} kind={jobBadgeKind(job.status)} />
        </View>

        {job.hourlyPay !== null ? (
          <View className="flex-row items-baseline gap-1.5">
            <Text variant="title" style={TABULAR}>
              {formatMoney(job.hourlyPay)}
            </Text>
            <Text variant="small" tone="secondary">
              per hour
            </Text>
          </View>
        ) : null}

        {due ? (
          <View className="flex-row items-center gap-2">
            <View className={`size-2 rounded-full ${due.urgent ? 'bg-warning' : 'bg-primary'}`} />
            <Text variant="small" tone={due.urgent ? 'default' : 'secondary'} style={TABULAR} className="min-w-0 flex-1">
              {due.text}
            </Text>
          </View>
        ) : null}

        {throughShifts && ['accepted', 'in_progress'].includes(job.status) ? (
          <Text variant="small" tone="secondary">
            This job runs on a schedule, so you start and finish it through its shifts.
          </Text>
        ) : null}

        {job.note ? (
          <View className="border-l-2 border-border-strong pl-3">
            <Text variant="small" tone="secondary">
              {job.note}
            </Text>
          </View>
        ) : null}
      </View>

      {progress.length > 0 ? (
        <View className="border-t border-border">
          {progress.map((row, index) => (
            <Fragment key={row.label}>
              {index > 0 ? <View className="ml-4 h-px bg-border" /> : null}
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
        </View>
      ) : null}
    </Card>
  );
}

export type OfferActionBarProps = {
  job: GuardJob;
  actions: JobAction[];
  busy: boolean;
  onAct: (action: JobAction) => void;
  /** Space to keep clear under the buttons, for the phone's navigation bar. */
  bottomInset: number;
};

/**
 * The answers to an offer, pinned under the request so they stay in reach while it is read: what it pays
 * and how long is left to answer, then the destructive answer on the left and the main one on the right,
 * where the thumb rests.
 */
export function OfferActionBar({ job, actions, busy, onAct, bottomInset }: OfferActionBarProps) {
  if (actions.length === 0) return null;
  const pay = job.hourlyPay !== null ? `${formatMoney(job.hourlyPay)}/hr` : null;

  return (
    <View
      className="gap-2 rounded-t-2xl border-t border-border bg-surface px-4 pt-2.5"
      style={{ paddingBottom: bottomInset + 8, boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.06)' }}>
      {awaitingAnswer(job) || pay ? (
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1">
            <ReplyTimer job={job} />
          </View>
          {pay ? (
            <Text variant="label" className="font-sans-semibold" style={TABULAR}>
              {pay}
            </Text>
          ) : null}
        </View>
      ) : null}
      <AnswerButtons actions={actions} busy={busy} onAct={onAct} />
    </View>
  );
}
