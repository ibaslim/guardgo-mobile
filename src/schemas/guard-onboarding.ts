import { z } from 'zod';

import type {
  GuardMetadata,
  GuardOnboardingValues,
  IdentityDocumentValues,
  PoliceClearanceValues,
  SecurityLicenseValues,
  TrainingCertificateValues,
  WeeklyAvailabilityValues,
} from '@/types/guard-onboarding';
import { WEEK_DAYS } from '@/types/guard-onboarding';
import { dayRangeErrors } from '@/utils/availability';
import { ageOn, endOfToday, startOfToday } from '@/utils/dates';
import { phoneDigits } from '@/utils/phone';
import { CANADIAN_PHONE, CANADIAN_POSTAL_CODE, isBlank } from '@/utils/validation';

// Same rules as the web guard profile (guard-setting.component.ts). The server only checks the
// operational area and radius, so these are the only checks on everything else.
const NAME = /^[a-zA-Z ]+$/;
const CONTACT_NAME = /^[a-zA-Z\s]+$/;
const CONTACT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LICENSE_NUMBER_LENGTH = { min: 4, max: 32 };

// How an identity document's number must look, by type.
const DOCUMENT_NUMBER: Record<string, RegExp> = {
  drivers_license: /^[A-Z0-9-]{4,20}$/i,
  provincial_id: /^[A-Z0-9-]{4,20}$/i,
  passport: /^[A-Z0-9-]{4,20}$/i,
  pr_card: /^[A-Z0-9]{8,12}$/i,
  work_permit: /^[A-Z0-9]{8,20}$/i,
  study_permit: /^[A-Z0-9]{8,20}$/i,
};

export const MAX_DOCUMENTS_PER_LIST = 2;
/** The web asks for exactly two identification documents. */
export const IDENTITY_DOCUMENT_COUNT = 2;

export const EMPTY_IDENTITY_DOCUMENT: IdentityDocumentValues = {
  document_type: null,
  number: '',
  province: null,
  passport_country: null,
  expiry_date: null,
  file: null,
};

export const EMPTY_SECURITY_LICENSE: SecurityLicenseValues = {
  full_legal_name: '',
  license_number: '',
  license_type: null,
  issuing_province: null,
  issuing_authority: '',
  issue_date: null,
  expiry_date: null,
  file: null,
};

export const EMPTY_POLICE_CLEARANCE: PoliceClearanceValues = {
  issuing_authority_type: null,
  issuing_authority_other: '',
  issuing_province: null,
  issuing_city: null,
  issue_date: null,
  reference_number: '',
  file: null,
};

export const EMPTY_TRAINING_CERTIFICATE: TrainingCertificateValues = {
  certificate_name: null,
  issuing_organization: null,
  issuing_organization_other: '',
  issue_date: null,
  expiry_date: null,
  file: null,
};

export const EMPTY_AVAILABILITY: WeeklyAvailabilityValues = {
  Monday: { enabled: false, ranges: [] },
  Tuesday: { enabled: false, ranges: [] },
  Wednesday: { enabled: false, ranges: [] },
  Thursday: { enabled: false, ranges: [] },
  Friday: { enabled: false, ranges: [] },
  Saturday: { enabled: false, ranges: [] },
  Sunday: { enabled: false, ranges: [] },
};

export const GUARD_ONBOARDING_DEFAULTS: GuardOnboardingValues = {
  full_name: '',
  date_of_birth: null,
  mobile_phone: '',
  landline_phone: '',
  secondary_name: '',
  secondary_email: '',
  secondary_phone: '',
  street: '',
  province: null,
  city: null,
  postal_code: '',
  latitude: '',
  longitude: '',
  operational_province: null,
  operational_city: null,
  radius_km: '',
  preferred_guard_types: [],
  identification: Array.from({ length: IDENTITY_DOCUMENT_COUNT }, () => ({ ...EMPTY_IDENTITY_DOCUMENT })),
  security_licenses: [{ ...EMPTY_SECURITY_LICENSE }],
  police_clearances: [{ ...EMPTY_POLICE_CLEARANCE }],
  training_certificates: [],
  weekly_availability: JSON.parse(JSON.stringify(EMPTY_AVAILABILITY)) as WeeklyAvailabilityValues,
  managed_by_provider: false,
};

/** The fields each step owns, so a step can be validated before moving on. */
export const GUARD_STEP_FIELDS = {
  you: ['full_name', 'date_of_birth', 'mobile_phone', 'landline_phone', 'secondary_name', 'secondary_email', 'secondary_phone'],
  home: ['street', 'province', 'city', 'postal_code', 'latitude', 'longitude'],
  work: ['operational_province', 'operational_city', 'radius_km', 'preferred_guard_types'],
  identity: ['identification'],
  licenses: ['security_licenses', 'police_clearances'],
  training: ['training_certificates'],
  availability: ['weekly_availability'],
} as const satisfies Record<string, readonly (keyof GuardOnboardingValues)[]>;

const text = z.string();
const choice = z.string().nullable();
const date = z.date().nullable();
const file = z
  .object({ id: z.string(), url: z.string(), name: z.string(), mimeType: z.string(), size: z.number() })
  .nullable();
const day = z.object({
  enabled: z.boolean(),
  ranges: z.array(z.object({ start: z.string(), end: z.string() })),
});

const shape = z.object({
  full_name: text,
  date_of_birth: date,
  mobile_phone: text,
  landline_phone: text,
  secondary_name: text,
  secondary_email: text,
  secondary_phone: text,
  street: text,
  province: choice,
  city: choice,
  postal_code: text,
  latitude: text,
  longitude: text,
  operational_province: choice,
  operational_city: choice,
  radius_km: text,
  preferred_guard_types: z.array(z.string()),
  identification: z.array(
    z.object({
      document_type: choice,
      number: text,
      province: choice,
      passport_country: choice,
      expiry_date: date,
      file,
    })
  ),
  security_licenses: z.array(
    z.object({
      full_legal_name: text,
      license_number: text,
      license_type: choice,
      issuing_province: choice,
      issuing_authority: text,
      issue_date: date,
      expiry_date: date,
      file,
    })
  ),
  police_clearances: z.array(
    z.object({
      issuing_authority_type: choice,
      issuing_authority_other: text,
      issuing_province: choice,
      issuing_city: choice,
      issue_date: date,
      reference_number: text,
      file,
    })
  ),
  training_certificates: z.array(
    z.object({
      certificate_name: choice,
      issuing_organization: choice,
      issuing_organization_other: text,
      issue_date: date,
      expiry_date: date,
      file,
    })
  ),
  weekly_availability: z.object({
    Monday: day,
    Tuesday: day,
    Wednesday: day,
    Thursday: day,
    Friday: day,
    Saturday: day,
    Sunday: day,
  }),
  managed_by_provider: z.boolean(),
});

const hasText = (...values: (string | null | undefined)[]) => values.some((value) => !isBlank(value));

/**
 * Every rule lives in one refinement so a step can ask for just its own fields
 * (`form.trigger(GUARD_STEP_FIELDS.you)`) and the final submit still checks everything. The
 * metadata tells which identity documents need a province and an expiry date.
 */
export function createGuardOnboardingSchema(metadata: GuardMetadata | null) {
  return shape.superRefine((values, ctx) => {
    const fail = (path: (string | number)[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    const today = startOfToday();
    const endToday = endOfToday();

    // --- You -----------------------------------------------------------------------------------
    if (isBlank(values.full_name)) fail(['full_name'], 'Name is required.');
    else if (!NAME.test(values.full_name)) fail(['full_name'], 'Name can only contain letters and spaces.');

    if (!values.date_of_birth) {
      fail(['date_of_birth'], 'Date of birth is required.');
    } else if (values.date_of_birth >= today) {
      fail(['date_of_birth'], 'Date of birth must be in the past.');
    } else {
      const age = ageOn(values.date_of_birth);
      if (age < 18) fail(['date_of_birth'], 'You must be at least 18 years old.');
      else if (age > 100) fail(['date_of_birth'], 'Please enter a valid date of birth.');
    }

    const hasMobile = !isBlank(values.mobile_phone);
    const hasLandline = !isBlank(values.landline_phone);
    if (hasMobile && !CANADIAN_PHONE.test(phoneDigits(values.mobile_phone))) {
      fail(['mobile_phone'], 'Enter a Canadian phone number with 10 digits, like 416 555 0123.');
    }
    if (hasLandline && !CANADIAN_PHONE.test(phoneDigits(values.landline_phone))) {
      fail(['landline_phone'], 'Enter a Canadian phone number with 10 digits, like 416 555 0123.');
    }
    if (!hasMobile && !hasLandline) fail(['mobile_phone'], 'At least one phone number (mobile or landline) is required.');

    // Secondary contact: name, email and a phone are all required.
    if (isBlank(values.secondary_name)) fail(['secondary_name'], 'Secondary contact name is required.');
    else if (!CONTACT_NAME.test(values.secondary_name)) {
      fail(['secondary_name'], 'Contact name can only contain letters and spaces.');
    }
    if (isBlank(values.secondary_email)) fail(['secondary_email'], 'Secondary contact email is required.');
    else if (!CONTACT_EMAIL.test(values.secondary_email.trim())) {
      fail(['secondary_email'], 'Please enter a valid email address.');
    }
    if (isBlank(values.secondary_phone)) fail(['secondary_phone'], 'Secondary contact phone number is required.');
    else if (!CANADIAN_PHONE.test(phoneDigits(values.secondary_phone))) {
      fail(['secondary_phone'], 'Enter a Canadian phone number with 10 digits, like 416 555 0123.');
    }

    // --- Home ----------------------------------------------------------------------------------
    if (isBlank(values.street)) fail(['street'], 'Street address is required.');
    if (isBlank(values.province)) fail(['province'], 'Province is required.');
    if (isBlank(values.city)) fail(['city'], 'City is required.');
    if (isBlank(values.postal_code)) fail(['postal_code'], 'Postal code is required.');
    else if (!CANADIAN_POSTAL_CODE.test(values.postal_code.trim())) {
      fail(['postal_code'], 'Invalid Canadian postal code format (e.g., A1A 1A1).');
    }

    const hasLatitude = !isBlank(values.latitude);
    const hasLongitude = !isBlank(values.longitude);
    if (!hasLatitude && !hasLongitude) {
      fail(['latitude'], 'Home coordinates are required. Choose your home on the map, use your location, or type them.');
    } else if (hasLatitude !== hasLongitude) {
      fail([hasLatitude ? 'longitude' : 'latitude'], 'Provide both latitude and longitude.');
    }
    if (hasLatitude) {
      const latitude = Number(values.latitude);
      if (!Number.isFinite(latitude)) fail(['latitude'], 'Latitude must be a valid number.');
      else if (latitude < -90 || latitude > 90) fail(['latitude'], 'Latitude must be between -90 and 90.');
    }
    if (hasLongitude) {
      const longitude = Number(values.longitude);
      if (!Number.isFinite(longitude)) fail(['longitude'], 'Longitude must be a valid number.');
      else if (longitude < -180 || longitude > 180) fail(['longitude'], 'Longitude must be between -180 and 180.');
    }

    // --- Work area -----------------------------------------------------------------------------
    if (values.preferred_guard_types.length === 0) {
      fail(['preferred_guard_types'], 'Select at least one preferred guard type.');
    }
    // A service provider sets these for its own guards.
    if (!values.managed_by_provider) {
      if (isBlank(values.operational_province)) fail(['operational_province'], 'Operational province is required.');
      if (isBlank(values.operational_city)) fail(['operational_city'], 'Operational city is required.');
      // The web form calls the radius optional, but the server rejects a save without it.
      const radius = Number(values.radius_km);
      if (isBlank(values.radius_km)) fail(['radius_km'], 'Enter how far you will travel, at least 1 km.');
      else if (!Number.isFinite(radius) || radius < 1) fail(['radius_km'], 'Operational radius must be at least 1 km.');
    }

    // --- Identification: exactly two documents, each complete --------------------------------
    if (values.identification.length < IDENTITY_DOCUMENT_COUNT) {
      fail(['identification'], 'At least 2 identification documents are required.');
    }
    const documentTypes = metadata?.identityDocumentTypes ?? [];
    values.identification.forEach((doc, index) => {
      const at = (field: keyof IdentityDocumentValues, message: string) => fail(['identification', index, field], message);
      const option = documentTypes.find((type) => type.value === doc.document_type);
      const requiresProvince = option?.requiresProvince ?? false;
      const requiresExpiry = option?.requiresExpiry ?? true;

      if (!doc.document_type) {
        at('document_type', 'Document type is required.');
      } else if (values.identification.some((other, otherIndex) => otherIndex !== index && other.document_type === doc.document_type)) {
        at('document_type', 'You have already added this document type.');
      }

      if (isBlank(doc.number)) {
        at('number', 'Document number is required.');
      } else if (doc.document_type) {
        const pattern = DOCUMENT_NUMBER[doc.document_type];
        if (pattern && !pattern.test(doc.number.trim())) {
          at('number', `Invalid ${option?.label ?? 'document'} number format.`);
        }
      }

      if (requiresProvince && isBlank(doc.province)) at('province', 'Province is required for this document type.');
      if (doc.document_type === 'passport' && isBlank(doc.passport_country)) {
        at('passport_country', 'Passport country is required for Passport.');
      }
      if (requiresExpiry && !doc.expiry_date) at('expiry_date', 'Expiry date is required for this document type.');
      else if (doc.expiry_date && doc.expiry_date < today) at('expiry_date', 'Document has expired.');
    });

    // --- Security licenses: the first is required, a second must be complete if started --------
    if (values.security_licenses.length === 0) fail(['security_licenses'], 'At least one security license is required.');
    values.security_licenses.forEach((license, index) => {
      const at = (field: keyof SecurityLicenseValues, message: string) => fail(['security_licenses', index, field], message);
      const started =
        index === 0 ||
        hasText(license.full_legal_name, license.license_number, license.license_type, license.issuing_province, license.issuing_authority) ||
        license.issue_date !== null ||
        license.expiry_date !== null;
      if (!started) return;

      if (isBlank(license.full_legal_name)) at('full_legal_name', 'Full legal name is required.');
      if (isBlank(license.license_number)) {
        at('license_number', 'License number is required.');
      } else {
        const length = license.license_number.replace(/[^A-Za-z0-9]/g, '').length;
        if (length < LICENSE_NUMBER_LENGTH.min || length > LICENSE_NUMBER_LENGTH.max) {
          at('license_number', 'License number must be 4-32 letters or numbers (hyphens/slashes/spaces allowed).');
        }
      }
      if (isBlank(license.license_type)) at('license_type', 'License type is required.');
      if (isBlank(license.issuing_province)) at('issuing_province', 'Issuing province is required.');
      if (isBlank(license.issuing_authority)) at('issuing_authority', 'Issuing authority is required.');
      if (!license.issue_date) at('issue_date', 'Issue date is required.');
      else if (license.issue_date > endToday) at('issue_date', 'Issue date cannot be in the future.');
      if (!license.expiry_date) {
        at('expiry_date', 'Expiry date is required.');
      } else if (license.expiry_date < today) {
        at('expiry_date', 'Security license has expired.');
      } else if (license.issue_date && license.expiry_date < license.issue_date) {
        at('expiry_date', 'Expiry date cannot be before issue date.');
      }
    });

    // --- Police clearances: the first is required, a second must be complete if started --------
    if (values.police_clearances.length === 0) fail(['police_clearances'], 'At least one police clearance is required.');
    values.police_clearances.forEach((record, index) => {
      const at = (field: keyof PoliceClearanceValues, message: string) => fail(['police_clearances', index, field], message);
      const started =
        index === 0 ||
        hasText(
          record.issuing_authority_type,
          record.issuing_authority_other,
          record.issuing_province,
          record.issuing_city,
          record.reference_number
        ) ||
        record.issue_date !== null;
      if (!started) return;

      if (isBlank(record.issuing_authority_type)) at('issuing_authority_type', 'Issuing authority type is required.');
      else if (record.issuing_authority_type === 'other' && isBlank(record.issuing_authority_other)) {
        at('issuing_authority_other', 'Please specify the issuing authority.');
      }
      if (isBlank(record.issuing_province)) at('issuing_province', 'Issuing province is required.');
      if (!record.issue_date) at('issue_date', 'Issue date is required.');
      else if (record.issue_date > endToday) at('issue_date', 'Issue date cannot be in the future.');
    });

    // --- Training certificates: optional, but complete if started ------------------------------
    values.training_certificates.forEach((cert, index) => {
      const at = (field: keyof TrainingCertificateValues, message: string) => fail(['training_certificates', index, field], message);
      const started =
        hasText(cert.certificate_name, cert.issuing_organization, cert.issuing_organization_other) ||
        cert.issue_date !== null ||
        cert.expiry_date !== null;
      if (!started) return;

      if (isBlank(cert.certificate_name)) at('certificate_name', 'Certificate name is required.');
      if (isBlank(cert.issuing_organization)) at('issuing_organization', 'Issuing organization is required.');
      else if (cert.issuing_organization === 'other' && isBlank(cert.issuing_organization_other)) {
        at('issuing_organization_other', 'Please specify the issuing organization.');
      }
      if (!cert.issue_date) at('issue_date', 'Issue date is required.');
      else if (cert.issue_date > endToday) at('issue_date', 'Issue date cannot be in the future.');
      if (cert.expiry_date && cert.issue_date && cert.expiry_date < cert.issue_date) {
        at('expiry_date', 'Expiry date cannot be before issue date.');
      }
    });

    // --- Availability: a service provider sets it for its own guards -----------------------------
    if (!values.managed_by_provider) {
      const enabledDays = WEEK_DAYS.filter((name) => values.weekly_availability[name].enabled);
      if (enabledDays.length === 0) {
        fail(['weekly_availability'], 'Please select at least one day of availability.');
      } else {
        for (const name of enabledDays) {
          const [problem] = dayRangeErrors(values.weekly_availability[name].ranges);
          if (problem) {
            fail(['weekly_availability'], `${name}: ${problem}`);
            break;
          }
        }
      }
    }
  });
}
