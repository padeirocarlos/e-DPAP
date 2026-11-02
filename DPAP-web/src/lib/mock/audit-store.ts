/**
 * In-memory mock audit trail (DEV-ONLY).
 *
 * Backs `GET /api/audit` and receives entries from the mock actor/user stores
 * so the audit viewer reflects live demo activity. Kept on `globalThis` to
 * survive HMR; reset on restart. Mirrors the backend contract
 * (`{ id, at, actorEmail, action, entityType, entityId, summary }`).
 */

import { randomUUID } from "node:crypto";
import { appConfig } from "@/config/app.config";
import type { AuditAction, AuditFilters, AuditLog, Paginated } from "@/lib/api/types";

type Store = { entries: AuditLog[] };

function seed(): Store {
  const now = Date.now();
  const at = (daysAgo: number) =>
    new Date(now - daysAgo * 86_400_000).toISOString();

  // Newest first — a representative slice of recent activity.
  const entries: AuditLog[] = [
    {
      id: randomUUID(),
      at: at(1),
      actorEmail: "gestor@dpap.gov.mz",
      action: "UPDATE",
      entityType: "ACTOR",
      entityId: "seed-actor",
      summary: "Empresa Pesqueira de Matutuíne",
    },
    {
      id: randomUUID(),
      at: at(3),
      actorEmail: "admin@dpap.gov.mz",
      action: "CREATE",
      entityType: "USER",
      entityId: "seed-user",
      summary: "analista@dpap.gov.mz",
    },
    {
      id: randomUUID(),
      at: at(6),
      actorEmail: "gestor@dpap.gov.mz",
      action: "CREATE",
      entityType: "ACTOR",
      entityId: "seed-actor-2",
      summary: "Instituto de Investigação Agrária de Matutuíne",
    },
    {
      id: randomUUID(),
      at: at(10),
      actorEmail: "admin@dpap.gov.mz",
      action: "DELETE",
      entityType: "ACTOR",
      entityId: "seed-actor-3",
      summary: "Registo duplicado removido",
    },
  ];
  return { entries };
}

const globalRef = globalThis as unknown as { __dpapMockAudit?: Store };
const store: Store = (globalRef.__dpapMockAudit ??= seed());

/** Record a data-mutating action (called by the mock actor/user stores). */
export function recordAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  summary: string,
  actorEmail: string,
): void {
  store.entries.unshift({
    id: randomUUID(),
    at: new Date().toISOString(),
    actorEmail,
    action,
    entityType,
    entityId,
    summary,
  });
}

export function listAudit(filters: AuditFilters): Paginated<AuditLog> {
  const filtered = store.entries.filter((e) => {
    if (filters.entityType && e.entityType !== filters.entityType) return false;
    if (filters.action && e.action !== filters.action) return false;
    return true;
  });

  const pageSize = filters.pageSize ?? appConfig.pagination.defaultPageSize;
  const page = filters.page ?? 1;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return { items, page, pageSize, total: filtered.length };
}
