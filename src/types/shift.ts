export type ShiftStatus =
  | 'scheduled'
  | 'partially_staffed'
  | 'staffed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'expired';

export type GuardShift = {
  id: string;
  requestId: string;
  title: string;
  siteName: string;
  status: ShiftStatus | string;
  /** The shift's date at the site, "2026-03-12". */
  dateLocal: string;
  start: Date | null;
  end: Date | null;
  staffed: number;
  required: number;
  clientActionRequired: boolean;
  /**
   * The site's position, when the shift response carries it. A guard rostered by a service provider can't
   * read the request (it is assigned to the provider), so this is the only place they can get it from.
   */
  siteLatitude: string;
  siteLongitude: string;
};

/** How a shift reads on the calendar: its colour. */
export type ShiftTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/** One position on a shift, and how far its guard has got: arrived, confirmed by the client, started, done. */
export type ShiftSlot = {
  id: string;
  number: number;
  status: string;
  guardName: string;
  /** The guard tenant on the position, or empty. */
  guardId: string;
  /** Who covers the position: "service_provider" or a direct guard. */
  coverageType: string;
  rosterDueAt: Date | null;
  arrivedAt: Date | null;
  confirmedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
};

export type GuardShiftDetail = { shift: GuardShift; slots: ShiftSlot[] };

/** What a guard can do next on one position of a shift. `wait` has no button: the client has to act. */
export type SlotStep = 'check_in' | 'wait_for_client' | 'start' | 'check_out' | 'none';
