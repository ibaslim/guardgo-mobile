/**
 * HTTP client for the GuardGo API. Every service should go through `api` so that auth, token
 * refresh and error handling work the same everywhere.
 */
import { ApiError } from '@/services/api/errors';
import { FormBody, httpRequest } from '@/services/api/http';
import { clearSession, ensureFreshToken, getAccessToken } from '@/services/api/session';
import type { HttpMethod, RequestOptions } from '@/types/api';

async function request<T>(method: HttpMethod, path: string, body?: unknown, options: RequestOptions = {}) {
  await ensureFreshToken();
  const token = getAccessToken();

  try {
    return await httpRequest<T>(method, path, body, { ...options, token });
  } catch (error) {
    // The server rejected the session (expired, revoked or logged in elsewhere).
    if (error instanceof ApiError && error.status === 401 && token) {
      clearSession();
    }
    throw error;
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
  /** POST as application/x-www-form-urlencoded (used by the OAuth2 login endpoint). */
  postForm: <T>(path: string, fields: Record<string, string>, options?: RequestOptions) =>
    request<T>('POST', path, new FormBody(fields), options),
};
