/**
 * Mock submission workflow transition (DEV-ONLY): applies the §4.2 state
 * machine. Role authorization is the real backend's job; the mock allows the
 * transition if it is valid for the current state.
 */

import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer, bearerEmail } from "@/lib/mock/http";
import { transition } from "@/lib/mock/submissions-store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { SubmissionAction } from "@/lib/api/types";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { action?: SubmissionAction; reason?: string; version?: number }
    | null;
  if (!body || !body.action) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }

  const result = transition(id, body.action, body.version);
  if (!result.ok) {
    if (result.code === "NOT_FOUND") return notFound();
    return NextResponse.json({ message: "Transição inválida", code: "CONFLICT" }, { status: 409 });
  }
  recordAudit("UPDATE", "SUBMISSION", id, `Submissão ${body.action}`, bearerEmail(request));
  return NextResponse.json(result.submission);
}
