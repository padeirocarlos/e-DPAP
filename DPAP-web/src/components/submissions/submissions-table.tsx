import Link from "next/link";
import { lang } from "next/root-params";
import { routes } from "@/config/routes";
import { listSubmissions } from "@/lib/api/submissions";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale } from "@/i18n/config";
import { getDistrict } from "@/lib/domain/location";
import { formatDate } from "@/lib/utils/format-date";
import { StatusBadge } from "@/components/submissions/status-badge";

/**
 * Server component: lists submissions for the current user/role (the backend
 * scopes by role). Rendered inside a <Suspense> boundary (reads the session
 * token); failures bubble to the segment error boundary.
 */
export async function SubmissionsTable() {
  const token = await getServerAuthToken();
  const [result, dict, locale] = await Promise.all([
    listSubmissions({ pageSize: 50 }, { token }),
    getDictionary(),
    resolveLocale(await lang()),
  ]);
  const t = dict.submissions;
  const { items } = result;

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-zinc-500 dark:border-white/15 dark:bg-zinc-900">
        {t.empty}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead className="border-b border-black/10 text-left text-zinc-500 dark:border-white/15">
          <tr>
            <th className="px-4 py-3 font-medium">{t.columns.number}</th>
            <th className="px-4 py-3 font-medium">{t.columns.actor}</th>
            <th className="px-4 py-3 font-medium">{t.columns.status}</th>
            <th className="px-4 py-3 font-medium">{t.columns.district}</th>
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
                  {s.actorName || t.detailTitle}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={s.status} label={t.status[s.status]} />
              </td>
              <td className="px-4 py-3">
                {s.districtCode ? getDistrict(s.districtCode)?.name ?? s.districtCode : "—"}
              </td>
              <td className="px-4 py-3 text-zinc-500">{formatDate(s.updatedAt, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
