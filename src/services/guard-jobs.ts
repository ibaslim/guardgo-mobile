import type { Href } from 'expo-router';

import { ENDPOINTS } from '@/constants/endpoints';
import { lower, toDate, toNumber } from '@/services/dashboard-data';
import { api, ApiError } from '@/services/api';
import type { Raw } from '@/types/api';
import type { GuardJob, GuardJobsPage, JobAction, JobStatus, JobsQuery } from '@/types/job';
import { parseServerTimestamp } from '@/utils/dates';

export const JOBS_PAGE_SIZE = 20;

type RawPage = { items?: Raw[]; pagination?: { page?: number; total_pages?: number; total_items?: number } };

export function parseGuardJob(raw: Raw): GuardJob {
  const request = raw.request ?? {};
  const forProvider = raw.assignee_tenant_type === 'service_provider';
  const pay = Number(request.pricing_snapshot?.[forProvider ? 'provider_hourly_pay' : 'guard_hourly_pay']);
  return {
    id: String(raw.id ?? ''),
    requestId: String(raw.request_id ?? request.id ?? ''),
    title: request.title || 'Job',
    siteName: request.site_name || 'Site unavailable',
    status: lower(raw.assignment_status),
    scope: lower(raw.assignment_scope),
    hasSchedule: Boolean(request.has_schedule),
    hourlyPay: Number.isFinite(pay) ? pay : null,
    guardsRequired: toNumber(request.guards_required),
    guardType: String(request.requested_guard_type ?? ''),
    start: toDate(request.requested_start_at),
    end: toDate(request.requested_end_at),
    dueAt: parseServerTimestamp(raw.response_due_at) ?? parseServerTimestamp(raw.reconfirmation_due_at),
    updatedAt: parseServerTimestamp(raw.updated_at),
    offeredAt: parseServerTimestamp(raw.offered_at),
    acceptedAt: parseServerTimestamp(raw.accepted_at),
    startedAt: parseServerTimestamp(raw.started_at),
    completedAt: parseServerTimestamp(raw.completed_at),
    note: String(raw.note ?? ''),
    assignee: String(raw.candidate_snapshot?.candidate_name ?? '').trim(),
    forProvider,
    committed: Math.max(1, Math.floor(toNumber(raw.slots_committed ?? 1))),
    openSlots: Math.max(0, Math.floor(toNumber(request.open_slots))),
  };
}

export async function listGuardJobs(page: number, { status, keyword, rows }: JobsQuery = {}): Promise<GuardJobsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.jobs.list, {
    query: { page, rows: rows ?? JOBS_PAGE_SIZE, assignment_status: status ?? '', keyword: keyword?.trim() ?? '' },
  });
  return {
    items: (response.items ?? []).filter((item) => item.id).map(parseGuardJob),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

/** How many jobs have this status, without loading them. */
export async function countGuardJobs(status: JobStatus): Promise<number> {
  return (await listGuardJobs(1, { status, rows: 1 })).totalItems;
}

export async function getGuardJob(jobId: string): Promise<GuardJob> {
  return parseGuardJob(await api.get<Raw>(`${ENDPOINTS.jobs.list}/${jobId}`));
}

/** Answers or moves a job on. The server says what is allowed; its message is returned for the toast. */
export async function respondToJob(jobId: string, status: JobStatus, reason?: string, slots?: number): Promise<string> {
  const response = await api.patch<{ message?: string }>(`${ENDPOINTS.jobs.list}/${jobId}/status`, {
    assignment_status: status,
    reason: reason?.trim() || null,
    slots_committed: slots ?? null,
  });
  return response.message || 'Job updated';
}

const action = (label: string, status: JobStatus, kind: JobAction['kind']): JobAction => ({
  label,
  status,
  kind,
  needsReason: status === 'declined' || status === 'cancelled',
});

/**
 * What a guard can do with a job right now, the same as on the web. A job on a schedule, or one that
 * replaces a missed shift, is run through its shifts, so it has no buttons of its own once accepted.
 */
export function jobActions(job: GuardJob): JobAction[] {
  // A service provider answers with how many guard positions it can cover, as on the web.
  if (job.forProvider && job.scope === 'request') {
    const positions = Math.max(job.guardsRequired, job.committed);
    if (job.status === 'offered') {
      return [{ ...action('Accept', 'accepted', 'primary'), slots: { min: 1, max: positions } }, action('Decline', 'declined', 'danger')];
    }
    if (job.status === 'reconfirmation_required') {
      return [
        { ...action('Reconfirm', 'accepted', 'primary'), slots: { min: job.committed, max: positions } },
        action('Decline', 'declined', 'danger'),
      ];
    }
    if (job.status === 'accepted' && job.openSlots > 0) {
      return [{ ...action('Add coverage', 'accepted', 'secondary'), slots: { min: job.committed + 1, max: job.committed + job.openSlots } }];
    }
  }
  const throughShifts = job.scope === 'shift_replacement' || (job.scope === 'request' && job.hasSchedule);
  if (throughShifts && ['accepted', 'in_progress', 'completed', 'cancelled'].includes(job.status)) return [];

  switch (job.status) {
    case 'offered':
      return [action('Accept', 'accepted', 'primary'), action('Decline', 'declined', 'danger')];
    case 'reconfirmation_required':
      return [action('Reconfirm', 'accepted', 'primary'), action('Decline', 'declined', 'danger')];
    case 'accepted':
      return [action('Start', 'in_progress', 'primary'), action('Cancel', 'cancelled', 'danger')];
    case 'in_progress':
      return [action('Complete', 'completed', 'primary'), action('Cancel', 'cancelled', 'danger')];
    default:
      return [];
  }
}

/**
 * Where an offer opens: the details of its request, with the offer and its answers on top (as the web's
 * request drawer). A job whose request isn't known opens on its own.
 */
export function offerHref(job: { id: string; requestId: string }): Href {
  return job.requestId ? { pathname: '/request/[id]', params: { id: job.requestId, job: job.id } } : (`/job/${job.id}` as Href);
}

export const JOB_STATUS_LABELS: Record<string, string> = {
  offered: 'Offered',
  reconfirmation_required: 'Reconfirm',
  accepted: 'Accepted',
  in_progress: 'In progress',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
  expired: 'Expired',
  closed_filled: 'Filled',
  superseded: 'Replaced',
};

/** A readable reason for a failed jobs call. */
export function jobsErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.message && !error.message.startsWith('Request failed')) return error.message;
  }
  return fallback;
}
