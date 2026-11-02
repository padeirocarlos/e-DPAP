import Link from "next/link";
import { lang } from "next/root-params";
import { routes } from "@/config/routes";
import { listActors } from "@/lib/api/actors";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale } from "@/i18n/config";
import { getDistrict } from "@/lib/domain/location";
import { formatDate } from "@/lib/utils/format-date";
import { format } from "@/i18n/format";
import {
  parseActorFilters,
  hasActiveFilters,
  type SearchParams,
} from "@/lib/actors/filter-params";
import { ActorRowActions } from "@/components/actors/actor-row-actions";

/**
 * Server component: parses filters from the URL, fetches the matching page of
 * actors, and renders the table. Rendered inside a <Suspense> boundary (reads
 * the session token + the request's searchParams); failures bubble to the
 * segment error boundary.
 */
export async function ActorsTable({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const filters = parseActorFilters(searchParams ? await searchParams : {});
  const token = await getServerAuthToken();
  const [result, dict, locale] = await Promise.all([
    listActors(filters, { token }),
    getDictionary(),
    resolveLocale(await lang()),
  ]);
  const cols = dict.actors.list.columns;
  const { items, page, pageSize, total } = result;

  const emptyMessage = hasActiveFilters(filters)
    ? dict.actors.list.noMatches
    : dict.actors.list.empty;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-zinc-500 dark:border-white/15">
            <tr>
              <th className="px-4 py-3 font-medium">{cols.name}</th>
              <th className="px-4 py-3 font-medium">{cols.type}</th>
              <th className="px-4 py-3 font-medium">{cols.sector}</th>
              <th className="px-4 py-3 font-medium">{cols.district}</th>
              <th className="px-4 py-3 font-medium">{cols.updatedAt}</th>
              <th className="px-4 py-3 text-right font-medium">
                {cols.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={routes.actorDetail(locale, a.id)}
                      className="text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {a.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{dict.domain.actorType[a.actorType]}</td>
                  <td className="px-4 py-3">{dict.domain.sector[a.sector]}</td>
                  <td className="px-4 py-3">
                    {getDistrict(a.districtCode)?.name ?? a.districtCode}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDate(a.updatedAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <ActorRowActions id={a.id} name={a.name} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {format(dict.common.pagination.summary, {
            from: (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
      ) : null}
    </div>
  );
}
