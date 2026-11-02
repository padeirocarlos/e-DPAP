import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type LocalActor } from "@/db/db";
import { dict, format } from "@/i18n";
import { districtName } from "@/domain/location";
import { normalizeText } from "@/lib/duplicate";
import { formatDateTime } from "@/lib/format-date";
import type { SyncStatus } from "@/api/types";

function StatusBadge({ status }: { status: SyncStatus }) {
  const s = dict.actors.status;
  const map: Record<SyncStatus, { label: string; cls: string }> = {
    SYNCED: {
      label: s.synced,
      cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    },
    PENDING: {
      label: s.pending,
      cls: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    },
    CONFLICT: {
      label: s.conflict,
      cls: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
    },
  };
  const { label, cls } = map[status];
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}

export function ActorList({ onEdit }: { onEdit: (localId: string) => void }) {
  const t = dict.actors.list;
  const [search, setSearch] = useState("");

  const actors = useLiveQuery(
    () => db.actors.orderBy("updatedAt").reverse().toArray(),
    [],
  );

  const filtered = useMemo(() => {
    if (!actors) return undefined;
    const q = normalizeText(search);
    if (!q) return actors;
    return actors.filter((a) => normalizeText(a.name).includes(q));
  }, [actors, search]);

  if (filtered === undefined) {
    return <p className="py-10 text-center text-sm text-zinc-500">{dict.common.states.loading}</p>;
  }

  if (actors && actors.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-black/15 px-4 py-10 text-center text-sm text-zinc-500 dark:border-white/20 dark:text-zinc-400">
        {t.empty}
      </p>
    );
  }

  const conflictCount = actors
    ? actors.filter((a) => a.syncStatus === "CONFLICT" || a.syncError).length
    : 0;

  return (
    <div className="space-y-3">
      {conflictCount > 0 ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {format(dict.actors.conflict.banner, { count: conflictCount })}
        </p>
      ) : null}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        className="w-full rounded-lg border border-black/15 bg-white px-3 py-2.5 text-base outline-none focus:border-emerald-600 dark:border-white/20 dark:bg-zinc-900"
      />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {format(t.count, { count: filtered.length })}
      </p>

      <ul className="space-y-2">
        {filtered.map((a: LocalActor) => (
          <li key={a.localId}>
            <button
              type="button"
              onClick={() => onEdit(a.localId)}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 text-left hover:bg-black/[0.02] dark:border-white/15 dark:bg-zinc-900 dark:hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{a.name}</p>
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {dict.domain.actorType[a.actorType]} · {districtName(a.districtCode)}
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {formatDateTime(a.updatedAt)}
                </p>
              </div>
              <StatusBadge status={a.syncStatus} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
