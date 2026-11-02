/**
 * Actor resource — typed wrappers over the backend actor endpoints.
 *
 * Mutations send the record `version` so the server can reject stale writes
 * (optimistic concurrency), consistent with the last-updated-wins + versioning
 * conflict model shared with the offline PWA.
 */

import { http, type Query } from "@/lib/api/http";
import type {
  Actor,
  ActorSummary,
  ActorFilters,
  ActorWriteModel,
  Paginated,
} from "@/lib/api/types";
import type { DuplicateCandidate } from "@/lib/validation/duplicate";

const PATHS = {
  collection: "/actors",
  byId: (id: string) => `/actors/${encodeURIComponent(id)}`,
} as const;

function toQuery(filters: ActorFilters = {}): Query {
  return {
    q: filters.q,
    districtCode: filters.districtCode,
    localityCode: filters.localityCode,
    sector: filters.sector,
    actorType: filters.actorType,
    legalStatus: filters.legalStatus,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function listActors(
  filters?: ActorFilters,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Paginated<ActorSummary>> {
  return http.get<Paginated<ActorSummary>>(PATHS.collection, {
    query: toQuery(filters),
    ...options,
  });
}

export function getActor(
  id: string,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Actor> {
  return http.get<Actor>(PATHS.byId(id), options);
}

export function createActor(
  input: ActorWriteModel,
  options?: { token?: string | null },
): Promise<Actor> {
  return http.post<Actor>(PATHS.collection, input, { token: options?.token });
}

export function updateActor(
  id: string,
  input: ActorWriteModel,
  version: number,
  options?: { token?: string | null },
): Promise<Actor> {
  // Version travels in the body so the backend can detect a stale update (409).
  return http.put<Actor>(PATHS.byId(id), { ...input, version }, {
    token: options?.token,
  });
}

export function deleteActor(
  id: string,
  options?: { token?: string | null },
): Promise<void> {
  return http.delete<void>(PATHS.byId(id), { token: options?.token });
}

/**
 * Fetch likely-matching actors for client-side duplicate ranking. Scoped to the
 * same district and a name query to keep the payload small; the fuzzy ranking
 * itself runs locally via `rankDuplicates`.
 */
export async function searchActorCandidates(
  params: { name: string; districtCode: string },
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<DuplicateCandidate[]> {
  const result = await listActors(
    { q: params.name, districtCode: params.districtCode, pageSize: 25 },
    options,
  );
  return result.items.map((a) => ({
    id: a.id,
    name: a.name,
    districtCode: a.districtCode,
    actorType: a.actorType,
  }));
}
