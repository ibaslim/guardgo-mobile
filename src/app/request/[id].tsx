import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import { ClientRequestActions } from '@/components/requests/client-request-actions';
import { RequestDetails } from '@/components/requests/request-details';
import { ShiftPlanCard } from '@/components/requests/shift-plan-card';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useRoleArea } from '@/hooks/use-session';
import { getRequest, getRequestSchedule, listRequestWaves } from '@/services/requests';
import type { RequestDetail, RequestSchedule, RequestWave } from '@/types/request';
import { clientPermissions } from '@/utils/request-actions';

/** The schedule is null when the request has none, and undefined when it couldn't be loaded (or isn't shown). */
type Loaded = { request: RequestDetail; waves: RequestWave[]; schedule: RequestSchedule | null | undefined };

/**
 * One request, read-only. Opened from a request list. A client also sees the offer rounds and the shift
 * plan; those are left out for other roles, and a failed call for either doesn't block the screen.
 */
export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const area = useRoleArea();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const client = area === 'client';
    const rounds = client ? listRequestWaves(id).catch(() => []) : Promise.resolve([]);
    const plan = client ? getRequestSchedule(id).catch(() => undefined) : Promise.resolve(undefined);
    Promise.all([getRequest(id), rounds, plan])
      .then(([request, waves, schedule]) => {
        if (!active) return;
        setLoaded({ request, waves, schedule });
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, area, attempt]);

  // Coming back from the form or the shift plan: show what changed. The first focus is the first load above.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setAttempt((count) => count + 1);
    }, [])
  );

  const title = loaded?.request.title ?? 'Request';
  const planShifts = area === 'client' && loaded !== null && clientPermissions(loaded.request).planShifts;

  return (
    <Screen>
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
          <Button title="Try again" variant="secondary" onPress={() => setAttempt((count) => count + 1)} />
        </View>
      ) : loaded ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <RequestDetails request={loaded.request} waves={loaded.waves} showPrice={area === 'client'} />
          {planShifts ? (
            <View className="pt-4">
              <ShiftPlanCard requestId={loaded.request.id} schedule={loaded.schedule} />
            </View>
          ) : null}
          {area === 'client' ? <ClientRequestActions request={loaded.request} onChanged={() => setAttempt((count) => count + 1)} /> : null}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center gap-3" accessibilityLiveRegion="polite">
          <ActivityIndicator colorClassName="accent-primary" />
          <Text tone="muted">Loading…</Text>
        </View>
      )}
    </Screen>
  );
}
