/**
 * Mock actor export (DEV-ONLY): `GET /api/reports/actors?format=csv&<filters>`.
 *
 * Mirrors the backend contract, but only CSV is generated here (see
 * `@/lib/mock/report`). XLSX/PDF return 501 so the download proxy can show a
 * localized "full backend required" notice rather than a broken file.
 */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { exportActors } from "@/lib/mock/store";
import { buildActorsCsv, CSV_CONTENT_TYPE } from "@/lib/mock/report";
import type { ActorFilters } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  await connection();
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const format = (sp.get("format") ?? "csv").toLowerCase();

  if (format !== "csv") {
    return NextResponse.json(
      {
        message: "Only CSV is available from the dev mock backend",
        code: "NOT_IMPLEMENTED",
      },
      { status: 501 },
    );
  }

  const filters: ActorFilters = {
    q: sp.get("q") ?? undefined,
    districtCode: sp.get("districtCode") ?? undefined,
    localityCode: sp.get("localityCode") ?? undefined,
    sector: (sp.get("sector") as ActorFilters["sector"]) ?? undefined,
    actorType: (sp.get("actorType") as ActorFilters["actorType"]) ?? undefined,
    legalStatus:
      (sp.get("legalStatus") as ActorFilters["legalStatus"]) ?? undefined,
  };

  const columnsParam = sp.get("columns");
  const columns = columnsParam ? columnsParam.split(",").filter(Boolean) : undefined;
  const csv = buildActorsCsv(exportActors(filters), columns);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": CSV_CONTENT_TYPE,
      "Content-Disposition": 'attachment; filename="atores.csv"',
    },
  });
}
