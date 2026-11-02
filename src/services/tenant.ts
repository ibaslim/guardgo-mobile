import { ENDPOINTS } from '@/constants/endpoints';
import { phoneDigits, toE164 } from '@/schemas/client-onboarding';
import { api, getAccessToken, getApiUrl, refreshSession, updateSession } from '@/services/api';
import type { PickedImage } from '@/services/image-picker';
import type { ClientMetadata, ClientOnboardingValues, OnboardingSite } from '@/types/onboarding';

// Same limits as the web profile picture upload.
export const TENANT_IMAGE_MAX_KB = 500;
const TENANT_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

type TenantUpdateResponse = { message?: string; id?: string; status?: string };

/** The signed-in user's tenant, from `GET /api/tenant`. */
export type TenantSnapshot = { id?: string; status?: string; profile?: Record<string, unknown> };

export function getTenant() {
  return api.get<TenantSnapshot>(ENDPOINTS.tenant.profile);
}

export function getClientMetadata() {
  return api.get<ClientMetadata>(ENDPOINTS.public.clientMetadata);
}

function imageType(image: PickedImage) {
  if (image.mimeType) return image.mimeType;
  if (/\.png$/i.test(image.uri)) return 'image/png';
  if (/\.jpe?g$/i.test(image.uri)) return 'image/jpeg';
  return null;
}

/** A reason the image can't be uploaded, or null when it is fine. Checked before sending, like the web. */
export function checkTenantImage(image: PickedImage): string | null {
  const type = imageType(image);
  if (!type || !TENANT_IMAGE_TYPES.includes(type)) return 'Only JPEG and PNG images are allowed.';
  if (image.fileSize !== null && image.fileSize > TENANT_IMAGE_MAX_KB * 1024) {
    return `The image must be smaller than ${TENANT_IMAGE_MAX_KB} KB. Choose a smaller one.`;
  }
  return null;
}

/** Saves the company logo or profile photo: multipart form data with the file in the `file` field. */
export function uploadTenantImage(image: PickedImage) {
  const type = imageType(image) ?? 'image/jpeg';
  const body = new FormData();
  // React Native reads a file from a { uri, name, type } object in place of a Blob.
  body.append('file', {
    uri: image.uri,
    name: image.fileName ?? (type === 'image/png' ? 'logo.png' : 'logo.jpg'),
    type,
  } as unknown as Blob);
  return api.put<unknown>(ENDPOINTS.tenant.image, body);
}

/** A logo to show: its address and the headers the server needs to serve it. */
export type TenantImage = { uri: string; headers?: Record<string, string> };

// What identifies a served file. Two responses with the same signature are the same file.
const fileSignature = (response: Response) =>
  [response.headers.get('etag'), response.headers.get('content-length'), response.headers.get('last-modified')].join('|');

/**
 * The logo already saved for this tenant, or null when there is none (or it can't be loaded).
 *
 * The image route only checks that an access_token cookie is present, and it answers with a default
 * avatar when no logo was uploaded. The app signs in with a bearer token, so the cookie is sent by
 * hand, and a logo counts as uploaded only when it differs from the default avatar (fetched through
 * the id "default", which resolves to that file).
 */
export async function fetchTenantLogo(id: string | undefined): Promise<TenantImage | null> {
  try {
    const token = getAccessToken();
    if (!token || !id) return null;

    const headers = { Cookie: `access_token=${token}` };
    const base = `${getApiUrl()}${ENDPOINTS.tenant.imageFile}`;
    const [own, fallback] = await Promise.all([fetch(`${base}/${id}`, { headers }), fetch(`${base}/default`, { headers })]);
    if (!own.ok || !fallback.ok) return null;
    const signature = fileSignature(own);
    if (signature === '||' || signature === fileSignature(fallback)) return null;

    // The timestamp stops a replaced logo from being served from the image cache.
    return { uri: `${base}/${id}?t=${Date.now()}`, headers };
  } catch {
    return null;
  }
}

export function deleteTenantImage() {
  return api.delete<unknown>(ENDPOINTS.tenant.image);
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
const asText = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim());

/** "4165550123" -> "416 555 0123" */
function formatPhone(phone: unknown) {
  const digits = phoneDigits(asText(phone));
  return digits.length === 10 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : digits;
}

/** A Canadian city's code from the name the server stores (or the code itself). */
function cityCodeFor(metadata: ClientMetadata | null, province: string, name: string) {
  const options = metadata?.canadianCitiesByProvince[province] ?? [];
  return (
    options.find((option) => option.value === name.toUpperCase())?.value ??
    options.find((option) => option.label.toLowerCase() === name.toLowerCase())?.value ??
    null
  );
}

/** Saved operational sites as form values (the reverse of the `sites` built in `buildClientProfile`). */
function parseSites(value: unknown, metadata: ClientMetadata | null): OnboardingSite[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const site = asObject(entry);
    const address = asObject(site.site_address);
    const province = asText(address.province);
    const guards = asText(site.number_of_guards_required);
    return {
      site_name: asText(site.site_name),
      site_type: asText(site.site_type) || null,
      manager_contact: asText(site.site_manager_contact),
      manager_email: asText(site.manager_email),
      guards_required: guards,
      street: asText(address.street),
      province: province || null,
      city: cityCodeFor(metadata, province, asText(address.city)),
      postal_code: asText(address.postal_code),
      latitude: asText(address.latitude),
      longitude: asText(address.longitude),
    };
  });
}

/**
 * The saved client profile as onboarding form values, or null when nothing was saved yet. This is
 * the reverse of `buildClientProfile`; the city comes back as a name and is matched to its code.
 */
export function parseClientProfile(
  profile: Record<string, unknown> | undefined,
  metadata: ClientMetadata | null
): Partial<ClientOnboardingValues> | null {
  if (!profile || Object.keys(profile).length === 0) return null;

  const primary = asObject(profile.primary_contact);
  const secondary = asObject(profile.secondary_contact);
  const address = asObject(profile.billing_address);
  const card = asObject(profile.billing_method);

  const businessType = asText(profile.business_type);
  const country = asText(address.country) || 'CA';
  const province = asText(address.province);
  const cityName = asText(address.city);
  const cityCode = cityCodeFor(metadata, province, cityName);

  const year = asText(card.expiry_year);
  const month = asText(card.expiry_month);

  return {
    client_type: businessType === 'individual' ? 'individual' : businessType ? 'company' : null,
    legal_entity_name: asText(profile.legal_entity_name),
    industry: asText(profile.industry),
    company_registration_number: asText(profile.company_registration_number),
    company_website: asText(profile.company_website),
    tax_vat_number: asText(profile.tax_vat_number),
    primary_name: asText(primary.name),
    primary_email: asText(primary.email),
    primary_phone: formatPhone(primary.phone),
    secondary_name: asText(secondary.name),
    secondary_email: asText(secondary.email),
    secondary_phone: formatPhone(secondary.phone),
    billing_street: asText(address.street),
    billing_country: country,
    billing_province: province || null,
    billing_city: country === 'CA' ? cityCode : cityName || null,
    billing_postal_code: asText(address.postal_code),
    card_method: card.method === 'debit_card' ? 'debit_card' : 'credit_card',
    card_holder: asText(card.cardholder_name),
    card_last4: asText(card.last4),
    card_expiry_month: month ? month.padStart(2, '0') : null,
    card_expiry_year: year.length === 2 ? `20${year}` : year || null,
    sites: parseSites(profile.sites, metadata),
  };
}

/** The profile in the shape `PUT /api/tenant` expects (same as the web client profile form). */
function buildClientProfile(values: ClientOnboardingValues, metadata: ClientMetadata) {
  const company = values.client_type === 'company';
  const province = values.billing_province ?? '';
  const cityCode = values.billing_city ?? '';
  // The server stores the city's name; Canadian cities are picked by code.
  const city = metadata.canadianCitiesByProvince[province]?.find((option) => option.value === cityCode)?.label ?? cityCode;

  return {
    tenant_type: 'client',
    profile: {
      legal_entity_name: values.legal_entity_name.trim(),
      business_type: values.client_type,
      industry: company ? values.industry.trim() : undefined,
      company_registration_number: company ? values.company_registration_number.trim() : '',
      company_website: company ? values.company_website.trim() || undefined : undefined,
      tax_vat_number: company ? values.tax_vat_number.trim() || undefined : undefined,
      primary_contact: {
        name: values.primary_name.trim(),
        email: values.primary_email.trim(),
        phone: toE164(values.primary_phone),
      },
      secondary_contact: {
        name: values.secondary_name.trim(),
        email: values.secondary_email.trim(),
        phone: toE164(values.secondary_phone),
      },
      billing_address: {
        street: values.billing_street.trim(),
        city,
        country: values.billing_country,
        province,
        postal_code: values.billing_postal_code.trim(),
      },
      billing_method: {
        method: values.card_method,
        cardholder_name: values.card_holder.trim(),
        last4: values.card_last4.trim(),
        expiry_month: values.card_expiry_month,
        expiry_year: values.card_expiry_year,
      },
      sites: values.sites.map((site) => {
        const siteProvince = site.province ?? '';
        const siteCity = site.city ?? '';
        return {
          site_name: site.site_name.trim(),
          site_manager_contact: site.manager_contact.trim() || undefined,
          manager_email: site.manager_email.trim() || undefined,
          number_of_guards_required: site.guards_required.trim() ? Number(site.guards_required) : undefined,
          site_type: site.site_type || undefined,
          site_address: {
            street: site.street.trim(),
            city: metadata.canadianCitiesByProvince[siteProvince]?.find((option) => option.value === siteCity)?.label ?? siteCity,
            country: 'CA',
            province: siteProvince,
            postal_code: site.postal_code.trim(),
            latitude: Number(site.latitude),
            longitude: Number(site.longitude),
          },
        };
      }),
    },
    // A first-time save waits for the platform's review before the account is active.
    status: 'pending_activation',
  };
}

/** Saves the client profile. The server then moves the tenant out of "onboarding". */
export function saveClientProfile(values: ClientOnboardingValues, metadata: ClientMetadata) {
  return api.put<TenantUpdateResponse>(ENDPOINTS.tenant.profile, buildClientProfile(values, metadata));
}

/**
 * Picks up the server's new tenant status after the profile was saved, so the app leaves onboarding.
 * If the refresh can't reach the server, the saved profile still counts: leave onboarding locally.
 */
export async function finishOnboarding() {
  try {
    await refreshSession();
  } catch {
    updateSession({ hasOnboarding: false });
  }
}
