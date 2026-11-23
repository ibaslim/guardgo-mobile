import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/services/api';
import type { MapsConfig } from '@/types/maps';

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
