/**
 * Server-only auth configuration and secrets.
 *
 * Kept separate from `src/config/env.ts` (which is imported by client code)
 * because these values must never reach the browser bundle.
 */

import "server-only";
import type { RoleCode } from "@/lib/domain/enums";
import { COOKIE_NAME } from "@/lib/auth/cookie";

export { COOKIE_NAME };

const isProduction = process.env.NODE_ENV === "production";

/**
 * Dev mode lets the team sign in as any demo role without a backend. On by
 * default outside production; must be explicitly opted into in production.
 */
export const authDevMode = isProduction
  ? process.env.AUTH_DEV_MODE === "true"
  : process.env.AUTH_DEV_MODE !== "false";

/**
 * HMAC secret for signing the session cookie (integrity, not encryption).
 * Resolved lazily so a missing secret fails at request time (fail-closed), not
 * at build/module-evaluation time.
 */
export function getSessionSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (secret) return secret;
  if (isProduction) {
    throw new Error(
      "AUTH_SESSION_SECRET must be set in production to sign session cookies.",
    );
  }
  return "dev-insecure-session-secret-change-me";
}

/** Session lifetime in seconds (default 8h — a government working day). */
export const sessionTtlSeconds = Number(
  process.env.AUTH_SESSION_TTL_SECONDS ?? 8 * 60 * 60,
);

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Demo accounts available only when `authDevMode` is on. Password is ignored. */
export const DEMO_ACCOUNTS: {
  email: string;
  name: string;
  role: RoleCode;
}[] = [
  { email: "admin@dpap.gov.mz", name: "Administrador do Sistema", role: "sysadmin" },
  { email: "gestor@dpap.gov.mz", name: "Gestor de Dados", role: "datamanager" },
  { email: "supervisor@dpap.gov.mz", name: "Supervisor de Demonstração", role: "supervisor" },
  { email: "inquiridor@dpap.gov.mz", name: "Inquiridor de Demonstração", role: "enumerator" },
  { email: "analista@dpap.gov.mz", name: "Analista de Demonstração", role: "analyst" },
  { email: "parceiro@dpap.gov.mz", name: "Parceiro de Demonstração", role: "partner" },
];
