import type { ReactNode } from "react";
import type { Submission } from "@/lib/api/types";
import {
  modules,
  moduleRelevant,
  fieldRelevant,
  optionsFor,
  type Field,
} from "@/form/schema-model";
import type { EvalContext } from "@/form/expr";

/**
 * Read-only, schema-driven rendering of a submission's answers, grouped by the
 * questionnaire's modules (only relevant modules / answered fields are shown).
 * Presentational — no data fetching. Labels resolve through the schema so no
 * question text is hard-coded.
 */
export function SubmissionView({ submission }: { submission: Submission }) {
  const answers = submission.answers as EvalContext;
  const relevantModules = modules().filter((m) => moduleRelevant(m, answers));

  const renderValue = (f: Field): ReactNode => {
    const v = answers[f.var];
    if (v === undefined || v === null || v === "") return null;

    if (f.type === "select_one" || f.type === "yes_no") {
      const opt = optionsFor(f).find((o) => Number(o.code) === Number(v));
      return opt?.label_pt ?? String(v);
    }
    if (f.type === "select_multiple" && Array.isArray(v)) {
      const opts = optionsFor(f);
      const labels = (v as number[]).map(
        (c) => opts.find((o) => Number(o.code) === Number(c))?.label_pt ?? String(c),
      );
      return labels.join(", ");
    }
    if (f.type === "geopoint" && typeof v === "object") {
      const g = v as { lat?: number; lon?: number; accuracy?: number };
      return g.lat != null ? `${g.lat}, ${g.lon}${g.accuracy != null ? ` (±${g.accuracy} m)` : ""}` : null;
    }
    if (f.type === "image" && typeof v === "string" && v.startsWith("data:")) {
      return (
        <span
          role="img"
          aria-label=""
          className="mt-1 block h-32 w-48 rounded border border-black/10 bg-cover bg-center"
          style={{ backgroundImage: `url(${v})` }}
        />
      );
    }
    return String(v);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {relevantModules.map((m) => {
        const rows = m.fields
          .filter((f) => fieldRelevant(f, answers))
          .map((f) => ({ f, value: renderValue(f) }))
          .filter((r) => r.value !== null);
        if (rows.length === 0 && m.rosters.length === 0) return null;

        return (
          <section key={m.key} className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              {m.key}. {m.title_pt}
            </h2>
            <dl className="divide-y divide-black/5 dark:divide-white/10">
              {rows.map(({ f, value }) => (
                <div key={f.var} className="flex gap-3 py-1.5 text-sm">
                  <dt className="w-44 shrink-0 text-zinc-500 dark:text-zinc-400">{f.label_pt}</dt>
                  <dd className="min-w-0 flex-1 break-words">{value}</dd>
                </div>
              ))}
            </dl>
            {m.rosters.map((r) => {
              const rowsData = Array.isArray(answers[r.var ?? r.id])
                ? (answers[r.var ?? r.id] as unknown as Record<string, unknown>[])
                : [];
              if (rowsData.length === 0) return null;
              return (
                <div key={r.id} className="mt-3">
                  <p className="text-xs font-medium text-zinc-500">{r.label_pt}</p>
                  <p className="text-sm">{rowsData.length} linha(s)</p>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
