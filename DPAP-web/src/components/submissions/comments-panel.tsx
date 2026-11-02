"use client";

/**
 * Review comments list + add-comment form (BRD FR-QC-3/4). The list is rendered
 * from server-fetched data; adding a comment calls the Server Action and
 * refreshes the server view.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary, useLocale } from "@/i18n/provider";
import { formatDate } from "@/lib/utils/format-date";
import { addCommentAction } from "@/lib/actions/submissions";
import type { ReviewComment } from "@/lib/api/types";

export function CommentsPanel({
  submissionId,
  comments,
  canComment,
}: {
  submissionId: string;
  comments: ReviewComment[];
  canComment: boolean;
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.submissions.review;
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError(null);
    const res = await addCommentAction(submissionId, text.trim());
    setBusy(false);
    if (res.ok) {
      setText("");
      router.refresh();
    } else {
      setError(t.commentError);
    }
  };

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t.commentsTitle}</h2>
      {comments.length === 0 ? (
        <p className="text-sm text-zinc-500">{t.noComments}</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-black/5 p-2 text-sm dark:border-white/10">
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{c.author}</span>
                <span>
                  {c.status ? <span className="mr-2 rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">{c.status}</span> : null}
                  {formatDate(c.createdAt, locale)}
                </span>
              </div>
              {c.field ? <span className="text-xs text-zinc-400">{c.field}</span> : null}
              <p className="mt-0.5">{c.comment}</p>
            </li>
          ))}
        </ul>
      )}
      {canComment ? (
        <div className="mt-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.commentPlaceholder}
            rows={2}
            className="w-full rounded-lg border border-black/15 bg-white p-2 text-sm outline-none focus:border-emerald-600 dark:border-white/20 dark:bg-zinc-950"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={add}
              disabled={busy || !text.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {t.addComment}
            </button>
            {error ? <span role="alert" className="text-sm text-red-600">{error}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
