/**
 * Actor resource — typed wrappers over the backend actor endpoints. Mutations
 * carry the record `version` so the backend can reject stale writes (optimistic
 * concurrency), which the sync engine resolves last-updated-wins.
 *
 * Each call accepts an optional explicit `token`. In the page the HTTP client
 * reads it from the stored session; the service worker (Background Sync) has no
 * access to that, so it passes the token it read from IndexedDB.
 */

import { http } from "@/api/http";
import type { Actor, ActorWriteModel, Paginated } from "@/api/types";

export function createActor(input: ActorWriteModel, token?: string): Promise<Actor> {
  return http.post<Actor>("/actors", input, { token });
}

export function updateActor(
  id: string,
  input: ActorWriteModel,
  version: number,
  token?: string,
): Promise<Actor> {
  // Version travels in the body so the backend can detect a stale update (409).
  return http.put<Actor>(`/actors/${encodeURIComponent(id)}`, { ...input, version }, {
    token,
  });
}

export function deleteActor(id: string, token?: string): Promise<void> {
  return http.delete<void>(`/actors/${encodeURIComponent(id)}`, { token });
}

/** Fetch one full actor — used by the sync engine to resolve a stale conflict. */
export function getActor(id: string, token?: string): Promise<Actor> {
  return http.get<Actor>(`/actors/${encodeURIComponent(id)}`, { token });
}

/**
 * Delta pull: full actor records changed at/after `since` (ISO 8601), oldest
 * first, paged. Omit `since` for a full initial pull. Backs server→device sync.
 */
export function listChanges(
  params: { since?: string; page?: number; pageSize?: number },
  options?: { token?: string },
): Promise<Paginated<Actor>> {
  return http.get<Paginated<Actor>>("/actors/changes", {
    query: { since: params.since, page: params.page, pageSize: params.pageSize },
    token: options?.token,
  });
}
