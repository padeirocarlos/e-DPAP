import Link from "next/link";
import { lang } from "next/root-params";
import { routes } from "@/config/routes";
import { listSubmissions } from "@/lib/api/submissions";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { resolveLocale } from "@/i18n/config";
import { getDistrict } from "@/lib/domain/location";
import { formatDate } from "@/lib/utils/format-date";
import { StatusBadge } from "@/components/submissions/status-badge";
import type { Submission, SubmissionStatus } from "@/lib/api/types";

/**
 * Data Conformance review queue (server component). Lists the submissions
 * awaiting validation — SUBMITTED, UNDER_REVIEW and RETURNED — newest first,
 * with their open QC-flag count, each linking to the submission detail where
 * the reviewer approves/returns/rejects. Rendered inside a <Suspense> boundary
 * (reads the session token); the page gates access to Supervisor+.
 */

/** Statuses that belong in the review queue (BRD §4.2). */
const QUEUE_STATUSES: SubmissionStatus[] = ["SUBMITTED", "UNDER_REVIEW", "RETURNED"];

export async function ConformanceQueue() {
  const token = await getServerAuthToken();
  const [pages, dict, locale] = await Promise.all([
    Promise.all(
      QUEUE_STATUSES.map((status) =>
        listSubmissions({ status, pageSize: 100 }, { token }),
      ),
    ),
    getDictionary(),
    resolveLocale(await lang()),
  ]);
  const t = dict.conformance;

  const items: Submission[] = pages
    .flatMap((p) => p.items)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-zinc-500 dark:border-white/15 dark:bg-zinc-900">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        {format(t.pending, { count: items.length })}
      </p>
      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead className="border-b border-black/10 text-left text-zinc-500 dark:border-white/15">
            <tr>
              <th className="px-4 py-3 font-medium">{t.columns.number}</th>
              <th className="px-4 py-3 font-medium">{t.columns.actor}</th>
              <th className="px-4 py-3 font-medium">{t.columns.district}</th>
              <th className="px-4 py-3 font-medium">{t.columns.qcFlags}</th>
              <th className="px-4 py-3 font-medium">{t.columns.status}</th>
              <th className="px-4 py-3 font-medium">{t.columns.updated}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                <td className="px-4 py-3 tabular-nums text-zinc-500">
                  {s.questionnaireNumber ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={routes.submissionDetail(locale, s.id)}
                    className="font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {s.actorName || dict.submissions.detailTitle}
                  </Link>
                </td>
                <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                  {s.districtCode ? getDistrict(s.districtCode)?.name ?? s.districtCode : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.qcFlagCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-200 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                      <span aria-hidden>⚑</span>
                      {s.qcFlagCount}
                    </span>
                  ) : (
                    <span className="text-zinc-400">{t.noFlags}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={s.status} label={dict.submissions.status[s.status]} />
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(s.updatedAt, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
