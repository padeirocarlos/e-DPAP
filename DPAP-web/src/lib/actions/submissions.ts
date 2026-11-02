"use server";

/**
 * Submission Server Actions. Each re-verifies the session + authorization on the
 * server and attaches the bearer token to the backend call. Creation re-runs the
 * schema validation (defense in depth); the backend is the authority (BR-RT-2).
 */

import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import {
  createSubmission,
  transitionSubmission,
  addComment,
  mergeActor,
} from "@/lib/api/submissions";
import { ApiError } from "@/lib/api/http";
import { validateSubmission } from "@/form/schema-model";
import type { EvalContext } from "@/form/expr";
import type { SubmissionAction } from "@/lib/api/types";

export type SubmissionMutationResult =
  | { ok: true; id: string }
  | { ok: false; code: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "STALE" | "ERROR"; message?: string };

export async function createSubmissionAction(
  answers: Record<string, unknown>,
  options?: { submit?: boolean },
): Promise<SubmissionMutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:write")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (options?.submit) {
    const errors = validateSubmission(answers as EvalContext);
    if (errors.length > 0) {
      return { ok: false, code: "VALIDATION", message: errors[0].message_pt };
    }
  }
  try {
    const created = await createSubmission(
      { answers, submit: options?.submit ?? false },
      { token: session.apiToken },
    );
    return { ok: true, id: created.id };
  } catch (err) {
    if (err instanceof ApiError && err.code === "VALIDATION") {
      return { ok: false, code: "VALIDATION", message: err.message };
    }
    if (err instanceof ApiError && err.code === "CONFLICT") {
      return { ok: false, code: "CONFLICT" };
    }
    return { ok: false, code: "ERROR" };
  }
}

export async function transitionSubmissionAction(
  id: string,
  action: SubmissionAction,
  version: number,
  reason?: string,
): Promise<SubmissionMutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:read")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  try {
    const updated = await transitionSubmission(
      id,
      { action, reason, version },
      { token: session.apiToken },
    );
    return { ok: true, id: updated.id };
  } catch (err) {
    if (err instanceof ApiError && err.code === "VALIDATION") {
      return { ok: false, code: "VALIDATION", message: err.message };
    }
    if (err instanceof ApiError && (err.code === "CONFLICT")) {
      return { ok: false, code: "STALE" };
    }
    if (err instanceof ApiError && err.code === "FORBIDDEN") {
      return { ok: false, code: "FORBIDDEN" };
    }
    return { ok: false, code: "ERROR" };
  }
}

export async function addCommentAction(
  id: string,
  comment: string,
  field?: string,
): Promise<SubmissionMutationResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:read")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  if (!comment.trim()) return { ok: false, code: "VALIDATION" };
  try {
    await addComment(id, { comment, field }, { token: session.apiToken });
    return { ok: true, id };
  } catch (err) {
    if (err instanceof ApiError && err.code === "FORBIDDEN") return { ok: false, code: "FORBIDDEN" };
    return { ok: false, code: "ERROR" };
  }
}

export async function mergeActorAction(
  sourceId: string,
  into: string,
): Promise<SubmissionMutationResult> {
  const session = await getActiveSession();
  // Merge is a registry operation; gate on delete (data-manager/sys-admin level).
  if (!session || !can(session.user.role, "actors:delete")) {
    return { ok: false, code: "FORBIDDEN" };
  }
  try {
    const res = await mergeActor(sourceId, into, { token: session.apiToken });
    return { ok: true, id: res.id };
  } catch (err) {
    if (err instanceof ApiError && err.code === "CONFLICT") return { ok: false, code: "CONFLICT" };
    if (err instanceof ApiError && err.code === "FORBIDDEN") return { ok: false, code: "FORBIDDEN" };
    return { ok: false, code: "ERROR" };
  }
}
