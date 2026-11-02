/**
 * Audit viewer filter <-> URL search params.
 *
 * One source of truth for the query-string keys and how they parse into
 * `AuditFilters`, shared by the server loader (reads them) and the client
 * viewer (writes them). Namespaced (`auditoria*`) so they can coexist with the
 * actor list filters on the same admin page. Unknown values are dropped.
 */

import type { AuditAction, AuditFilters } from "@/lib/api/types";
import type { SearchParams } from "@/lib/actors/filter-params";

export const AUDIT_FILTER_KEYS = {
  entity: "auditoriaEntidade",
  action: "auditoriaAcao",
  page: "auditoriaPagina",
} as const;

const ENTITY_TYPES = ["ACTOR", "USER"] as const;
const ACTIONS: AuditAction[] = ["CREATE", "UPDATE", "DELETE"];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAuditFilters(sp: SearchParams): AuditFilters {
  const e = first(sp[AUDIT_FILTER_KEYS.entity]);
  const entityType = e && (ENTITY_TYPES as readonly string[]).includes(e) ? e : undefined;

  const a = first(sp[AUDIT_FILTER_KEYS.action]);
  const action =
    a && (ACTIONS as string[]).includes(a) ? (a as AuditAction) : undefined;

  const p = Number(first(sp[AUDIT_FILTER_KEYS.page]));
  const page = Number.isInteger(p) && p > 0 ? p : undefined;

  return { entityType, action, page };
}

export { ENTITY_TYPES, ACTIONS as AUDIT_ACTIONS };
