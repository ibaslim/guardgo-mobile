import type { FastApiValidationError, ServerValidationError } from '@/types/api';

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached and 408 when the request timed out. */
  readonly status: number;
  /** Per-field validation messages, keyed by field name. */
  readonly fieldErrors: Record<string, string>;
  /** Parsed response body, if any. */
  readonly body: unknown;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}, body?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.body = body;
  }
}

// The server answers errors in three shapes:
//   { detail: "message" }                                   HTTPException
//   { detail: [{ loc, msg, type }] }                        FastAPI validation (per the OpenAPI spec)
//   { validation_errors: [{ field, message }], traceback }  the server's own validation handler
export function toApiError(status: number, body: unknown): ApiError {
  const fieldErrors: Record<string, string> = {};
  let message = `Request failed (${status})`;

  if (body && typeof body === 'object') {
    const { detail, validation_errors, message: bodyMessage } = body as Record<string, unknown>;

    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail)) {
      for (const error of detail as FastApiValidationError[]) {
        fieldErrors[String(error.loc[error.loc.length - 1])] = error.msg;
      }
    } else if (Array.isArray(validation_errors)) {
      for (const error of validation_errors as ServerValidationError[]) {
        fieldErrors[error.field] = error.message;
      }
    } else if (typeof bodyMessage === 'string') {
      message = bodyMessage;
    }

    const firstFieldError = Object.entries(fieldErrors)[0];
    if (firstFieldError) {
      message = `${firstFieldError[0]}: ${firstFieldError[1]}`;
    }
  } else if (typeof body === 'string' && body) {
    message = body;
  }

  return new ApiError(status, message, fieldErrors, body);
}
