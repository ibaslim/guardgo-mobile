import type { AccountInfo, AccountKind } from '@/services/account';
import { fromIsoDate } from '@/utils/dates';
import { formatPhone } from '@/utils/phone';
import { asObject, asText } from '@/utils/profile';

export type ProfileRow = { label: string; value: string };

/** The server saves "N/A" as the name of a tenant that has no profile yet. */
const clean = (value: unknown) => {
  const text = asText(value);
  return text.toUpperCase() === 'N/A' ? '' : text;
};

const first = (...values: unknown[]) => values.map(clean).find(Boolean) ?? '';

/** "unarmed" -> "Unarmed", "TORONTO" -> "Toronto", "first_aid" -> "First aid". */
export function sentenceCase(code: string) {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const titleCase = (code: string) => code.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());

const list = (value: unknown) => (Array.isArray(value) ? value.map(clean).filter(Boolean) : []);
const objects = (value: unknown) => (Array.isArray(value) ? value.map((entry) => asObject(entry)) : []);
const place = (address: Record<string, unknown>) => [clean(address.city), clean(address.province)].filter(Boolean).join(', ');
const phone = (value: unknown) => formatPhone(value);

const NOT_SET_BY_PROVIDER = 'Not set yet. Your service provider sets it.';

/** The name shown at the top of the Account screen. */
export function accountName(kind: AccountKind, account: AccountInfo | null, username: string) {
  const profile = account?.tenant.profile ?? {};
  const user = account?.user;
  if (kind === 'provider') return first(profile.legal_company_name, profile.trading_name, user?.full_name, username) || username;
  if (kind === 'client') return first(profile.legal_entity_name, user?.full_name, username) || username;
  if (kind === 'guard' || kind === 'provider-guard') return first(profile.full_name, user?.full_name, username) || username;
  return first(user?.full_name, username) || username;
}

function guardRows(account: AccountInfo, managed: boolean): ProfileRow[] {
  const profile = account.tenant.profile;
  const provider = clean(account.tenant.service_provider?.name) || 'Your service provider';

  const birth = fromIsoDate(profile.date_of_birth);
  const operationalCity = clean(profile.operational_city_code);
  const radius = Number(profile.max_travel_radius_km);
  const area = operationalCity
    ? [titleCase(operationalCity) + (clean(profile.operational_region_code) ? `, ${clean(profile.operational_region_code)}` : ''), Number.isFinite(radius) && radius > 0 ? `${radius} km` : '']
        .filter(Boolean)
        .join(' · ')
    : '';

  const days = Object.values(asObject(profile.weekly_availability)).filter((ranges) => Array.isArray(ranges) && ranges.length > 0).length;
  const availability = days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} a week` : '';

  const rows: (ProfileRow | null)[] = [
    managed ? { label: 'Managed by', value: provider } : null,
    { label: 'Full name', value: first(profile.full_name, account.user.full_name) },
    { label: 'Mobile', value: phone(profile.mobile_phone) },
    { label: 'Landline', value: phone(profile.landline_phone) },
    { label: 'Date of birth', value: birth ? birth.toLocaleDateString() : '' },
    { label: 'Home', value: place(asObject(profile.home_address)) },
    { label: 'Work area', value: area || (managed ? NOT_SET_BY_PROVIDER : '') },
    { label: 'Availability', value: availability || (managed ? NOT_SET_BY_PROVIDER : '') },
    { label: 'Guard types', value: list(profile.preferred_guard_types).map(sentenceCase).join(', ') },
  ];
  return rows.filter((row): row is ProfileRow => row !== null && row.value !== '');
}

function providerRows(account: AccountInfo): ProfileRow[] {
  const profile = account.tenant.profile;
  const representative = asObject(profile.representative);
  const regions = objects(profile.operating_regions);
  const cities = regions.reduce((total, region) => total + Math.max(objects(region.city_entries).length, list(region.city_codes).length, region.city ? 1 : 0), 0);
  const coverage =
    regions.length > 0
      ? `${regions.length} ${regions.length === 1 ? 'province' : 'provinces'}${cities > 0 ? `, ${cities} ${cities === 1 ? 'city' : 'cities'}` : ''}`
      : '';

  const company = first(profile.legal_company_name, profile.trading_name);
  const trading = clean(profile.trading_name);
  const rows: ProfileRow[] = [
    { label: 'Company', value: company },
    { label: 'Trading name', value: trading && trading !== company ? trading : '' },
    { label: 'Representative', value: clean(representative.name) },
    { label: 'Phone', value: phone(representative.phone) },
    { label: 'Contact email', value: clean(representative.email) },
    { label: 'Address', value: place(asObject(profile.address)) },
    { label: 'Coverage', value: coverage },
    { label: 'Guard types', value: list(profile.guard_categories_offered).map(sentenceCase).join(', ') },
  ];
  return rows.filter((row) => row.value !== '');
}

function clientRows(account: AccountInfo): ProfileRow[] {
  const profile = account.tenant.profile;
  const contact = asObject(profile.primary_contact);
  const businessType = clean(profile.business_type);
  const sites = objects(profile.sites).length;

  const rows: ProfileRow[] = [
    { label: 'Client type', value: businessType ? (businessType === 'individual' ? 'Individual' : 'Company') : '' },
    { label: 'Name', value: clean(profile.legal_entity_name) },
    { label: 'Industry', value: clean(profile.industry) },
    { label: 'Contact', value: clean(contact.name) },
    { label: 'Phone', value: phone(contact.phone) },
    { label: 'Contact email', value: clean(contact.email) },
    { label: 'Billing address', value: place(asObject(profile.billing_address)) },
    { label: 'Sites', value: sites > 0 ? `${sites} ${sites === 1 ? 'site' : 'sites'}` : '' },
  ];
  return rows.filter((row) => row.value !== '');
}

/**
 * The rows of the Profile card. They differ by kind of account, and only the ones that have a value
 * are listed. Before the account is loaded, or for an account without a tenant profile (platform
 * admins), the card shows what the session knows.
 */
export function profileRows(
  kind: AccountKind,
  account: AccountInfo | null,
  session: { username: string; status: string; verificationDate: string | null } | null
): ProfileRow[] {
  const rows =
    account === null
      ? []
      : kind === 'guard'
        ? guardRows(account, false)
        : kind === 'provider-guard'
          ? guardRows(account, true)
          : kind === 'provider'
            ? providerRows(account)
            : kind === 'client'
              ? clientRows(account)
              : [];
  if (rows.length > 0) return rows;

  // Nothing saved in a profile yet: show the basics.
  const verified = session?.verificationDate ? new Date(session.verificationDate) : null;
  return [
    { label: 'Username', value: session?.username ?? '' },
    { label: 'Status', value: session?.status ? sentenceCase(session.status) : '' },
    { label: 'Verified', value: verified && !Number.isNaN(verified.getTime()) ? verified.toLocaleDateString() : 'Not verified' },
  ].filter((row) => row.value !== '');
}
