import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { SubmissionsTable } from "@/components/submissions/submissions-table";
import { NewSubmissionButton } from "@/components/submissions/new-submission-button";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.submissions.title };
}

export default async function SubmissionsPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader
        title={dict.submissions.title}
        subtitle={dict.submissions.subtitle}
        actions={<NewSubmissionButton />}
      />
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <RequirePermission permission="actors:read">
          <SubmissionsTable />
        </RequirePermission>
      </Suspense>
    </>
  );
}
