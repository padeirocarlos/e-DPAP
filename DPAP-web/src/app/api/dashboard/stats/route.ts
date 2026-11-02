/** Mock dashboard aggregates (DEV-ONLY). */

import { NextResponse, type NextRequest } from "next/server";
import { connection } from "next/server";
import { MOCK_ENABLED, notFound, unauthorized, hasBearer } from "@/lib/mock/http";
import { dashboardStats } from "@/lib/mock/store";

export async function GET(request: NextRequest) {
  // Opt into per-request rendering so stats reflect the live in-memory store
  // (the Cache Components way; the `dynamic` segment config is disallowed).
  await connection();
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  return NextResponse.json(dashboardStats());
}
