import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError } from '@/services/api';
import type { EndStatus, FulfillmentMode, ListRequestsOptions, RequestDetail, RequestPayload, RequestSchedule, RequestStatus, RequestSummary, RequestUpdatePayload, RequestWave, RequestsPage, ScheduleKind, SchedulePayload, StaffingStatus } from '@/types/request';
import { parseServerTimestamp } from '@/utils/dates';

export const REQUESTS_PAGE_SIZE = 20;

type RawRequest = {
  id?: string;
  title?: string | null;
  request_status?: string | null;
  staffing_status?: string | null;
  fulfillment_mode?: string | null;
  guards_required?: number | null;
  accepted_slots?: number | null;
  open_slots?: number | null;
  requested_guard_type?: string | null;
  special_instructions?: string | null;
  timezone?: string | null;
  request_revision?: number | null;
  site_snapshot?: {
    site_name?: string | null;
    site_index?: number | null;
    site_manager_contact?: string | null;
    manager_email?: string | null;
    site_address?: {
      street?: string | null;
      city?: string | null;
      province?: string | null;
      postal_code?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    } | null;
  } | null;
  pricing_snapshot?: {
    currency?: string | null;
    client_hourly_quote?: number | null;
    estimated_total_hours?: number | null;
    estimated_client_charge?: number | null;
    requested_hours_per_position?: number | null;
    rate_field?: string | null;
  } | null;
  invoicing_snapshot?: {
    billing_cycle?: string | null;
    invoice_recipient_email?: string | null;
    invoice_note?: string | null;
    invoice_status?: string | null;
  } | null;
  lock_reason?: string | null;
  published_at?: string | null;
  cancelled_at?: string | null;
  closed_at?: string | null;
  expired_at?: string | null;
  match_summary?: { eligible_count?: number | null; total_candidates?: number | null } | null;
  requested_start_at?: string | null;
  requested_end_at?: string | null;
  request_expires_at?: string | null;
  created_at?: string | null;
};

type RawPage = {
  items?: RawRequest[];
  pagination?: { page?: number; total_pages?: number; total_items?: number };
};

const STATUSES: readonly string[] = ['draft', 'submitted', 'assigned', 'in_progress', 'cancelled', 'closed'];
const STAFFING: readonly string[] = ['pending_review', 'review_returned', 'open', 'partially_filled', 'filled', 'expired'];
const MODES: readonly string[] = ['individual_only', 'service_provider_only', 'hybrid'];

/**
 * The web saves a request's times as the plain local time the client picked ("2026-11-20T09:00", no
 * zone) and the server returns them as they were saved. Reading them without a zone shows the same
 * wall-clock time the client chose; a time that does carry a zone is honoured.
 */
/** A time a person typed on the request (its start and end): wall-clock time, read as the phone's local time. */
function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseRequest(raw: RawRequest): RequestSummary {
  const required = Math.max(Number(raw.guards_required) || 0, 0);
  // Prefer the count of accepted positions; fall back to what is no longer open.
  const filled =
    typeof raw.accepted_slots === 'number'
      ? raw.accepted_slots
      : typeof raw.open_slots === 'number'
        ? required - raw.open_slots
        : 0;

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? '').trim() || 'Untitled request',
    status: (STATUSES.includes(String(raw.request_status)) ? raw.request_status : 'draft') as RequestStatus,
    staffing: STAFFING.includes(String(raw.staffing_status)) ? (raw.staffing_status as StaffingStatus) : null,
    fulfillment: MODES.includes(String(raw.fulfillment_mode)) ? (raw.fulfillment_mode as FulfillmentMode) : null,
    siteName: String(raw.site_snapshot?.site_name ?? '').trim(),
    city: String(raw.site_snapshot?.site_address?.city ?? '').trim(),
    guardsRequired: required,
    filled: Math.min(Math.max(filled, 0), required),
    start: parseDate(raw.requested_start_at),
    end: parseDate(raw.requested_end_at),
    expiresAt: parseServerTimestamp(raw.request_expires_at),
    createdAt: parseServerTimestamp(raw.created_at),
  };
}

export async function listRequests({ page, keyword }: ListRequestsOptions): Promise<RequestsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.requests.list, {
    query: { page, rows: REQUESTS_PAGE_SIZE, keyword: keyword?.trim() ?? '' },
  });
  return {
    items: (response.items ?? []).map(parseRequest).filter((request) => request.id),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

/** A readable reason for a failed requests call. */
export function requestsErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.message && !error.message.startsWith('Request failed')) return error.message;
  }
  return fallback;
}

const text = (value: string | null | undefined) => String(value ?? '').trim();
const amount = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function parseDetail(raw: RawRequest): RequestDetail {
  const address = raw.site_snapshot?.site_address;
  const price = raw.pricing_snapshot;
  const hasPrice = Boolean(price && (amount(price.client_hourly_quote) !== null || amount(price.estimated_client_charge) !== null));

  return {
    ...parseRequest(raw),
    guardType: text(raw.requested_guard_type),
    instructions: text(raw.special_instructions),
    timezone: text(raw.timezone),
    revision: raw.request_revision ?? 1,
    site: {
      contact: text(raw.site_snapshot?.site_manager_contact),
      email: text(raw.site_snapshot?.manager_email),
      address: [address?.street, address?.city, address?.province, address?.postal_code].map(text).filter(Boolean).join(', '),
      street: text(address?.street),
      city: text(address?.city),
      province: text(address?.province),
      postalCode: text(address?.postal_code),
      latitude: address?.latitude == null ? '' : String(address.latitude),
      longitude: address?.longitude == null ? '' : String(address.longitude),
      savedIndex: typeof raw.site_snapshot?.site_index === 'number' && raw.site_snapshot.site_index >= 0 ? raw.site_snapshot.site_index : null,
    },
    pricing: hasPrice
      ? {
          currency: text(price?.currency) || 'CAD',
          hourlyRate: amount(price?.client_hourly_quote),
          estimatedHours: amount(price?.estimated_total_hours),
          estimatedTotal: amount(price?.estimated_client_charge),
          hoursEach: amount(price?.requested_hours_per_position),
          weekend: price?.rate_field === 'weekend_rate',
        }
      : null,
    billingCycle: text(raw.invoicing_snapshot?.billing_cycle),
    invoiceEmail: text(raw.invoicing_snapshot?.invoice_recipient_email),
    lockReason: text(raw.lock_reason),
    publishedAt: parseServerTimestamp(raw.published_at),
    endedAt: parseServerTimestamp(raw.cancelled_at ?? raw.closed_at ?? raw.expired_at),
    eligibleGuards: amount(raw.match_summary?.eligible_count),
    candidateTotal: amount(raw.match_summary?.total_candidates),
    invoiceNote: text(raw.invoicing_snapshot?.invoice_note),
    invoiceStatus: text(raw.invoicing_snapshot?.invoice_status),
  };
}

export async function getRequest(requestId: string): Promise<RequestDetail> {
  return parseDetail(await api.get<RawRequest>(`${ENDPOINTS.requests.list}/${requestId}`));
}

type RawWave = {
  id?: string;
  wave_number?: number;
  wave_status?: string;
  offer_count?: number;
  accepted_slots_at_close?: number;
  wave_expires_at?: string | null;
  activated_at?: string | null;
  review_note?: string | null;
};

export async function listRequestWaves(requestId: string): Promise<RequestWave[]> {
  const response = await api.get<{ items?: RawWave[] }>(`${ENDPOINTS.requests.list}/${requestId}/waves`, {
    query: { page: 1, rows: 20 },
  });
  return (response.items ?? [])
    .map((wave) => ({
      id: String(wave.id ?? ''),
      number: wave.wave_number ?? 0,
      status: String(wave.wave_status ?? ''),
      offers: wave.offer_count ?? 0,
      accepted: wave.accepted_slots_at_close ?? 0,
      expiresAt: parseServerTimestamp(wave.wave_expires_at),
      activatedAt: parseServerTimestamp(wave.activated_at),
      reviewNote: text(wave.review_note),
    }))
    .filter((wave) => wave.id)
    .sort((a, b) => b.number - a.number);
}

type Saved = { message?: string; item?: { id?: string } };

/** Saves a new draft. Returns its id. */
export async function createRequest(payload: RequestPayload): Promise<string> {
  const response = await api.post<Saved>(ENDPOINTS.requests.list, { ...payload, commit: false });
  const id = response.item?.id;
  if (!id) throw new ApiError(0, 'The request was saved but the server sent no id.');
  return id;
}

/** Saves changes to a draft. */
export function updateRequest(requestId: string, payload: RequestPayload) {
  // The server doesn't take the saved-site pointer or the owner on an edit.
  const { site_index: _siteIndex, ...rest } = payload;
  return api.patch<Saved>(`${ENDPOINTS.requests.list}/${requestId}`, rest);
}

/** Sends a saved draft out to guards or providers. It needs a response cutoff. */
export function publishRequest(requestId: string) {
  return api.post<Saved>(`${ENDPOINTS.requests.list}/${requestId}/publish`, { max_match_results: 25 });
}

type RawSchedule = {
  id?: string;
  schedule_type?: string;
  start_date?: string;
  end_date?: string | null;
  recurrence_days?: string[] | null;
};

/** The repeat pattern saved for a request, or null when it doesn't repeat (the server answers 404). */
export async function getRequestSchedule(requestId: string): Promise<RequestSchedule | null> {
  try {
    const { schedule } = await api.get<{ schedule?: RawSchedule | null }>(`${ENDPOINTS.requests.list}/${requestId}/schedule`);
    if (!schedule?.id) return null;
    return {
      id: schedule.id,
      kind: (schedule.schedule_type as ScheduleKind) ?? 'one_time',
      startDate: String(schedule.start_date ?? ''),
      endDate: String(schedule.end_date ?? ''),
      recurrenceDays: Array.isArray(schedule.recurrence_days) ? schedule.recurrence_days : [],
    };
  } catch (failure) {
    if (failure instanceof ApiError && failure.status === 404) return null;
    throw failure;
  }
}

/** Saves the repeat pattern: creates it, or changes the one the request already has. */
export function saveRequestSchedule(requestId: string, payload: SchedulePayload, exists: boolean) {
  const url = `${ENDPOINTS.requests.list}/${requestId}/schedule`;
  return exists ? api.patch<unknown>(url, payload) : api.post<unknown>(url, payload);
}

export function setRequestStatus(requestId: string, status: EndStatus) {
  return api.patch<Saved>(`${ENDPOINTS.requests.list}/${requestId}/status`, { request_status: status, reason: null });
}

/** Sends changes to a request that is already out to guards. Matching guards are offered the new version. */
export function publishRequestUpdate(requestId: string, payload: RequestUpdatePayload) {
  return api.post<Saved>(`${ENDPOINTS.requests.list}/${requestId}/publish-update`, payload);
}

/** Asks for more guards on a live request, with an optional new response time ("2026-11-20T09:00"). */
export function requestMoreCoverage(requestId: string, extraGuards: number, respondBy: string | null) {
  return api.post<Saved>(`${ENDPOINTS.requests.list}/${requestId}/additional-coverage`, {
    additional_slots: extraGuards,
    ...(respondBy ? { request_expires_at: respondBy } : {}),
    max_match_results: 25,
  });
}
