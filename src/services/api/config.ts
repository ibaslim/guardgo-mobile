import { env } from '@/config/env';

/** Server from .env, used until the user picks another one on the IP Config screen. */
export const DEFAULT_API_URL = env.apiUrl;

let apiUrl = DEFAULT_API_URL;

export function getApiUrl() {
  return apiUrl;
}

/** Points all API traffic at another server (see services/server-config.ts for persistence). */
export function setApiUrl(url: string) {
  apiUrl = url.replace(/\/+$/, '');
}
