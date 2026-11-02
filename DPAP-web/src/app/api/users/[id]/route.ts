/** Mock single-user endpoints (DEV-ONLY): update + delete. */

import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_ENABLED,
  notFound,
  unauthorized,
  hasBearer,
  bearerEmail,
} from "@/lib/mock/http";
import { listUsers, updateUser, deleteUser } from "@/lib/mock/users-store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { UserUpdateInput } from "@/lib/api/types";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const input = (await request.json().catch(() => null)) as UserUpdateInput | null;
  if (!input) {
    return NextResponse.json({ message: "Invalid body", code: "VALIDATION" }, { status: 422 });
  }
  const result = updateUser(id, input);
  if (!result.ok) return notFound();
  recordAudit("UPDATE", "USER", id, result.value.email, bearerEmail(request));
  return NextResponse.json(result.value);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const existing = listUsers().find((u) => u.id === id);
  if (!deleteUser(id)) return notFound();
  recordAudit("DELETE", "USER", id, existing?.email ?? id, bearerEmail(request));
  return new NextResponse(null, { status: 204 });
}
