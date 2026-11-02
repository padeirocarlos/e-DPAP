"use client";

/**
 * Audit trail viewer: a read-only, filterable, paged table of data-mutating
 * actions. Filter + page state lives in the URL (namespaced `auditoria*` keys)
 * so it is shareable and the server loader re-renders from it. Uses
 * `useSearchParams`, so the page wraps it in a <Suspense> boundary.
 */

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { controlClass } from "@/components/ui/field";
import { formatDate } from "@/lib/utils/format-date";
import { format } from "@/i18n/format";
import {
  AUDIT_FILTER_KEYS,
  ENTITY_TYPES,
  AUDIT_ACTIONS,
} from "@/lib/audit/filter-params";
import type { AuditLog, Paginated } from "@/lib/api/types";

export function AuditViewer({ result }: { result: Paginated<AuditLog> }) {
  const dict = useDictionary();
  const t = dict.admin.audit;
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectClass = controlClass.replace("w-full", "w-auto");
  const { items, page, pageSize, total } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const current = (key: string) => searchParams.get(key) ?? "";

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    // Any filter change resets to the first page.
    params.delete(AUDIT_FILTER_KEYS.page);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete(AUDIT_FILTER_KEYS.page);
    else params.set(AUDIT_FILTER_KEYS.page, String(next));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasFilters =
    searchParams.has(AUDIT_FILTER_KEYS.entity) ||
    searchParams.has(AUDIT_FILTER_KEYS.action);

  const actionLabel = (a: AuditLog["action"]) => t.actions[a] ?? a;
  const entityLabel = (e: string) =>
    (t.entities as Record<string, string>)[e] ?? e;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <select
          aria-label={t.filters.entity}
          value={current(AUDIT_FILTER_KEYS.entity)}
          onChange={(e) => setParam(AUDIT_FILTER_KEYS.entity, e.target.value)}
          className={selectClass}
        >
          <option value="">{t.filters.allEntities}</option>
          {ENTITY_TYPES.map((code) => (
            <option key={code} value={code}>
              {entityLabel(code)}
            </option>
          ))}
        </select>

        <select
          aria-label={t.filters.action}
          value={current(AUDIT_FILTER_KEYS.action)}
          onChange={(e) => setParam(AUDIT_FILTER_KEYS.action, e.target.value)}
          className={selectClass}
        >
          <option value="">{t.filters.allActions}</option>
          {AUDIT_ACTIONS.map((code) => (
            <option key={code} value={code}>
              {actionLabel(code)}
            </option>
          ))}
        </select>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setParam(AUDIT_FILTER_KEYS.entity, "");
              setParam(AUDIT_FILTER_KEYS.action, "");
            }}
            className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {t.filters.clear}
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-zinc-500 dark:border-white/15">
            <tr>
              <th className="px-4 py-3 font-medium">{t.columns.at}</th>
              <th className="px-4 py-3 font-medium">{t.columns.user}</th>
              <th className="px-4 py-3 font-medium">{t.columns.action}</th>
              <th className="px-4 py-3 font-medium">{t.columns.entity}</th>
              <th className="px-4 py-3 font-medium">{t.columns.summary}</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500 dark:text-zinc-400">
                  {t.empty}
                </td>
              </tr>
            ) : (
              items.map((e) => (
                <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                    {formatDate(e.at, locale)}
                  </td>
                  <td className="px-4 py-3">{e.actorEmail}</td>
                  <td className="px-4 py-3">{actionLabel(e.action)}</td>
                  <td className="px-4 py-3">{entityLabel(e.entityType)}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                    {e.summary ?? "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {format(t.summary, {
              from: (page - 1) * pageSize + 1,
              to: Math.min(page * pageSize, total),
              total,
            })}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page <= 1}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {dict.common.actions.previous}
            </button>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {dict.common.actions.next}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
