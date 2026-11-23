import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import type { AccountInfo, AccountKind } from '@/types/account';
import { roleAreaFor } from '@/utils/role';

export function getAccount() {
  return api.get<AccountInfo>(ENDPOINTS.account.me);
}

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
