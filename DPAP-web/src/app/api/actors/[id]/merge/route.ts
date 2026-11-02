/** Mock actor merge (DEV-ONLY): echoes the surviving actor id. */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  await params;
  const body = (await request.json().catch(() => null)) as { into?: string } | null;
  if (!body?.into) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }
  return NextResponse.json({ id: body.into });
}
