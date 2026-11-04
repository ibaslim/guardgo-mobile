import { z } from 'zod';

import type {
  InsuranceValues,
  OperatingCityValues,
  OperatingRegionValues,
  ProviderLicenseValues,
  ProviderOnboardingValues,
} from '@/types/provider-onboarding';
import { endOfToday } from '@/utils/dates';
import { phoneDigits } from '@/utils/phone';
import {
  CANADIAN_PHONE,
  CANADIAN_POSTAL_CODE,
  EMAIL,
  isBlank,
  LETTERS_AND_SPACES,
  WEBSITE,
} from '@/utils/validation';

// Same rules as the web service provider profile (service-provider-setting.component.ts). The
// server only checks the operating regions, so these are the only checks on everything else.

export const MAX_LICENSES = 2;
/** The server rejects a coverage radius below this. */
export const MIN_RADIUS_KM = 1;

export const EMPTY_LICENSE: ProviderLicenseValues = {
  license_number: '',
  license_type: null,
  issuing_province: null,
  issuing_authority: '',
  issue_date: null,
  expiry_date: null,
  file: null,
};

export const EMPTY_INSURANCE: InsuranceValues = {
  policy_number: '',
  coverage_amount: '',
  expiry_date: null,
  coverage_details: '',
  file: null,
};

export const emptyCity = (): OperatingCityValues => ({ city: null, radius_km: '', latitude: '', longitude: '' });

export const emptyRegion = (): OperatingRegionValues => ({ province: null, cities: [emptyCity()] });

export const PROVIDER_ONBOARDING_DEFAULTS: ProviderOnboardingValues = {
  legal_company_name: '',
  trading_name: '',
  corporation_number: '',
  established_on: null,
  tax_number: '',
  website: '',
  street: '',
  province: null,
  city: null,
  postal_code: '',
  latitude: '',
  longitude: '',
  rep_name: '',
  rep_email: '',
  rep_phone: '',
  secondary_name: '',
  secondary_email: '',
  secondary_phone: '',
  security_licenses: [{ ...EMPTY_LICENSE }],
  insurance: { ...EMPTY_INSURANCE },
  operating_regions: [emptyRegion()],
  guard_categories: [],
};

/** The fields each step owns, so a step can be validated before moving on. */
export const PROVIDER_STEP_FIELDS = {
  company: ['legal_company_name', 'trading_name', 'corporation_number', 'established_on', 'tax_number', 'website'],
  head: ['street', 'province', 'city', 'postal_code', 'latitude', 'longitude'],
  contacts: ['rep_name', 'rep_email', 'rep_phone', 'secondary_name', 'secondary_email', 'secondary_phone'],
  licenses: ['security_licenses', 'insurance'],
  coverage: ['operating_regions', 'guard_categories'],
} as const satisfies Record<string, readonly (keyof ProviderOnboardingValues)[]>;

const text = z.string();
const choice = z.string().nullable();
const date = z.date().nullable();
const file = z
  .object({ id: z.string(), url: z.string(), name: z.string(), mimeType: z.string(), size: z.number() })
  .nullable();

const shape = z.object({
  legal_company_name: text,
  trading_name: text,
  corporation_number: text,
  established_on: date,
  tax_number: text,
  website: text,
  street: text,
  province: choice,
  city: choice,
  postal_code: text,
  latitude: text,
  longitude: text,
  rep_name: text,
  rep_email: text,
  rep_phone: text,
  secondary_name: text,
  secondary_email: text,
  secondary_phone: text,
  security_licenses: z.array(
    z.object({
      license_number: text,
      license_type: choice,
      issuing_province: choice,
      issuing_authority: text,
      issue_date: date,
      expiry_date: date,
      file,
    })
  ),
  insurance: z.object({
    policy_number: text,
    coverage_amount: text,
    expiry_date: date,
    coverage_details: text,
    file,
  }),
  operating_regions: z.array(
    z.object({
      province: choice,
      cities: z.array(z.object({ city: choice, radius_km: text, latitude: text, longitude: text })),
    })
  ),
  guard_categories: z.array(z.string()),
});

const PHONE_MESSAGE = 'Enter a Canadian phone number with 10 digits, like 416 555 0123.';

/**
 * Checks a latitude/longitude pair typed as text. `at` names the two fields in the form; `missing`
 * is the message when both are empty. Returns nothing when the pair is fine.
 */
function coordinateProblems(latitude: string, longitude: string, missing: string) {
  const problems: { field: 'latitude' | 'longitude'; message: string }[] = [];
  const hasLatitude = !isBlank(latitude);
  const hasLongitude = !isBlank(longitude);
  if (!hasLatitude && !hasLongitude) {
    problems.push({ field: 'latitude', message: missing });
    return problems;
  }
  if (hasLatitude !== hasLongitude) {
    problems.push({ field: hasLatitude ? 'longitude' : 'latitude', message: 'Provide both latitude and longitude.' });
  }
  if (hasLatitude) {
    const value = Number(latitude);
    if (!Number.isFinite(value)) problems.push({ field: 'latitude', message: 'Latitude must be a valid number.' });
    else if (value < -90 || value > 90) problems.push({ field: 'latitude', message: 'Latitude must be between -90 and 90.' });
  }
  if (hasLongitude) {
    const value = Number(longitude);
    if (!Number.isFinite(value)) problems.push({ field: 'longitude', message: 'Longitude must be a valid number.' });
    else if (value < -180 || value > 180) {
      problems.push({ field: 'longitude', message: 'Longitude must be between -180 and 180.' });
    }
  }
  return problems;
}

const hasText = (...values: (string | null | undefined)[]) => values.some((value) => !isBlank(value));

/**
 * Every rule lives in one refinement so a step can ask for just its own fields
 * (`form.trigger(PROVIDER_STEP_FIELDS.company)`) and the final submit still checks everything.
 */
export function createProviderOnboardingSchema() {
  return shape.superRefine((values, ctx) => {
    const fail = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const endToday = endOfToday();

    // --- Company -------------------------------------------------------------------------------
    if (isBlank(values.legal_company_name)) fail(['legal_company_name'], 'Legal company name is required.');
    if (isBlank(values.corporation_number)) fail(['corporation_number'], 'Corporation number is required.');
    if (values.established_on && values.established_on > endToday) {
      fail(['established_on'], 'Date of establishment cannot be in the future.');
    }
    if (!isBlank(values.website) && !WEBSITE.test(values.website.trim())) {
      fail(['website'], 'Please enter a valid website URL.');
    }

    // --- Head office ---------------------------------------------------------------------------
    if (isBlank(values.street)) fail(['street'], 'Office street address is required.');
    if (isBlank(values.province)) fail(['province'], 'Office province is required.');
    if (isBlank(values.city)) fail(['city'], 'Office city is required.');
    if (isBlank(values.postal_code)) fail(['postal_code'], 'Office postal code is required.');
    else if (!CANADIAN_POSTAL_CODE.test(values.postal_code.trim())) {
      fail(['postal_code'], 'Invalid Canadian postal code format (e.g., A1A 1A1).');
    }
    for (const problem of coordinateProblems(
      values.latitude,
      values.longitude,
      'Head office coordinates are required. Choose the head office on the map, use your location, or type them.'
    )) {
      fail([problem.field], problem.message);
    }

    // --- Contacts ------------------------------------------------------------------------------
    if (isBlank(values.rep_name)) fail(['rep_name'], 'Representative name is required.');
    else if (!LETTERS_AND_SPACES.test(values.rep_name)) {
      fail(['rep_name'], 'Representative name can only contain letters and spaces.');
    }
    if (isBlank(values.rep_email)) fail(['rep_email'], 'Representative email is required.');
    else if (!EMAIL.test(values.rep_email.trim())) fail(['rep_email'], 'Invalid email format.');
    if (isBlank(values.rep_phone)) fail(['rep_phone'], 'Representative phone is required.');
    else if (!CANADIAN_PHONE.test(phoneDigits(values.rep_phone))) fail(['rep_phone'], PHONE_MESSAGE);

    if (isBlank(values.secondary_name)) fail(['secondary_name'], 'Secondary contact name is required.');
    else if (!LETTERS_AND_SPACES.test(values.secondary_name)) {
      fail(['secondary_name'], 'Contact name can only contain letters and spaces.');
    }
    if (isBlank(values.secondary_email)) fail(['secondary_email'], 'Secondary contact email is required.');
    else if (!EMAIL.test(values.secondary_email.trim())) fail(['secondary_email'], 'Invalid email format.');
    if (isBlank(values.secondary_phone)) fail(['secondary_phone'], 'Secondary contact phone number is required.');
    else if (!CANADIAN_PHONE.test(phoneDigits(values.secondary_phone))) fail(['secondary_phone'], PHONE_MESSAGE);

    // --- Security licenses: the first is required, a second must be complete if started --------
    if (values.security_licenses.length === 0) fail(['security_licenses'], 'At least one security license is required.');
    values.security_licenses.forEach((license, index) => {
      const at = (field: keyof ProviderLicenseValues, message: string) => fail(['security_licenses', index, field], message);
      const started =
        index === 0 ||
        hasText(license.license_number, license.license_type, license.issuing_province, license.issuing_authority) ||
        license.issue_date !== null ||
        license.expiry_date !== null;
      if (!started) return;

      if (isBlank(license.license_number)) at('license_number', 'Security license number is required.');
      if (isBlank(license.license_type)) at('license_type', 'License type is required.');
      if (isBlank(license.issuing_province)) at('issuing_province', 'Issuing province is required.');
      if (isBlank(license.issuing_authority)) at('issuing_authority', 'Issuing authority is required.');
      if (license.issue_date && license.issue_date > endToday) at('issue_date', 'Issue date cannot be in the future.');
      if (!license.expiry_date) at('expiry_date', 'Expiry date is required.');
      else if (license.issue_date && license.expiry_date < license.issue_date) {
        at('expiry_date', 'Expiry date cannot be before issue date.');
      }
    });

    // --- Insurance: optional, but a number and an expiry date once any of it is filled in -------
    const insurance = values.insurance;
    if (hasText(insurance.policy_number, insurance.coverage_amount, insurance.coverage_details) || insurance.expiry_date) {
      if (isBlank(insurance.policy_number)) fail(['insurance', 'policy_number'], 'Policy number is required.');
      if (!insurance.expiry_date) fail(['insurance', 'expiry_date'], 'Policy expiry date is required.');
      if (!isBlank(insurance.coverage_amount)) {
        const amount = Number(insurance.coverage_amount);
        if (!Number.isFinite(amount) || amount < 0) fail(['insurance', 'coverage_amount'], 'Enter the coverage amount as a number.');
      }
    }

    // --- Operating regions: the server checks these too ---------------------------------------
    if (values.operating_regions.length === 0) fail(['operating_regions'], 'At least one operating region is required.');
    values.operating_regions.forEach((region, regionIndex) => {
      if (isBlank(region.province)) {
        fail(['operating_regions', regionIndex, 'province'], 'Province is required.');
      } else if (values.operating_regions.some((other, otherIndex) => otherIndex < regionIndex && other.province === region.province)) {
        fail(['operating_regions', regionIndex, 'province'], 'This province is already added. Add more cities to it instead.');
      }

      if (region.cities.length === 0) {
        fail(['operating_regions', regionIndex, 'province'], 'Select at least one city for this province.');
      }
      region.cities.forEach((entry, cityIndex) => {
        const at = (field: keyof OperatingCityValues, message: string) =>
          fail(['operating_regions', regionIndex, 'cities', cityIndex, field], message);

        if (isBlank(entry.city)) at('city', 'City is required.');
        else if (region.cities.some((other, otherIndex) => otherIndex < cityIndex && other.city === entry.city)) {
          at('city', 'This city is already added.');
        }

        const radius = Number(entry.radius_km);
        if (isBlank(entry.radius_km)) at('radius_km', 'Coverage radius is required for each city.');
        else if (!Number.isFinite(radius) || radius < MIN_RADIUS_KM) {
          at('radius_km', `Coverage radius must be at least ${MIN_RADIUS_KM} km.`);
        }

        for (const problem of coordinateProblems(
          entry.latitude,
          entry.longitude,
          'Choose a map location for each operating city.'
        )) {
          at(problem.field, problem.message);
        }
      });
    });

    // --- Guard categories ----------------------------------------------------------------------
    if (values.guard_categories.length === 0) fail(['guard_categories'], 'At least one guard category is required.');
  });
}
