import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import { SiteCard } from '@/components/shifts/site-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InfoCard } from '@/components/ui/info-card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useJobResponder } from '@/hooks/use-job-responder';
import { useRequestSite } from '@/hooks/use-request-site';
import { getGuardJob, JOB_STATUS_LABELS, jobActions } from '@/services/guard-jobs';
import type { GuardJob } from '@/types/job';
import { formatMoney } from '@/utils/format';
import { jobBadgeKind, sentenceCase, stamp } from '@/utils/job-status';

/** One job offered to, or taken by, the guard: what it is, when it runs, the pay, and what they can do next. */
export default function JobScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<GuardJob | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const { respond, busyId, sheet } = useJobResponder(() => setAttempt((count) => count + 1));

  useEffect(() => {
    let active = true;
    getGuardJob(id)
      .then((loaded) => {
        if (!active) return;
        setJob(loaded);
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, attempt]);

  const request = useRequestSite(job?.requestId);
  const actions = job ? jobActions(job) : [];
  const throughShifts = job ? job.scope === 'shift_replacement' || (job.scope === 'request' && job.hasSchedule) : false;

  return (
    <Screen>
      <EditHeading title={job?.title ?? 'Job'} />
      {failed ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load this job
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={() => setAttempt((count) => count + 1)} />
        </View>
      ) : job ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}>
          <Card>
            <View className="gap-2 p-4">
              <View className="flex-row items-start justify-between gap-3">
                <Text variant="heading" numberOfLines={3} className="min-w-0 flex-1">
                  {job.title}
                </Text>
                <Badge label={JOB_STATUS_LABELS[job.status] ?? job.status} kind={jobBadgeKind(job.status)} />
              </View>
              <Text tone="secondary">{job.siteName}</Text>
              {job.hourlyPay !== null ? (
                <Text variant="label" className="font-sans-semibold">
                  {formatMoney(job.hourlyPay)} / hr
                </Text>
              ) : null}
            </View>
          </Card>

          {actions.length > 0 ? (
            <View className="flex-row gap-3">
              {actions.map((action) => (
                <View key={action.status} className="flex-1">
                  <Button
                    title={action.label}
                    variant={action.kind === 'danger' ? 'danger' : action.kind === 'secondary' ? 'secondary' : 'primary'}
                    loading={busyId === job.id}
                    onPress={() => respond(job, action)}
                  />
                </View>
              ))}
            </View>
          ) : throughShifts && ['accepted', 'in_progress'].includes(job.status) ? (
            <View className="rounded-xl border border-dashed border-border-strong p-4">
              <Text tone="secondary">This job runs on a schedule, so it is carried out through its shifts.</Text>
            </View>
          ) : null}

          <InfoCard
            title="Job"
            rows={[
              { label: 'Guard type', value: sentenceCase(job.guardType) },
              { label: 'Guards needed', value: job.guardsRequired ? String(job.guardsRequired) : '' },
              { label: 'Starts', value: stamp(job.start) },
              { label: 'Ends', value: stamp(job.end) },
              {
                label: job.status === 'reconfirmation_required' ? 'Reconfirm by' : 'Reply by',
                value: job.status === 'offered' || job.status === 'reconfirmation_required' ? stamp(job.dueAt) : '',
              },
            ]}
          />

          {request ? <SiteCard site={request.site} name={job.siteName} /> : null}

          <InfoCard
            title="Progress"
            rows={[
              { label: 'Offered', value: stamp(job.offeredAt) },
              { label: 'Accepted', value: stamp(job.acceptedAt) },
              { label: 'Started', value: stamp(job.startedAt) },
              { label: 'Completed', value: stamp(job.completedAt) },
            ]}
          />

          {job.note ? (
            <Card title="Note">
              <View className="p-4">
                <Text variant="small">{job.note}</Text>
              </View>
            </Card>
          ) : null}

          {job.requestId ? (
            <Button
              title="View request details"
              variant="secondary"
              onPress={() => router.push({ pathname: '/request/[id]', params: { id: job.requestId } })}
            />
          ) : null}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      )}
      {sheet}
    </Screen>
  );
}
