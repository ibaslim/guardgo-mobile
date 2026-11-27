/** Where a job is in its life, for the guard it was offered to. */
export type JobStatus =
  | 'offered'
  | 'reconfirmation_required'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired'
  | 'closed_filled'
  | 'superseded';

export type GuardJob = {
  id: string;
  requestId: string;
  title: string;
  siteName: string;
  status: JobStatus | string;
  /** "shift_replacement" when the job covers one missed shift. */
  scope: string;
  /** True when the request runs on a schedule: starting and finishing then happen through shifts. */
  hasSchedule: boolean;
  /** Hourly pay on offer, when the request carries one. */
  hourlyPay: number | null;
  guardsRequired: number;
  guardType: string;
  start: Date | null;
  end: Date | null;
  /** When the offer must be answered by (or reconfirmed by). */
  dueAt: Date | null;
  updatedAt: Date | null;
  offeredAt: Date | null;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  /** A note the sender attached to the offer. */
  note: string;
  /** Who the job was offered to, by name, as the client sees it. Empty when the server sent none. */
  assignee: string;
  /** True when the job is offered to a service provider (which commits a number of guard positions) rather than a guard. */
  forProvider: boolean;
  /** Guard positions this assignee has committed to. */
  committed: number;
  /** Positions of the request nobody has taken yet. */
  openSlots: number;
};

export type GuardJobsPage = {
  items: GuardJob[];
  page: number;
  totalPages: number;
  totalItems: number;
};

export type JobsQuery = {
  /** One assignment status, or all jobs when left out. */
  status?: JobStatus;
  /** Matches the request title or site. */
  keyword?: string;
  rows?: number;
};

export type JobAction = {
  label: string;
  /** The status the job moves to. */
  status: JobStatus;
  kind: 'primary' | 'secondary' | 'danger';
  /** True when the server wants a reason, so the app asks for one first. */
  needsReason: boolean;
  /** Set for a service provider's acceptance: how many guard positions it can cover. The app asks first. */
  slots?: { min: number; max: number };
};
