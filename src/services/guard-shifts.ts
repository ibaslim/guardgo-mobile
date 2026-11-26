import { ENDPOINTS } from '@/constants/endpoints';
import { lower, toNumber } from '@/services/dashboard-data';
import { api } from '@/services/api';
import type { Raw } from '@/types/api';
import type { GuardShift, GuardShiftDetail, ShiftSlot, ShiftTone, SlotStep } from '@/types/shift';
import type { MonthCursor } from '@/types/time';
import { monthRange } from '@/utils/calendar';
import { parseServerTimestamp, parseWallClock } from '@/utils/dates';
import { deviceTimezone } from '@/utils/request-form';

/** More than a guard will ever work in a month, so one page holds the whole month. */
const MONTH_ROWS = 300;

type RawPage = { items?: Raw[] };

const coordinate = (value: unknown) => (value == null || value === '' ? '' : String(value));

function parseShift(raw: Raw): GuardShift {
  return {
    id: String(raw.id ?? ''),
    requestId: String(raw.request_id ?? ''),
    title: raw.request_title || 'Shift',
    siteName: raw.site_name || 'Site unavailable',
    status: lower(raw.instance_status),
    dateLocal: String(raw.shift_date_local ?? ''),
    start: parseWallClock(raw.shift_start_at_utc),
    end: parseWallClock(raw.shift_end_at_utc),
    staffed: toNumber(raw.slots_staffed),
    required: toNumber(raw.slots_required),
    clientActionRequired: !!raw.client_action_required,
    siteLatitude: coordinate(raw.site_location?.latitude),
    siteLongitude: coordinate(raw.site_location?.longitude),
  };
}

/** The shifts of one month that the signed-in guard can see, earliest first. */
export async function listGuardShifts(cursor: MonthCursor): Promise<GuardShift[]> {
  const { from, to } = monthRange(cursor);
  const page = await api.get<RawPage>(ENDPOINTS.dashboard.shifts, {
    query: { page: 1, rows: MONTH_ROWS, date_from: from, date_to: to },
  });
  return (page.items ?? [])
    .filter((item) => item.id)
    .map(parseShift)
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
}

/** More upcoming shifts than a roster is ever copied to at once; the web lists the same number. */
const REQUEST_SHIFT_ROWS = 100;

/** One request's shifts from `fromDate` ("2026-03-12", at the site) on, earliest first. */
export async function listRequestShifts(requestId: string, fromDate: string): Promise<GuardShift[]> {
  const page = await api.get<RawPage>(ENDPOINTS.dashboard.shifts, {
    query: { page: 1, rows: REQUEST_SHIFT_ROWS, request_id: requestId, date_from: fromDate },
  });
  return (page.items ?? [])
    .filter((item) => item.id)
    .map(parseShift)
    .sort((a, b) => (a.start?.getTime() ?? 0) - (b.start?.getTime() ?? 0));
}

export function shiftTone(shift: GuardShift): ShiftTone {
  switch (shift.status) {
    case 'in_progress':
      return 'success';
    case 'completed':
      return 'neutral';
    case 'cancelled':
    case 'expired':
      return 'danger';
    default:
      return shift.clientActionRequired || shift.status === 'partially_staffed' ? 'warning' : 'primary';
  }
}

export const SHIFT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  partially_staffed: 'Needs guards',
  staffed: 'Staffed',
  in_progress: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

/** Hours between a shift's start and end, 0 when either is missing. */
export function shiftHours(shift: GuardShift) {
  if (!shift.start || !shift.end) return 0;
  return Math.max(0, (shift.end.getTime() - shift.start.getTime()) / 3_600_000);
}

export const isOpenShift = (shift: GuardShift) => !['completed', 'cancelled', 'expired'].includes(shift.status);

export const SLOT_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  reserved: 'Reserved',
  rostered: 'Guard assigned',
  unavailable: 'Guard unavailable',
  late_risk: 'Running late',
  arrival_pending: 'Arrival pending',
  client_confirmation_pending: 'Waiting for client',
  in_progress: 'In progress',
  completed: 'Completed',
  no_show_suspected: 'No-show suspected',
  no_show_confirmed: 'No-show',
  replacement_required: 'Needs replacement',
  cancelled: 'Cancelled',
};

function parseSlot(raw: Raw): ShiftSlot {
  return {
    id: String(raw.id ?? ''),
    number: toNumber(raw.slot_number),
    status: lower(raw.slot_status),
    guardName: String(raw.assigned_guard_name ?? ''),
    guardId: String(raw.assigned_guard_tenant_id ?? ''),
    coverageType: lower(raw.coverage_source_type),
    assignmentId: String(raw.parent_assignment_id ?? ''),
    coverageIndex: toNumber(raw.coverage_slot_index),
    rosterDueAt: parseServerTimestamp(raw.roster_due_at),
    arrivedAt: parseServerTimestamp(raw.arrived_at),
    confirmedAt: parseServerTimestamp(raw.client_confirmed_at),
    startedAt: parseServerTimestamp(raw.started_at),
    completedAt: parseServerTimestamp(raw.completed_at),
  };
}

/** One shift with the positions the signed-in guard can see on it. */
export async function getGuardShift(shiftId: string): Promise<GuardShiftDetail> {
  const response = await api.get<{ shift?: Raw; slots?: Raw[] }>(`${ENDPOINTS.dashboard.shifts}/${shiftId}`);
  return { shift: parseShift(response.shift ?? {}), slots: (response.slots ?? []).filter((slot) => slot.id).map(parseSlot) };
}

const BEFORE_START = ['reserved', 'rostered', 'client_confirmation_pending'];

export function slotStep(slot: ShiftSlot): SlotStep {
  if (slot.status === 'in_progress') return 'check_out';
  if (!BEFORE_START.includes(slot.status) || slot.startedAt) return 'none';
  if (!slot.arrivedAt) return 'check_in';
  return slot.confirmedAt ? 'start' : 'wait_for_client';
}

const slotUrl = (slotId: string, action: string) => `/api/shift-slots/${slotId}/${action}`;

/** The guard arrives: sends the phone's position, which the server checks against the site's geofence. */
export async function checkInToSlot(slotId: string, position: { latitude: number; longitude: number }) {
  await api.post(slotUrl(slotId, 'check-in'), { ...position, timezone: deviceTimezone() });
}

export async function startSlot(slotId: string) {
  await api.post(slotUrl(slotId, 'start'), { timezone: deviceTimezone() });
}

export async function checkOutOfSlot(slotId: string) {
  await api.post(slotUrl(slotId, 'check-out'), {});
}

/** A position a service provider can still put a named guard on: it covers the position and has not started. */
export const isRosterable = (slot: ShiftSlot) => slot.coverageType === 'service_provider' && ['reserved', 'rostered'].includes(slot.status);

/** Names one of the provider's guards for each position of a shift (`slotId` to guard tenant id). */
export async function rosterShift(shiftId: string, assignments: { slotId: string; guardId: string }[]) {
  await api.post(`${ENDPOINTS.dashboard.shifts}/${shiftId}/roster`, {
    assignments: assignments.map((item) => ({ slot_id: item.slotId, guard_tenant_id: item.guardId })),
  });
}
