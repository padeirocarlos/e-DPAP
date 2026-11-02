/**
 * Mock single-actor endpoints (DEV-ONLY): fetch, update (optimistic
 * concurrency via `version`), and delete.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  MOCK_ENABLED,
  notFound,
  unauthorized,
  hasBearer,
  bearerEmail,
} from "@/lib/mock/http";
import { getActor, updateActor, deleteActor } from "@/lib/mock/store";
import { recordAudit } from "@/lib/mock/audit-store";
import type { ActorWriteModel } from "@/lib/api/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const actor = getActor(id);
  if (!actor) return notFound();
  return NextResponse.json(actor);
}

export async function PUT(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | (ActorWriteModel & { version?: number })
    | null;
  if (!body || typeof body.version !== "number") {
    return NextResponse.json(
      { message: "Invalid body", code: "VALIDATION" },
      { status: 422 },
    );
  }

  const { version, ...input } = body;
  const result = updateActor(id, input, version);
  if (!result.ok) {
    return result.reason === "NOT_FOUND"
      ? notFound()
      : NextResponse.json(
          { message: "Version conflict", code: "CONFLICT" },
          { status: 409 },
        );
  }
  recordAudit("UPDATE", "ACTOR", id, result.actor.name, bearerEmail(request));
  return NextResponse.json(result.actor);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  if (!MOCK_ENABLED) return notFound();
  if (!hasBearer(request)) return unauthorized();

  const { id } = await params;
  const existing = getActor(id);
  if (!deleteActor(id)) return notFound();
  recordAudit("DELETE", "ACTOR", id, existing?.name ?? id, bearerEmail(request));
  return new NextResponse(null, { status: 204 });
}
