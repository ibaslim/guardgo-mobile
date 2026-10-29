export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type QueryValue = string | number | boolean | null | undefined;

/** Query string parameters; null/undefined values are left out, arrays repeat the key. */
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export type RequestOptions = {
  query?: QueryParams;
  headers?: Record<string, string>;
  /** Send this one request to another server (e.g. to test it before switching). */
  baseUrl?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
};

/** Options for the session-unaware transport layer: the caller decides which token to send. */
export type HttpRequestOptions = RequestOptions & {
  token?: string | null;
};

export type Pagination = {
  page: number;
  rows: number;
  total_items: number;
  total_pages: number;
};

/** Envelope used by the paginated list endpoints (`?page=&rows=`). */
export type Paginated<T> = {
  items: T[];
  pagination: Pagination;
};

/** `{ detail: [...] }` items from FastAPI request validation. */
export type FastApiValidationError = {
  loc: (string | number)[];
  msg: string;
  type?: string;
};

/** `{ validation_errors: [...] }` items from the server's own validation handler. */
export type ServerValidationError = {
  field: string;
  message: string;
  type?: string;
};
