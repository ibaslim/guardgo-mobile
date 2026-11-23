import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError, getAccessToken, getApiUrl } from '@/services/api';
import { parseServerTimestamp } from '@/utils/dates';
import { formatPhone } from '@/utils/phone';

export const GUARDS_PAGE_SIZE = 20;

export type InviteState = 'pending' | 'expired' | 'accepted';

/** One guard of the service provider, as the list shows it. */
export type ProviderGuard = {
  id: string;
  /** The guard's name, empty until they fill in their profile. */
  name: string;
  email: string;
  status: string;
  invite: InviteState | null;
  inviteExpiresAt: Date | null;
  /** Phone number when the server sends one, already formatted. */
  phone: string;
};

export type ProviderGuardsPage = {
  items: ProviderGuard[];
  page: number;
  totalPages: number;
  totalItems: number;
};

type RawGuard = {
  id?: string;
  name?: string | null;
  email?: string | null;
  status?: string | null;
  invite_status?: string | null;
  invite_expires_at?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
};

type RawPage = {
  items?: RawGuard[];
  pagination?: { page?: number; total_pages?: number; total_items?: number };
};

const INVITE_STATES: readonly string[] = ['pending', 'expired', 'accepted'];

// A guard with no profile yet is saved with the placeholder name "N/A".
const cleanName = (name: string | null | undefined) => {
  const value = (name ?? '').trim();
  return value.toUpperCase() === 'N/A' ? '' : value;
};

function parseGuard(raw: RawGuard): ProviderGuard {
  const expiry = parseServerTimestamp(raw.invite_expires_at);
  return {
    id: String(raw.id ?? ''),
    name: cleanName(raw.name),
    email: String(raw.email ?? ''),
    status: String(raw.status ?? '').trim().toLowerCase(),
    invite: INVITE_STATES.includes(String(raw.invite_status)) ? (raw.invite_status as InviteState) : null,
    inviteExpiresAt: expiry,
    phone: formatPhone(raw.phone ?? raw.mobile_phone),
  };
}

/** Which guards the server returns: those with this one tenant `status`, or all of them when left out. */
export type GuardsQuery = { status?: GuardStatus; rows?: number };

/** The tenant statuses the server knows. */
export type GuardStatus = 'onboarding' | 'pending_verification' | 'pending_activation' | 'active' | 'inactive' | 'banned';

function toPage(response: RawPage, page: number): ProviderGuardsPage {
  return {
    items: (response.items ?? []).map(parseGuard).filter((guard) => guard.id),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

export async function listProviderGuards(page: number, filter: GuardsQuery = {}): Promise<ProviderGuardsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.providerGuards.list, {
    query: { page, rows: filter.rows ?? GUARDS_PAGE_SIZE, status: filter.status },
  });
  return toPage(response, page);
}

/** Guards whose name or email contains `keyword` (case-insensitive), whatever their status. */
export async function searchProviderGuards(page: number, keyword: string): Promise<ProviderGuardsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.providerGuards.search, {
    query: { keyword: keyword.trim(), page, rows: GUARDS_PAGE_SIZE },
  });
  return toPage(response, page);
}

/** Emails the guard a link to set their password. The server answers 400 when the email is already used. */
export function inviteGuard(email: string) {
  return api.post<{ message?: string }>(ENDPOINTS.providerGuards.invite, { email: email.trim() });
}

/** Removes an invite that has expired, so the guard can be invited again. */
export function deleteExpiredInvite(guardId: string) {
  return api.delete<unknown>(`${ENDPOINTS.providerGuards.pendingInvite}/${guardId}`);
}

/** A guard of the service provider with the profile they filled in, from `GET /api/sp/guards/<id>`. */
export type ProviderGuardDetail = {
  id: string;
  status: string;
  profile: Record<string, unknown>;
  email: string;
};

type RawDetail = {
  id?: string;
  status?: string | null;
  profile?: Record<string, unknown> | null;
  tenant_admin_user?: { email?: string | null } | null;
};

export async function getProviderGuard(guardId: string): Promise<ProviderGuardDetail> {
  const raw = await api.get<RawDetail>(`${ENDPOINTS.providerGuards.list}/${guardId}`);
  return {
    id: String(raw.id ?? guardId),
    status: String(raw.status ?? '').trim().toLowerCase().replace(/_/g, ' '),
    profile: raw.profile ?? {},
    email: String(raw.tenant_admin_user?.email ?? ''),
  };
}

export type GuardCoverage = {
  regionCode: string;
  cityCode: string;
  radiusKm: number;
  /** Weekly availability as the server stores it (see `availabilityPayload`). */
  weeklyAvailability: Record<string, { start: string; end: string }[]>;
};

/** Sets the work area and weekly availability of one of the provider's guards. */
export function saveGuardCoverage(guardId: string, coverage: GuardCoverage) {
  return api.put<unknown>(`${ENDPOINTS.providerGuards.list}/${guardId}/operational-coverage`, {
    operational_region_code: coverage.regionCode,
    operational_city_code: coverage.cityCode,
    max_travel_radius_km: coverage.radiusKm,
    weekly_availability: coverage.weeklyAvailability,
  });
}

/**
 * Approves a guard whose profile is waiting for review, so they become active. The server answers 400
 * until the work area and weekly availability are set.
 */
export function approveGuard(guardId: string) {
  return api.post<{ message?: string }>(`${ENDPOINTS.providerGuards.list}/${guardId}/status-request`, {
    action: 'activate',
  });
}

/** Deactivates a guard. The server requires a reason, which it keeps in the activity log. */
export function deactivateGuard(guardId: string, reason: string) {
  return api.post<{ message?: string }>(`${ENDPOINTS.providerGuards.list}/${guardId}/status-request`, {
    action: 'deactivate',
    reason: reason.trim(),
  });
}

/** A guard's profile photo, with the cookie the image route checks (the app signs in with a bearer token). */
export function guardPhoto(guardId: string): { uri: string; headers: Record<string, string> } | null {
  const token = getAccessToken();
  if (!token) return null;
  return { uri: `${getApiUrl()}${ENDPOINTS.tenant.imageFile}/${guardId}`, headers: { Cookie: `access_token=${token}` } };
}

/** A readable reason for a failed guards request. */
export function guardsErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    if (error.status === 0 || error.status === 408) return "Couldn't reach GuardGo. Check your connection and try again.";
    if (error.status === 403 && /pending approval/i.test(error.message)) {
      return 'Your company is still waiting for approval. You can invite guards once it is approved.';
    }
    if (error.message && !error.message.startsWith('Request failed')) return error.message;
  }
  return fallback;
}
