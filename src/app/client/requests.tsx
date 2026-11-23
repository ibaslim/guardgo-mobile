import { router } from 'expo-router';

import { ArrivalsBanner } from '@/components/requests/arrivals-banner';
import { Button } from '@/components/ui/button';
import { RequestsScreen } from '@/components/requests/requests-screen';
import { ICONS } from '@/constants/icons';
import { usePendingArrivals } from '@/hooks/use-pending-arrivals';

export default function ClientRequestsScreen() {
  const arrivals = usePendingArrivals();
  return (
    <RequestsScreen
      title="Jobs"
      subtitle="Ask for guards and follow how each job is covered"
      banner={<ArrivalsBanner arrivals={arrivals} />}
      action={<Button title="New request" icon={ICONS.note} onPress={() => router.push('/request-form')} />}
      onOpen={(request) => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
      empty={{ live: 'No live requests. Create one to start finding guards.' }}
    />
  );
}
