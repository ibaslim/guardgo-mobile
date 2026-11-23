import { DASHBOARD_ROWS, jobStats, listInvoices, listJobs, listShifts, payoutStats, SECTION_SIZE, settled, shiftStats, throwIfAllFailed, weekAhead } from '@/services/dashboard-data';
import { listProviderGuards } from '@/services/provider-guards';
import type { DashboardInvoice, DashboardJob, DashboardShift, ProviderDashboard } from '@/types/dashboard';
import type { ProviderGuard } from '@/types/provider-guard';

/** Builds the provider's dashboard from the raw lists the same way the web dashboard does. */
export function buildProviderDashboard(input: {
  jobs: DashboardJob[];
  offered: DashboardJob[];
  reconfirm: DashboardJob[];
  shifts: DashboardShift[];
  invoices: DashboardInvoice[];
  guards: ProviderGuard[];
  today: string;
}): ProviderDashboard {
  const jobs = jobStats(input.jobs, input.offered, input.reconfirm);
  const shifts = shiftStats(input.shifts, input.today);
  const pay = payoutStats(input.invoices);
  const guards = input.guards;

  return {
    actionableOffers: jobs.actionableOffers,
    dueSoonOffers: jobs.dueSoon,
    reconfirmations: jobs.reconfirmations,
    accepted: jobs.accepted,
    committed: jobs.committed,
    inProgress: jobs.inProgress,
    atRiskShifts: shifts.atRisk,
    clientActionShifts: shifts.clientAction,
    activeGuards: guards.filter((guard) => guard.status === 'active').length,
    pendingGuards: guards.filter((guard) => guard.invite === 'pending' || ['pending_activation', 'onboarding'].includes(guard.status)).length,
    recentGuards: guards.slice(0, SECTION_SIZE),
    payout: pay.payout,
    averageRate: pay.averageRate,
    invoiceCount: pay.invoiceCount,
    recentInvoices: pay.recentInvoices,
  };
}

/** Loads everything the provider's home screen shows. Fails only when nothing at all could be loaded. */
export async function loadProviderDashboard(): Promise<ProviderDashboard> {
  const { from, to, today } = weekAhead();
  const results = await Promise.allSettled([
    listJobs(),
    listJobs('offered'),
    listJobs('reconfirmation_required'),
    listShifts(from, to),
    listInvoices(),
    listProviderGuards(1, { rows: DASHBOARD_ROWS }).then((page) => page.items),
  ] as const);
  throwIfAllFailed(results);

  return buildProviderDashboard({
    jobs: settled(results[0], []),
    offered: settled(results[1], []),
    reconfirm: settled(results[2], []),
    shifts: settled(results[3], []),
    invoices: settled(results[4], []),
    guards: settled(results[5], []),
    today,
  });
}
