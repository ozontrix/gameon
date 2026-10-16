/**
 * The one HTTP client every mobile screen talks to the GameOn API through.
 *
 * This is a port of `gameon-multisports/src/lib/api-client.ts`, with the
 * platform-specific parts gone: a browser has one origin, so the base URL is the
 * web app's own `/api/v1` rather than an emulator host, and `NEXT_PUBLIC_API_URL`
 * only has to be set when the app is served from somewhere else.
 *
 * Behaviour kept from the original, because the screens depend on it:
 *   • one automatic renewal of the access token, resolved once per request so an
 *     ambiguous refresh is never replayed;
 *   • GET retries on a dropped connection or a 5xx, never on a write;
 *   • a 401 on a protected route tells the session provider to sign out.
 */

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL || '/api/v1').replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 20_000;
const READ_RETRY_DELAYS_MS = [750, 1_500];
const RETRYABLE_HTTP_STATUSES = new Set([408, 502, 503, 504]);

function cancelledRequest() {
  return new ApiError('The request was cancelled.', 0, { code: 'CANCELLED' });
}

function waitForRetry(milliseconds: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(cancelledRequest());
      return;
    }
    const abort = () => {
      clearTimeout(timer);
      reject(cancelledRequest());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function isRetryableReadError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    ((error.status === 0 && error.body?.code !== 'CANCELLED') ||
      RETRYABLE_HTTP_STATUSES.has(error.status))
  );
}

/** The two fields the client ever reads out of a failed response's JSON. */
export type ApiErrorBody = { code?: string; error?: string } | null;

/** A failed API call, carrying the HTTP status and whatever JSON the server sent back. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(message: string, status: number, body: ApiErrorBody) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

class ApiClient {
  private token: string | null = null;
  private tokenProvider: (() => Promise<string | null>) | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  /** Called when a protected route answers 401, so the session can be dropped. */
  setUnauthorizedHandler(handler: (() => void) | null) {
    this.unauthorizedHandler = handler;
  }

  /** Called before each protected request, so an expired token is renewed first. */
  setTokenProvider(provider: (() => Promise<string | null>) | null) {
    this.tokenProvider = provider;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  async fetch(endpoint: string, options: RequestInit = {}): Promise<unknown> {
    if (options.signal?.aborted) throw cancelledRequest();
    // Session renewal can rotate credentials. Resolve it once, outside the read
    // retry loop, so an ambiguous refresh failure is never automatically replayed.
    const token =
      this.token && !endpoint.startsWith('/auth/') && this.tokenProvider
        ? await this.tokenProvider()
        : this.token;
    // A failed write may already have reached the server: never replay it.
    const canRetry = (options.method || 'GET').toUpperCase() === 'GET';
    for (let attempt = 0; ; attempt++) {
      if (options.signal?.aborted) throw cancelledRequest();
      try {
        return await this.request(endpoint, options, token);
      } catch (error) {
        if (options.signal?.aborted) throw cancelledRequest();
        if (!canRetry || !isRetryableReadError(error) || attempt >= READ_RETRY_DELAYS_MS.length) {
          throw error;
        }
        await waitForRetry(READ_RETRY_DELAYS_MS[attempt], options.signal);
      }
    }
  }

  private async request(endpoint: string, options: RequestInit, token: string | null) {
    if (options.signal?.aborted) throw cancelledRequest();
    const headers = new Headers(options.headers || {});

    // Multipart requests must let fetch supply the boundary itself.
    if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const abort = () => controller.abort();
    if (options.signal?.aborted) controller.abort();
    options.signal?.addEventListener('abort', abort);
    let response: Response;
    let text: string;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      text = await response.text();
    } catch (error) {
      if (options.signal?.aborted) throw cancelledRequest();
      if (controller.signal.aborted) {
        throw new ApiError(
          'The request timed out. Check your connection and try again.',
          0,
          { code: 'TIMEOUT' },
        );
      }
      if (error instanceof TypeError) {
        throw new ApiError('Unable to connect. Check your internet connection and try again.', 0, null);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }

    // A proxy or crashed deploy can answer with HTML; don't let JSON.parse be
    // the error the user sees.
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      if (response.status === 401 && !endpoint.startsWith('/auth/')) this.unauthorizedHandler?.();
      const body = data as ApiErrorBody;
      throw new ApiError(body?.error || `Request failed (${response.status})`, response.status, body);
    }
    if (data === null) {
      throw new ApiError('The server sent an unexpected response.', response.status, null);
    }

    return data;
  }

  async get(endpoint: string, options: Pick<RequestInit, 'signal'> = {}) {
    return this.fetch(endpoint, { ...options, method: 'GET' });
  }

  async post(endpoint: string, body: unknown) {
    return this.fetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  async patch(endpoint: string, body: unknown) {
    return this.fetch(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }
}

export const api = new ApiClient();
