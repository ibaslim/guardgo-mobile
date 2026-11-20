import { WorkScreen } from '@/components/jobs/work-screen';
import { useSession } from '@/hooks/use-session';

/**
 * The guard's work: offers, jobs and shifts. A guard owned by a service provider is never offered
 * jobs (the provider rosters them onto shifts), so it sees the shifts only.
 */
export default function GuardJobsScreen() {
  const providerOwned = useSession()?.tenant?.providerOwned ?? false;
  return <WorkScreen shiftsOnly={providerOwned} />;
}
