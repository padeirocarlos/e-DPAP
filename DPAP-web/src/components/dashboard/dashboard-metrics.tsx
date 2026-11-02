import { getDashboardStats } from "@/lib/api/dashboard";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { getDistrict } from "@/lib/domain/location";
import type { ActorTypeCode, SectorCode } from "@/lib/domain/enums";
import type { CountByCode } from "@/lib/api/types";
import { DashboardView, type DashboardCategory } from "@/components/dashboard/dashboard-view";

/**
 * Server component: fetches dashboard aggregates, resolves codes to localized
 * labels, and hands plain data to the client `DashboardView`. Rendered inside a
 * <Suspense> boundary (the fetch is request-time/dynamic under Cache Components).
 */
export async function DashboardMetrics() {
  const token = await getServerAuthToken();
  const [stats, dict] = await Promise.all([
    getDashboardStats({ token }),
    getDictionary(),
  ]);
  const m = dict.dashboard.metrics;

  const rows = (counts: CountByCode[], toLabel: (code: string) => string) =>
    counts.map((c) => ({ code: c.code, label: toLabel(c.code), count: c.count }));

  const categories: DashboardCategory[] = [
    { kind: "district", title: m.byDistrict, rows: rows(stats.byDistrict, (c) => getDistrict(c)?.name ?? c) },
    { kind: "sector", title: m.bySector, rows: rows(stats.bySector, (c) => dict.domain.sector[c as SectorCode] ?? c) },
    { kind: "type", title: m.byType, rows: rows(stats.byType, (c) => dict.domain.actorType[c as ActorTypeCode] ?? c) },
  ];

  return (
    <DashboardView
      summary={{
        total: stats.totalActors,
        completenessPct: Math.round(stats.completeness * 100),
        pending: stats.sync.pending,
        districts: stats.byDistrict.length,
      }}
      trend={stats.registrationTrend}
      categories={categories}
    />
  );
}
