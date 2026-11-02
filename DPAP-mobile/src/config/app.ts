/**
 * Central app configuration. No tunable is hardcoded in components; read them
 * from here. The backend base URL comes from the build-time env var
 * `VITE_API_BASE_URL` (default: local backend).
 */

export const appConfig = {
  org: { shortName: "DPAP", province: "Maputo" },

  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api",
    timeoutMs: 20_000,
  },

  /** Debounce (ms) before running the on-device duplicate check while typing. */
  duplicateCheckDebounceMs: 400,

  /** Geolocation capture options (high accuracy for field GPS). */
  gps: {
    enableHighAccuracy: true,
    timeoutMs: 15_000,
    maximumAgeMs: 0,
  },

  /** How often (ms) the sync engine retries the outbox while online. */
  sync: { autoIntervalMs: 60_000 },
} as const;

export type AppConfig = typeof appConfig;
