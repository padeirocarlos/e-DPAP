import { dict, format } from "@/i18n";
import { formatDateTime } from "@/lib/format-date";
import type { UseSync } from "@/hooks/useSync";

/** Status strip: connectivity, pending count, last sync, and a manual button. */
export function SyncBar({ sync }: { sync: UseSync }) {
  const t = dict.sync;
  const { online, syncing, pendingCount, lastSyncAt, lastPull, syncNow } = sync;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span
            aria-hidden
            className={
              "inline-block h-2.5 w-2.5 rounded-full " +
              (online ? "bg-emerald-500" : "bg-zinc-400")
            }
          />
          <span className="font-medium">{online ? t.online : t.offline}</span>
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {pendingCount > 0
              ? format(t.pending, { count: pendingCount })
              : t.allSynced}
          </span>
        </div>

        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={!online || syncing}
          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-40"
        >
          {syncing ? t.syncing : t.syncNow}
        </button>
      </div>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {format(t.lastSync, { at: lastSyncAt ? formatDateTime(lastSyncAt) : t.never })}
        {lastPull && lastPull.pulled > 0
          ? ` · ${format(t.received, { count: lastPull.pulled })}`
          : ""}
      </p>

      {!online ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {t.offlineHint}
        </p>
      ) : null}
    </div>
  );
}
