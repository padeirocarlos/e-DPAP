"use client";

/**
 * Report builder: pick which columns to print, then export (CSV/XLSX/PDF). The
 * download links carry the current actor-list filters (read from the URL) plus
 * the selected column keys, and point at the download proxy
 * (`/api/download/actors`), which forwards the session's bearer token to the
 * backend and streams the file back (the `Content-Disposition: attachment`
 * header triggers the download without navigating away).
 *
 * Reads the URL via `useSearchParams`, so the page wraps it in a <Suspense>.
 */

import { useState } from "react";
import { useDictionary, useLocale } from "@/i18n/provider";
import { format } from "@/i18n/format";
import {
  actorExportUrl,
  actorGeoExportUrl,
  dictionaryExportUrl,
  REPORT_ERROR_PARAM,
  type ReportFormat,
} from "@/config/routes";
import { FILTER_KEYS } from "@/lib/actors/filter-params";
import { useSearchParams } from "next/navigation";
import { REPORT_COLUMNS, DEFAULT_REPORT_COLUMNS } from "@/lib/reports/columns";

const FORMATS: ReportFormat[] = ["csv", "xlsx", "pdf"];

export function ReportExport() {
  const dict = useDictionary();
  const t = dict.reports;
  const locale = useLocale();
  const searchParams = useSearchParams();

  const [selected, setSelected] = useState<string[]>(DEFAULT_REPORT_COLUMNS);
  const [anon, setAnon] = useState(false);

  // Map the (Portuguese) URL filter keys to the backend query parameters.
  const filters = {
    q: searchParams.get(FILTER_KEYS.q) ?? undefined,
    districtCode: searchParams.get(FILTER_KEYS.district) ?? undefined,
    sector: searchParams.get(FILTER_KEYS.sector) ?? undefined,
    actorType: searchParams.get(FILTER_KEYS.type) ?? undefined,
  };

  const errorFlag = searchParams.get(REPORT_ERROR_PARAM);
  const errorMessage =
    errorFlag === "formato" ? t.errors.formato : errorFlag === "exportacao" ? t.errors.exportacao : null;

  const toggle = (key: string) =>
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  const allKeys = REPORT_COLUMNS.map((c) => c.key);
  // Preserve canonical order when building the download URL.
  const orderedSelected = allKeys.filter((k) => selected.includes(k));

  const labelFor = (fmt: ReportFormat) =>
    fmt === "csv" ? t.export.csv : fmt === "xlsx" ? t.export.xlsx : t.export.pdf;

  return (
    <div className="space-y-4">
      {/* Column chooser */}
      <section className="rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{t.columns.heading}</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              {format(t.columns.selected, { n: orderedSelected.length, total: allKeys.length })}
            </span>
            <button type="button" onClick={() => setSelected(allKeys)} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
              {t.columns.all}
            </button>
            <button type="button" onClick={() => setSelected([])} className="font-medium text-zinc-500 hover:underline">
              {t.columns.none}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {REPORT_COLUMNS.map((c) => {
            const on = selected.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(c.key)}
                className={
                  "rounded-full border px-3 py-1 text-sm transition-colors " +
                  (on
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-black/15 text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Export */}
      <section className="space-y-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-semibold">{t.export.heading}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.export.description}</p>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {FORMATS.map((fmt) => (
            <a
              key={fmt}
              href={actorExportUrl(locale, fmt, filters, orderedSelected)}
              aria-disabled={orderedSelected.length === 0}
              className={
                "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white " +
                (orderedSelected.length === 0
                  ? "pointer-events-none bg-emerald-700/40"
                  : "bg-emerald-700 hover:bg-emerald-800")
              }
            >
              {format(t.export.download, { format: labelFor(fmt) })}
            </a>
          ))}
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">{t.export.csvNote}</p>
      </section>

      {/* Georeferenced export (GeoJSON / KML) */}
      <section className="space-y-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-semibold">{t.geo.heading}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.geo.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4" />
          {t.geo.anonymised}
        </label>
        <div className="flex flex-wrap gap-3">
          <a href={actorGeoExportUrl(locale, "geojson", anon)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            {t.geo.geojson}
          </a>
          <a href={actorGeoExportUrl(locale, "kml", anon)}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            {t.geo.kml}
          </a>
        </div>
      </section>

      {/* Data dictionary */}
      <section className="space-y-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
        <div>
          <h2 className="text-base font-semibold">{t.dictionary.heading}</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.dictionary.description}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={dictionaryExportUrl(locale, "json")}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20">
            {t.dictionary.json}
          </a>
          <a href={dictionaryExportUrl(locale, "csv")}
            className="inline-flex items-center gap-2 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20">
            {t.dictionary.csv}
          </a>
        </div>
      </section>
    </div>
  );
}
