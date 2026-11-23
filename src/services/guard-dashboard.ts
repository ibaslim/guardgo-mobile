import { getAccount } from '@/services/account';
import { jobStats, listInvoices, listJobs, listShifts, payoutStats, SECTION_SIZE, settled, shiftStats, throwIfAllFailed, weekAhead } from '@/services/dashboard-data';
import type { DashboardInvoice, GuardDashboard } from '@/types/dashboard';

/** Loads a guard's home screen. A guard owned by a service provider has no payout figures of their own. */
export async function loadGuardDashboard(): Promise<GuardDashboard> {
  const { from, to, today } = weekAhead();
  // Ownership decides whether payout invoices are loaded at all, so the account comes first.
  const account = await getAccount().catch(() => null);
  const managed = account?.tenant.ownership_type === 'service_provider';
  const managedBy = managed ? account?.tenant.service_provider?.name || 'Service provider' : null;

  const results = await Promise.allSettled([
    listJobs(),
    listJobs('offered'),
    listJobs('reconfirmation_required'),
    listShifts(from, to),
    managed ? Promise.resolve([] as DashboardInvoice[]) : listInvoices(),
  ] as const);
  throwIfAllFailed(results);

  const jobs = jobStats(settled(results[0], []), settled(results[1], []), settled(results[2], []));
  const shifts = shiftStats(settled(results[3], []), today);
  const pay = payoutStats(settled(results[4], []));

  return {
    managedBy,
    actionableOffers: jobs.actionableOffers,
    dueSoonOffers: jobs.dueSoon,
    reconfirmations: jobs.reconfirmations,
    accepted: jobs.accepted,
    committed: jobs.committed,
    inProgress: jobs.inProgress,
    upcomingShifts: shifts.upcoming.slice(0, SECTION_SIZE),
    shiftsToday: shifts.today,
    liveShifts: shifts.inProgress,
    atRiskShifts: shifts.atRisk.length,
    recentJobs: jobs.recent.slice(0, SECTION_SIZE),
    payout: pay.payout,
    averageRate: pay.averageRate,
    invoiceCount: pay.invoiceCount,
    recentInvoices: pay.recentInvoices,
  };
}
