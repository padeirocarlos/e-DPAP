/**
 * Duplicate-avoidance for actor registration (shared logic with DPAP-web).
 *
 * Two layers: a deterministic *identity key* (normalized name + district +
 * type, or registration number when present) blocks exact duplicates, and a
 * fuzzy *similarity* score warns about near-matches (typos, spacing, accents).
 * On the field device the lookup runs against the local IndexedDB store.
 */

import type { ActorTypeCode } from "@/domain/enums";

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
  score: number;
  exact: boolean;
};

export const SIMILARITY_THRESHOLD = 0.82;

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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
      return { id: e.id, name: e.name, districtCode: e.districtCode, score, exact };
    })
    .filter((m) => m.exact || m.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}
