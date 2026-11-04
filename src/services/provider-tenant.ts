import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import { fileFields, parseFile } from '@/services/guard-tenant';
import {
  EMPTY_INSURANCE,
  EMPTY_LICENSE,
  emptyCity,
  emptyRegion,
  MAX_LICENSES,
} from '@/schemas/provider-onboarding';
import type { GuardMetadata } from '@/types/guard-onboarding';
import type { OperatingRegionValues, ProviderOnboardingValues } from '@/types/provider-onboarding';
import { fromIsoDate, toIsoDate } from '@/utils/dates';
import { formatPhone, toE164 } from '@/utils/phone';
import { asObject, asText, cityCodeFor, cityLabelFor } from '@/utils/profile';

type TenantUpdateResponse = { message?: string; id?: string; status?: string };

// The option lists (provinces, cities, license types, guard types) come from the guard metadata:
// see hooks/use-guard-metadata.ts. The web's provider page reads the same lists.

// ---------------------------------------------------------------------------------------------
// Reading a saved profile
// ---------------------------------------------------------------------------------------------

const asList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map((entry) => asObject(entry)) : [];

const positiveText = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? String(number) : '';
};

/**
 * The saved operating regions. The server (and the web) keep several shapes: one entry per city
 * (`city_entries`), a list of city codes with one radius for the region, or a single `city`.
 */
function parseRegions(value: unknown, cities: GuardMetadata['canadianCitiesByProvince']): OperatingRegionValues[] {
  const regions = asList(value).map((region) => {
    const province = asText(region.region_code) || asText(region.province);
    const regionRadius = positiveText(region.coverage_radius_km);
    const entries = asList(region.city_entries);

    let list;
    if (entries.length > 0) {
      list = entries.map((entry) => ({
        city: cityCodeFor(cities, province, asText(entry.city_code) || asText(entry.city)),
        radius_km: positiveText(entry.coverage_radius_km) || regionRadius,
        latitude: asText(entry.latitude),
        longitude: asText(entry.longitude),
      }));
    } else {
      const codes = Array.isArray(region.city_codes) ? region.city_codes.map((code) => asText(code)) : [asText(region.city)];
      list = codes
        .filter(Boolean)
        .map((code) => ({ city: cityCodeFor(cities, province, code), radius_km: regionRadius, latitude: '', longitude: '' }));
    }

    return { province: province || null, cities: list.length > 0 ? list : [emptyCity()] };
  });
  return regions.length > 0 ? regions : [emptyRegion()];
}

/**
 * The saved service provider profile as onboarding form values, or null when nothing was saved
 * yet. This is the reverse of `buildProviderProfile`. The head office city is saved as a name and
 * the operating cities as codes.
 */
export function parseProviderProfile(
  profile: Record<string, unknown> | undefined,
  metadata: GuardMetadata
): Partial<ProviderOnboardingValues> | null {
  if (!profile || Object.keys(profile).length === 0) return null;

  const cities = metadata.canadianCitiesByProvince;
  const address = asObject(profile.head_office_address);
  const representative = asObject(profile.primary_representative);
  const secondary = asObject(profile.emergency_contact);
  const insurance = asObject(profile.insurance_details);
  const province = asText(address.province);

  // Older profiles have a single `security_license` instead of the list.
  const savedLicenses = asList(profile.security_licenses);
  const licenseEntries = savedLicenses.length > 0 ? savedLicenses : Object.keys(asObject(profile.security_license)).length > 0 ? [asObject(profile.security_license)] : [];
  const licenses = licenseEntries.slice(0, MAX_LICENSES).map((license) => ({
    license_number: asText(license.license_number),
    license_type: asText(license.license_type) || null,
    issuing_province: asText(license.issuing_province) || null,
    issuing_authority: asText(license.issuing_authority),
    issue_date: fromIsoDate(license.issue_date),
    expiry_date: fromIsoDate(license.expiry_date),
    file: parseFile(license),
  }));

  return {
    legal_company_name: asText(profile.legal_company_name),
    trading_name: asText(profile.trading_name),
    corporation_number: asText(profile.company_registration_number),
    established_on: fromIsoDate(profile.year_of_establishment),
    tax_number: asText(profile.tax_registration_number),
    website: asText(profile.company_website),
    street: asText(address.street),
    province: province || null,
    city: cityCodeFor(cities, province, asText(address.city)),
    postal_code: asText(address.postal_code),
    latitude: asText(address.latitude),
    longitude: asText(address.longitude),
    rep_name: asText(representative.name),
    rep_email: asText(representative.email),
    rep_phone: formatPhone(representative.phone),
    secondary_name: asText(secondary.name),
    secondary_email: asText(secondary.email),
    secondary_phone: formatPhone(secondary.phone),
    security_licenses: licenses.length > 0 ? licenses : [{ ...EMPTY_LICENSE }],
    insurance: {
      ...EMPTY_INSURANCE,
      policy_number: asText(insurance.policy_number),
      coverage_amount: asText(insurance.coverage_amount),
      expiry_date: fromIsoDate(insurance.expiry_date),
      coverage_details: asText(insurance.coverage_details),
      file: parseFile(insurance),
    },
    operating_regions: parseRegions(profile.operating_regions, cities),
    guard_categories: Array.isArray(profile.guard_categories_offered)
      ? profile.guard_categories_offered.map((type) => asText(type)).filter(Boolean)
      : [],
  };
}

// ---------------------------------------------------------------------------------------------
// Saving
// ---------------------------------------------------------------------------------------------

const optional = (value: string | null | undefined) => (value && value.trim() ? value.trim() : undefined);
const optionalDate = (value: Date | null) => (value ? toIsoDate(value) : undefined);
/** A distance with at most two decimals, like the web stores it. */
const roundKm = (value: string) => Math.round(Number(value) * 100) / 100;

/** The profile in the shape `PUT /api/tenant` expects (same as the web service provider form). */
function buildProviderProfile(values: ProviderOnboardingValues, metadata: GuardMetadata) {
  const cities = metadata.canadianCitiesByProvince;
  const phone = toE164(values.rep_phone);

  const licenses = values.security_licenses
    // A second license card that was added and left empty is not saved.
    .filter(
      (license, index) =>
        index === 0 ||
        license.license_number.trim() ||
        license.license_type ||
        license.issuing_province ||
        license.issuing_authority.trim() ||
        license.issue_date ||
        license.expiry_date ||
        license.file
    )
    .map((license) => ({
      license_number: license.license_number.trim(),
      license_type: license.license_type,
      issuing_province: license.issuing_province,
      issuing_authority: license.issuing_authority.trim(),
      ...(license.issue_date && { issue_date: toIsoDate(license.issue_date) }),
      expiry_date: optionalDate(license.expiry_date),
      ...fileFields(license.file),
    }));

  const insurance = values.insurance;

  const regions = values.operating_regions.map((region) => {
    const province = region.province ?? '';
    const entries = region.cities.map((entry) => ({
      city_code: entry.city ?? '',
      city: cityLabelFor(cities, province, entry.city ?? ''),
      coverage_radius_km: roundKm(entry.radius_km),
      latitude: Number(entry.latitude),
      longitude: Number(entry.longitude),
    }));
    const [first] = entries;
    return {
      country: 'CA',
      province,
      region_code: province,
      city: first.city,
      city_code: first.city_code,
      city_codes: entries.map((entry) => entry.city_code),
      coverage_radius_km: first.coverage_radius_km,
      city_entries: entries,
    };
  });

  const profile: Record<string, unknown> = {
    legal_company_name: values.legal_company_name.trim(),
    trading_name: optional(values.trading_name),
    company_registration_number: values.corporation_number.trim(),
    year_of_establishment: optionalDate(values.established_on),
    company_website: optional(values.website),
    tax_registration_number: optional(values.tax_number),
    head_office_address: {
      street: values.street.trim(),
      city: cityLabelFor(cities, values.province ?? '', values.city ?? ''),
      country: 'CA',
      province: values.province ?? '',
      postal_code: values.postal_code.trim(),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
    },
    // The company's phone and email are the representative's.
    company_phone: phone,
    company_email: values.rep_email.trim(),
    primary_representative: { name: values.rep_name.trim(), email: values.rep_email.trim(), phone },
    // The secondary contact is called "emergency_contact" on the server.
    emergency_contact: {
      name: values.secondary_name.trim(),
      email: values.secondary_email.trim(),
      phone: toE164(values.secondary_phone),
    },
    // The server model has one license; the web sends the first one there and the full list below.
    security_license: licenses[0],
    security_licenses: licenses,
    insurance_details: {
      policy_number: optional(insurance.policy_number),
      ...(optional(insurance.coverage_amount) && { coverage_amount: Number(insurance.coverage_amount) }),
      currency: 'CAD',
      expiry_date: optionalDate(insurance.expiry_date),
      coverage_details: optional(insurance.coverage_details),
      ...fileFields(insurance.file),
    },
    operating_regions: regions,
    guard_categories_offered: values.guard_categories,
  };

  return { tenant_type: 'service_provider', profile, status: 'pending_activation' };
}

/** Saves the service provider profile. The server then moves the tenant out of "onboarding". */
export function saveProviderProfile(values: ProviderOnboardingValues, metadata: GuardMetadata) {
  return api.put<TenantUpdateResponse>(ENDPOINTS.tenant.profile, buildProviderProfile(values, metadata));
}
