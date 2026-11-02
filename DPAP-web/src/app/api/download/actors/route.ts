/**
 * Actor-export download proxy (NOT a mock — runs in production too).
 *
 * A file download is a top-level browser navigation, so it cannot carry the
 * httpOnly session cookie's bearer token the way a `fetch` from our code can.
 * This route reads the session server-side, attaches the JWT as the bearer,
 * forwards the request to the backend report endpoint (mock or real, at
 * `appConfig.api.baseUrl`), and streams the bytes straight back to the browser
 * with the attachment headers.
 *
 * Direct `fetch` (not the typed `http` client) is deliberate: the client
 * decodes JSON, but exports are opaque binary streams. On any upstream failure
 * the proxy redirects back to the reports page with a localized error flag
 * rather than serving a broken file.
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { appConfig } from "@/config/app.config";
import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { routes, REPORT_ERROR_PARAM } from "@/config/routes";
import { defaultLocale, isLocale } from "@/i18n/config";

/** Query params forwarded verbatim to the backend export endpoint. */
const FORWARDED = [
  "format",
  "q",
  "districtCode",
  "localityCode",
  "sector",
  "actorType",
  "legalStatus",
  "columns",
] as const;

export async function GET(request: NextRequest) {
  await connection();

  const sp = request.nextUrl.searchParams;
  const langParam = sp.get("lang");
  const locale = langParam && isLocale(langParam) ? langParam : defaultLocale;

  const failure = (reason: "formato" | "exportacao") =>
    NextResponse.redirect(
      new URL(
        `${routes.reports(locale)}?${REPORT_ERROR_PARAM}=${reason}`,
        request.nextUrl.origin,
      ),
    );

  const session = await getActiveSession();
  if (!session) return NextResponse.redirect(new URL(routes.login(locale), request.nextUrl.origin));
  if (!can(session.user.role, "reports:read")) return failure("exportacao");

  // Build the backend export URL from the whitelisted, forwarded params.
  const base = appConfig.api.baseUrl.replace(/\/$/, "");
  const upstream = new URL(`${base}/reports/actors`);
  for (const key of FORWARDED) {
    const value = sp.get(key);
    if (value) upstream.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(upstream, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: "no-store",
    });
  } catch {
    return failure("exportacao");
  }

  if (!response.ok) {
    return failure(response.status === 501 ? "formato" : "exportacao");
  }

  const headers = new Headers();
  headers.set(
    "Content-Type",
    response.headers.get("Content-Type") ?? "application/octet-stream",
  );
  headers.set(
    "Content-Disposition",
    response.headers.get("Content-Disposition") ??
      'attachment; filename="atores"',
  );
  return new NextResponse(response.body, { status: 200, headers });
}
