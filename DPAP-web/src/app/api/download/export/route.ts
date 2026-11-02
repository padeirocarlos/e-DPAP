/**
 * Export download proxy for GeoJSON/KML and the data dictionary (BRD FR-EXP).
 * Like the actors proxy, it attaches the session bearer token server-side and
 * streams the backend's bytes (a download can't carry the httpOnly cookie).
 * `kind=geo` → backend `/actors/export`; `kind=dictionary` → `/form/dictionary`.
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { appConfig } from "@/config/app.config";
import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { routes, REPORT_ERROR_PARAM } from "@/config/routes";
import { defaultLocale, isLocale } from "@/i18n/config";

export async function GET(request: NextRequest) {
  await connection();

  const sp = request.nextUrl.searchParams;
  const langParam = sp.get("lang");
  const locale = langParam && isLocale(langParam) ? langParam : defaultLocale;
  const kind = sp.get("kind") === "dictionary" ? "dictionary" : "geo";

  const failure = (reason: "formato" | "exportacao") =>
    NextResponse.redirect(
      new URL(`${routes.reports(locale)}?${REPORT_ERROR_PARAM}=${reason}`, request.nextUrl.origin),
    );

  const session = await getActiveSession();
  if (!session) return NextResponse.redirect(new URL(routes.login(locale), request.nextUrl.origin));
  if (!can(session.user.role, "reports:read")) return failure("exportacao");

  const base = appConfig.api.baseUrl.replace(/\/$/, "");
  const upstream = new URL(`${base}${kind === "dictionary" ? "/form/dictionary" : "/actors/export"}`);
  const format = sp.get("format");
  if (format) upstream.searchParams.set("format", format);
  if (kind === "geo" && sp.get("anonymised") === "true") {
    upstream.searchParams.set("anonymised", "true");
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
  if (!response.ok) return failure(response.status === 501 ? "formato" : "exportacao");

  const headers = new Headers();
  headers.set("Content-Type", response.headers.get("Content-Type") ?? "application/octet-stream");
  headers.set("Content-Disposition", response.headers.get("Content-Disposition") ?? 'attachment; filename="export"');
  return new NextResponse(response.body, { status: 200, headers });
}
