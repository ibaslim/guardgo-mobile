import { ArrivalsBanner } from '@/components/requests/arrivals-banner';
import { ClientJobsScreen } from '@/components/requests/client-jobs-screen';
import { usePendingArrivals } from '@/hooks/use-pending-arrivals';

export default function ClientRequestsScreen() {
  const arrivals = usePendingArrivals();
  return <ClientJobsScreen banner={<ArrivalsBanner arrivals={arrivals} />} />;
}
