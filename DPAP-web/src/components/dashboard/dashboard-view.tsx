"use client";

/**
 * Dashboard presentation. Fed plain data by the server component. Charts are
 * magnitude bars in a single brand hue (emerald) — the job is magnitude, so one
 * sequential hue is correct and needs no categorical CVD palette — plus a
 * registration trend area. Each category bar is clickable and expands an inline
 * drill-down of the actors in that category (fetched via a Server Action).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useDictionary, useLocale } from "@/i18n/provider";
import { format } from "@/i18n/format";
import { routes } from "@/config/routes";
import { FILTER_KEYS } from "@/lib/actors/filter-params";
import {
  drilldownActorsAction,
  type DrilldownKind,
  type DrilldownResult,
} from "@/lib/actions/dashboard";
import type { ActorSummary } from "@/lib/api/types";

export type DashboardCategory = {
  kind: DrilldownKind;
  title: string;
  rows: { code: string; label: string; count: number }[];
};

export type DashboardViewProps = {
  summary: { total: number; completenessPct: number; pending: number; districts: number };
  trend: { period: string; count: number }[];
  categories: DashboardCategory[];
};

export function DashboardView({ summary, trend, categories }: DashboardViewProps) {
  const dict = useDictionary();
  const m = dict.dashboard.metrics;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={m.totalActors} value={summary.total.toLocaleString("pt-PT")} accent />
        <StatTile label={m.completeness} value={`${summary.completenessPct}%`} meter={summary.completenessPct} />
        <StatTile label={m.coverage} value={String(summary.districts)} />
        <StatTile label={m.syncStatus} value={summary.pending.toLocaleString("pt-PT")} />
      </div>

      <TrendChart data={trend} />

      <p className="text-xs text-zinc-500 dark:text-zinc-400">{dict.dashboard.clickHint}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {categories.map((c) => (
          <CategoryChart key={c.kind} category={c} />
        ))}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  accent,
  meter,
}: {
  label: string;
  value: string;
  accent?: boolean;
  meter?: number;
}) {
  return (
    <div
      className={
        "rounded-xl border p-4 " +
        (accent
          ? "border-emerald-600/30 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-950/40"
          : "border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900")
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      {typeof meter === "number" ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
            style={{ width: `${Math.min(100, Math.max(0, meter))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/** Registration trend as an SVG area + line with a hover crosshair. */
function TrendChart({ data }: { data: { period: string; count: number }[] }) {
  const dict = useDictionary();
  const [hover, setHover] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.dashboard.metrics.registrationTrend}
        </h2>
        <p className="mt-6 text-sm text-zinc-400">{dict.dashboard.trendEmpty}</p>
      </section>
    );
  }

  const W = 720;
  const H = 160;
  const PAD = { t: 12, r: 12, b: 22, l: 28 };
  const max = Math.max(...data.map((d) => d.count), 1);
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const x = (i: number) =>
    PAD.l + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v: number) => PAD.t + innerH - (v / max) * innerH;

  const line = data.map((d, i) => `${x(i)},${y(d.count)}`).join(" ");
  const area = `${PAD.l},${PAD.t + innerH} ${line} ${x(data.length - 1)},${PAD.t + innerH}`;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {dict.dashboard.metrics.registrationTrend}
        </h2>
        {hover !== null ? (
          <span className="text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
            {data[hover].period} · {data[hover].count}
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-3 h-40 w-full"
        role="img"
        aria-label={dict.dashboard.metrics.registrationTrend}
        onMouseLeave={() => setHover(null)}
      >
        <polygon points={area} className="fill-emerald-500/15" />
        <polyline
          points={line}
          className="fill-none stroke-emerald-600 dark:stroke-emerald-500"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {data.map((d, i) => (
          <g key={d.period}>
            {hover === i ? (
              <circle cx={x(i)} cy={y(d.count)} r={4} className="fill-emerald-600 dark:fill-emerald-400" />
            ) : null}
            {/* Invisible wide hit target. */}
            <rect
              x={x(i) - innerW / data.length / 2}
              y={PAD.t}
              width={innerW / data.length}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
          </g>
        ))}
      </svg>
    </section>
  );
}

function CategoryChart({ category }: { category: DashboardCategory }) {
  const dict = useDictionary();
  const locale = useLocale();
  const [open, setOpen] = useState<string | null>(null);
  const [cache, setCache] = useState<Record<string, DrilldownResult>>({});
  const [pending, startTransition] = useTransition();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const max = Math.max(...category.rows.map((r) => r.count), 1);

  const toggle = (code: string) => {
    if (open === code) {
      setOpen(null);
      return;
    }
    setOpen(code);
    if (!cache[code]) {
      setLoadingCode(code);
      startTransition(async () => {
        const res = await drilldownActorsAction(category.kind, code);
        setCache((prev) => ({ ...prev, [code]: res }));
        setLoadingCode(null);
      });
    }
  };

  const filterKey =
    category.kind === "district"
      ? FILTER_KEYS.district
      : category.kind === "sector"
        ? FILTER_KEYS.sector
        : FILTER_KEYS.type;

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{category.title}</h2>
      {category.rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">{dict.common.states.empty}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {category.rows.map((r) => {
            const isOpen = open === r.code;
            const result = cache[r.code];
            return (
              <li key={r.code}>
                <button
                  type="button"
                  onClick={() => toggle(r.code)}
                  aria-expanded={isOpen}
                  title={`${r.label}: ${r.count}`}
                  className="group flex w-full items-center gap-3 rounded-md px-1.5 py-1 text-left hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                >
                  <span className="w-28 shrink-0 truncate text-sm">{r.label}</span>
                  <span className="relative h-5 flex-1 overflow-hidden rounded bg-black/5 dark:bg-white/10">
                    <span
                      className="absolute inset-y-0 left-0 rounded bg-emerald-600 transition-all dark:bg-emerald-500"
                      style={{ width: `${(r.count / max) * 100}%` }}
                    />
                  </span>
                  <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                    {r.count}
                  </span>
                  <svg
                    className={"h-4 w-4 shrink-0 text-zinc-400 transition-transform " + (isOpen ? "rotate-90" : "")}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M7 5l6 5-6 5V5z" />
                  </svg>
                </button>

                {isOpen ? (
                  <div className="mb-1 ml-1.5 mt-1 rounded-md border border-black/10 bg-black/[0.02] p-2 text-sm dark:border-white/10 dark:bg-white/[0.03]">
                    {loadingCode === r.code || (pending && !result) ? (
                      <p className="px-1 py-1 text-zinc-400">{dict.common.states.loading}</p>
                    ) : result && result.ok ? (
                      result.items.length === 0 ? (
                        <p className="px-1 py-1 text-zinc-400">{dict.dashboard.drilldownEmpty}</p>
                      ) : (
                        <>
                          <ul className="divide-y divide-black/5 dark:divide-white/10">
                            {result.items.map((a: ActorSummary) => (
                              <li key={a.id}>
                                <Link
                                  href={routes.actorDetail(locale, a.id)}
                                  className="block truncate px-1 py-1.5 text-emerald-700 hover:underline dark:text-emerald-400"
                                >
                                  {a.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                          <Link
                            href={`${routes.actors(locale)}?${filterKey}=${encodeURIComponent(r.code)}`}
                            className="mt-1 inline-block px-1 py-1 text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {dict.dashboard.viewAll}
                            {result.total > result.items.length
                              ? " · " + format(dict.dashboard.more, { count: result.total - result.items.length })
                              : ""}
                          </Link>
                        </>
                      )
                    ) : (
                      <p className="px-1 py-1 text-red-600">{dict.dashboard.drilldownError}</p>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
