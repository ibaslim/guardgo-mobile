import { ENDPOINTS } from '@/constants/endpoints';
import { lower, toNumber, type Raw } from '@/services/dashboard-data';
import { api } from '@/services/api';
import { parseServerTimestamp, parseWallClock } from '@/utils/dates';

/** A guard who has checked in at a site and is waiting for the client to confirm they have arrived. */
export type PendingArrival = {
  slotId: string;
  slotNumber: number;
  status: string;
  /** When the guard checked in (a server timestamp, shown on the phone's clock). */
  arrivedAt: Date | null;
  /** How far from the site the guard was when checking in, in metres. Null when it wasn't measured. */
  distanceMeters: number | null;
  guardName: string;
  shiftId: string;
  /** The shift's start and end, as written for the site. */
  start: Date | null;
  end: Date | null;
  requestId: string;
  title: string;
  siteName: string;
};

export type PendingArrivals = { items: PendingArrival[]; total: number };

type RawPage = { items?: Raw[]; total?: number };

function parseArrival(raw: Raw): PendingArrival {
  const distance = raw.distance_meters;
  return {
    slotId: String(raw.slot_id ?? ''),
    slotNumber: toNumber(raw.slot_number),
    status: lower(raw.slot_status),
    arrivedAt: parseServerTimestamp(raw.arrived_at),
    distanceMeters: distance === null || distance === undefined || distance === '' ? null : toNumber(distance),
    guardName: String(raw.assigned_guard_name ?? '') || 'A guard',
    shiftId: String(raw.shift_id ?? ''),
    start: parseWallClock(raw.shift_start_at_utc),
    end: parseWallClock(raw.shift_end_at_utc),
    requestId: String(raw.request_id ?? ''),
    title: raw.request_title || 'Shift',
    siteName: raw.site_name || 'Site unavailable',
  };
}

/** The guards waiting for the signed-in client to confirm their arrival, the longest waiting first. */
export async function listPendingArrivals(rows = 20): Promise<PendingArrivals> {
  const page = await api.get<RawPage>(ENDPOINTS.shiftSlots.pendingArrivals, { query: { page: 1, rows } });
  const items = (page.items ?? []).filter((item) => item.slot_id).map(parseArrival);
  return { items, total: typeof page.total === 'number' ? page.total : items.length };
}

/** The client confirms the guard is at the site, so the guard can start the shift. */
export async function confirmArrival(slotId: string) {
  await api.post(`${ENDPOINTS.shiftSlots.list}/${slotId}/client-confirm`, {});
}
