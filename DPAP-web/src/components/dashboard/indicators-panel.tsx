import { getIndicators } from "@/lib/api/network";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { fieldByVar, optionsFor } from "@/form/schema-model";
import type { CodeCount, ModuleStat } from "@/lib/api/types";

/**
 * Dashboard indicators (BRD §9 subset: IND-01 by level, IND-02 by sex, IND-16
 * programmes, IND-18 coordination). Server component; labels resolve through the
 * schema. Magnitude bars use a single hue (dataviz: no categorical palette).
 */
export async function IndicatorsPanel() {
  const token = await getServerAuthToken();
  const [ind, dict] = await Promise.all([
    getIndicators({ token }).catch(() => null),
    getDictionary(),
  ]);
  if (!ind) return null;
  const t = dict.indicators;

  const labelFor = (fieldVar: string) => {
    const f = fieldByVar(fieldVar);
    const opts = f ? optionsFor(f) : [];
    return (code: string) => opts.find((o) => String(o.code) === code)?.label_pt ?? code;
  };

  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-semibold">{t.title}</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarCard title={t.byLevel} rows={ind.actorsByLevel} resolve={labelFor("qA_17")} />
        <BarCard title={t.bySex} rows={ind.respondentsBySex} resolve={labelFor("qA_05")} />
        <BarCard title={t.knowsPlans} rows={ind.coordination.knowsGovPlans} resolve={labelFor("qN_01")} />
        <BarCard title={t.participates} rows={ind.coordination.participatesPlanning} resolve={labelFor("qN_02")} />
      </div>

      <ModuleStatsCard rows={ind.byModule ?? []} dict={dict} />

      <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
        <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.programmes}</h3>
        <p className="mt-1 text-sm">
          {ind.programmes.count.toLocaleString("pt-PT")} · {t.beneficiaries}:{" "}
          <span className="tabular-nums">
            {ind.programmes.beneficiariesMen.toLocaleString("pt-PT")} /{" "}
            {ind.programmes.beneficiariesWomen.toLocaleString("pt-PT")}
          </span>
        </p>
      </div>
    </section>
  );
}

/**
 * Per-questionnaire-module completeness (data conformance). Magnitude is a
 * percentage, so a single sequential hue is correct (dataviz: no categorical
 * palette). Each row is one module 0–O with its applicable-submission count.
 */
function ModuleStatsCard({
  rows,
  dict,
}: {
  rows: ModuleStat[];
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  const t = dict.indicators;
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.byModule}</h3>
      <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{t.byModuleHint}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">{t.moduleEmpty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="text-sm">
              <div className="mb-0.5 flex items-baseline justify-between gap-2">
                <span className="truncate">
                  <span className="mr-1 font-medium tabular-nums text-zinc-500">{r.key}</span>
                  {r.title}
                </span>
                <span className="shrink-0 tabular-nums text-zinc-500">
                  {r.completenessPct}% · {format(t.moduleApplicable, { count: r.applicableSubmissions })}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded bg-black/5 dark:bg-white/10"
                role="img"
                aria-label={`${r.title}: ${r.completenessPct}%`}
              >
                <div
                  className="h-full rounded bg-emerald-600 dark:bg-emerald-500"
                  style={{ width: `${Math.min(100, Math.max(0, r.completenessPct))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BarCard({
  title,
  rows,
  resolve,
}: {
  title: string;
  rows: CodeCount[];
  resolve: (code: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">—</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.code} className="text-sm">
              <div className="mb-0.5 flex justify-between gap-2">
                <span className="truncate">{resolve(r.code)}</span>
                <span className="tabular-nums text-zinc-500">{r.count.toLocaleString("pt-PT")}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded bg-black/5 dark:bg-white/10">
                <div className="h-full rounded bg-emerald-600" style={{ width: `${(r.count / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
