import { z } from 'zod';

import type { ClientOnboardingValues, OnboardingSite } from '@/types/onboarding';
import { phoneDigits } from '@/utils/phone';
import { CANADIAN_PHONE, CANADIAN_POSTAL_CODE, EMAIL, LETTERS_AND_SPACES, WEBSITE } from '@/utils/validation';

// Same rules as the web client profile (client-setting.component.ts).

export const EMPTY_SITE: OnboardingSite = {
  site_name: '',
  site_type: null,
  manager_contact: '',
  manager_email: '',
  guards_required: '',
  street: '',
  province: null,
  city: null,
  postal_code: '',
  latitude: '',
  longitude: '',
};

export const CLIENT_ONBOARDING_DEFAULTS: ClientOnboardingValues = {
  client_type: null,
  legal_entity_name: '',
  industry: '',
  company_registration_number: '',
  company_website: '',
  tax_vat_number: '',
  primary_name: '',
  primary_email: '',
  primary_phone: '',
  secondary_name: '',
  secondary_email: '',
  secondary_phone: '',
  billing_street: '',
  billing_country: 'CA',
  billing_province: null,
  billing_city: null,
  billing_postal_code: '',
  card_method: 'credit_card',
  card_holder: '',
  card_last4: '',
  card_expiry_month: null,
  card_expiry_year: null,
  sites: [],
};

/** The fields each step owns, so a step can be validated before moving on. */
export const CLIENT_STEP_FIELDS = {
  type: ['client_type'],
  identity: ['legal_entity_name', 'industry', 'company_registration_number', 'company_website', 'tax_vat_number'],
  contacts: ['primary_name', 'primary_email', 'primary_phone', 'secondary_name', 'secondary_email', 'secondary_phone'],
  billing: [
    'billing_street',
    'billing_country',
    'billing_province',
    'billing_city',
    'billing_postal_code',
    'card_method',
    'card_holder',
    'card_last4',
    'card_expiry_month',
    'card_expiry_year',
  ],
  sites: ['sites'],
} as const satisfies Record<string, readonly (keyof ClientOnboardingValues)[]>;

const text = z.string();
const choice = z.string().nullable();

const shape = z.object({
  client_type: z.enum(['company', 'individual']).nullable(),
  legal_entity_name: text,
  industry: text,
  company_registration_number: text,
  company_website: text,
  tax_vat_number: text,
  primary_name: text,
  primary_email: text,
  primary_phone: text,
  secondary_name: text,
  secondary_email: text,
  secondary_phone: text,
  billing_street: text,
  billing_country: choice,
  billing_province: choice,
  billing_city: choice,
  billing_postal_code: text,
  card_method: z.enum(['credit_card', 'debit_card']).nullable(),
  card_holder: text,
  card_last4: text,
  card_expiry_month: choice,
  card_expiry_year: choice,
  sites: z.array(
    z.object({
      site_name: text,
      site_type: choice,
      manager_contact: text,
      manager_email: text,
      guards_required: text,
      street: text,
      province: choice,
      city: choice,
      postal_code: text,
      latitude: text,
      longitude: text,
    })
  ),
});

/**
 * Every rule lives in one refinement so a step can ask for just its own fields
 * (`form.trigger(CLIENT_STEP_FIELDS.contacts)`) and the final submit still checks everything.
 */
export const clientOnboardingSchema = shape.superRefine((values, ctx) => {
  const fail = (path: keyof ClientOnboardingValues, message: string) =>
    ctx.addIssue({ code: 'custom', path: [path], message });
  const blank = (value: string | null) => !value || value.trim() === '';

  const company = values.client_type === 'company';
  const individual = values.client_type === 'individual';

  if (values.client_type === null) fail('client_type', 'Choose who this account is for.');

  // Identity
  if (blank(values.legal_entity_name)) {
    fail('legal_entity_name', individual ? 'Enter your full name.' : 'Enter the legal entity name.');
  } else if (individual && !LETTERS_AND_SPACES.test(values.legal_entity_name)) {
    fail('legal_entity_name', 'Use letters and spaces only.');
  }
  if (company) {
    if (blank(values.industry)) fail('industry', 'Enter your industry or business sector.');
    else if (!LETTERS_AND_SPACES.test(values.industry)) fail('industry', 'Use letters and spaces only.');
    if (blank(values.company_registration_number)) {
      fail('company_registration_number', 'Enter the company registration number.');
    }
    if (!blank(values.company_website) && !WEBSITE.test(values.company_website.trim())) {
      fail('company_website', 'Enter a valid website, like example.com.');
    }
  }

  // Contacts: both are required, each with a name, an email and a Canadian phone number.
  for (const contact of ['primary', 'secondary'] as const) {
    const label = contact === 'primary' ? 'primary' : 'secondary';
    const name = values[`${contact}_name`];
    const email = values[`${contact}_email`];
    const phone = values[`${contact}_phone`];

    if (blank(name)) fail(`${contact}_name`, `Enter the ${label} contact's name.`);
    else if (!LETTERS_AND_SPACES.test(name)) fail(`${contact}_name`, 'Use letters and spaces only.');

    if (blank(email)) fail(`${contact}_email`, `Enter the ${label} contact's email.`);
    else if (!EMAIL.test(email.trim())) fail(`${contact}_email`, 'Enter a valid email, like name@example.com.');

    if (blank(phone)) fail(`${contact}_phone`, `Enter the ${label} contact's phone number.`);
    else if (!CANADIAN_PHONE.test(phoneDigits(phone))) {
      fail(`${contact}_phone`, 'Enter a Canadian phone number with 10 digits, like 416 555 0123.');
    }
  }

  // Billing address
  const canada = values.billing_country === 'CA';
  if (blank(values.billing_street)) fail('billing_street', 'Enter the billing street address.');
  if (blank(values.billing_country)) fail('billing_country', 'Choose a country.');
  if (canada && blank(values.billing_province)) fail('billing_province', 'Choose a province.');
  if (blank(values.billing_city)) fail('billing_city', canada ? 'Choose a city.' : 'Enter a city.');
  if (blank(values.billing_postal_code)) fail('billing_postal_code', 'Enter the postal code.');
  else if (canada && !CANADIAN_POSTAL_CODE.test(values.billing_postal_code.trim())) {
    fail('billing_postal_code', 'Enter a valid postal code, like A1A 1A1.');
  }

  // Billing card
  if (!values.card_method) fail('card_method', 'Choose a card type.');
  if (blank(values.card_holder)) fail('card_holder', 'Enter the cardholder name.');
  if (!/^[0-9]{4}$/.test(values.card_last4.trim())) fail('card_last4', 'Enter the last 4 digits of the card.');
  if (!values.card_expiry_month || !/^(0[1-9]|1[0-2])$/.test(values.card_expiry_month)) {
    fail('card_expiry_month', 'Choose the expiry month.');
  }
  if (!values.card_expiry_year || !/^\d{2,4}$/.test(values.card_expiry_year)) {
    fail('card_expiry_year', 'Choose the expiry year.');
  }

  // Operational sites: optional, but every site that is added must be complete, like the web.
  values.sites.forEach((site, index) => {
    const failSite = (field: keyof OnboardingSite, message: string) =>
      ctx.addIssue({ code: 'custom', path: ['sites', index, field], message });

    if (blank(site.site_name)) failSite('site_name', 'Enter the site name.');
    if (blank(site.site_type)) failSite('site_type', 'Choose a site type.');
    if (blank(site.street)) failSite('street', 'Enter the street address.');
    if (blank(site.province)) failSite('province', 'Choose a province.');
    if (blank(site.city)) failSite('city', 'Choose a city.');
    if (blank(site.postal_code)) failSite('postal_code', 'Enter the postal code.');
    else if (!CANADIAN_POSTAL_CODE.test(site.postal_code.trim())) {
      failSite('postal_code', 'Enter a valid postal code, like A1A 1A1.');
    }
    if (!blank(site.manager_email) && !EMAIL.test(site.manager_email.trim())) {
      failSite('manager_email', 'Enter a valid email, like name@example.com.');
    }
    if (!blank(site.guards_required)) {
      const guards = Number(site.guards_required);
      if (!Number.isInteger(guards) || guards < 1) failSite('guards_required', 'Use a whole number of at least 1.');
    }

    const latitude = Number(site.latitude);
    if (blank(site.latitude)) failSite('latitude', 'Enter the latitude.');
    else if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      failSite('latitude', 'Latitude must be between -90 and 90.');
    }
    const longitude = Number(site.longitude);
    if (blank(site.longitude)) failSite('longitude', 'Enter the longitude.');
    else if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      failSite('longitude', 'Longitude must be between -180 and 180.');
    }
  });
});
