/**
 * Isomorphic HTTP client for the DPAP backend.
 *
 * Runs on both the server (Server Components fetching data) and the client
 * (forms, duplicate checks). Responsibilities: base URL + query building, JSON
 * encode/decode, bearer-token injection, request timeout, and normalizing every
 * failure into a single `ApiError` so callers and error boundaries handle one
 * shape.
 *
 * Error messages here are diagnostic (for logs); user-facing copy is resolved
 * from the i18n dictionary at the UI layer, keyed off `ApiError.code`.
 */

import { appConfig } from "@/config/app.config";
import { getAuthToken } from "@/lib/api/auth-token";

/** Stable error codes callers can branch on (mirrors backend error codes). */
export type ApiErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "SERVER"
  | "UNKNOWN";

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    status = 0,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type QueryValue = string | number | boolean | undefined | null;
export type Query = Record<string, QueryValue>;

type RequestOptions = {
  query?: Query;
  body?: unknown;
  /** Explicit bearer token; falls back to the auth-token module. */
  token?: string | null;
  signal?: AbortSignal;
  /** Override the default timeout for this request. */
  timeoutMs?: number;
};

/**
 * Effective API base URL for this call.
 *
 * The configured base (NEXT_PUBLIC_API_BASE_URL) commonly points at
 * `localhost:8080`. That is correct on the server (Server Actions/Components run
 * on the same host as the backend) but wrong in the browser when the page was
 * opened over a LAN IP or hostname — there `localhost` is the *device*, not the
 * server. In that one case we swap the host for the page's own host so the API
 * is reached on the same machine that served the app. Non-loopback or
 * server-side calls are left untouched.
 */
function resolveBaseUrl(): string {
  const configured = appConfig.api.baseUrl;
  if (typeof window === "undefined") return configured;
  try {
    const url = new URL(configured);
    const pageHost = window.location.hostname;
    const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (loopback && pageHost && pageHost !== url.hostname) {
      url.hostname = pageHost;
      return url.toString().replace(/\/$/, "");
    }
  } catch {
    // Malformed config — fall back to the configured value unchanged.
  }
  return configured;
}

function buildUrl(path: string, query?: Query): string {
  const base = resolveBaseUrl().replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function mapStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION";
    default:
      return status >= 500 ? "SERVER" : "UNKNOWN";
  }
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { query, body, token, signal, timeoutMs } = options;

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMs ?? appConfig.api.timeoutMs,
  );
  // Honor a caller-provided signal alongside our timeout.
  signal?.addEventListener("abort", () => controller.abort(), { once: true });

  const bearer = token ?? getAuthToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      // Reads are request-time data (dynamic under Cache Components), never cached here.
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out", 0, err);
    }
    throw new ApiError("NETWORK", "Network request failed", 0, err);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 204) return undefined as T;

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const code = mapStatusToCode(response.status);
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : undefined) ?? `Request failed with status ${response.status}`;
    throw new ApiError(code, message, response.status, payload);
  }

  return payload as T;
}

export const http = {
  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("DELETE", path, options),
};
