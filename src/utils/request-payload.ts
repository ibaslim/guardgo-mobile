import { REQUEST_FORM_DEFAULTS } from '@/schemas/request-form';
import { DEFAULT_SCHEDULE_RULES } from '@/constants/schedule';
import type { ClientMetadata } from '@/types/onboarding';
import type { RequestDetail, RequestPayload, RequestSchedule, RequestUpdatePayload, SavedSite, SchedulePayload, ScheduleRules } from '@/types/request';
import type { RequestFormValues } from '@/types/request-form';
import { formatTime12 } from '@/utils/availability';
import { cityCodeFor, cityLabelFor, asObject, asText } from '@/utils/profile';
import { combineDateTime, dateKey, deviceTimezone, localStamp, repeats, to24Hour } from '@/utils/request-form';

const hasNumber = (value: unknown) => value !== null && value !== '' && value !== undefined && Number.isFinite(Number(value));

/** The sites saved in the client's profile (`sites`), in order. */
export function savedSitesFrom(profile: Record<string, unknown> | undefined): SavedSite[] {
  const sites = Array.isArray(profile?.sites) ? profile.sites : [];
  return sites.map((entry, index) => {
    const site = asObject(entry);
    const address = asObject(site.site_address);
    return {
      index,
      name: asText(site.site_name) || `Site ${index + 1}`,
      address: [address.street, address.city, address.province].map(asText).filter(Boolean).join(', '),
      hasCoordinates: hasNumber(address.latitude) && hasNumber(address.longitude),
    };
  });
}

const orNull = (value: string) => value.trim() || null;

/** The request as the server takes it. The form has to have passed `requestFormSchema` first. */
export function buildRequestPayload(values: RequestFormValues, metadata: ClientMetadata | null): RequestPayload {
  const saved = values.site_source === 'saved' && values.saved_site !== null;
  const province = values.province ?? '';
  const provinceLabel = metadata?.canadianProvinces.find((option) => option.value === province)?.label ?? province;

  return {
    title: values.title.trim(),
    timezone: deviceTimezone(),
    fulfillment_mode: values.fulfillment_mode,
    site_index: saved ? Number(values.saved_site) : null,
    site: saved
      ? null
      : {
          site_name: values.site_name.trim(),
          site_manager_contact: orNull(values.site_manager),
          manager_email: orNull(values.manager_email),
          site_address: {
            street: orNull(values.street),
            city: cityLabelFor(metadata?.canadianCitiesByProvince, province, values.city ?? ''),
            country: 'CA',
            province: provinceLabel,
            postal_code: orNull(values.postal_code),
            latitude: Number(values.latitude),
            longitude: Number(values.longitude),
          },
        },
    requested_guard_type: values.guard_type,
    guards_required: Number(values.guards_required),
    requested_start_at: localStamp(combineDateTime(values.start_date, values.start_time)),
    requested_end_at: localStamp(combineDateTime(values.end_date, values.end_time)),
    request_expires_at: localStamp(combineDateTime(values.expiry_date, values.expiry_time)),
    special_instructions: orNull(values.instructions),
    // A repeating job is billed over time; a single job is billed once.
    invoice_contract_type: repeats(values) ? 'long_term' : 'short_term',
    invoice_cutoff_day: null,
    invoice_recipient_email: orNull(values.invoice_email),
    max_match_results: 25,
  };
}

/**
 * The repeat pattern. Only for a form that repeats. The attendance rules are kept from the schedule the
 * request already has, when the client set one; otherwise they are the standard ones.
 */
export function buildSchedulePayload(values: RequestFormValues, existing: RequestSchedule | null = null): SchedulePayload {
  const rules = existing && !existing.systemGenerated ? existing.rules : DEFAULT_SCHEDULE_RULES;
  return {
    timezone: deviceTimezone(),
    schedule_type: values.repeat === 'recurring_weekly' ? 'recurring_weekly' : 'date_range',
    start_date: values.start_date ? dateKey(values.start_date) : '',
    end_date: values.repeat_until ? dateKey(values.repeat_until) : null,
    start_time_local: to24Hour(values.start_time),
    end_time_local: to24Hour(values.end_time),
    recurrence_days: values.repeat === 'recurring_weekly' ? values.repeat_days : [],
    ...rulesPayload(rules),
    active: true,
  };
}

/** The attendance rules as the server takes them. */
export function rulesPayload(rules: ScheduleRules) {
  return {
    generation_horizon_days: rules.horizonDays,
    roster_due_offset_minutes: rules.rosterLeadMinutes,
    unavailable_cutoff_minutes: rules.leaveCutoffMinutes,
    late_grace_minutes: rules.lateGraceMinutes,
    no_show_cutoff_minutes: rules.noShowMinutes,
    checkin_geofence_meters: rules.geofenceMeters,
  };
}

const parseDay = (text: string) => {
  const [year, month, day] = text.split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const clock = (date: Date | null) => (date ? formatTime12(date) : '');

/**
 * A saved draft as form values, to edit it. The site always comes back as an address (even when the
 * request used a saved site), since an edit sends the address itself.
 */
export function formFromRequest(
  request: RequestDetail,
  schedule: RequestSchedule | null,
  metadata: ClientMetadata | null
): RequestFormValues {
  const { site } = request;
  const provinceCode =
    metadata?.canadianProvinces.find(
      (option) => option.value.toLowerCase() === site.province.toLowerCase() || option.label.toLowerCase() === site.province.toLowerCase()
    )?.value ?? null;
  // A one-day schedule is the same as no repeat.
  const pattern = schedule && schedule.kind !== 'one_time' ? schedule : null;

  return {
    ...REQUEST_FORM_DEFAULTS,
    title: request.title,
    fulfillment_mode: request.fulfillment ?? REQUEST_FORM_DEFAULTS.fulfillment_mode,
    guard_type: request.guardType || null,
    guards_required: String(request.guardsRequired || 1),
    instructions: request.instructions,
    site_source: 'manual',
    site_name: request.siteName,
    site_manager: site.contact,
    manager_email: site.email,
    street: site.street,
    province: provinceCode,
    city: provinceCode ? cityCodeFor(metadata?.canadianCitiesByProvince, provinceCode, site.city) : null,
    postal_code: site.postalCode,
    latitude: site.latitude,
    longitude: site.longitude,
    start_date: request.start,
    start_time: clock(request.start),
    end_date: request.end,
    end_time: clock(request.end),
    expiry_date: request.expiresAt,
    expiry_time: clock(request.expiresAt),
    repeat: pattern?.kind === 'date_range' || pattern?.kind === 'recurring_weekly' ? pattern.kind : 'none',
    repeat_until: pattern ? parseDay(pattern.endDate) : null,
    repeat_days: pattern ? pattern.recurrenceDays : [],
    invoice_email: request.invoiceEmail,
  };
}

/** The changes to send for an update to a live request: the form's values without the title and guard count. */
export function buildUpdatePayload(values: RequestFormValues, metadata: ClientMetadata | null): RequestUpdatePayload {
  const { title: _title, guards_required: _guards, site_index: _site, ...rest } = buildRequestPayload(values, metadata);
  return rest;
}
