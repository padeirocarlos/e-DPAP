/**
 * List of interviews captured on this device, with sync status. Reads live from
 * IndexedDB so it reflects autosaves and sync results immediately.
 */

import { useLiveQuery } from "dexie-react-hooks";
import { dict, format } from "@/i18n";
import { db, type LocalSubmission, type SubmissionSyncStatus } from "@/db/db";
import { deleteSubmission } from "@/db/submissions-repo";

const STATUS_LABEL: Record<SubmissionSyncStatus, string> = {
  draft: dict.interviews.statusDraft,
  pending: dict.interviews.statusPending,
  synced: dict.interviews.statusSynced,
  error: dict.interviews.statusError,
};

const STATUS_CLASS: Record<SubmissionSyncStatus, string> = {
  draft: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  pending: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  synced: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
  error: "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",
};

export function InterviewList({ onOpen }: { onOpen: (localId: string) => void }) {
  const items = useLiveQuery(
    () => db.submissions.orderBy("updatedAt").reverse().toArray(),
    [],
    [] as LocalSubmission[],
  );

  if (!items || items.length === 0) {
    return <p className="text-sm text-zinc-500">{dict.interviews.empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((s) => {
        const name = (s.answers?.qA_01 as string) || dict.interviews.untitled;
        return (
          <li
            key={s.localId}
            className="flex items-center justify-between gap-3 rounded-lg border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-zinc-900"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name}</p>
              <p className="text-xs text-zinc-500">
                {s.questionnaireNumber != null
                  ? format(dict.interviews.number, { n: s.questionnaireNumber }) + " · "
                  : ""}
                <span className={"rounded px-1.5 py-0.5 " + STATUS_CLASS[s.status]}>
                  {STATUS_LABEL[s.status]}
                </span>
              </p>
              {s.syncError ? <p className="mt-0.5 text-xs text-red-600">{s.syncError}</p> : null}
            </div>
            <div className="flex shrink-0 gap-2">
              {s.status !== "synced" ? (
                <button
                  type="button"
                  onClick={() => onOpen(s.localId)}
                  className="rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium dark:border-white/20"
                >
                  {dict.interviews.open}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (confirm(dict.interviews.discardConfirm)) void deleteSubmission(s.localId);
                }}
                className="rounded-lg px-2 py-1.5 text-sm text-red-600"
              >
                {dict.interviews.discard}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
