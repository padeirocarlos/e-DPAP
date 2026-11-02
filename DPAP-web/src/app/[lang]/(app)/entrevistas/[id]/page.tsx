import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { SubmissionDetailLoader } from "@/components/submissions/submission-detail-loader";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.submissions.detailTitle };
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  // `params` is request-time data — pass the promise into the loader (inside
  // <Suspense>) instead of awaiting it here (Next 16 instant-shell rule).
  const dict = await getDictionary();

  return (
    <Suspense fallback={<Loading label={dict.common.states.loading} />}>
      <RequirePermission permission="actors:read">
        <SubmissionDetailLoader params={params} />
      </RequirePermission>
    </Suspense>
  );
}
