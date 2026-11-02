/** Mock review comments for a submission (DEV-ONLY): list + add. */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer, bearerEmail } from "@/lib/mock/http";
import { getSubmission, listComments, addComment } from "@/lib/mock/submissions-store";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  const { id } = await params;
  if (!getSubmission(id)) return notFound();
  return NextResponse.json(listComments(id));
}

export async function POST(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  const { id } = await params;
  if (!getSubmission(id)) return notFound();
  const body = (await request.json().catch(() => null)) as { field?: string; comment?: string } | null;
  if (!body || !body.comment) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }
  return NextResponse.json(addComment(id, body.field ?? null, body.comment, bearerEmail(request)), { status: 201 });
}
