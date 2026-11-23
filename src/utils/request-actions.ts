import type { RequestPermissions, RequestSummary } from '@/types/request';

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
