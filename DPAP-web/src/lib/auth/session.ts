/**
 * Server-side session access — the Data Access Layer for auth.
 *
 * Reading the session reads `cookies()`, which is request-time data. Under Cache
 * Components a cookie read must sit behind a <Suspense> boundary and never at a
 * layout's top level, so call these from components already inside a boundary
 * (or from Server Actions, which re-verify independently).
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { lang } from "next/root-params";
import { COOKIE_NAME, cookieOptions, sessionTtlSeconds } from "@/lib/auth/config";
import { decodeSession, encodeSession } from "@/lib/auth/session-token";
import type { AuthUser, ClientSession, ServerSession } from "@/lib/auth/types";
import { resolveLocale } from "@/i18n/config";
import { routes } from "@/config/routes";

export async function getSession(): Promise<ServerSession | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  return decodeSession(token);
}

/**
 * Whether a session is past its expiry. Call only from Server Actions / route
 * handlers (reading the clock in the render path trips Cache Components).
 */
export function isSessionExpired(session: ServerSession): boolean {
  return session.expiresAt < Date.now();
}

/** Session for use in a Server Action: null when missing or expired. */
export async function getActiveSession(): Promise<ServerSession | null> {
  const session = await getSession();
  if (!session || isSessionExpired(session)) return null;
  return session;
}

/** Bearer token for backend API calls (server-side only). */
export async function getServerAuthToken(): Promise<string | null> {
  return (await getSession())?.apiToken ?? null;
}

/** Shape safe to hand to Client Components (no API token). */
export function toClientSession(session: ServerSession): ClientSession {
  return { user: session.user, expiresAt: session.expiresAt };
}

/** Require a session; redirect to login if absent/expired. For components. */
export async function requireSession(): Promise<ServerSession> {
  const session = await getSession();
  if (!session) {
    const locale = resolveLocale(await lang());
    redirect(routes.login(locale));
  }
  return session;
}

export async function setSessionCookie(
  user: AuthUser,
  apiToken: string,
): Promise<void> {
  const expiresAt = Date.now() + sessionTtlSeconds * 1000;
  const session: ServerSession = { user, apiToken, expiresAt };
  (await cookies()).set(
    COOKIE_NAME,
    encodeSession(session),
    cookieOptions(sessionTtlSeconds),
  );
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
