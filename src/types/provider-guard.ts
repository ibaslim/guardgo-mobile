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

/** Which guards the server returns: those with this one tenant `status`, or all of them when left out. */
export type GuardsQuery = { status?: GuardStatus; rows?: number };

/** The tenant statuses the server knows. */
export type GuardStatus = 'onboarding' | 'pending_verification' | 'pending_activation' | 'active' | 'inactive' | 'banned';

/** A guard of the service provider with the profile they filled in, from `GET /api/sp/guards/<id>`. */
export type ProviderGuardDetail = {
  id: string;
  status: string;
  profile: Record<string, unknown>;
  email: string;
};

export type GuardCoverage = {
  regionCode: string;
  cityCode: string;
  radiusKm: number;
  /** Weekly availability as the server stores it (see `availabilityPayload`). */
  weeklyAvailability: Record<string, { start: string; end: string }[]>;
};
