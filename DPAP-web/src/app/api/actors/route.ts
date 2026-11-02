/**
 * Mock actors collection (DEV-ONLY): list with filters/pagination, and create.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_ENABLED,
  notFound,
  unauthorized,
  hasBearer,
  bearerEmail,
} from "@/lib/mock/http";
import { listActors, createActor } from "@/lib/mock/store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { ActorFilters, ActorWriteModel } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const num = (v: string | null) => (v ? Number(v) : undefined);

  const filters: ActorFilters = {
    q: sp.get("q") ?? undefined,
    districtCode: sp.get("districtCode") ?? undefined,
    localityCode: sp.get("localityCode") ?? undefined,
    sector: (sp.get("sector") as ActorFilters["sector"]) ?? undefined,
    actorType: (sp.get("actorType") as ActorFilters["actorType"]) ?? undefined,
    legalStatus:
      (sp.get("legalStatus") as ActorFilters["legalStatus"]) ?? undefined,
    page: num(sp.get("page")),
    pageSize: num(sp.get("pageSize")),
  };

  return NextResponse.json(listActors(filters));
}

export async function POST(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const input = (await request.json().catch(() => null)) as ActorWriteModel | null;
  if (!input) {
    return NextResponse.json(
      { message: "Invalid body", code: "VALIDATION" },
      { status: 422 },
    );
  }

  const result = createActor(input);
  if (!result.ok) {
    return NextResponse.json(
      { message: "Duplicate actor", code: "CONFLICT" },
      { status: 409 },
    );
  }
  recordAudit("CREATE", "ACTOR", result.actor.id, result.actor.name, bearerEmail(request));
  return NextResponse.json(result.actor, { status: 201 });
}
