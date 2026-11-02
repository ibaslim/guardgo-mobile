/** One entry of a metadata dropdown list from the server. */
export type MetadataOption = { value: string; label: string };

/** Option lists for the client profile, from `GET /api/public/client-metadata`. */
export type ClientMetadata = {
  countries: MetadataOption[];
  canadianProvinces: MetadataOption[];
  /** City options by province code. */
  canadianCitiesByProvince: Record<string, MetadataOption[]>;
  /** Kinds of operational site (office, warehouse, ...). */
  siteTypeOptions?: MetadataOption[];
};

export type ClientKind = 'company' | 'individual';

export type CardMethod = 'credit_card' | 'debit_card';

/** One operational site the client wants guards at. Coordinates are kept as typed text. */
export type OnboardingSite = {
  site_name: string;
  site_type: string | null;
  manager_contact: string;
  manager_email: string;
  guards_required: string;
  street: string;
  province: string | null;
  city: string | null;
  postal_code: string;
  latitude: string;
  longitude: string;
};

/** Everything the client onboarding flow collects, in one flat form (see schemas/client-onboarding.ts). */
export type ClientOnboardingValues = {
  client_type: ClientKind | null;
  legal_entity_name: string;
  industry: string;
  company_registration_number: string;
  company_website: string;
  tax_vat_number: string;
  primary_name: string;
  primary_email: string;
  primary_phone: string;
  secondary_name: string;
  secondary_email: string;
  secondary_phone: string;
  billing_street: string;
  billing_country: string | null;
  billing_province: string | null;
  billing_city: string | null;
  billing_postal_code: string;
  card_method: CardMethod | null;
  card_holder: string;
  card_last4: string;
  card_expiry_month: string | null;
  card_expiry_year: string | null;
  sites: OnboardingSite[];
};
