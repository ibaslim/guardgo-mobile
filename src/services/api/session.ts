/**
 * Session token store.
 *
 * Auth model (see backend/routes/auth_routes.py in guardgo-master):
 * - Login returns a JWT access token (30 min). There is no separate refresh token:
 *   POST /api/token/refresh exchanges the *current, still valid* token for a new one (3 min).
 * - So the token must be refreshed before it expires. This module schedules that automatically,
 *   and the client also checks before every request.
 * - Once a token has expired the session cannot be recovered: it is cleared, and screens
 *   subscribed with `subscribeSession` (the root layout's guard) send the user back to login.
 */
import { AppState } from 'react-native';

import { TOKEN_REFRESH_MARGIN_MS } from '@/constants/api';
import { ENDPOINTS } from '@/constants/endpoints';
import { ApiError } from '@/services/api/errors';
import { httpRequest } from '@/services/api/http';
import type { Session, TokenResponse } from '@/types/auth';
import { readTokenExpiry } from '@/utils/jwt';

// setTimeout fires immediately for delays above 2^31-1 ms.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

let accessToken: string | null = null;
let session: Session | null = null;
let tokenExpiresAt: number | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | undefined;
let refreshInFlight: Promise<void> | null = null;
const sessionListeners = new Set<() => void>();

/** Called whenever the token is set or cleared (for useSyncExternalStore). */
export function subscribeSession(listener: () => void) {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

function notifySessionListeners() {
  sessionListeners.forEach((listener) => listener());
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  if (tokenExpiresAt === null) return;
  const delay = Math.min(Math.max(tokenExpiresAt - TOKEN_REFRESH_MARGIN_MS - Date.now(), 0), MAX_TIMEOUT_MS);
  refreshTimer = setTimeout(() => {
    refreshSession().catch(() => {});
  }, delay);
}

/**
 * Stores the access token from a login or refresh and keeps it refreshed. The user details are
 * replaced only when the response includes them, so a refresh without `session` keeps the old ones.
 */
export function setAccessToken(token: string, nextSession?: Session) {
  accessToken = token;
  if (nextSession) session = nextSession;
  tokenExpiresAt = readTokenExpiry(token);
  scheduleRefresh();
  notifySessionListeners();
}

export function getAccessToken() {
  return accessToken;
}

/** The signed-in user's details (role, status, ...), or null when logged out. */
export function getSession() {
  return session;
}

/** Forgets the token locally (logout, or a session the server no longer accepts). */
export function clearSession() {
  if (!accessToken) return;
  clearTimeout(refreshTimer);
  accessToken = null;
  session = null;
  tokenExpiresAt = null;
  notifySessionListeners();
}

/** Exchanges the current token for a fresh one. Concurrent callers share one request. */
function refreshSession(): Promise<void> {
  if (!accessToken) return Promise.resolve();
  if (!refreshInFlight) {
    const token = accessToken;
    refreshInFlight = httpRequest<TokenResponse>('POST', ENDPOINTS.auth.refresh, undefined, { token })
      .then((response) => {
        // Ignore the result if the user logged out or in again meanwhile.
        if (accessToken === token) setAccessToken(response.access_token, response.session);
      })
      .catch((error: unknown) => {
        // Network problems and timeouts may be temporary; anything else means the session is gone.
        if (error instanceof ApiError && error.status !== 0 && error.status !== 408 && accessToken === token) {
          clearSession();
        }
        throw error;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Refreshes the token if it is about to expire, or clears the session if it already has. */
export async function ensureFreshToken() {
  if (!accessToken || tokenExpiresAt === null) return;
  const remaining = tokenExpiresAt - Date.now();
  if (remaining <= 0) {
    clearSession();
  } else if (remaining < TOKEN_REFRESH_MARGIN_MS) {
    await refreshSession().catch(() => {});
  }
}

/**
 * Timers don't run while the app is in the background, so re-check the token whenever the app
 * comes back to the foreground. Call once from the root layout; returns a cleanup function.
 */
export function startSessionMonitor() {
  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      ensureFreshToken().then(scheduleRefresh);
    }
  });
  return () => subscription.remove();
}
