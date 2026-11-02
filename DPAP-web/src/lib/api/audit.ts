/**
 * Audit-trail resource — typed wrapper over the backend `/audit` endpoint
 * (administrator-only; the backend enforces it).
 */

import { http, type Query } from "@/lib/api/http";
import type { AuditFilters, AuditLog, Paginated } from "@/lib/api/types";

const PATH = "/audit";

function toQuery(filters: AuditFilters = {}): Query {
  return {
    entityType: filters.entityType,
    action: filters.action,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function listAudit(
  filters?: AuditFilters,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Paginated<AuditLog>> {
  return http.get<Paginated<AuditLog>>(PATH, { query: toQuery(filters), ...options });
}
