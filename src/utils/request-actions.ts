import type { RequestSummary } from '@/services/requests';

/** What a client can do with a request, from where it is in its life. */
export type RequestPermissions = {
  /** Change a draft, then publish it. */
  editDraft: boolean;
  /** Send changes to a request that is already out to guards. */
  updateLive: boolean;
  /** Ask for more guards on a live request. */
  addCoverage: boolean;
  /** Stop the request, or mark it finished. */
  endRequest: boolean;
};

const LIVE = ['submitted', 'assigned'];

export function clientPermissions(request: Pick<RequestSummary, 'status' | 'staffing'>): RequestPermissions {
  const live = LIVE.includes(request.status) && request.staffing !== 'expired';
  return {
    editDraft: request.status === 'draft',
    updateLive: live,
    addCoverage: live,
    endRequest: [...LIVE, 'in_progress'].includes(request.status),
  };
}
