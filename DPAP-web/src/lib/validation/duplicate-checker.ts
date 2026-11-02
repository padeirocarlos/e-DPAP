/**
 * Active duplicate checker.
 *
 * The web app checks duplicates against the backend. The offline PWA will swap
 * in an IndexedDB-backed checker; both reuse `rankDuplicates`. A seeded
 * in-memory checker is also exported for tests and local development without a
 * backend.
 */

import type { DuplicateChecker } from "@/lib/validation/duplicate";
import { ApiDuplicateChecker } from "@/lib/validation/api-duplicate-checker";
import {
  InMemoryDuplicateChecker,
  type DuplicateCandidate,
} from "@/lib/validation/duplicate";

export const defaultChecker: DuplicateChecker = new ApiDuplicateChecker();

/** Seed data for tests / offline development. */
export const SEED_ACTORS: DuplicateCandidate[] = [
  {
    id: "seed-1",
    name: "Associação Agrícola de Boane",
    districtCode: "BOA",
    actorType: "PRODUCER_ASSOCIATION",
  },
  {
    id: "seed-2",
    name: "Cooperativa de Pescadores da Manhiça",
    districtCode: "MAN",
    actorType: "FISHERIES_ACTOR",
  },
];

export const seededChecker = new InMemoryDuplicateChecker(SEED_ACTORS);
