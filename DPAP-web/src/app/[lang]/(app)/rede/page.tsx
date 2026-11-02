import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { NetworkLoader } from "@/components/network/network-loader";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.network.title };
}

export default async function NetworkPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader title={dict.network.title} subtitle={dict.network.subtitle} />
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <RequirePermission permission="actors:read">
          <NetworkLoader />
        </RequirePermission>
      </Suspense>
    </>
  );
}
