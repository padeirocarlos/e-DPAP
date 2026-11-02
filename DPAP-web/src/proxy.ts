import { NextResponse, type NextRequest } from "next/server";
import { locales, defaultLocale, isLocale } from "@/i18n/config";
import { segments } from "@/config/routes";
import { COOKIE_NAME } from "@/lib/auth/cookie";

/**
 * Locale routing + auth gate (Next 16 renamed `middleware` → `proxy`).
 *
 * 1. Ensures every request is under a `/[lang]` prefix.
 * 2. Hard-redirects unauthenticated requests (no session cookie) to the login
 *    page, so protected routes never start rendering for signed-out users.
 *
 * This is a presence check only — the session's signature and expiry are
 * verified server-side in the (app) layout and in every Server Action. The API
 * remains the real security boundary.
 */

function negotiateLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (header) {
    for (const part of header.split(",")) {
      const tag = part.split(";")[0]?.trim().toLowerCase();
      const base = tag?.split("-")[0];
      if (base && isLocale(base)) return base;
    }
  }
  return defaultLocale;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (!hasLocale) {
    const locale = negotiateLocale(request);
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  const locale = pathname.split("/")[1] ?? defaultLocale;
  const loginPath = `/${locale}/${segments.login}`;
  const isLoginPage = pathname === loginPath;
  const hasSession = request.cookies.has(COOKIE_NAME);

  if (!hasSession && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes, and anything with a file extension.
  matcher: ["/((?!_next/|api/|.*\\.).*)"],
};
