import Link from "next/link";
import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { routes } from "@/config/routes";
import {
  getSubmission,
  listQcFlags,
  listComments,
  listDuplicates,
} from "@/lib/api/submissions";
import { getServerAuthToken, requireSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale } from "@/i18n/config";
import { ApiError } from "@/lib/api/http";
import { PageHeader } from "@/components/ui/page-header";
import { SubmissionView } from "@/components/submissions/submission-view";
import { SubmissionWorkflow } from "@/components/submissions/submission-workflow";
import { StatusBadge } from "@/components/submissions/status-badge";
import { QcPanel } from "@/components/submissions/qc-panel";
import { CommentsPanel } from "@/components/submissions/comments-panel";
import { DuplicatesPanel } from "@/components/submissions/duplicates-panel";
import type { DuplicateCandidate } from "@/lib/api/types";

/**
 * Server loader for one submission: the schema-driven read view + the review
 * surface (QC flags, comments, workflow) and, once approved/published, the
 * duplicate-candidate/merge panel. Rendered inside a <Suspense> boundary.
 */
export async function SubmissionDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getServerAuthToken();
  const [dict, locale, session] = await Promise.all([
    getDictionary(),
    resolveLocale(await lang()),
    requireSession(),
  ]);
  const t = dict.submissions;

  let submission;
  try {
    submission = await getSubmission(id, { token });
  } catch (err) {
    if (err instanceof ApiError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const [qcFlags, comments] = await Promise.all([
    listQcFlags(id, { token }).catch(() => []),
    listComments(id, { token }).catch(() => []),
  ]);
  const showDuplicates = submission.status === "APPROVED" || submission.status === "PUBLISHED";
  const duplicates: DuplicateCandidate[] = showDuplicates
    ? await listDuplicates(id, { token }).catch(() => [])
    : [];

  const canComment = can(session.user.role, "actors:write");
  const canMerge = can(session.user.role, "actors:delete");

  const title = submission.questionnaireNumber != null
    ? `${t.detailTitle} #${submission.questionnaireNumber}`
    : t.detailTitle;

  return (
    <>
      <PageHeader
        title={title}
        subtitle={submission.actorName ?? undefined}
        actions={
          <Link
            href={routes.submissions(locale)}
            className="rounded-md border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
          >
            {t.back}
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={submission.status} label={t.status[submission.status]} />
        <SubmissionWorkflow id={submission.id} status={submission.status} version={submission.version} />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QcPanel
          flags={qcFlags}
          title={t.review.qcTitle}
          emptyLabel={t.review.noFlags}
          severityLabels={t.review.severity}
        />
        <CommentsPanel submissionId={submission.id} comments={comments} canComment={canComment} />
        {showDuplicates ? (
          <DuplicatesPanel actorId={submission.actorId} candidates={duplicates} canMerge={canMerge} />
        ) : null}
      </div>

      <SubmissionView submission={submission} />
    </>
  );
}
