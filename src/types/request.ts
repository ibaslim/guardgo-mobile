/** Where a request is in its life. A client drafts it, publishes it, and it ends cancelled or closed. */
export type RequestStatus = 'draft' | 'submitted' | 'assigned' | 'in_progress' | 'cancelled' | 'closed';

/** How well the published request is staffed. Absent for a draft. */
export type StaffingStatus = 'pending_review' | 'review_returned' | 'open' | 'partially_filled' | 'filled' | 'expired';

/** Who may cover the job. */
export type FulfillmentMode = 'individual_only' | 'service_provider_only' | 'hybrid';

/** One request, as the lists show it. The same for a client, a guard and a service provider. */
export type RequestSummary = {
  id: string;
  title: string;
  status: RequestStatus;
  staffing: StaffingStatus | null;
  fulfillment: FulfillmentMode | null;
  siteName: string;
  city: string;
  guardsRequired: number;
  /** Positions already covered. */
  filled: number;
  start: Date | null;
  end: Date | null;
  /** The last moment someone can still respond. */
  expiresAt: Date | null;
  createdAt: Date | null;
};

export type RequestsPage = {
  items: RequestSummary[];
  page: number;
  totalPages: number;
  totalItems: number;
};

export type ListRequestsOptions = {
  page: number;
  /** Matches the title or the site. */
  keyword?: string;
};

/** The money a client is quoted for a request. */
export type RequestPricing = {
  currency: string;
  hourlyRate: number | null;
  estimatedHours: number | null;
  estimatedTotal: number | null;
  /** Hours one guard works on this job. */
  hoursEach: number | null;
  /** Weekend jobs are quoted at the weekend rate. */
  weekend: boolean;
};

/** One request with everything its details screen shows. */
export type RequestDetail = RequestSummary & {
  guardType: string;
  instructions: string;
  timezone: string;
  revision: number;
  site: {
    contact: string;
    email: string;
    /** Street, city, province and postal code on one line. */
    address: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: string;
    longitude: string;
    /** Which of the client's saved sites this request used, or null for a one-off address. */
    savedIndex: number | null;
  };
  /** The client's price. Only a client (or the platform) is sent it; empty for a guard and a provider. */
  pricing: RequestPricing | null;
  billingCycle: string;
  invoiceEmail: string;
  /** Why the request is locked: review_pending, filled, request_expired, request_cancelled or request_closed. */
  lockReason: string;
  /** When it was published to guards. */
  publishedAt: Date | null;
  /** When it was cancelled, closed or ran out of time. */
  endedAt: Date | null;
  /** How many of the guards considered fit the job. Only a client is sent the match results. */
  eligibleGuards: number | null;
  candidateTotal: number | null;
  /** The server's own plain-language note on how this request is invoiced. */
  invoiceNote: string;
  invoiceStatus: string;
};

/** Where an offer round is: waiting for approval, sent out, or finished one way or another. */
export type WaveStatus = 'pending_review' | 'active' | 'returned' | 'filled' | 'expired' | 'superseded' | 'cancelled';

/** One round of offers sent to guards or providers for a request. */
export type RequestWave = {
  id: string;
  number: number;
  status: WaveStatus | string;
  offers: number;
  accepted: number;
  expiresAt: Date | null;
  /** When the offers went out. */
  activatedAt: Date | null;
  /** Why the round was sent back, written by the reviewer. Only a client is sent it. */
  reviewNote: string;
};

/** A site typed in for one request (not one of the client's saved sites). */
export type SiteInput = {
  site_name: string;
  site_manager_contact: string | null;
  manager_email: string | null;
  site_address: {
    street: string | null;
    city: string;
    country: string;
    province: string;
    postal_code: string | null;
    latitude: number;
    longitude: number;
  };
};

/** What the server takes to create or edit a draft. Times are plain local ("2026-11-20T09:00"). */
export type RequestPayload = {
  title: string;
  timezone: string;
  fulfillment_mode: FulfillmentMode;
  /** A saved site, by its place in the client's profile. Then `site` is null. */
  site_index: number | null;
  site: SiteInput | null;
  requested_guard_type: string | null;
  guards_required: number;
  requested_start_at: string | null;
  requested_end_at: string | null;
  request_expires_at: string | null;
  special_instructions: string | null;
  invoice_contract_type: 'short_term' | 'long_term';
  invoice_cutoff_day: null;
  invoice_recipient_email: string | null;
  max_match_results: number;
};

export type ScheduleKind = 'one_time' | 'date_range' | 'recurring_weekly';

/** How a request repeats: the same shift every day in a range, or on chosen weekdays. */
export type SchedulePayload = {
  timezone: string;
  schedule_type: ScheduleKind;
  start_date: string;
  end_date: string | null;
  start_time_local: string;
  end_time_local: string;
  recurrence_days: string[];
  generation_horizon_days: number;
  roster_due_offset_minutes: number;
  unavailable_cutoff_minutes: number;
  late_grace_minutes: number;
  no_show_cutoff_minutes: number;
  checkin_geofence_meters: number;
  active: boolean;
};

/** The attendance rules a schedule's shifts follow. Minutes, except the geofence (meters) and horizon (days). */
export type ScheduleRules = {
  /** How many days ahead shifts are created. More are added as days pass. */
  horizonDays: number;
  /** How long before a shift starts a provider must have named the guard. */
  rosterLeadMinutes: number;
  /** Until how close to the start a guard can still report leave. */
  leaveCutoffMinutes: number;
  /** How long after the start a guard can arrive before being marked late. */
  lateGraceMinutes: number;
  /** How long after the start a missing guard is confirmed as a no-show. */
  noShowMinutes: number;
  /** How near the site a guard has to be to check in. */
  geofenceMeters: number;
};

/** The schedule saved for a request: how it turns into dated shifts, and the rules those shifts follow. */
export type RequestSchedule = {
  id: string;
  kind: ScheduleKind;
  /** "2026-11-20" */
  startDate: string;
  endDate: string;
  recurrenceDays: string[];
  /** IANA name, like "America/Toronto". The shift times are in it. */
  timezone: string;
  /** "09:00", 24-hour. An end at or before the start runs overnight. */
  startTime: string;
  endTime: string;
  rules: ScheduleRules;
  /** False when it was paused (on the web): it creates no shifts. */
  active: boolean;
  /**
   * True when the server made it from the request's own start and end, because the client never set one.
   * It is then a single shift with the standard rules.
   */
  systemGenerated: boolean;
  /** Shifts made from it so far, when the server says. */
  shiftCount: number | null;
};

/** The two ways a live request ends: cancelled before it is done, or closed once the work is over. */
export type EndStatus = 'cancelled' | 'closed';

/** The changes an update to a live request can carry. The title and the guard count can't be changed this way. */
export type RequestUpdatePayload = Omit<RequestPayload, 'title' | 'guards_required' | 'site_index'>;

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
  /** Set how a published request repeats as shifts, and their attendance rules. A draft does it in its form. */
  planShifts: boolean;
};

/** One of the client's saved sites, as the request form can pick it. */
export type SavedSite = {
  /** Its place in the client's profile: the number a request names it by. */
  index: number;
  name: string;
  /** Street, city and province on one line. */
  address: string;
  /** A site without a location can't be used: guards are matched by distance. */
  hasCoordinates: boolean;
};

/** The groups a list can be filtered into: what still needs attention, and what is over. */
export type RequestGroup = 'draft' | 'live' | 'done';
