import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import type { Raw } from '@/types/api';
import type { ClientDashboard, DashboardRequest } from '@/types/dashboard';
import { parseServerTimestamp } from '@/utils/dates';
import { DASHBOARD_ROWS, jobStats, listShifts, lower, newestFirst, parseJob, SECTION_SIZE, settled, shiftStats, throwIfAllFailed, toDate, toNumber, weekAhead } from '@/services/dashboard-data';

const HOUR_MS = 60 * 60 * 1000;
const round = (value: number) => Math.round(value * 100) / 100;

/** What the request costs the client: the saved charge, or the quote times hours times committed positions. */
function chargeOf(raw: Raw, committedSlots: number) {
  const pricing = raw.pricing_snapshot ?? {};
  const saved = Number(pricing.estimated_client_charge);
  if (Number.isFinite(saved) && saved > 0) return saved;

  const quote = Number(pricing.client_hourly_quote);
  const guards = Number(pricing.guards_required ?? raw.guards_required);
  const start = toDate(raw.requested_start_at);
  const end = toDate(raw.requested_end_at);
  const perPosition =
    Number(pricing.requested_hours_per_position) > 0
      ? Number(pricing.requested_hours_per_position)
      : Number(pricing.estimated_total_hours) > 0 && guards > 0
        ? Number(pricing.estimated_total_hours) / guards
        : start && end && end > start
          ? (end.getTime() - start.getTime()) / HOUR_MS
          : 0;
  return quote > 0 && perPosition > 0 && committedSlots > 0 ? round(quote * perPosition * committedSlots) : 0;
}

function parseRequest(raw: Raw, committedSlots: number): DashboardRequest {
  return {
    id: String(raw.id ?? ''),
    title: raw.title || 'Request',
    status: lower(raw.request_status),
    staffing: lower(raw.staffing_status),
    siteName: raw.site_snapshot?.site_name || 'Site unavailable',
    accepted: toNumber(raw.accepted_slots),
    open: toNumber(raw.open_slots),
    expiresAt: parseServerTimestamp(raw.request_expires_at),
    updatedAt: parseServerTimestamp(raw.updated_at),
    charge: chargeOf(raw, committedSlots),
    invoiceNumber: raw.invoicing_snapshot?.latest_invoice_number || '',
    invoiceStatus: lower(raw.invoicing_snapshot?.invoice_status || raw.invoicing_snapshot?.billing_cycle),
    billingCycle: lower(raw.invoicing_snapshot?.billing_cycle),
    invoicedAt: parseServerTimestamp(raw.invoicing_snapshot?.last_invoice_issued_at),
  };
}

/** Positions already covered per request, from the jobs that are accepted, running or done. */
function committedSlotsByRequest(raws: Raw[]) {
  const slots: Record<string, number> = {};
  for (const raw of raws) {
    if (!['accepted', 'in_progress', 'completed'].includes(lower(raw.assignment_status))) continue;
    const count = Math.floor(Number(raw.slots_committed ?? 1));
    slots[raw.request_id] = (slots[raw.request_id] ?? 0) + (count > 0 ? count : 1);
  }
  return slots;
}

const listRaw = (path: string) =>
  api.get<{ items?: Raw[] }>(path, { query: { page: 1, rows: DASHBOARD_ROWS } }).then((page) => (page.items ?? []).filter((item) => item.id));

/** Loads a client's home screen: requests, who covers them, the next week's shifts and what they cost. */
export async function loadClientDashboard(): Promise<ClientDashboard> {
  const { from, to, today } = weekAhead();
  const results = await Promise.allSettled([
    listRaw(ENDPOINTS.requests.list),
    listRaw(ENDPOINTS.dashboard.jobs),
    listShifts(from, to),
  ] as const);
  throwIfAllFailed(results);

  const rawRequests = settled(results[0], []);
  const rawJobs = settled(results[1], []);
  const jobs = jobStats(rawJobs.map(parseJob), [], []);
  const shifts = shiftStats(settled(results[2], []), today);
  const slots = committedSlotsByRequest(rawJobs);
  const requests = rawRequests.map((raw) => parseRequest(raw, slots[raw.id] ?? 0));

  const attention = requests.filter((r) => ['pending_review', 'review_returned', 'open', 'partially_filled'].includes(r.staffing));
  const seeking = requests.filter((r) => ['open', 'partially_filled'].includes(r.staffing));
  const coverageGaps = requests.filter((r) => r.open > 0 && !['cancelled', 'closed'].includes(r.status));
  const billable = requests.filter((r) => !['draft', 'cancelled', 'closed'].includes(r.status));
  const spend = billable.reduce((total, r) => total + r.charge, 0);

  return {
    drafts: requests.filter((r) => r.status === 'draft').length,
    submitted: requests.filter((r) => ['submitted', 'assigned', 'in_progress'].includes(r.status)).length,
    inMotion: attention.length,
    seekingCoverage: seeking.length,
    liveAssignments: jobs.committed,
    inProgress: jobs.inProgress,
    upcomingShifts: shifts.upcoming.length,
    shiftsToday: shifts.today,
    coverageRisk: coverageGaps.length + shifts.atRisk.length,
    clientActionShifts: shifts.clientAction,
    spend: billable.length
      ? { label: 'Active spend', amount: spend, hint: `${billable.length} active request${billable.length === 1 ? '' : 's'}` }
      : { label: 'Spend estimate', amount: 0, hint: 'No active billing yet' },
    needsAttention: [...attention].sort((a, b) => b.open - a.open).slice(0, SECTION_SIZE),
    atRiskShifts: shifts.atRisk.slice(0, SECTION_SIZE),
    recentJobs: jobs.recent.slice(0, SECTION_SIZE),
    billing: requests
      .filter((r) => r.invoiceNumber || r.invoiceStatus)
      .sort((a, b) => newestFirst(a.invoicedAt ?? a.updatedAt, b.invoicedAt ?? b.updatedAt))
      .slice(0, SECTION_SIZE),
  };
}
