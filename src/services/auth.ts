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

/** Logs in with username/email and password and stores the session token. */
export async function login(username: string, password: string) {
  const response = await api.postForm<Partial<TokenResponse>>(ENDPOINTS.auth.token, { username, password });
  // Accounts with two-factor authentication get a challenge instead of a token; the app doesn't support 2FA.
  if (!response.access_token) {
    throw new AuthError('This account uses two-factor authentication, which the mobile app does not support.');
  }
  setAccessToken(response.access_token, response.session);
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
