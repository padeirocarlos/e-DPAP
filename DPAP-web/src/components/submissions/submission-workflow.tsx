"use client";

/**
 * Workflow action bar for a submission (BRD §4.2). Shows only the transitions
 * allowed from the current status and calls the transition Server Action; the
 * backend authorizes by role and re-validates. RETURN/REJECT prompt for a
 * mandatory reason (FR-QC-3). Refreshes the server view on success.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "@/i18n/provider";
import { transitionSubmissionAction } from "@/lib/actions/submissions";
import type { SubmissionAction, SubmissionStatus } from "@/lib/api/types";

const NEXT_ACTIONS: Record<SubmissionStatus, SubmissionAction[]> = {
  DRAFT: ["SUBMIT"],
  SUBMITTED: ["OPEN_REVIEW"],
  UNDER_REVIEW: ["APPROVE", "RETURN", "REJECT"],
  RETURNED: ["SUBMIT"],
  APPROVED: ["PUBLISH"],
  PUBLISHED: [],
  REJECTED: [],
};

const NEEDS_REASON: SubmissionAction[] = ["RETURN", "REJECT"];

export function SubmissionWorkflow({
  id,
  status,
  version,
}: {
  id: string;
  status: SubmissionStatus;
  version: number;
}) {
  const dict = useDictionary();
  const t = dict.submissions;
  const router = useRouter();
  const [busy, setBusy] = useState<SubmissionAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = NEXT_ACTIONS[status];
  if (actions.length === 0) return null;

  const run = async (action: SubmissionAction) => {
    setError(null);
    let reason: string | undefined;
    if (NEEDS_REASON.includes(action)) {
      const entered = window.prompt(t.reasonPrompt);
      if (entered == null || entered.trim() === "") return;
      reason = entered.trim();
    }
    setBusy(action);
    const res = await transitionSubmissionAction(id, action, version, reason);
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      setError(res.message ?? t.transitionError);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          disabled={busy !== null}
          onClick={() => run(a)}
          className={
            "min-h-10 rounded-lg px-4 text-sm font-medium disabled:opacity-60 " +
            (a === "APPROVE" || a === "PUBLISH"
              ? "bg-emerald-700 text-white hover:bg-emerald-800"
              : a === "REJECT"
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-black/15 dark:border-white/20")
          }
        >
          {busy === a ? "…" : t.actions[a]}
        </button>
      ))}
      {error ? <span role="alert" className="text-sm text-red-600">{error}</span> : null}
    </div>
  );
}
