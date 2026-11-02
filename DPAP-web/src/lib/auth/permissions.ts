/**
 * Role → permission mapping (client-safe: no secrets, no cookies).
 *
 * The single source of truth for what each of the BRD's six roles (§3.3) can do.
 * It drives UI gating (hide/show) on the client and authorization checks in
 * Server Actions on the server. Remember: UI checks only hide elements — the
 * backend API re-verifies the bearer token and is the real security boundary,
 * and its SecurityConfig role rules mirror this map.
 */

import type { RoleCode } from "@/lib/domain/enums";

export type Permission =
  | "actors:read"
  | "actors:write"
  | "actors:delete"
  | "reports:read"
  | "conformance:review"
  | "admin:access";

// `conformance:review` — the Data Conformance (Conformidade de Dados) review
// queue. Supervisors and above validate submitted interviews; enumerators
// (interviewers), analysts and partners must NOT see it. Mirrors the backend
// review-role rules (comments/transitions = SUPERVISOR/DATA_MANAGER/SYS_ADMIN).
const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  sysadmin: ["actors:read", "reports:read", "actors:write", "actors:delete", "conformance:review", "admin:access"],
  datamanager: ["actors:read", "reports:read", "actors:write", "actors:delete", "conformance:review"],
  supervisor: ["actors:read", "reports:read", "actors:write", "conformance:review"],
  enumerator: ["actors:read", "reports:read", "actors:write"],
  analyst: ["actors:read", "reports:read"],
  partner: ["actors:read", "reports:read"],
};

export function can(role: RoleCode, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Normalize a raw role claim to a code. Accepts the backend's uppercase enum
 * names (e.g. "SYS_ADMIN", "ROLE_DATA_MANAGER") by lowercasing and dropping the
 * "role_" prefix and underscores (SYS_ADMIN → "sysadmin").
 */
export function normalizeRole(raw: string | undefined): RoleCode | null {
  if (!raw) return null;
  const value = raw.toLowerCase().replace(/^role_/, "").replace(/_/g, "");
  const codes: RoleCode[] = [
    "sysadmin",
    "datamanager",
    "supervisor",
    "enumerator",
    "analyst",
    "partner",
  ];
  return (codes as string[]).includes(value) ? (value as RoleCode) : null;
}
