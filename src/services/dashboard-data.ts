import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError } from '@/services/api';
import { parseServerTimestamp, parseWallClock } from '@/utils/dates';

/**
 * Lists and figures shared by the home dashboards (provider, guard, client). They read the same
 * `jobs`, `shifts` and `my-invoices` lists as the web dashboard and count them the same way.
 */

export const DASHBOARD_ROWS = 200;
export const SECTION_SIZE = 5;
const SOON_MS = 24 * 60 * 60 * 1000;

/** A job offered to, or taken by, the signed-in tenant (or, for a client, by whoever covers their request). */
export type DashboardJob = {
  id: string;
  title: string;
  siteName: string;
  status: string;
  /** Who covers the job. */
  assignee: 'service_provider' | 'guard';
  /** Hourly pay on offer to this assignee, when the request carries one. */
  hourlyPay: number | null;
  /** When the offer must be answered by. */
  dueAt: Date | null;
  updatedAt: Date | null;
};

export type DashboardShift = {
  id: string;
  title: string;
  siteName: string;
  status: string;
  /** The shift's date at the site, "2026-03-12". */
  dateLocal: string;
  start: Date | null;
  staffed: number;
  required: number;
  clientActionRequired: boolean;
  rosterDueAt: Date | null;
};

export type DashboardInvoice = {
  id: string;
  number: string;
  title: string;
  period: string;
  status: string;
  currency: string;
  amount: number;
  hours: number;
  createdAt: Date | null;
  periodStart: Date | null;
};

export type Raw = Record<string, any>;
type RawPage = { items?: Raw[] };

export const toDate = (value: unknown) => {
  if (typeof value !== 'string' || !value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
export const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
export const lower = (value: unknown) => String(value ?? '').trim().toLowerCase();

export function parseJob(raw: Raw): DashboardJob {
  const assignee = raw.assignee_tenant_type === 'service_provider' ? 'service_provider' : 'guard';
  const pay = Number(raw.request?.pricing_snapshot?.[assignee === 'service_provider' ? 'provider_hourly_pay' : 'guard_hourly_pay']);
  return {
    id: String(raw.id ?? ''),
    title: raw.request?.title || 'Offer',
    siteName: raw.request?.site_name || 'Site unavailable',
    status: lower(raw.assignment_status),
    assignee,
    hourlyPay: Number.isFinite(pay) ? pay : null,
    dueAt: parseServerTimestamp(raw.response_due_at) ?? parseServerTimestamp(raw.reconfirmation_due_at),
    updatedAt: parseServerTimestamp(raw.updated_at),
  };
}

function parseShift(raw: Raw): DashboardShift {
  return {
    id: String(raw.id ?? ''),
    title: raw.request_title || 'Shift',
    siteName: raw.site_name || 'Site unavailable',
    status: lower(raw.instance_status),
    dateLocal: String(raw.shift_date_local ?? ''),
    start: parseWallClock(raw.shift_start_at_utc),
    staffed: toNumber(raw.slots_staffed),
    required: toNumber(raw.slots_required),
    clientActionRequired: !!raw.client_action_required,
    rosterDueAt: parseServerTimestamp(raw.roster_due_at),
  };
}

function parseInvoice(raw: Raw): DashboardInvoice {
  return {
    id: String(raw.id ?? ''),
    number: String(raw.invoice_number ?? ''),
    title: raw.request_title || 'Coverage invoice',
    period: raw.billing_period_label || '',
    status: lower(raw.invoice_status),
    currency: raw.currency || 'CAD',
    amount: toNumber(raw.estimated_amount),
    hours: toNumber(raw.estimated_total_hours),
    createdAt: parseServerTimestamp(raw.created_at),
    periodStart: toDate(raw.billing_period_start_local) ?? parseServerTimestamp(raw.created_at),
  };
}

const withId = (page: RawPage) => (page.items ?? []).filter((item) => item.id);

export const listJobs = (assignmentStatus = '') =>
  api
    .get<RawPage>(ENDPOINTS.dashboard.jobs, { query: { page: 1, rows: DASHBOARD_ROWS, assignment_status: assignmentStatus, keyword: '' } })
    .then((page) => withId(page).map(parseJob));

export const listShifts = (from: string, to: string) =>
  api
    .get<RawPage>(ENDPOINTS.dashboard.shifts, { query: { page: 1, rows: DASHBOARD_ROWS, date_from: from, date_to: to } })
    .then((page) => withId(page).map(parseShift));

export const listInvoices = () =>
  api
    .get<RawPage>(ENDPOINTS.dashboard.invoices, { query: { page: 1, rows: DASHBOARD_ROWS } })
    .then((page) => withId(page).map(parseInvoice));

/** The value of a settled call, or `fallback` when it failed. */
export const settled = <T>(result: PromiseSettledResult<T>, fallback: T) => (result.status === 'fulfilled' ? result.value : fallback);

/** Lets a dashboard show what loaded when one call fails; only when every call fails is the error raised. */
export function throwIfAllFailed(results: readonly PromiseSettledResult<unknown>[]) {
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
  if (failures.length === results.length) throw failures[0].reason;
}

export function dashboardErrorMessage(error: unknown) {
  if (error instanceof ApiError && (error.status === 0 || error.status === 408)) {
    return "Couldn't reach GuardGo. Check your connection and pull down to try again.";
  }
  return "Couldn't load your dashboard. Pull down to try again.";
}

export function weekAhead() {
  const pad = (n: number) => String(n).padStart(2, '0');
  const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = new Date();
  const to = new Date();
  to.setDate(to.getDate() + 7);
  return { from: iso(from), to: iso(to), today: iso(from) };
}

export const within24Hours = (value: Date | null) => {
  if (!value) return false;
  const ahead = value.getTime() - Date.now();
  return ahead >= 0 && ahead <= SOON_MS;
};

const isThisMonth = (value: Date | null) => {
  const now = new Date();
  return !!value && value.getFullYear() === now.getFullYear() && value.getMonth() === now.getMonth();
};

export const newestFirst = (a: Date | null, b: Date | null) => (b?.getTime() ?? 0) - (a?.getTime() ?? 0);

/** What the three job lists add up to. `jobs` is every assignment; the other two are the ones waiting on an answer. */
export function jobStats(jobs: DashboardJob[], offered: DashboardJob[], reconfirm: DashboardJob[]) {
  const actionableOffers = [...offered, ...reconfirm].sort((a, b) => newestFirst(a.updatedAt, b.updatedAt));
  const accepted = jobs.filter((job) => job.status === 'accepted').length;
  const inProgress = jobs.filter((job) => job.status === 'in_progress').length;
  return {
    actionableOffers,
    dueSoon: actionableOffers.filter((job) => within24Hours(job.dueAt)).length,
    reconfirmations: reconfirm.length,
    accepted,
    inProgress,
    committed: accepted + inProgress,
    recent: [...jobs].sort((a, b) => newestFirst(a.updatedAt, b.updatedAt)),
  };
}

/** What the next week's shifts add up to. */
export function shiftStats(shifts: DashboardShift[], today: string) {
  const upcoming = shifts
    .filter((shift) => ['scheduled', 'partially_staffed', 'staffed', 'in_progress'].includes(shift.status))
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
  const atRisk = upcoming.filter(
    (shift) =>
      shift.clientActionRequired || shift.status === 'partially_staffed' || shift.staffed < shift.required || within24Hours(shift.rosterDueAt)
  );
  return {
    upcoming,
    today: upcoming.filter((shift) => shift.dateLocal === today).length,
    inProgress: shifts.filter((shift) => shift.status === 'in_progress').length,
    atRisk,
    clientAction: upcoming.filter((shift) => shift.clientActionRequired).length,
  };
}

const roundHours = (hours: number) => `${Math.round(hours * 100) / 100} hrs`;

/** The payout tile and average rate from the issued payout invoices. */
export function payoutStats(invoices: DashboardInvoice[]) {
  const sum = (list: DashboardInvoice[], pick: (invoice: DashboardInvoice) => number) =>
    list.reduce((total, invoice) => total + pick(invoice), 0);
  const month = invoices.filter((invoice) => isThisMonth(invoice.periodStart));
  const payout = month.length
    ? { label: 'Current month payout', amount: sum(month, (i) => i.amount), hint: `${roundHours(sum(month, (i) => i.hours))} planned this month` }
    : invoices.length
      ? {
          label: 'Issued payout',
          amount: sum(invoices, (i) => i.amount),
          hint: `${roundHours(sum(invoices, (i) => i.hours))} across ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`,
        }
      : { label: 'Projected payout', amount: 0, hint: 'No payout invoices yet' };

  const billable = invoices.filter((invoice) => invoice.hours > 0);
  const hours = sum(billable, (i) => i.hours);
  return {
    payout: { ...payout, currency: invoices[0]?.currency ?? 'CAD' },
    averageRate: hours > 0 ? Math.round((sum(billable, (i) => i.amount) / hours) * 100) / 100 : null,
    invoiceCount: invoices.length,
    recentInvoices: [...invoices].sort((a, b) => newestFirst(a.createdAt, b.createdAt)).slice(0, SECTION_SIZE),
  };
}
