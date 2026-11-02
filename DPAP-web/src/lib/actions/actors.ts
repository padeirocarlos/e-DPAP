"use server";

/**
 * Actor write + duplicate-check Server Actions.
 *
 * Each action re-verifies the session and authorization on the server — the
 * client's UI gating is not trusted — and attaches the bearer token to the
 * backend call. The duplicate check runs server-side so it carries the token
 * (the httpOnly cookie never reaches client-side fetch).
 */

import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  createActor,
  updateActor,
  deleteActor,
  searchActorCandidates,
} from "@/lib/api/actors";
import { ApiError } from "@/lib/api/http";
import { buildActorSchema } from "@/lib/validation/actor-schema";
import {
  rankDuplicates,
  type ActorIdentity,
  type DuplicateMatch,
} from "@/lib/validation/duplicate";
import { getDictionaryFor } from "@/i18n/dictionary";
import { defaultLocale } from "@/i18n/config";
import type { ActorWriteModel } from "@/lib/api/types";

export type MutationResult =
  | { ok: true }
  | {
      ok: false;
      code: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "STALE" | "ERROR";
      /** The backend's own message, when the failure carried one (not a plain outage). */
      message?: string;
    };

/** Map an API failure to a result, preserving the backend message when useful. */
function toFailure(err: unknown): MutationResult {
  if (err instanceof ApiError) {
    if (err.code === "CONFLICT") return { ok: false, code: "CONFLICT" };
    if (err.code === "VALIDATION") return { ok: false, code: "VALIDATION", message: err.message };
    // Network/timeout = a real connectivity problem (no message to show);
    // anything else (4xx/5xx) carries a message worth surfacing.
    const offline = err.code === "NETWORK" || err.code === "TIMEOUT";
    return { ok: false, code: "ERROR", message: offline ? undefined : err.message };
  }
  return { ok: false, code: "ERROR" };
}

async function validate(input: ActorWriteModel): Promise<boolean> {
  // Server-side re-validation (defense in depth; the backend validates too).
  const schema = buildActorSchema(await getDictionaryFor(defaultLocale));
  return schema.safeParse(input).success;
}

export async function createActorAction(
  input: ActorWriteModel,
): Promise<MutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:write")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (!(await validate(input))) return { ok: false, code: "VALIDATION" };

  try {
    await createActor(input, { token: session.apiToken });
    return { ok: true };
  } catch (err) {
    return toFailure(err);
  }
}

export async function updateActorAction(
  id: string,
  version: number,
  input: ActorWriteModel,
): Promise<MutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:write")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (!(await validate(input))) return { ok: false, code: "VALIDATION" };

  try {
    await updateActor(id, input, version, { token: session.apiToken });
    return { ok: true };
  } catch (err) {
    // Version mismatch — the record changed since it was loaded.
    if (err instanceof ApiError && err.code === "CONFLICT") {
      return { ok: false, code: "STALE" };
    }
    return toFailure(err);
  }
}

export async function deleteActorAction(id: string): Promise<MutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:delete")) {
    return { ok: false, code: "FORBIDDEN" };
  }

  try {
    await deleteActor(id, { token: session.apiToken });
    return { ok: true };
  } catch {
    return { ok: false, code: "ERROR" };
  }
}

export async function checkActorDuplicatesAction(
  candidate: ActorIdentity,
  /** When editing, exclude the actor being edited from the matches. */
  excludeId?: string,
): Promise<DuplicateMatch[]> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:read")) return [];

  try {
    const candidates = await searchActorCandidates(
      { name: candidate.name, districtCode: candidate.districtCode },
      { token: session.apiToken },
    );
    const matches = rankDuplicates(candidate, candidates);
    return excludeId ? matches.filter((m) => m.id !== excludeId) : matches;
  } catch (err) {
    // Fail soft: never block the form on a check failure.
    if (err instanceof ApiError) return [];
    throw err;
  }
}
