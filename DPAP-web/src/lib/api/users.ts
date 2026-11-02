/**
 * User administration resource — typed wrappers over the backend `/users`
 * endpoints (administrator-only; the backend enforces it).
 */

import { http } from "@/lib/api/http";
import type { UserAdmin, UserCreateInput, UserUpdateInput } from "@/lib/api/types";

const PATHS = {
  collection: "/users",
  byId: (id: string) => `/users/${encodeURIComponent(id)}`,
} as const;

export function listUsers(options?: {
  signal?: AbortSignal;
  token?: string | null;
}): Promise<UserAdmin[]> {
  return http.get<UserAdmin[]>(PATHS.collection, options);
}

export function createUser(
  input: UserCreateInput,
  options?: { token?: string | null },
): Promise<UserAdmin> {
  return http.post<UserAdmin>(PATHS.collection, input, { token: options?.token });
}

export function updateUser(
  id: string,
  input: UserUpdateInput,
  options?: { token?: string | null },
): Promise<UserAdmin> {
  return http.put<UserAdmin>(PATHS.byId(id), input, { token: options?.token });
}

export function deleteUser(
  id: string,
  options?: { token?: string | null },
): Promise<void> {
  return http.delete<void>(PATHS.byId(id), { token: options?.token });
}
