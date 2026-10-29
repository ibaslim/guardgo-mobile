/**
 * Lets the user point the app at another API server (IP Config screen) and remembers the choice
 * across restarts. Until one is saved, the server from EXPO_PUBLIC_API_URL is used.
 */
import { SERVER_TEST_TIMEOUT_MS } from '@/constants/api';
import { ENDPOINTS } from '@/constants/endpoints';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { readSetting, removeSetting, writeSetting } from '@/lib/storage';
import { api, DEFAULT_API_URL, getApiUrl, setApiUrl } from '@/services/api';
import type { ServerConfig } from '@/types/server-config';
import { normalizeServerUrl } from '@/utils/server-url';

/** Loads the saved server, if any. Call once at startup before making API requests. */
export async function loadServerConfig() {
  const config = await readSetting<ServerConfig>(STORAGE_KEYS.serverConfig);
  if (config && typeof config.apiUrl === 'string' && normalizeServerUrl(config.apiUrl)) {
    setApiUrl(config.apiUrl);
  }
}

export async function saveServerUrl(url: string) {
  setApiUrl(url);
  await writeSetting<ServerConfig>(STORAGE_KEYS.serverConfig, { apiUrl: getApiUrl() });
}

export function resetServerUrl() {
  setApiUrl(DEFAULT_API_URL);
  removeSetting(STORAGE_KEYS.serverConfig);
}

/** Throws an ApiError if the server can't be reached or isn't the GuardGo API. */
export async function testServer(url: string) {
  await api.get(ENDPOINTS.public.config, { baseUrl: url, timeoutMs: SERVER_TEST_TIMEOUT_MS });
}
