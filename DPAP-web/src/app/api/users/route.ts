/** Mock users collection (DEV-ONLY): list + create. */

import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_ENABLED,
  notFound,
  unauthorized,
  hasBearer,
  bearerEmail,
} from "@/lib/mock/http";
import { listUsers, createUser } from "@/lib/mock/users-store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { UserCreateInput } from "@/lib/api/types";

export async function GET(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();
  return NextResponse.json(listUsers());
}

export async function POST(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const input = (await request.json().catch(() => null)) as UserCreateInput | null;
  if (!input) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }
  const result = createUser(input);
  if (!result.ok) {
    return NextResponse.json({ message: "Email already in use", code: "CONFLICT" }, { status: 409 });
  }
  recordAudit("CREATE", "USER", result.value.id, result.value.email, bearerEmail(request));
  return NextResponse.json(result.value, { status: 201 });
}
