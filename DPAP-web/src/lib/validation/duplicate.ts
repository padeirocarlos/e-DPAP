/**
 * Duplicate-avoidance for actor registration.
 *
 * Two layers:
 *  1. A deterministic *identity key* (normalized name + district + type) used to
 *     block exact duplicates.
 *  2. A fuzzy *similarity* score used to warn the enumerator about near-matches
 *     (typos, spacing, accents) before they create a record.
 *
 * The actual lookup is abstracted behind `DuplicateChecker` so the web app can
 * query the backend while the offline PWA can query the local IndexedDB store,
 * both reusing this normalization logic.
 */

import type { ActorTypeCode } from "@/lib/domain/enums";

export type ActorIdentity = {
  name: string;
  districtCode: string;
  actorType: ActorTypeCode | string;
  registrationNumber?: string;
};

export type DuplicateCandidate = ActorIdentity & { id: string };

export type DuplicateMatch = {
  id: string;
  name: string;
  districtCode: string;
  /** 1 = identical identity key, 0..1 for fuzzy name similarity. */
  score: number;
  /** True when the normalized identity key matches exactly. */
  exact: boolean;
};

/** Minimum fuzzy score (0..1) for a record to be surfaced as "similar". */
export const SIMILARITY_THRESHOLD = 0.82;

/** Lowercase, strip accents/punctuation, collapse whitespace. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Stable key for exact-duplicate detection. A registration number, when
 * present, is authoritative; otherwise fall back to name + district + type.
 */
export function identityKey(identity: ActorIdentity): string {
  const reg = identity.registrationNumber?.trim();
  if (reg) return `reg:${normalizeText(reg)}`;
  return [
    "nat",
    normalizeText(identity.name),
    identity.districtCode.toLowerCase(),
    String(identity.actorType).toLowerCase(),
  ].join("|");
}

/** Dice coefficient over character bigrams — robust to small typos. */
export function nameSimilarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s: string) => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return map;
  };

  const ma = bigrams(na);
  const mb = bigrams(nb);
  let overlap = 0;
  for (const [g, count] of ma) {
    const other = mb.get(g);
    if (other) overlap += Math.min(count, other);
  }
  const total = na.length - 1 + (nb.length - 1);
  return (2 * overlap) / total;
}

/** Rank candidates against a new actor, keeping only exact or similar matches. */
export function rankDuplicates(
  candidate: ActorIdentity,
  existing: DuplicateCandidate[],
): DuplicateMatch[] {
  const candidateKey = identityKey(candidate);

  return existing
    .map((e): DuplicateMatch => {
      const exact = identityKey(e) === candidateKey;
      const score = exact
        ? 1
        : e.districtCode === candidate.districtCode
          ? nameSimilarity(candidate.name, e.name)
          : 0;
      return {
        id: e.id,
        name: e.name,
        districtCode: e.districtCode,
        score,
        exact,
      };
    })
    .filter((m) => m.exact || m.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

/**
 * Lookup abstraction. Implement against the backend API (web) or IndexedDB
 * (offline PWA); both should delegate ranking to `rankDuplicates`.
 */
export interface DuplicateChecker {
  findMatches(candidate: ActorIdentity): Promise<DuplicateMatch[]>;
}

/** In-memory checker over a known list — used in tests and early development. */
export class InMemoryDuplicateChecker implements DuplicateChecker {
  constructor(private readonly records: DuplicateCandidate[]) {}

  async findMatches(candidate: ActorIdentity): Promise<DuplicateMatch[]> {
    return rankDuplicates(candidate, this.records);
  }
}
