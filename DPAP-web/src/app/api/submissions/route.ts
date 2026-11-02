/**
 * Mock submissions collection (DEV-ONLY): list + create.
 */

import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer, bearerEmail } from "@/lib/mock/http";
import { listSubmissions, createSubmission } from "@/lib/mock/submissions-store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { SubmissionFilters, SubmissionRequest } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const sp = request.nextUrl.searchParams;
  const num = (v: string | null) => (v ? Number(v) : undefined);
  const filters: SubmissionFilters = {
    status: (sp.get("status") as SubmissionFilters["status"]) ?? undefined,
    districtCode: sp.get("districtCode") ?? undefined,
    actorType: num(sp.get("actorType")),
    page: num(sp.get("page")),
    pageSize: num(sp.get("pageSize")),
  };
  return NextResponse.json(listSubmissions(filters));
}

export async function POST(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const input = (await request.json().catch(() => null)) as SubmissionRequest | null;
  if (!input || typeof input !== "object" || !input.answers) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }

  const created = createSubmission(input, bearerEmail(request));
  recordAudit("CREATE", "SUBMISSION", created.id, `Submissão ${created.status}`, bearerEmail(request));
  return NextResponse.json(created, { status: 201 });
}
