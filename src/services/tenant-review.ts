import { ENDPOINTS } from '@/constants/endpoints';
import { api, updateSession } from '@/services/api';

type TenantReviewResponse = {
  status?: string;
  approvals_required?: number;
  approvals_done?: number;
  ownership_type?: string | null;
  service_provider_tenant_id?: string | null;
};

/** The web app treats the old "pending_verification" status the same as "pending_activation". */
export function isAwaitingApproval(status: string | null | undefined) {
  const value = String(status ?? '').trim().toLowerCase();
  return value === 'pending_activation' || value === 'pending_verification';
}

/**
 * Loads the tenant's review status into the session, so the root layout can show the "under review"
 * screen to a guard whose profile an admin hasn't approved yet (the same rule as the web app's
 * pendingVerificationGuard). Throws if the server can't be reached.
 */
export async function syncTenantReview() {
  const tenant = await api.get<TenantReviewResponse>(ENDPOINTS.tenant.profile);
  updateSession({
    tenant: {
      status: String(tenant.status ?? '').trim().toLowerCase(),
      approvalsRequired: Math.max(Number(tenant.approvals_required) || 1, 1),
      approvalsDone: Math.max(Number(tenant.approvals_done) || 0, 0),
      providerOwned: tenant.ownership_type === 'service_provider' && Boolean(tenant.service_provider_tenant_id),
    },
  });
}
