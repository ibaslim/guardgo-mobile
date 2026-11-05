import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError } from '@/services/api';

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
  const expiry = raw.invite_expires_at ? new Date(raw.invite_expires_at) : null;
  return {
    id: String(raw.id ?? ''),
    name: cleanName(raw.name),
    email: String(raw.email ?? ''),
    status: String(raw.status ?? '').trim().toLowerCase(),
    invite: INVITE_STATES.includes(String(raw.invite_status)) ? (raw.invite_status as InviteState) : null,
    inviteExpiresAt: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
  };
}

export async function listProviderGuards(page: number): Promise<ProviderGuardsPage> {
  const response = await api.get<RawPage>(ENDPOINTS.providerGuards.list, {
    query: { page, rows: GUARDS_PAGE_SIZE },
  });
  return {
    items: (response.items ?? []).map(parseGuard).filter((guard) => guard.id),
    page: response.pagination?.page ?? page,
    totalPages: response.pagination?.total_pages ?? 1,
    totalItems: response.pagination?.total_items ?? 0,
  };
}

/** Emails the guard a link to set their password. The server answers 400 when the email is already used. */
export function inviteGuard(email: string) {
  return api.post<{ message?: string }>(ENDPOINTS.providerGuards.invite, { email: email.trim() });
}

/** Removes an invite that has expired, so the guard can be invited again. */
export function deleteExpiredInvite(guardId: string) {
  return api.delete<unknown>(`${ENDPOINTS.providerGuards.pendingInvite}/${guardId}`);
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
