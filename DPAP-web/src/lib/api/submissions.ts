/**
 * Submission resource — typed wrappers over the backend interview endpoints
 * (BRD §4.2 workflow). Mutations go through Server Actions that attach the
 * session bearer token (the httpOnly cookie can't reach client fetch).
 */

import { http, type Query } from "@/lib/api/http";
import type {
  DuplicateCandidate,
  Paginated,
  QcFlag,
  ReviewComment,
  Submission,
  SubmissionAction,
  SubmissionFilters,
  SubmissionRequest,
} from "@/lib/api/types";

const PATHS = {
  collection: "/submissions",
  byId: (id: string) => `/submissions/${encodeURIComponent(id)}`,
  transitions: (id: string) => `/submissions/${encodeURIComponent(id)}/transitions`,
  qc: (id: string) => `/submissions/${encodeURIComponent(id)}/qc`,
  comments: (id: string) => `/submissions/${encodeURIComponent(id)}/comments`,
  duplicates: (id: string) => `/submissions/${encodeURIComponent(id)}/duplicates`,
  merge: (id: string) => `/actors/${encodeURIComponent(id)}/merge`,
} as const;

function toQuery(f: SubmissionFilters = {}): Query {
  return {
    status: f.status,
    districtCode: f.districtCode,
    actorType: f.actorType,
    mine: f.mine,
    page: f.page,
    pageSize: f.pageSize,
  };
}

export function listSubmissions(
  filters?: SubmissionFilters,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Paginated<Submission>> {
  return http.get<Paginated<Submission>>(PATHS.collection, { query: toQuery(filters), ...options });
}

export function getSubmission(
  id: string,
  options?: { signal?: AbortSignal; token?: string | null },
): Promise<Submission> {
  return http.get<Submission>(PATHS.byId(id), options);
}

export function createSubmission(
  input: SubmissionRequest,
  options?: { token?: string | null },
): Promise<Submission> {
  return http.post<Submission>(PATHS.collection, input, { token: options?.token });
}

export function transitionSubmission(
  id: string,
  body: { action: SubmissionAction; reason?: string; version?: number },
  options?: { token?: string | null },
): Promise<Submission> {
  return http.post<Submission>(PATHS.transitions(id), body, { token: options?.token });
}

export function listQcFlags(
  id: string,
  options?: { token?: string | null },
): Promise<QcFlag[]> {
  return http.get<QcFlag[]>(PATHS.qc(id), options);
}

export function listComments(
  id: string,
  options?: { token?: string | null },
): Promise<ReviewComment[]> {
  return http.get<ReviewComment[]>(PATHS.comments(id), options);
}

export function addComment(
  id: string,
  body: { field?: string; comment: string },
  options?: { token?: string | null },
): Promise<ReviewComment> {
  return http.post<ReviewComment>(PATHS.comments(id), body, { token: options?.token });
}

export function listDuplicates(
  id: string,
  options?: { token?: string | null },
): Promise<DuplicateCandidate[]> {
  return http.get<DuplicateCandidate[]>(PATHS.duplicates(id), options);
}

export function mergeActor(
  sourceId: string,
  into: string,
  options?: { token?: string | null },
): Promise<{ id: string }> {
  return http.post<{ id: string }>(PATHS.merge(sourceId), { into }, { token: options?.token });
}
