/**
 * Centralized route builders.
 *
 * Every internal link is produced here so URL segments live in one place and
 * all links stay locale-prefixed. Never hardcode a path string in a component.
 */

import type { Locale } from "@/i18n/config";

/** Raw path segments under `/[lang]`. */
export const segments = {
  dashboard: "",
  map: "mapa",
  actors: "atores",
  newActor: "atores/novo",
  submissions: "entrevistas",
  newSubmission: "entrevistas/nova",
  conformance: "conformidade",
  network: "rede",
  reports: "relatorios",
  administration: "administracao",
  login: "entrar",
} as const;

function path(locale: Locale, segment: string): string {
  return segment ? `/${locale}/${segment}` : `/${locale}`;
}

/** Query-string key the reports page reads to show a localized export error. */
export const REPORT_ERROR_PARAM = "erro";

/** Export formats offered by the report download proxy. */
export type ReportFormat = "csv" | "xlsx" | "pdf";

export const routes = {
  dashboard: (l: Locale) => path(l, segments.dashboard),
  map: (l: Locale) => path(l, segments.map),
  actors: (l: Locale) => path(l, segments.actors),
  newActor: (l: Locale) => path(l, segments.newActor),
  actorDetail: (l: Locale, id: string) =>
    `${path(l, segments.actors)}/${encodeURIComponent(id)}`,
  editActor: (l: Locale, id: string) =>
    `${path(l, segments.actors)}/${encodeURIComponent(id)}/editar`,
  submissions: (l: Locale) => path(l, segments.submissions),
  newSubmission: (l: Locale) => path(l, segments.newSubmission),
  submissionDetail: (l: Locale, id: string) =>
    `${path(l, segments.submissions)}/${encodeURIComponent(id)}`,
  conformance: (l: Locale) => path(l, segments.conformance),
  network: (l: Locale) => path(l, segments.network),
  reports: (l: Locale) => path(l, segments.reports),
  administration: (l: Locale) => path(l, segments.administration),
  login: (l: Locale) => path(l, segments.login),
} as const;

/**
 * URL for the actor-export download proxy (`src/app/api/download/actors`).
 * `lang` lets the proxy build locale-correct redirects on failure; the actor
 * list filters are forwarded verbatim to the backend export endpoint.
 */
export function actorExportUrl(
  locale: Locale,
  format: ReportFormat,
  filters: Record<string, string | undefined> = {},
  columns?: string[],
): string {
  const params = new URLSearchParams({ format, lang: locale });
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (columns && columns.length) params.set("columns", columns.join(","));
  return `/api/download/actors?${params.toString()}`;
}

/** GeoJSON/KML export of georeferenced actors (FR-EXP), optionally anonymised. */
export function actorGeoExportUrl(
  locale: Locale,
  format: "geojson" | "kml",
  anonymised = false,
): string {
  const params = new URLSearchParams({ kind: "geo", format, lang: locale });
  if (anonymised) params.set("anonymised", "true");
  return `/api/download/export?${params.toString()}`;
}

/** Data-dictionary export per form version (FR-EXP-3). */
export function dictionaryExportUrl(locale: Locale, format: "json" | "csv"): string {
  const params = new URLSearchParams({ kind: "dictionary", format, lang: locale });
  return `/api/download/export?${params.toString()}`;
}
