/** Mock BRD indicators (DEV-ONLY). */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { indicators } from "@/lib/mock/submissions-store";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  return NextResponse.json(indicators());
}
