import { ENDPOINTS } from '@/constants/endpoints';
import { api, ApiError, clearSession, setAccessToken } from '@/services/api';
import type { RegisterPayload, TokenResponse } from '@/types/auth';

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
  verificationCredentials = null;
  setAccessToken(result.access_token, result.session);
}

/** Creates an account. It does not sign in. */
export function register(payload: RegisterPayload) {
  return api.post<unknown>(ENDPOINTS.auth.register, payload);
}

export type InviteContext = { invite_pending: boolean; email: string; username: string; full_name: string };

/** Checks an invite link. Rejects with a 404 (unknown link) or 400 (expired, or already used). */
export function getInviteContext(token: string) {
  return api.get<InviteContext>(`${ENDPOINTS.auth.inviteContext}/${encodeURIComponent(token)}`);
}

/** Finishes an invited account by choosing its username and password. It does not sign in. */
export function activateInvite(payload: { token: string; username: string; full_name: string; password: string }) {
  return api.post<unknown>(ENDPOINTS.auth.inviteActivate, payload);
}

/** Emails a link to reset the password. Rejects with a 404 when no account uses the email. */
export function requestPasswordReset(email: string) {
  return api.post<{ message?: string }>(ENDPOINTS.auth.forgotPassword, { email: email.trim() });
}

/** Checks a reset link. Rejects with a 404 (unknown link) or 400 (expired). */
export function getResetContext(token: string) {
  return api.get<InviteContext>(`${ENDPOINTS.auth.resetContext}/${encodeURIComponent(token)}`);
}

/** Sets a new password with the token from the reset email. It does not sign in. */
export function resetPassword(token: string, password: string) {
  return api.post<unknown>(ENDPOINTS.auth.updatePassword, { token, password });
}

/** True when the server refused a sign-in because the account's email isn't confirmed yet. */
export function isEmailVerificationPending(error: unknown) {
  return error instanceof ApiError && error.status === 401 && /email verification pending/i.test(error.message);
}

/**
 * True when the server refused a sign-in because the account is blocked: "account blocked" when the
 * whole tenant is banned, "Account Blocked" when only this user is.
 */
export function isAccountBlocked(error: unknown) {
  return error instanceof ApiError && error.status === 401 && /account blocked/i.test(error.message);
}

export type VerificationCredentials = { username: string; email?: string; password: string };

// Resending asks the server to check the password again, so the credentials the user just typed are
// kept in memory (never saved, never put in a route) until the verify-email screen is left.
let verificationCredentials: VerificationCredentials | null = null;

export function setVerificationCredentials(credentials: VerificationCredentials | null) {
  verificationCredentials = credentials;
}

export function hasVerificationCredentials() {
  return verificationCredentials !== null;
}

/**
 * Sends a new confirmation link to the account that was just registered or refused at sign-in.
 * The server allows one email per minute (429 after that). Resolves with the address it was sent to.
 */
export async function resendVerificationEmail() {
  if (!verificationCredentials) throw new AuthError('Sign in again to get a new confirmation email.');
  const response = await api.post<{ email?: string }>(ENDPOINTS.auth.resendVerification, verificationCredentials);
  return response.email ?? null;
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
