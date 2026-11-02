import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { ConformanceQueue } from "@/components/conformance/conformance-queue";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.conformance.title };
}

/**
 * Data Conformance (Conformidade de Dados) — the submission review queue.
 * Gated to Supervisor/Data Manager/Sys Admin: interviewers (enumerators),
 * analysts and partners get the localized "forbidden" notice. The backend
 * additionally re-verifies every review action.
 */
export default async function ConformancePage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.conformance.title} subtitle={dict.conformance.subtitle} />
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <RequirePermission permission="conformance:review">
          <ConformanceQueue />
        </RequirePermission>
      </Suspense>
    </>
  );
}
