import { ActivityIndicator, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ICONS } from '@/constants/icons';
import { JOB_STATUS_LABELS, jobActions, type GuardJob, type JobAction } from '@/services/guard-jobs';
import { formatMoney } from '@/utils/format';
import { jobBadgeKind, jobRail, stamp, type JobRail } from '@/utils/job-status';

const RAILS: Record<JobRail, string> = {
  primary: 'bg-primary',
  success: 'bg-badge-success',
  warning: 'bg-badge-warning',
  danger: 'bg-badge-danger',
  neutral: 'bg-border-strong',
};

export type JobCardProps = {
  job: GuardJob;
  /** True while this job's answer is being sent: the buttons wait. */
  busy?: boolean;
  onOpen: () => void;
  onAct: (action: JobAction) => void;
};

/** The line under the site: when the job runs, or when the offer must be answered. */
function whenLine(job: GuardJob) {
  if (job.status === 'offered' || job.status === 'reconfirmation_required') {
    return job.dueAt ? `Reply by ${stamp(job.dueAt)}` : 'No reply deadline';
  }
  return job.start ? `Starts ${stamp(job.start)}` : '';
}

/**
 * A job offered to, or taken by, the guard. Tapping it opens the details. An offer, or a job to
 * reconfirm, also has its two answers in a footer, so it can be dealt with without opening it.
 */
export function JobCard({ job, busy = false, onOpen, onAct }: JobCardProps) {
  const quick = job.status === 'offered' || job.status === 'reconfirmation_required' ? jobActions(job) : [];
  const meta = [job.hourlyPay === null ? null : `${formatMoney(job.hourlyPay)} / hr`, whenLine(job)].filter(Boolean).join(' · ');

  return (
    <View className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${job.title}. ${JOB_STATUS_LABELS[job.status] ?? job.status}. ${job.siteName}`}
        onPress={onOpen}
        className="active:bg-surface-muted">
        <View className={`absolute bottom-3 left-0 top-3 w-1 rounded-r-full ${RAILS[jobRail(job)]}`} />
        <View className="flex-row items-start gap-3 py-3.5 pl-4 pr-3">
          <View className="min-w-0 flex-1 gap-0.5">
            <Text variant="label" numberOfLines={2} className="font-sans-semibold text-base">
              {job.title}
            </Text>
            <Text variant="small" tone="secondary" numberOfLines={1}>
              {job.siteName}
            </Text>
            {meta ? (
              <Text variant="caption" tone="muted" numberOfLines={2}>
                {meta}
              </Text>
            ) : null}
          </View>
          <Badge label={JOB_STATUS_LABELS[job.status] ?? job.status} kind={jobBadgeKind(job.status)} />
        </View>
      </Pressable>

      {quick.length > 0 ? (
        <View className="flex-row border-t border-border">
          {quick.map((action, index) => (
            <View key={action.status} className="flex-1 flex-row">
              {index > 0 ? <View className="w-px bg-border" accessible={false} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${action.label} ${job.title}`}
                accessibilityState={{ busy }}
                disabled={busy}
                onPress={() => onAct(action)}
                className="h-10 flex-1 items-center justify-center active:bg-surface-muted">
                {busy && action.kind === 'primary' ? (
                  <ActivityIndicator colorClassName="accent-primary" />
                ) : (
                  <View className="flex-row items-center gap-1.5">
                    <Icon icon={action.kind === 'danger' ? ICONS.close : ICONS.check} size={16} tone={action.kind === 'danger' ? 'danger' : 'primary'} />
                    <Text variant="label" tone={action.kind === 'danger' ? 'danger' : 'link'} className="font-sans-semibold">
                      {action.label}
                    </Text>
                  </View>
                )}
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
