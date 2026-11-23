/** Google Maps settings the server hands to every client, from `GET /api/public` (same as the web). */
export type MapsConfig = {
  apiKey: string;
  mapId?: string;
  /** Two-letter country the address search is limited to, like "ca". */
  countryRestriction?: string;
};
