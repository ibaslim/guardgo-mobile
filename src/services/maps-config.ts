import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';

/** Google Maps settings the server hands to every client, from `GET /api/public` (same as the web). */
export type MapsConfig = {
  apiKey: string;
  mapId?: string;
  /** Two-letter country the address search is limited to, like "ca". */
  countryRestriction?: string;
};

type PublicConfig = { settings?: Record<string, string | undefined> };

/** The maps settings, or null when the server has Google Maps turned off. */
export async function getMapsConfig(): Promise<MapsConfig | null> {
  const { settings = {} } = await api.get<PublicConfig>(ENDPOINTS.public.config);
  const apiKey = (settings.google_maps_api_key ?? '').trim();
  if (settings.google_maps_enabled !== '1' || !apiKey) return null;
  return {
    apiKey,
    mapId: settings.google_maps_map_id?.trim() || undefined,
    countryRestriction: settings.google_maps_country_restriction?.trim().toLowerCase() || undefined,
  };
}
