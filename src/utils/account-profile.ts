import { CLIENT_PROFILE_STEPS, GUARD_PROFILE_STEPS, PROVIDER_PROFILE_STEPS } from '@/constants/profile-steps';
import type { AccountInfo, AccountKind } from '@/services/account';
import { formatPhone } from '@/utils/phone';
import { asObject, asText } from '@/utils/profile';

/**
 * One line of the Profile card. With a `step`, it is a section of the profile that opens its edit
 * screen (`edit-profile/[step]`); without one it is only shown.
 */
export type ProfileStepRow = { title: string; summary: string; step?: string };

/** The server saves "N/A" as the name of a tenant that has no profile yet. */
const clean = (value: unknown) => {
  const text = asText(value);
  return text.toUpperCase() === 'N/A' ? '' : text;
};

const first = (...values: unknown[]) => values.map(clean).find(Boolean) ?? '';

/** "unarmed" -> "Unarmed", "first_aid" -> "First aid". */
export function sentenceCase(code: string) {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const titleCase = (code: string) => code.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, gap: string, letter: string) => gap + letter.toUpperCase());

const list = (value: unknown) => (Array.isArray(value) ? value.map(clean).filter(Boolean) : []);
const objects = (value: unknown) => (Array.isArray(value) ? value.map((entry) => asObject(entry)) : []);
const place = (address: Record<string, unknown>) => [clean(address.city), clean(address.province)].filter(Boolean).join(', ');
const count = (total: number, one: string, many: string) => (total > 0 ? `${total} ${total === 1 ? one : many}` : '');
const join = (...parts: string[]) => parts.filter(Boolean).join(' · ');

const SET_BY_PROVIDER = 'Set by your service provider';

/** The name shown at the top of the Account screen. */
export function accountName(kind: AccountKind, account: AccountInfo | null, username: string) {
  const profile = account?.tenant.profile ?? {};
  const user = account?.user;
  if (kind === 'provider') return first(profile.legal_company_name, profile.trading_name, user?.full_name, username) || username;
  if (kind === 'client') return first(profile.legal_entity_name, user?.full_name, username) || username;
  if (kind === 'guard' || kind === 'provider-guard') return first(profile.full_name, user?.full_name, username) || username;
  return first(user?.full_name, username) || username;
}

function guardSteps(account: AccountInfo, managed: boolean): ProfileStepRow[] {
  const profile = account.tenant.profile;
  const provider = clean(account.tenant.service_provider?.name) || 'Your service provider';

  const operationalCity = clean(profile.operational_city_code);
  const radius = Number(profile.max_travel_radius_km);
  const area = operationalCity
    ? join(
        titleCase(operationalCity) + (clean(profile.operational_region_code) ? `, ${clean(profile.operational_region_code)}` : ''),
        Number.isFinite(radius) && radius > 0 ? `${radius} km` : ''
      )
    : '';
  const types = list(profile.preferred_guard_types).map(sentenceCase).join(', ');
  const days = Object.values(asObject(profile.weekly_availability)).filter((ranges) => Array.isArray(ranges) && ranges.length > 0).length;

  const summaries: Record<string, string> = {
    you: join(first(profile.full_name, account.user.full_name), formatPhone(profile.mobile_phone)),
    home: place(asObject(profile.home_address)),
    // A provider's guard only chooses the types of work; the provider sets the area.
    work: managed ? types : area,
    identity: count(objects(asObject(profile.identification).documents).length, 'document', 'documents'),
    licenses: join(count(objects(profile.security_licenses).length, 'license', 'licenses'), count(objects(profile.police_clearances).length, 'clearance', 'clearances')),
    training: count(objects(profile.training_certificates).length, 'certificate', 'certificates'),
    availability: days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} a week` : '',
  };

  const rows: ProfileStepRow[] = [];
  if (managed) rows.push({ title: 'Managed by', summary: provider });
  for (const { key, title } of GUARD_PROFILE_STEPS) {
    // The provider sets a managed guard's availability, so it is shown but not edited here.
    if (managed && key === 'availability') {
      rows.push({ title, summary: summaries.availability || SET_BY_PROVIDER });
      continue;
    }
    rows.push({ title, summary: summaries[key], step: key });
  }
  return rows;
}

function providerSteps(account: AccountInfo): ProfileStepRow[] {
  const profile = account.tenant.profile;
  const regions = objects(profile.operating_regions);
  const cities = regions.reduce((total, region) => total + Math.max(objects(region.city_entries).length, list(region.city_codes).length, region.city ? 1 : 0), 0);

  const summaries: Record<string, string> = {
    company: first(profile.legal_company_name, profile.trading_name),
    head: place(asObject(profile.head_office_address)),
    contacts: first(asObject(profile.primary_representative).name),
    licenses: count(objects(profile.security_licenses).length || (Object.keys(asObject(profile.security_license)).length > 0 ? 1 : 0), 'license', 'licenses'),
    coverage: join(count(regions.length, 'province', 'provinces'), count(cities, 'city', 'cities')),
  };
  return PROVIDER_PROFILE_STEPS.map(({ key, title }) => ({ title, summary: summaries[key], step: key }));
}

function clientSteps(account: AccountInfo): ProfileStepRow[] {
  const profile = account.tenant.profile;
  const businessType = clean(profile.business_type);

  const summaries: Record<string, string> = {
    identity: clean(profile.legal_entity_name),
    contacts: clean(asObject(profile.primary_contact).name),
    billing: place(asObject(profile.billing_address)),
    sites: count(objects(profile.sites).length, 'site', 'sites'),
  };
  const rows: ProfileStepRow[] = [];
  if (businessType) rows.push({ title: 'Client type', summary: businessType === 'individual' ? 'Individual' : 'Company' });
  for (const { key, title } of CLIENT_PROFILE_STEPS) rows.push({ title, summary: summaries[key], step: key });
  return rows;
}

/**
 * The lines of the Profile card. They differ by kind of account: for a guard, a provider's guard, a
 * service provider and a client they are the sections of the profile (the onboarding steps), each
 * with a short summary and an edit screen. Before the account loads, and for platform admins who
 * have no tenant profile, the card shows what the session knows.
 */
export function profileSteps(
  kind: AccountKind,
  account: AccountInfo | null,
  session: { username: string; status: string; verificationDate: string | null } | null
): ProfileStepRow[] {
  if (account !== null) {
    if (kind === 'guard') return guardSteps(account, false);
    if (kind === 'provider-guard') return guardSteps(account, true);
    if (kind === 'provider') return providerSteps(account);
    if (kind === 'client') return clientSteps(account);
  }

  const verified = session?.verificationDate ? new Date(session.verificationDate) : null;
  return [
    { title: 'Username', summary: session?.username ?? '' },
    { title: 'Status', summary: session?.status ? sentenceCase(session.status) : '' },
    { title: 'Verified', summary: verified && !Number.isNaN(verified.getTime()) ? verified.toLocaleDateString() : 'Not verified' },
  ].filter((row) => row.summary !== '');
}
