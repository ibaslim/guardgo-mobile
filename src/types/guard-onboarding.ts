import type { MetadataOption } from '@/types/onboarding';

export type IdentityDocumentOption = MetadataOption & {
  requiresProvince: boolean;
  requiresExpiry: boolean;
  mandatory?: boolean;
};

/** Option lists for the guard profile, from `GET /api/public/guard-metadata`. */
export type GuardMetadata = {
  countries: MetadataOption[];
  canadianProvinces: MetadataOption[];
  /** City options by province code. */
  canadianCitiesByProvince: Record<string, MetadataOption[]>;
  identityDocumentTypes: IdentityDocumentOption[];
  securityLicenseTypes: MetadataOption[];
  trainingCertificateTypes: MetadataOption[];
  /** Issuing organizations by certificate type. */
  trainingIssuerOptionsMap: Record<string, MetadataOption[]>;
  policeClearanceAuthorityTypes: MetadataOption[];
  guardTypeOptions: MetadataOption[];
};

/** A document already uploaded to the server (see services/documents.ts). */
export type UploadedFile = {
  id: string;
  /** Server path, like "/api/tenant/files/identity/<id>". */
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

export type IdentityDocumentValues = {
  document_type: string | null;
  number: string;
  province: string | null;
  passport_country: string | null;
  expiry_date: Date | null;
  file: UploadedFile | null;
};

export type SecurityLicenseValues = {
  full_legal_name: string;
  license_number: string;
  license_type: string | null;
  issuing_province: string | null;
  issuing_authority: string;
  issue_date: Date | null;
  expiry_date: Date | null;
  file: UploadedFile | null;
};

export type PoliceClearanceValues = {
  issuing_authority_type: string | null;
  issuing_authority_other: string;
  issuing_province: string | null;
  issuing_city: string | null;
  issue_date: Date | null;
  reference_number: string;
  file: UploadedFile | null;
};

export type TrainingCertificateValues = {
  certificate_name: string | null;
  issuing_organization: string | null;
  issuing_organization_other: string;
  issue_date: Date | null;
  expiry_date: Date | null;
  file: UploadedFile | null;
};

export const WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

/** A time range as the server stores it: 12-hour text like "09:30 AM", or '' while empty. */
export type TimeRangeValue = { start: string; end: string };
export type DayAvailabilityValue = { enabled: boolean; ranges: TimeRangeValue[] };
export type WeeklyAvailabilityValues = Record<WeekDay, DayAvailabilityValue>;

/** Everything the guard onboarding collects, in one form (see schemas/guard-onboarding.ts). */
export type GuardOnboardingValues = {
  // You
  full_name: string;
  date_of_birth: Date | null;
  mobile_phone: string;
  landline_phone: string;
  secondary_name: string;
  secondary_email: string;
  secondary_phone: string;
  // Home
  street: string;
  province: string | null;
  city: string | null;
  postal_code: string;
  latitude: string;
  longitude: string;
  // Work area
  operational_province: string | null;
  operational_city: string | null;
  radius_km: string;
  preferred_guard_types: string[];
  // Documents
  identification: IdentityDocumentValues[];
  security_licenses: SecurityLicenseValues[];
  police_clearances: PoliceClearanceValues[];
  training_certificates: TrainingCertificateValues[];
  // Availability
  weekly_availability: WeeklyAvailabilityValues;
  /**
   * True when a service provider owns this guard. The provider sets the work area radius and the
   * availability, so those fields are hidden and left out of the save.
   */
  managed_by_provider: boolean;
};
