import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { EditHeading } from '@/components/account/edit-step-shell';
import { ClientRequestActions } from '@/components/requests/client-request-actions';
import { RequestDetails } from '@/components/requests/request-details';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useRoleArea } from '@/hooks/use-session';
import { getRequest, listRequestWaves } from '@/services/requests';
import type { RequestDetail, RequestWave } from '@/types/request';

type Loaded = { request: RequestDetail; waves: RequestWave[] };

/**
 * One request, read-only. Opened from a request list. A client also sees the offer rounds; the
 * offer rounds are left out for other roles, and a failed offer-rounds call doesn't block the screen.
 */
export default function RequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const area = useRoleArea();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const rounds = area === 'client' ? listRequestWaves(id).catch(() => []) : Promise.resolve([]);
    Promise.all([getRequest(id), rounds])
      .then(([request, waves]) => {
        if (!active) return;
        setLoaded({ request, waves });
        setFailed(false);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [id, area, attempt]);

  const title = loaded?.request.title ?? 'Request';

  return (
    <Screen>
      <EditHeading title={title} />
      {failed ? (
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
          <RequestDetails request={loaded.request} waves={loaded.waves} />
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
