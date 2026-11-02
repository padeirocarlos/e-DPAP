/** Mock audit trail (DEV-ONLY): `GET /api/audit` with filters + pagination. */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { listAudit } from "@/lib/mock/audit-store";
import type { AuditFilters } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  // Per-request so the list reflects live mock activity (Cache Components).
  await connection();
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const num = (v: string | null) => (v ? Number(v) : undefined);

  const filters: AuditFilters = {
    entityType: sp.get("entityType") ?? undefined,
    action: (sp.get("action") as AuditFilters["action"]) ?? undefined,
    page: num(sp.get("page")),
    pageSize: num(sp.get("pageSize")),
  };

  return NextResponse.json(listAudit(filters));
}
