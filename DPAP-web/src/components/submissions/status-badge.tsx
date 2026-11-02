import type { SubmissionStatus } from "@/lib/api/types";

const CLASS: Record<SubmissionStatus, string> = {
  DRAFT: "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200",
  SUBMITTED: "bg-sky-200 text-sky-900 dark:bg-sky-900 dark:text-sky-100",
  UNDER_REVIEW: "bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100",
  RETURNED: "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100",
  APPROVED: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100",
  PUBLISHED: "bg-emerald-600 text-white",
  REJECTED: "bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-100",
};

export function StatusBadge({ status, label }: { status: SubmissionStatus; label: string }) {
  return (
    <span className={"inline-block rounded px-2 py-0.5 text-xs font-medium " + CLASS[status]}>
      {label}
    </span>
  );
}
