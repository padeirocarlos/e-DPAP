import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { NewSubmission } from "@/components/submissions/new-submission";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.submissions.newTitle };
}

export default async function NewSubmissionPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.submissions.newTitle} subtitle={dict.submissions.newSubtitle} />
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <RequirePermission permission="actors:write">
          <NewSubmission />
        </RequirePermission>
      </Suspense>
    </>
  );
}
