import type { QcFlag } from "@/lib/api/types";

const SEVERITY_CLASS: Record<QcFlag["severity"], string> = {
  LOW: "border-sky-500/40 bg-sky-50 dark:bg-sky-950/30",
  MEDIUM: "border-amber-500/40 bg-amber-50 dark:bg-amber-950/30",
  HIGH: "border-red-500/40 bg-red-50 dark:bg-red-950/30",
};

const DOT_CLASS: Record<QcFlag["severity"], string> = {
  LOW: "bg-sky-500",
  MEDIUM: "bg-amber-500",
  HIGH: "bg-red-500",
};

/** Read-only panel of automated QC flags (BRD FR-QC-1/2). */
export function QcPanel({
  flags,
  title,
  emptyLabel,
  severityLabels,
}: {
  flags: QcFlag[];
  title: string;
  emptyLabel: string;
  severityLabels: Record<QcFlag["severity"], string>;
}) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{title}</h2>
      {flags.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {flags.map((f) => (
            <li key={f.id} className={"flex items-start gap-2 rounded-lg border p-2 text-sm " + SEVERITY_CLASS[f.severity]}>
              <span className={"mt-1 h-2 w-2 shrink-0 rounded-full " + DOT_CLASS[f.severity]} />
              <span>
                <span className="font-medium">{f.ruleId}</span>{" "}
                <span className="text-xs text-zinc-500">({severityLabels[f.severity]})</span>
                <br />
                {f.message}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
