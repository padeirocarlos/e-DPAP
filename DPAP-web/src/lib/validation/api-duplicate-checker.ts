/**
 * Backend-backed duplicate checker.
 *
 * Queries the actors endpoint for candidates in the same district, then reuses
 * `rankDuplicates` for the fuzzy ranking so the web and offline implementations
 * score identically.
 *
 * Fails soft on connectivity errors (returns no matches) so the form stays
 * usable when the backend is unreachable — a create attempt will still surface
 * the real error, and the server enforces uniqueness authoritatively.
 */

import {
  rankDuplicates,
  type ActorIdentity,
  type DuplicateChecker,
  type DuplicateMatch,
} from "@/lib/validation/duplicate";
import { searchActorCandidates } from "@/lib/api/actors";
import { ApiError } from "@/lib/api/http";

export class ApiDuplicateChecker implements DuplicateChecker {
  async findMatches(candidate: ActorIdentity): Promise<DuplicateMatch[]> {
    try {
      const candidates = await searchActorCandidates({
        name: candidate.name,
        districtCode: candidate.districtCode,
      });
      return rankDuplicates(candidate, candidates);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.code === "NETWORK" || err.code === "TIMEOUT")
      ) {
        return [];
      }
      throw err;
    }
  }
}
