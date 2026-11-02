/**
 * HTTP client for the DPAP backend (browser-only).
 *
 * Responsibilities: base URL + query building, JSON encode/decode, bearer-token
 * injection from the stored session, request timeout, and normalizing every
 * failure into a typed `ApiError` with a stable `code` so the sync engine and
 * UI branch on one shape. A `NETWORK` error is the expected offline signal.
 */

import { appConfig } from "@/config/app";
import { getToken } from "@/auth/session";

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
  constructor(code: ApiErrorCode, message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
  /** True when the failure is a lost/absent connection (work offline). */
  get isOffline(): boolean {
    return this.code === "NETWORK" || this.code === "TIMEOUT";
  }
}

export type Query = Record<string, string | number | boolean | undefined | null>;

type Options = {
  query?: Query;
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

/**
 * Effective API base URL for this call.
 *
 * `VITE_API_BASE_URL` commonly points at `localhost:8080`. When the PWA is
 * opened over a LAN IP/hostname (a field tablet reaching the server over
 * Wi-Fi), `localhost` is the *device* itself, so the call must instead target
 * the host that served the app. We swap the host only for a loopback default
 * opened from a different host; an explicitly-configured LAN URL is left as-is.
 */
function resolveBaseUrl(): string {
  const configured = appConfig.api.baseUrl;
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
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function mapStatus(status: number): ApiErrorCode {
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

async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), appConfig.api.timeoutMs);
  options.signal?.addEventListener("abort", () => controller.abort(), { once: true });

  const bearer = options.token ?? getToken();
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (bearer) headers.Authorization = `Bearer ${bearer}`;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("TIMEOUT", "Request timed out");
    }
    throw new ApiError("NETWORK", "Network request failed");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 204) return undefined as T;
  const payload = await res.json().catch(() => undefined);

  if (!res.ok) {
    const code = mapStatus(res.status);
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${res.status}`;
    throw new ApiError(code, message, res.status);
  }
  return payload as T;
}

export const http = {
  get: <T>(path: string, options?: Options) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: Options) =>
    request<T>("PUT", path, { ...options, body }),
  delete: <T>(path: string, options?: Options) => request<T>("DELETE", path, options),
};
