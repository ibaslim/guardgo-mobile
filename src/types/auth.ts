/** Where the signed-in user's tenant stands in the admin review. Loaded from GET /api/tenant, not part of the token response. */
export type TenantReview = {
  /** "pending_activation" while the profile waits for approval, "active" once approved. */
  status: string;
  /** The tenant's id, used to load its profile photo. */
  id?: string;
  /** True for a guard owned by a service provider, whose provider approves the profile. */
  providerOwned: boolean;
};

/** User session details returned with a token (login, refresh). */
export type Session = {
  username: string;
  role: string;
  status: string;
  hasOnboarding: boolean;
  subscription: boolean;
  verificationDate: string | null;
  licenses: string[];
  /** Set by `syncTenantReview`. A token refresh keeps it, since the token response doesn't include it. */
  tenant?: TenantReview;
};

export type TokenResponse = {
  access_token: string;
  token_type: 'bearer';
  session?: Session;
};

/** Kind of account a new user signs up for. */
export type TenantType = 'client' | 'guard' | 'service_provider';

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  tenant_type: TenantType;
};
