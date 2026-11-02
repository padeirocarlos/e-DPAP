/**
 * Mock single-submission endpoint (DEV-ONLY): fetch by id.
 */

import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { getSubmission } from "@/lib/mock/submissions-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const submission = getSubmission(id);
  if (!submission) return notFound();
  return NextResponse.json(submission);
}
