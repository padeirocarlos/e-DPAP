import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { UsersLoader } from "@/components/admin/users-loader";
import { AuditLoader } from "@/components/admin/audit-loader";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.admin.title };
}

export default async function AdministrationPage({
  searchParams,
}: PageProps<"/[lang]/administracao">) {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.admin.title} subtitle={dict.admin.subtitle} />

      <div className="space-y-10">
        <Suspense fallback={<Loading label={dict.common.states.loading} />}>
          <RequirePermission permission="admin:access">
            <UsersLoader />
          </RequirePermission>
        </Suspense>

        {/* Audit trail — request-time (searchParams + session) under Suspense. */}
        <Suspense fallback={<Loading label={dict.common.states.loading} />}>
          <RequirePermission permission="admin:access">
            <AuditLoader searchParams={searchParams} />
          </RequirePermission>
        </Suspense>
      </div>
    </>
  );
}
