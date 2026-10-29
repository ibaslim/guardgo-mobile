/**
 * Transport layer: builds the URL, encodes the body, applies the timeout and turns failures into
 * ApiError. It knows nothing about the session; the caller passes the token to send, if any.
 */
import { REQUEST_TIMEOUT_MS } from '@/constants/api';
import { getApiUrl } from '@/services/api/config';
import { ApiError, toApiError } from '@/services/api/errors';
import type { HttpMethod, HttpRequestOptions, QueryParams } from '@/types/api';

/** Marks a body to be sent as application/x-www-form-urlencoded. */
export class FormBody {
  constructor(readonly fields: Record<string, string>) {}
}

function buildUrl(baseUrl: string, path: string, query?: QueryParams) {
  const url = baseUrl.replace(/\/+$/, '') + (path.startsWith('/') ? path : `/${path}`);
  if (!query) return url;

  const params: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== null && item !== undefined) {
        params.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
      }
    }
  }
  return params.length ? `${url}?${params.join('&')}` : url;
}

function encodeForm(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export async function httpRequest<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options: HttpRequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...options.headers };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body; // fetch sets the multipart boundary itself
  } else if (body instanceof FormBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
    payload = encodeForm(body.fields);
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort();
  options.signal?.addEventListener('abort', abortFromCaller);

  let response: Response;
  try {
    response = await fetch(buildUrl(options.baseUrl ?? getApiUrl(), path, options.query), {
      method,
      headers,
      body: payload,
      signal: controller.signal,
      // The server also sets an httpOnly access_token cookie, and /api/logout only reads that cookie.
      credentials: 'include',
    });
  } catch (error) {
    if (timedOut) throw new ApiError(408, 'Request timed out');
    if (options.signal?.aborted) throw error;
    throw new ApiError(0, 'Cannot connect to server');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromCaller);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw toApiError(response.status, data);
  }

  return data as T;
}
