import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditHeading } from '@/components/account/edit-step-shell';
import { OfferActionBar, OfferPanel } from '@/components/jobs/offer-panel';
import { ClientRequestActions } from '@/components/requests/client-request-actions';
import { RequestDetails } from '@/components/requests/request-details';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useJobResponder } from '@/hooks/use-job-responder';
import { useRoleArea } from '@/hooks/use-session';
import { getGuardJob, jobActions } from '@/services/guard-jobs';
import { getRequest, getRequestSchedule, listRequestWaves } from '@/services/requests';
import type { GuardJob } from '@/types/job';
import type { RequestDetail, RequestSchedule, RequestWave } from '@/types/request';
import { clientPermissions } from '@/utils/request-actions';

/** The schedule is null when the request has none, and undefined when it couldn't be loaded. */
type Loaded = {
  request: RequestDetail;
  waves: RequestWave[];
  schedule: RequestSchedule | null | undefined;
  /** The viewer's own offer on the request, when the screen was opened from it. */
  job: GuardJob | null;
};

/**
 * One request. Every role sees the request, its site and its operations schedule. A client also sees the
 * price and the offer rounds, and can act on the request. A guard or provider opened from an offer (the
 * `job` param) sees the offer on top and answers it from the bar at the bottom, as in the web's drawer.
 */
export default function RequestScreen() {
  const { id, job: jobId } = useLocalSearchParams<{ id: string; job?: string }>();
  const area = useRoleArea();
  const client = area === 'client';
  const insets = useSafeAreaInsets();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  const { respond, busyId, sheet } = useJobResponder(reload);

  useEffect(() => {
    let active = true;
    const rounds = client ? listRequestWaves(id).catch(() => []) : Promise.resolve([]);
    // The rest of the screen doesn't wait on these: a failed call only leaves its card out.
    const plan = getRequestSchedule(id).catch(() => undefined);
    const offer = jobId && !client ? getGuardJob(jobId).catch(() => null) : Promise.resolve(null);
    Promise.all([getRequest(id), rounds, plan, offer])
      .then(([request, waves, schedule, job]) => {
        if (!active) return;
        setLoaded({ request, waves, schedule, job });
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, jobId, client, attempt]);

  // Coming back from the form or the shift plan: show what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      reload();
    }, [reload])
  );

  const title = loaded?.request.title ?? 'Request';
  const planShifts = client && loaded !== null && clientPermissions(loaded.request).planShifts;
  const job = loaded?.job ?? null;
  const actions = job ? jobActions(job) : [];
  // A guard or provider only gets the card when there is something to show; a client always does, to plan one.
  const scheduleValue = loaded?.schedule;
  const showSchedule = client || scheduleValue !== undefined;

  return (
    <Screen edges={actions.length > 0 ? ['top'] : ['top', 'bottom']}>
      <EditHeading title={title} />
      {/* A failed refresh keeps what was already loaded; only a failed first load shows the error. */}
      {failed && !loaded ? (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text variant="heading" className="text-center">
            Could not load this request
          </Text>
          <Text tone="secondary" className="text-center">
            Check your connection and try again.
          </Text>
          <Button title="Try again" variant="secondary" onPress={reload} />
        </View>
      ) : loaded ? (
        <>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <RequestDetails
              request={loaded.request}
              waves={loaded.waves}
              showPrice={client}
              siteActions={!client}
              schedule={
                showSchedule
                  ? {
                      value: scheduleValue,
                      onEdit: planShifts
                        ? () => router.push({ pathname: '/request-schedule/[id]', params: { id: loaded.request.id } })
                        : undefined,
                    }
                  : undefined
              }>
              {job ? <OfferPanel job={job} /> : null}
            </RequestDetails>
            {client ? <ClientRequestActions request={loaded.request} onChanged={reload} /> : null}
          </ScrollView>
          {job ? (
            <OfferActionBar
              job={job}
              actions={actions}
              busy={busyId === job.id}
              onAct={(action) => respond(job, action)}
              bottomInset={insets.bottom}
            />
          ) : null}
        </>
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
