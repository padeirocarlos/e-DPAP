/**
 * Network graph + indicators resource (BRD FR-NET, §9).
 */

import { http } from "@/lib/api/http";
import type { Network, Indicators } from "@/lib/api/types";

export function getNetwork(
  relationType?: number,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Network> {
  return http.get<Network>("/network", {
    query: relationType != null ? { relationType } : undefined,
    ...options,
  });
}

export function getIndicators(
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Indicators> {
  return http.get<Indicators>("/indicators", options);
}
