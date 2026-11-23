import type { FulfillmentMode } from '@/types/request';

/** How a request repeats. `none` is a single job; the others create a shift on each matching day. */
export type RepeatKind = 'none' | 'date_range' | 'recurring_weekly';

/** Where the job is: one of the client's saved sites, or an address typed in for this request only. */
export type SiteSource = 'saved' | 'manual';

/**
 * Everything the request form collects, in one flat form. Dates and times are kept apart, as the
 * pickers give them: a date, and a time as text like "09:30 AM". Coordinates are kept as typed text.
 */
export type RequestFormValues = {
  // The job
  title: string;
  fulfillment_mode: FulfillmentMode;
  guard_type: string | null;
  guards_required: string;
  instructions: string;

  // The site
  site_source: SiteSource;
  /** The saved site's place in the client's profile, as text. */
  saved_site: string | null;
  site_name: string;
  site_manager: string;
  manager_email: string;
  street: string;
  province: string | null;
  city: string | null;
  postal_code: string;
  latitude: string;
  longitude: string;

  // When. With a repeat these describe the first shift.
  start_date: Date | null;
  start_time: string;
  end_date: Date | null;
  end_time: string;
  /** The last moment someone can still respond. Needed to publish. */
  expiry_date: Date | null;
  expiry_time: string;

  // Repeat
  repeat: RepeatKind;
  /** The last day of the pattern (date range or weekdays). */
  repeat_until: Date | null;
  /** Weekday codes ("mon" ... "sun") for a weekly repeat. */
  repeat_days: string[];

  // Billing
  invoice_email: string;
};
