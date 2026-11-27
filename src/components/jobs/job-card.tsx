import { ActivityIndicator, Pressable, View } from 'react-native';

import { ReplyTimer } from '@/components/jobs/offer-answer';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { JOB_STATUS_LABELS, jobActions } from '@/services/guard-jobs';
import type { GuardJob, JobAction } from '@/types/job';
import { formatMoney } from '@/utils/format';
import { jobBadgeKind, stamp } from '@/utils/job-status';
import { formatWindow } from '@/utils/request-status';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

export type JobCardProps = {
  job: GuardJob;
  /** True while this job's answer is being sent: the buttons wait. */
  busy?: boolean;
  onOpen: () => void;
  /** Answers the job. Not needed for a read-only card. */
  onAct?: (action: JobAction) => void;
  /**
   * For a client looking at who was offered its work: no answer buttons and no pay (that is what the guard
   * earns), and the line under the site names who the job went to.
   */
  readOnly?: boolean;
};

/** The quiet line under the details: why an offer has no deadline, or when a lapsed one was due. */
function whenLine(job: GuardJob) {
  if (job.status === 'expired') return job.dueAt ? `No reply by ${stamp(job.dueAt)}` : 'Not answered in time';
  if (job.status === 'offered' || job.status === 'reconfirmation_required') return job.dueAt ? '' : 'No reply deadline';
  return '';
}

/**
 * A job offered to, or taken by, the guard. Tapping it opens the details. An offer, or a job to
 * reconfirm, also shows the time left to answer running down and its pay, with Details and Accept in a
 * footer. Declining asks for a reason, so it is done from the details.
 */
export function JobCard({ job, busy = false, onOpen, onAct, readOnly = false }: JobCardProps) {
  const open = job.status === 'offered' || job.status === 'reconfirmation_required';
  // An offer or a reconfirmation: the timer and pay row, and the answers.
  const answering = !readOnly && open;
  // Only the main answer is on the card; declining (which asks for a reason) happens in the details.
  const accept = answering ? jobActions(job).find((action) => action.kind === 'primary') : undefined;
  const pay = !readOnly && job.hourlyPay !== null ? `${formatMoney(job.hourlyPay)}/hr` : null;
  const who = readOnly ? job.assignee || (job.forProvider ? 'Service provider' : 'Guard') : null;
  // An offer shows its pay next to the timer; any other job keeps it in the quiet line.
  const meta = [who, answering ? null : pay, whenLine(job)].filter(Boolean).join(' · ');
  const status = JOB_STATUS_LABELS[job.status] ?? job.status;

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${job.title}. ${status}. ${job.siteName}`}
        onPress={onOpen}
        className="active:bg-surface-muted">
        <View className="gap-2 px-4 pb-3 pt-3.5">
          <View className="flex-row items-start gap-3">
            <Text variant="label" numberOfLines={2} className="min-w-0 flex-1 font-sans-semibold text-base">
              {job.title}
            </Text>
            <Badge label={status} kind={jobBadgeKind(job.status)} />
          </View>

          <View className="flex-row items-center gap-1.5">
            <Icon icon={ICONS.location} size={14} tone="muted" />
            <Text variant="small" tone="secondary" numberOfLines={1} className="min-w-0 flex-1">
              {job.siteName}
            </Text>
          </View>

          {job.start ? (
            <View className="flex-row items-center gap-1.5">
              <Icon icon={ICONS.clock} size={14} tone="muted" />
              <Text variant="small" tone="secondary" numberOfLines={2} style={TABULAR} className="min-w-0 flex-1">
                {formatWindow(job.start, job.end)}
              </Text>
            </View>
          ) : null}

          {answering && job.dueAt ? (
            <View className="flex-row items-center gap-1.5">
              <Icon icon={ICONS.calendar} size={14} tone="muted" />
              <Text variant="small" tone="secondary" numberOfLines={1} style={TABULAR} className="min-w-0 flex-1">
                {`${job.status === 'reconfirmation_required' ? 'Reconfirm by' : 'Reply by'} ${stamp(job.dueAt)}`}
              </Text>
            </View>
          ) : null}

          {meta ? (
            <Text variant="caption" tone="muted" numberOfLines={2} style={TABULAR}>
              {meta}
            </Text>
          ) : null}

          {answering ? (
            <View className="flex-row items-center justify-between gap-3 pt-1">
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
        </View>
      </Pressable>

      {accept ? (
        <View className="flex-row border-t border-border">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Details of ${job.title}`}
            onPress={onOpen}
            className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
            <Text variant="label" tone="secondary" className="font-sans-semibold">
              DETAILS
            </Text>
          </Pressable>
          <View className="w-px bg-border" accessible={false} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${accept.label} ${job.title}`}
            accessibilityState={{ busy }}
            disabled={busy}
            onPress={() => onAct?.(accept)}
            className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
            {busy ? (
              <ActivityIndicator colorClassName="accent-primary" />
            ) : (
              <Text variant="label" tone="link" className="font-sans-semibold">
                {accept.label.toUpperCase()}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
