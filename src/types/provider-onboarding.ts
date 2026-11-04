import type { UploadedFile } from '@/types/guard-onboarding';

/** One security license of the company. Unlike a guard's, it has no legal name field. */
export type ProviderLicenseValues = {
  license_number: string;
  license_type: string | null;
  issuing_province: string | null;
  issuing_authority: string;
  issue_date: Date | null;
  expiry_date: Date | null;
  file: UploadedFile | null;
};

/** The company's insurance policy. Optional, but a started policy needs a number and an expiry date. */
export type InsuranceValues = {
  policy_number: string;
  /** Kept as typed text. */
  coverage_amount: string;
  expiry_date: Date | null;
  coverage_details: string;
  file: UploadedFile | null;
};

/** One city the company covers: how far from the map point it can send guards. Numbers are typed text. */
export type OperatingCityValues = {
  city: string | null;
  radius_km: string;
  latitude: string;
  longitude: string;
};

/** A province the company covers, with the cities in it. */
export type OperatingRegionValues = {
  province: string | null;
  cities: OperatingCityValues[];
};

/** Everything the service provider onboarding collects, in one form (see schemas/provider-onboarding.ts). */
export type ProviderOnboardingValues = {
  // Company
  legal_company_name: string;
  trading_name: string;
  corporation_number: string;
  /** The web calls it "date of establishment" (the server field is `year_of_establishment`). */
  established_on: Date | null;
  tax_number: string;
  website: string;
  // Head office
  street: string;
  province: string | null;
  city: string | null;
  postal_code: string;
  latitude: string;
  longitude: string;
  // Contacts
  rep_name: string;
  rep_email: string;
  rep_phone: string;
  secondary_name: string;
  secondary_email: string;
  secondary_phone: string;
  // Licenses and insurance
  security_licenses: ProviderLicenseValues[];
  insurance: InsuranceValues;
  // Coverage
  operating_regions: OperatingRegionValues[];
  guard_categories: string[];
};
