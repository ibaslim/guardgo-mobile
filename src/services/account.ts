import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import { roleAreaFor } from '@/utils/role';

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

export function getAccount() {
  return api.get<AccountInfo>(ENDPOINTS.account.me);
}

/** Which Account screen content a user gets. */
export type AccountKind = 'guard' | 'provider-guard' | 'provider' | 'client' | 'platform';

/**
 * The kind of account. The role decides it right away; once the account is loaded, a guard owned
 * by a service provider is told apart from a self-managed one.
 */
export function accountKind(role: string | null | undefined, account: AccountInfo | null): AccountKind {
  const area = roleAreaFor(role);
  if (area === 'guard') return account?.tenant.ownership_type === 'service_provider' ? 'provider-guard' : 'guard';
  if (area === 'provider') return 'provider';
  if (area === 'client') return 'client';
  return 'platform';
}
