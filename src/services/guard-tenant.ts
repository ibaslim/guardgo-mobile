import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import {
  EMPTY_AVAILABILITY,
  EMPTY_IDENTITY_DOCUMENT,
  EMPTY_POLICE_CLEARANCE,
  EMPTY_SECURITY_LICENSE,
  IDENTITY_DOCUMENT_COUNT,
  MAX_DOCUMENTS_PER_LIST,
} from '@/schemas/guard-onboarding';
import type {
  GuardMetadata,
  GuardOnboardingValues,
  UploadedFile,
  WeeklyAvailabilityValues,
} from '@/types/guard-onboarding';
import { WEEK_DAYS } from '@/types/guard-onboarding';
import { formatTime12, timeToDate } from '@/utils/availability';
import { fromIsoDate, toIsoDate } from '@/utils/dates';
import { formatPhone, phoneDigits, toE164 } from '@/utils/phone';
import { asObject, asText, cityCodeFor, cityLabelFor } from '@/utils/profile';

type TenantUpdateResponse = { message?: string; id?: string; status?: string };

export function getGuardMetadata() {
  return api.get<GuardMetadata>(ENDPOINTS.public.guardMetadata);
}

// ---------------------------------------------------------------------------------------------
// Reading a saved profile
// ---------------------------------------------------------------------------------------------

const asList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map((entry) => asObject(entry)) : [];

/** The file info saved on a document, or null when no file was attached. */
export function parseFile(entry: Record<string, unknown>): UploadedFile | null {
  const id = asText(entry.document_file_id);
  const url = asText(entry.document_file_url);
  if (!id || !url) return null;
  const size = Number(entry.document_file_size);
  return {
    id,
    url,
    name: asText(entry.document_file_name) || 'Document',
    mimeType: asText(entry.document_file_mime_type),
    size: Number.isFinite(size) ? size : 0,
  };
}

/** A time saved by the web or the app, as "09:30 AM". Text that can't be read is kept as it is. */
function normalizeTime(value: unknown) {
  const text = asText(value);
  const parsed = timeToDate(text);
  return parsed ? formatTime12(parsed) : text;
}

/** The availability the server saved, as one entry per day with its time ranges. */
export function parseAvailability(value: unknown): WeeklyAvailabilityValues {
  const saved = asObject(value);
  const result: WeeklyAvailabilityValues = JSON.parse(JSON.stringify(EMPTY_AVAILABILITY));
  for (const name of WEEK_DAYS) {
    const ranges = asList(saved[name])
      .map((range) => ({ start: normalizeTime(range.start), end: normalizeTime(range.end) }))
      .filter((range) => range.start && range.end);
    result[name] = { enabled: ranges.length > 0, ranges };
  }
  return result;
}

/**
 * The saved guard profile as onboarding form values, or null when nothing was saved yet. This is the
 * reverse of `buildGuardProfile`. Cities are saved as names for the home address and as codes for
 * the operational city.
 */
export function parseGuardProfile(
  profile: Record<string, unknown> | undefined,
  metadata: GuardMetadata
): Partial<GuardOnboardingValues> | null {
  if (!profile || Object.keys(profile).length === 0) return null;

  const address = asObject(profile.home_address);
  const secondary = asObject(profile.secondary_contact);
  const identification = asObject(profile.identification);
  const cities = metadata.canadianCitiesByProvince;

  const province = asText(address.province);
  const operationalProvince = asText(profile.operational_region_code);
  const radius = Number(profile.max_travel_radius_km);

  const documents = asList(identification.documents)
    .slice(0, IDENTITY_DOCUMENT_COUNT)
    .map((doc) => ({
      document_type: asText(doc.document_type) || null,
      number: asText(doc.document_number),
      province: asText(doc.province) || null,
      passport_country: asText(doc.passport_country) || null,
      expiry_date: fromIsoDate(doc.expiry_date),
      file: parseFile(doc),
    }));
  while (documents.length < IDENTITY_DOCUMENT_COUNT) documents.push({ ...EMPTY_IDENTITY_DOCUMENT });

  const licenses = asList(profile.security_licenses)
    .slice(0, MAX_DOCUMENTS_PER_LIST)
    .map((license) => ({
      full_legal_name: asText(license.full_legal_name),
      license_number: asText(license.license_number),
      license_type: asText(license.license_type) || null,
      issuing_province: asText(license.issuing_province) || null,
      issuing_authority: asText(license.issuing_authority),
      issue_date: fromIsoDate(license.issue_date),
      expiry_date: fromIsoDate(license.expiry_date),
      file: parseFile(license),
    }));

  const clearances = asList(profile.police_clearances)
    .slice(0, MAX_DOCUMENTS_PER_LIST)
    .map((record) => {
      const clearanceProvince = asText(record.issuing_province);
      return {
        issuing_authority_type: asText(record.issuing_authority) || null,
        issuing_authority_other: asText(record.issuing_authority_other),
        issuing_province: clearanceProvince || null,
        issuing_city: cityCodeFor(cities, clearanceProvince, asText(record.issuing_city)),
        issue_date: fromIsoDate(record.issue_date),
        reference_number: asText(record.reference_number),
        file: parseFile(record),
      };
    });

  const certificates = asList(profile.training_certificates)
    .slice(0, MAX_DOCUMENTS_PER_LIST)
    .map((cert) => ({
      certificate_name: asText(cert.certificate_name) || null,
      issuing_organization: asText(cert.issuing_organization) || null,
      issuing_organization_other: asText(cert.issuing_organization_other),
      issue_date: fromIsoDate(cert.issue_date),
      expiry_date: fromIsoDate(cert.expiry_date),
      file: parseFile(cert),
    }));

  return {
    full_name: asText(profile.full_name),
    date_of_birth: fromIsoDate(profile.date_of_birth),
    mobile_phone: formatPhone(profile.mobile_phone),
    landline_phone: formatPhone(profile.landline_phone),
    secondary_name: asText(secondary.name),
    secondary_email: asText(secondary.email),
    secondary_phone: formatPhone(secondary.phone),
    street: asText(address.street),
    province: province || null,
    city: cityCodeFor(cities, province, asText(address.city)),
    postal_code: asText(address.postal_code),
    latitude: asText(address.latitude),
    longitude: asText(address.longitude),
    operational_province: operationalProvince || null,
    operational_city: asText(profile.operational_city_code) || null,
    radius_km: Number.isFinite(radius) && radius > 0 ? String(radius) : '',
    preferred_guard_types: Array.isArray(profile.preferred_guard_types)
      ? profile.preferred_guard_types.map((type) => asText(type)).filter(Boolean)
      : [],
    identification: documents,
    security_licenses: licenses.length > 0 ? licenses : [{ ...EMPTY_SECURITY_LICENSE }],
    police_clearances: clearances.length > 0 ? clearances : [{ ...EMPTY_POLICE_CLEARANCE }],
    training_certificates: certificates,
    weekly_availability: parseAvailability(profile.weekly_availability),
  };
}

// ---------------------------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------------------------

/** The file keys the server keeps on a document, or nothing when no file was attached. */
export function fileFields(file: UploadedFile | null) {
  if (!file) return {};
  return {
    document_file_id: file.id,
    document_file_url: file.url,
    document_file_name: file.name,
    document_file_mime_type: file.mimeType,
    document_file_size: file.size,
  };
}

const optional = (value: string | null | undefined) => (value && value.trim() ? value.trim() : undefined);
const optionalDate = (value: Date | null) => (value ? toIsoDate(value) : undefined);

/** Weekly availability as the server stores it. All seven days are sent so a day switched off replaces what was saved before. */
export function availabilityPayload(availability: WeeklyAvailabilityValues) {
  return Object.fromEntries(
    WEEK_DAYS.map((name) => {
      const day = availability[name];
      const ranges = day.enabled ? day.ranges.filter((range) => range.start && range.end) : [];
      return [name, ranges.map((range) => ({ start: range.start, end: range.end }))];
    })
  );
}

/** The profile in the shape `PUT /api/tenant` expects (same as the web guard profile form). */
function buildGuardProfile(values: GuardOnboardingValues, metadata: GuardMetadata) {
  const cities = metadata.canadianCitiesByProvince;
  const [primaryDocument] = values.identification;
  const mobile = optional(values.mobile_phone) ? toE164(values.mobile_phone) : undefined;
  const landline = optional(values.landline_phone) ? toE164(values.landline_phone) : undefined;

  const profile: Record<string, unknown> = {
    full_name: values.full_name.trim(),
    date_of_birth: values.date_of_birth ? toIsoDate(values.date_of_birth) : undefined,
    home_address: {
      street: values.street.trim(),
      city: cityLabelFor(cities, values.province ?? '', values.city ?? ''),
      country: 'CA',
      province: values.province ?? '',
      postal_code: values.postal_code.trim(),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
    },
    identification: {
      ...(primaryDocument?.document_type && { id_type: primaryDocument.document_type }),
      ...(optional(primaryDocument?.number) && { id_number: primaryDocument.number.trim() }),
      ...(primaryDocument?.file && { document_url: primaryDocument.file.url }),
      documents: values.identification.map((doc) => ({
        document_type: doc.document_type,
        document_number: doc.number.trim(),
        ...(doc.province && { province: doc.province }),
        ...(doc.passport_country && { passport_country: doc.passport_country }),
        ...(doc.expiry_date && { expiry_date: toIsoDate(doc.expiry_date) }),
        ...fileFields(doc.file),
      })),
    },
    security_licenses: values.security_licenses.map((license) => ({
      full_legal_name: license.full_legal_name.trim(),
      license_number: license.license_number.trim(),
      license_type: license.license_type,
      issuing_province: license.issuing_province,
      issuing_authority: license.issuing_authority.trim(),
      issue_date: optionalDate(license.issue_date),
      expiry_date: optionalDate(license.expiry_date),
      ...fileFields(license.file),
    })),
    police_clearances: values.police_clearances.map((record) => ({
      issuing_authority: record.issuing_authority_type,
      ...(record.issuing_authority_type === 'other' && optional(record.issuing_authority_other)
        ? { issuing_authority_other: record.issuing_authority_other.trim() }
        : {}),
      issuing_province: record.issuing_province,
      ...(record.issuing_city && {
        issuing_city: cityLabelFor(cities, record.issuing_province ?? '', record.issuing_city),
      }),
      issue_date: optionalDate(record.issue_date),
      ...(optional(record.reference_number) && { reference_number: record.reference_number.trim() }),
      ...fileFields(record.file),
    })),
    // An empty certificate card the guard added and didn't fill in is left out.
    training_certificates: values.training_certificates
      .filter((cert) => cert.certificate_name || cert.issuing_organization || cert.issue_date || cert.expiry_date)
      .map((cert) => ({
      certificate_name: cert.certificate_name,
      issuing_organization: cert.issuing_organization,
      ...(cert.issuing_organization === 'other' && optional(cert.issuing_organization_other)
        ? { issuing_organization_other: cert.issuing_organization_other.trim() }
        : {}),
      issue_date: optionalDate(cert.issue_date),
      ...(cert.expiry_date && { expiry_date: toIsoDate(cert.expiry_date) }),
      ...fileFields(cert.file),
    })),
    preferred_guard_types: values.preferred_guard_types,
    secondary_contact: {
      name: values.secondary_name.trim(),
      email: values.secondary_email.trim(),
      phone: toE164(values.secondary_phone),
    },
    // Older field the web still fills in: the mobile number, else the landline.
    contact: phoneDigits(values.mobile_phone) || phoneDigits(values.landline_phone),
    ...(mobile && { mobile_phone: mobile, mobile_phone_country: 'CA' }),
    ...(landline && { landline_phone: landline, landline_phone_country: 'CA' }),
  };

  // A service provider sets these for its own guards, and the server rejects a guard that changes them.
  if (!values.managed_by_provider) {
    profile.operational_region_code = values.operational_province;
    profile.operational_city_code = values.operational_city;
    profile.max_travel_radius_km = Number(values.radius_km);
    profile.weekly_availability = availabilityPayload(values.weekly_availability);
  }

  return { tenant_type: 'guard', profile, status: 'pending_activation' };
}

/** Saves the guard profile. The server then moves the tenant out of "onboarding". */
export function saveGuardProfile(values: GuardOnboardingValues, metadata: GuardMetadata, status = 'pending_activation') {
  return api.put<TenantUpdateResponse>(ENDPOINTS.tenant.profile, { ...buildGuardProfile(values, metadata), status });
}
