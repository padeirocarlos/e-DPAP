/** Dashboard aggregates resource. */

import { http } from "@/lib/api/http";
import type { DashboardStats } from "@/lib/api/types";

const PATH = "/dashboard/stats";

export function getDashboardStats(options?: {
  signal?: AbortSignal;
  token?: string | null;
}): Promise<DashboardStats> {
  return http.get<DashboardStats>(PATH, options);
}
