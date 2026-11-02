/**
 * In-memory mock users for the dev backend (DEV-ONLY). Mirrors the real
 * `/users` contract. State lives on `globalThis` to survive HMR.
 */

import type { UserAdmin, UserCreateInput, UserUpdateInput } from "@/lib/api/types";

type Store = { users: Map<string, UserAdmin> };

function seed(): Store {
  const users = new Map<string, UserAdmin>();
  const now = new Date().toISOString();
  const demo: Omit<UserAdmin, "id" | "createdAt">[] = [
    { name: "Administrador do Sistema", email: "admin@dpap.gov.mz", role: "SYS_ADMIN", enabled: true },
    { name: "Gestor de Dados", email: "gestor@dpap.gov.mz", role: "DATA_MANAGER", enabled: true },
    { name: "Supervisor de Demonstração", email: "supervisor@dpap.gov.mz", role: "SUPERVISOR", enabled: true },
    { name: "Inquiridor de Demonstração", email: "inquiridor@dpap.gov.mz", role: "ENUMERATOR", enabled: true },
    { name: "Analista de Demonstração", email: "analista@dpap.gov.mz", role: "ANALYST", enabled: true },
    { name: "Parceiro de Demonstração", email: "parceiro@dpap.gov.mz", role: "PARTNER", enabled: true },
  ];
  for (const d of demo) {
    const id = globalThis.crypto.randomUUID();
    users.set(id, { ...d, id, createdAt: now });
  }
  return { users };
}

const ref = globalThis as unknown as { __dpapMockUsers?: Store };
const store: Store = (ref.__dpapMockUsers ??= seed());

export function listUsers(): UserAdmin[] {
  return [...store.users.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export type MockUserResult<T> = { ok: true; value: T } | { ok: false; reason: "CONFLICT" | "NOT_FOUND" };

export function createUser(input: UserCreateInput): MockUserResult<UserAdmin> {
  const email = input.email.trim().toLowerCase();
  for (const u of store.users.values()) {
    if (u.email.toLowerCase() === email) return { ok: false, reason: "CONFLICT" };
  }
  const id = globalThis.crypto.randomUUID();
  const user: UserAdmin = {
    id,
    name: input.name.trim(),
    email,
    role: input.role,
    enabled: true,
    createdAt: new Date().toISOString(),
  };
  store.users.set(id, user);
  return { ok: true, value: user };
}

export function updateUser(id: string, input: UserUpdateInput): MockUserResult<UserAdmin> {
  const existing = store.users.get(id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  const updated: UserAdmin = {
    ...existing,
    name: input.name.trim(),
    role: input.role,
    enabled: input.enabled,
  };
  store.users.set(id, updated);
  return { ok: true, value: updated };
}

export function deleteUser(id: string): boolean {
  return store.users.delete(id);
}
