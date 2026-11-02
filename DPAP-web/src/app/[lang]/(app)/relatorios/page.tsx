import type { Metadata } from "next";
import { Suspense } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { PageHeader } from "@/components/ui/page-header";
import { Loading } from "@/components/ui/loading";
import { RequirePermission } from "@/components/auth/require-permission";
import { ActorFilters } from "@/components/actors/actor-filters";
import { ReportSummary } from "@/components/reports/report-summary";
import { ReportExport } from "@/components/reports/report-export";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.reports.title };
}

export default async function ReportsPage({
  searchParams,
}: PageProps<"/[lang]/relatorios">) {
  const dict = await getDictionary();
  const s = dict.reports.summary;

  return (
    <>
      <PageHeader title={dict.reports.title} subtitle={dict.reports.subtitle} />

      <Suspense fallback={<Loading label={dict.common.states.loading} />}>
        <RequirePermission permission="reports:read">
          <div className="space-y-4">
            {/* 1. Filter */}
            <section className="space-y-3 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900">
              <div>
                <h2 className="text-base font-semibold">{s.filtersTitle}</h2>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{s.filtersHint}</p>
              </div>
              <Suspense fallback={null}>
                <ActorFilters />
              </Suspense>
              <Suspense fallback={<Loading label={dict.common.states.loading} />}>
                <ReportSummary searchParams={searchParams} />
              </Suspense>
            </section>

            {/* 2. Columns + 3. Export */}
            <Suspense fallback={null}>
              <ReportExport />
            </Suspense>
          </div>
        </RequirePermission>
      </Suspense>
    </>
  );
}
