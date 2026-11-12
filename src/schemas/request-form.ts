import { z } from 'zod';

import type { RequestFormValues } from '@/types/request-form';
import { combineDateTime, dateKey } from '@/utils/request-form';
import { EMAIL, isBlank } from '@/utils/validation';

export const REQUEST_FORM_DEFAULTS: RequestFormValues = {
  title: '',
  fulfillment_mode: 'individual_only',
  guard_type: null,
  guards_required: '1',
  instructions: '',
  site_source: 'manual',
  saved_site: null,
  site_name: '',
  site_manager: '',
  manager_email: '',
  street: '',
  province: null,
  city: null,
  postal_code: '',
  latitude: '',
  longitude: '',
  start_date: null,
  start_time: '',
  end_date: null,
  end_time: '',
  expiry_date: null,
  expiry_time: '',
  repeat: 'none',
  repeat_until: null,
  repeat_days: [],
  invoice_email: '',
};

/** The fields each section owns, so a section can be checked or scrolled to on its own. */
export const REQUEST_SECTION_FIELDS = {
  job: ['title', 'fulfillment_mode', 'guard_type', 'guards_required', 'instructions'],
  site: ['site_source', 'saved_site', 'site_name', 'site_manager', 'manager_email', 'street', 'province', 'city', 'postal_code', 'latitude', 'longitude'],
  when: ['start_date', 'start_time', 'end_date', 'end_time', 'expiry_date', 'expiry_time', 'repeat', 'repeat_until', 'repeat_days'],
  billing: ['invoice_email'],
} as const satisfies Record<string, readonly (keyof RequestFormValues)[]>;

const text = z.string();
const choice = z.string().nullable();
const day = z.date().nullable();

const shape = z.object({
  title: text,
  fulfillment_mode: z.enum(['individual_only', 'service_provider_only', 'hybrid']),
  guard_type: choice,
  guards_required: text,
  instructions: text,
  site_source: z.enum(['saved', 'manual']),
  saved_site: choice,
  site_name: text,
  site_manager: text,
  manager_email: text,
  street: text,
  province: choice,
  city: choice,
  postal_code: text,
  latitude: text,
  longitude: text,
  start_date: day,
  start_time: text,
  end_date: day,
  end_time: text,
  expiry_date: day,
  expiry_time: text,
  repeat: z.enum(['none', 'date_range', 'recurring_weekly']),
  repeat_until: day,
  repeat_days: z.array(z.string()),
  invoice_email: text,
});

type Fail = (path: keyof RequestFormValues, message: string) => void;

const coordinate = (value: string, limit: number) => {
  const number = Number(value);
  return value.trim() !== '' && Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
};

/** Rules for a draft: what is filled in has to be right, but the dates can still be missing. */
export const requestFormSchema = shape.superRefine((values, ctx) => {
  const fail: Fail = (path, message) => ctx.addIssue({ code: 'custom', path: [path], message });

  if (isBlank(values.title)) fail('title', 'Give the job a title.');

  const guards = Number(values.guards_required);
  if (!Number.isInteger(guards) || guards < 1) fail('guards_required', 'Enter at least 1 guard.');

  if (values.site_source === 'saved') {
    if (!values.saved_site) fail('saved_site', 'Choose one of your saved sites.');
  } else {
    if (isBlank(values.site_name)) fail('site_name', 'Enter the site name.');
    if (!values.province) fail('province', 'Choose a province.');
    if (!values.city) fail('city', 'Choose a city.');
    if (!isBlank(values.manager_email) && !EMAIL.test(values.manager_email.trim())) {
      fail('manager_email', 'Enter a valid email address.');
    }
    const lat = coordinate(values.latitude, 90);
    const lng = coordinate(values.longitude, 180);
    if (isBlank(values.latitude) || lat === null) fail('latitude', 'Set the site location: latitude must be a number from -90 to 90.');
    if (isBlank(values.longitude) || lng === null) fail('longitude', 'Set the site location: longitude must be a number from -180 to 180.');
  }

  if (isBlank(values.invoice_email)) fail('invoice_email', 'Enter the email to send invoices to.');
  else if (!EMAIL.test(values.invoice_email.trim())) fail('invoice_email', 'Enter a valid email address.');

  // Start and end come as a pair: both date and time, or none of them.
  const anyStart = Boolean(values.start_date) || !isBlank(values.start_time);
  const anyEnd = Boolean(values.end_date) || !isBlank(values.end_time);
  if (anyStart && (!values.start_date || isBlank(values.start_time))) fail('start_date', 'Choose both a start date and time.');
  if (anyEnd && (!values.end_date || isBlank(values.end_time))) fail('end_date', 'Choose both an end date and time.');
  if (anyStart !== anyEnd) fail(anyStart ? 'end_date' : 'start_date', 'Set both the start and the end, or leave both empty.');

  const start = combineDateTime(values.start_date, values.start_time);
  const end = combineDateTime(values.end_date, values.end_time);
  if (start && end && end <= start) fail('end_date', 'The end has to be after the start.');

  const anyExpiry = Boolean(values.expiry_date) || !isBlank(values.expiry_time);
  if (anyExpiry && (!values.expiry_date || isBlank(values.expiry_time))) fail('expiry_date', 'Choose both a date and a time.');

  if (values.repeat !== 'none') {
    if (!values.start_date || isBlank(values.start_time)) fail('start_date', 'A repeating job needs the first shift\'s start.');
    if (!values.end_date || isBlank(values.end_time)) fail('end_date', 'A repeating job needs the first shift\'s end.');
    if (!values.repeat_until) fail('repeat_until', 'Choose the last day.');
    else if (values.start_date && dateKey(values.repeat_until) < dateKey(values.start_date)) {
      fail('repeat_until', 'The last day can\'t be before the first shift.');
    }
    if (values.repeat === 'recurring_weekly' && values.repeat_days.length === 0) fail('repeat_days', 'Choose at least one weekday.');
  }
});

export type RequestFormIssues = Partial<Record<keyof RequestFormValues, string>>;

/** Extra rules to publish: the job needs dates, and a response cutoff that is still ahead and before it starts. */
export function publishIssues(values: RequestFormValues, now = new Date()): RequestFormIssues {
  const issues: RequestFormIssues = {};
  const start = combineDateTime(values.start_date, values.start_time);
  const end = combineDateTime(values.end_date, values.end_time);
  const expiry = combineDateTime(values.expiry_date, values.expiry_time);

  if (!start) issues.start_date = 'Set when the job starts before publishing.';
  if (!end) issues.end_date = 'Set when the job ends before publishing.';
  if (!expiry) issues.expiry_date = 'Set how long guards have to respond before publishing.';
  else if (expiry <= now) issues.expiry_date = 'The response time has to be in the future.';
  else if (start && expiry > start) issues.expiry_date = 'Guards have to respond before the job starts.';
  return issues;
}
