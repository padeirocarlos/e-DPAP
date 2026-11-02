import { listActors } from "@/lib/api/actors";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { format } from "@/i18n/format";
import { parseActorFilters, type SearchParams } from "@/lib/actors/filter-params";

/**
 * Server component: counts the actors matching the current URL filters. Reads
 * the session token + the request's searchParams, so render inside a <Suspense>
 * boundary; it re-renders when the filter controls update the URL.
 */
export async function ReportSummary({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const filters = parseActorFilters(searchParams ? await searchParams : {});
  const [token, dict] = await Promise.all([getServerAuthToken(), getDictionary()]);

  let total = 0;
  try {
    total = (await listActors({ ...filters, pageSize: 1 }, { token })).total;
  } catch {
    total = 0;
  }

  return (
    <div className="rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-950/40">
      <p className="text-sm text-emerald-900 dark:text-emerald-200">
        {total === 0
          ? dict.reports.summary.none
          : format(dict.reports.summary.matched, { count: total.toLocaleString("pt-PT") })}
      </p>
    </div>
  );
}
