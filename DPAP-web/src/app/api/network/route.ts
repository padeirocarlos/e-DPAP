/** Mock network graph (DEV-ONLY). */
import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { network } from "@/lib/mock/submissions-store";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  const rt = request.nextUrl.searchParams.get("relationType");
  return NextResponse.json(network(rt ? Number(rt) : undefined));
}
