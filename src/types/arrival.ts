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
