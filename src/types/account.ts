/** The signed-in user and their tenant, from `GET /api/me`. */
export type AccountInfo = {
  user: {
    email: string;
    username: string;
    full_name: string;
    role: string;
    status: string;
    verificationDate: string | null;
  };
  tenant: {
    id: string;
    name: string;
    tenant_type: string | null;
    status: string | null;
    /** 'service_provider' when a service provider owns this guard. */
    ownership_type: string | null;
    service_provider: { id: string; name: string } | null;
    profile: Record<string, unknown>;
  };
};

/** Which Account screen content a user gets. */
export type AccountKind = 'guard' | 'provider-guard' | 'provider' | 'client' | 'platform';

/**
 * One line of the Profile card. With a `step`, it is a section of the profile that opens its edit
 * screen (`edit-profile/[step]`); without one it is only shown.
 */
export type ProfileStepRow = { title: string; summary: string; step?: string; /** Opens the read-only screen for what the service provider set (`/assigned-schedule`). */ section?: 'area' | 'availability' };
