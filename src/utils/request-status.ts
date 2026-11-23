import type { FulfillmentMode, RequestGroup, RequestStatus, RequestSummary, StaffingStatus } from '@/types/request';
import type { BadgeKind } from '@/types/ui';
import { formatDate, formatTime } from '@/utils/format';

export const STATUS_LABELS: Record<RequestStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  assigned: 'Assigned',
  in_progress: 'In progress',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export const STATUS_KINDS: Record<RequestStatus, BadgeKind> = {
  draft: 'secondary',
  submitted: 'primary',
  assigned: 'success',
  in_progress: 'success',
  cancelled: 'danger',
  closed: 'secondary',
};

export const STAFFING_LABELS: Record<StaffingStatus, string> = {
  pending_review: 'Awaiting approval',
  review_returned: 'Sent back for changes',
  open: 'Looking for guards',
  partially_filled: 'Partly covered',
  filled: 'Fully covered',
  expired: 'Offer expired',
};

export const FULFILLMENT_LABELS: Record<FulfillmentMode, string> = {
  individual_only: 'Direct guards',
  service_provider_only: 'Service providers',
  hybrid: 'Guards or providers',
};

const GROUPS: Record<RequestGroup, readonly RequestStatus[]> = {
  draft: ['draft'],
  live: ['submitted', 'assigned', 'in_progress'],
  done: ['cancelled', 'closed'],
};

export const inGroup = (request: RequestSummary, group: RequestGroup) => GROUPS[group].includes(request.status);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** "12 Mar 2026, 9:00 AM – 5:00 PM", with both dates when the job spans days. */
export function formatWindow(start: Date | null, end: Date | null) {
  if (!start) return 'No dates set';
  if (!end) return `${formatDate(start)}, ${formatTime(start)}`;
  if (sameDay(start, end)) return `${formatDate(start)}, ${formatTime(start)} – ${formatTime(end)}`;
  return `${formatDate(start)}, ${formatTime(start)} – ${formatDate(end)}, ${formatTime(end)}`;
}

/** "2 of 5 guards" */
export function coverageText(filled: number, required: number) {
  if (required <= 0) return 'No guards requested';
  return `${filled} of ${required} ${required === 1 ? 'guard' : 'guards'}`;
}

export const WAVE_LABELS: Record<string, string> = {
  pending_review: 'Awaiting approval',
  active: 'Offers out',
  returned: 'Sent back',
  filled: 'Filled',
  expired: 'Expired',
  superseded: 'Replaced',
  cancelled: 'Cancelled',
};
