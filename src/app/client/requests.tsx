import { router } from 'expo-router';

import { Button } from '@/components/ui/button';
import { RequestsScreen } from '@/components/requests/requests-screen';
import { ICONS } from '@/constants/icons';

export default function ClientRequestsScreen() {
  return (
    <RequestsScreen
      title="Jobs"
      subtitle="Ask for guards and follow how each job is covered"
      action={<Button title="New request" icon={ICONS.note} onPress={() => router.push('/request-form')} />}
      onOpen={(request) => router.push({ pathname: '/request/[id]', params: { id: request.id } })}
      empty={{ live: 'No live requests. Create one to start finding guards.' }}
    />
  );
}
