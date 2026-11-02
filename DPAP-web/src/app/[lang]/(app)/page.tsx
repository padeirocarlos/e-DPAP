import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { DashboardMetrics } from "@/components/dashboard/dashboard-metrics";
import { IndicatorsPanel } from "@/components/dashboard/indicators-panel";

export default async function DashboardPage() {
  const dict = await getDictionary();

  return (
    <>
      <PageHeader
        title={dict.dashboard.title}
        subtitle={dict.dashboard.subtitle}
      />
      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <DashboardMetrics />
      </Suspense>
      <Suspense fallback={null}>
        <IndicatorsPanel />
      </Suspense>
    </>
  );
}
