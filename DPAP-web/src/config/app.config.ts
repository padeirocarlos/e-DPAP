/**
 * Central application configuration.
 *
 * No user-facing strings or tunable values are hardcoded across the codebase:
 * everything configurable lives here (or in the i18n dictionaries for text, and
 * in `src/lib/domain` for reference data). Prefer reading values from this module
 * over inlining literals in components.
 */

import { env } from "@/config/env";

export const appConfig = {
  /** Institution this system is built for. */
  org: {
    shortName: "DPAP",
    province: "Maputo",
    country: "MZ",
  },

  /**
   * Geographic defaults for all maps. Centered on Maputo Province.
   * Tile source is OpenStreetMap (open, no licensing cost) per project constraints.
   */
  map: {
    /** [latitude, longitude] — approximate centroid of Maputo Province. */
    defaultCenter: [-25.9, 32.5] as [number, number],
    defaultZoom: 8,
    minZoom: 5,
    maxZoom: 18,
    /** Bounding box for Maputo Province [[southWest], [northEast]] to constrain panning. */
    maxBounds: [
      [-27.0, 31.3],
      [-25.0, 33.1],
    ] as [[number, number], [number, number]],
    tileUrl: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    /** Attribution key resolved through i18n at render time. */
    tileAttribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    /** Max actor markers fetched for the map in one request. */
    markerFetchLimit: 500,
  },

  /** List and table paging defaults. */
  pagination: {
    defaultPageSize: 25,
    pageSizeOptions: [10, 25, 50, 100],
  },

  /** How long the UI waits (ms) after typing before running a duplicate check. */
  duplicateCheckDebounceMs: 400,

  /** Debounce (ms) before applying the list search box to the URL. */
  listFilterDebounceMs: 350,

  /** Backend API access. */
  api: {
    /** Base URL, injected from the environment (never hardcoded). */
    baseUrl: env.apiBaseUrl,
    /** Abort a request after this many ms. */
    timeoutMs: 15_000,
  },
} as const;

export type AppConfig = typeof appConfig;
