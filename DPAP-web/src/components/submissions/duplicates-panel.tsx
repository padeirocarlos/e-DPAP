"use client";

/**
 * Possible-duplicate candidates for a published submission, with a merge action
 * (BRD FR-REG-4, BR-RG-2). Merging folds the submission's actor into the chosen
 * existing actor. Only shown to users who can merge (registry-level).
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n/provider";
import { mergeActorAction } from "@/lib/actions/submissions";
import type { DuplicateCandidate } from "@/lib/api/types";

export function DuplicatesPanel({
  actorId,
  candidates,
  canMerge,
}: {
  actorId: string | null;
  candidates: DuplicateCandidate[];
  canMerge: boolean;
}) {
  const dict = useDictionary();
  const t = dict.submissions.review;
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const merge = async (targetId: string) => {
    if (!actorId) return;
    if (!window.confirm(t.mergeConfirm)) return;
    setBusy(targetId);
    setError(null);
    const res = await mergeActorAction(actorId, targetId);
    setBusy(null);
    if (res.ok) router.refresh();
    else setError(t.mergeError);
  };

  // Don't suggest the actor's own record as a duplicate of itself.
  const others = candidates.filter((c) => c.id !== actorId);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.duplicatesTitle}</h2>
      {others.length === 0 ? (
        <p className="text-sm text-zinc-500">{t.noDuplicates}</p>
      ) : (
        <ul className="space-y-2">
          {others.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-black/5 p-2 text-sm dark:border-white/10">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="text-xs text-zinc-500">
                  {c.actorUid ? c.actorUid + " · " : ""}{c.reason}
                  {c.phone ? " · " + c.phone : ""}
                </p>
              </div>
              {canMerge && actorId ? (
                <button
                  type="button"
                  onClick={() => merge(c.id)}
                  disabled={busy !== null}
                  className="shrink-0 rounded-lg border border-black/15 px-3 py-1.5 text-sm font-medium disabled:opacity-50 dark:border-white/20"
                >
                  {busy === c.id ? "…" : t.mergeInto}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {error ? <p role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
