"use server";

/**
 * User-management Server Actions. Each re-verifies the session and requires the
 * `admin:access` permission on the server, then forwards the bearer token to
 * the backend (which is the authoritative authorization boundary).
 */

import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { createUser, updateUser, deleteUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/http";
import type { UserCreateInput, UserUpdateInput } from "@/lib/api/types";

export type UserMutationResult =
  | { ok: true }
  | { ok: false; code: "FORBIDDEN" | "CONFLICT" | "ERROR" };

async function requireAdminToken(): Promise<string | null | false> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "admin:access")) return false;
  return session.apiToken;
}

function mapError(err: unknown): UserMutationResult {
  if (err instanceof ApiError && err.code === "CONFLICT") {
    return { ok: false, code: "CONFLICT" };
  }
  return { ok: false, code: "ERROR" };
}

export async function createUserAction(
  input: UserCreateInput,
): Promise<UserMutationResult> {
  const token = await requireAdminToken();
  if (token === false) return { ok: false, code: "FORBIDDEN" };
  try {
    await createUser(input, { token });
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function updateUserAction(
  id: string,
  input: UserUpdateInput,
): Promise<UserMutationResult> {
  const token = await requireAdminToken();
  if (token === false) return { ok: false, code: "FORBIDDEN" };
  try {
    await updateUser(id, input, { token });
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}

export async function deleteUserAction(id: string): Promise<UserMutationResult> {
  const token = await requireAdminToken();
  if (token === false) return { ok: false, code: "FORBIDDEN" };
  try {
    await deleteUser(id, { token });
    return { ok: true };
  } catch (err) {
    return mapError(err);
  }
}
