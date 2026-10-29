import { ENDPOINTS } from '@/constants/endpoints';
import { api, clearSession, setAccessToken } from '@/services/api';
import type { TokenResponse } from '@/types/auth';

/** A login problem that isn't an HTTP error, with a message that can be shown to the user. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

type LoginResult = TokenResponse & { access_token: string };

/**
 * Checks username/email and password with the server, without signing in yet. Pass the result to
 * `startSession`; screens can animate out in between.
 */
export async function requestLogin(username: string, password: string): Promise<LoginResult> {
  const response = await api.postForm<Partial<TokenResponse>>(ENDPOINTS.auth.token, { username, password });
  // Accounts with two-factor authentication get a challenge instead of a token; the app doesn't support 2FA.
  if (!response.access_token) {
    throw new AuthError('This account uses two-factor authentication, which the mobile app does not support.');
  }
  return response as LoginResult;
}

/** Signs in with a result from `requestLogin`. The root layout then shows the user's area. */
export function startSession(result: LoginResult) {
  setAccessToken(result.access_token, result.session);
}

/** Logs in with username/email and password and stores the session token. */
export async function login(username: string, password: string) {
  startSession(await requestLogin(username, password));
}

export async function logout() {
  try {
    await api.post(ENDPOINTS.auth.logout);
  } catch {
    // The session is dropped locally either way.
  } finally {
    clearSession();
  }
}
