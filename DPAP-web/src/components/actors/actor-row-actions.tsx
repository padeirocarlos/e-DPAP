"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useCan } from "@/lib/auth/provider";
import { routes } from "@/config/routes";
import { format } from "@/i18n/format";
import { deleteActorAction } from "@/lib/actions/actors";

/**
 * Per-row actions. Edit shows for `actors:write`, delete for `actors:delete`.
 * Delete uses an inline two-step confirm (no native dialog) and refreshes the
 * server-rendered list on success.
 */
export function ActorRowActions({ id, name }: { id: string; name: string }) {
  const dict = useDictionary();
  const locale = useLocale();
  const router = useRouter();
  const can = useCan();

  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(false);

  const canWrite = can("actors:write");
  const canDelete = can("actors:delete");
  if (!canWrite && !canDelete) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(false);
    const res = await deleteActorAction(id);
    if (res.ok) {
      router.refresh();
    } else {
      setError(true);
      setDeleting(false);
      setConfirming(false);
    }
  };

  const linkClass =
    "rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950";

  return (
    <div className="flex items-center justify-end gap-1">
      {error ? (
        <span role="alert" className="text-xs text-red-600">
          {dict.actors.delete.error}
        </span>
      ) : null}

      {canWrite && !confirming ? (
        <Link
          href={routes.editActor(locale, id)}
          className={linkClass}
          aria-label={format(dict.actors.rowActions.edit, { name })}
        >
          {dict.common.actions.edit}
        </Link>
      ) : null}

      {canDelete && !confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          aria-label={format(dict.actors.rowActions.delete, { name })}
        >
          {dict.common.actions.delete}
        </button>
      ) : null}

      {canDelete && confirming ? (
        <>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded bg-red-700 px-2 py-1 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {dict.common.actions.confirm}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="rounded px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10"
          >
            {dict.common.actions.cancel}
          </button>
        </>
      ) : null}
    </div>
  );
}
