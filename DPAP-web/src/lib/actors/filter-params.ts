/**
 * Actor list filter <-> URL search params.
 *
 * One source of truth for the query-string keys and how they parse into
 * `ActorFilters`, shared by the server table (reads them) and the client filter
 * form (writes them). Unknown codes are dropped so a hand-edited URL can't send
 * garbage to the API.
 */

import {
  SECTOR_CODES,
  ACTOR_TYPE_CODES,
  type SectorCode,
  type ActorTypeCode,
} from "@/lib/domain/enums";
import { DISTRICT_BY_CODE } from "@/lib/domain/location";
import type { ActorFilters } from "@/lib/api/types";

export const FILTER_KEYS = {
  q: "q",
  district: "distrito",
  sector: "setor",
  type: "tipo",
} as const;

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseActorFilters(sp: SearchParams): ActorFilters {
  const q = first(sp[FILTER_KEYS.q])?.trim() || undefined;

  const d = first(sp[FILTER_KEYS.district]);
  const districtCode = d && DISTRICT_BY_CODE.has(d) ? d : undefined;

  const s = first(sp[FILTER_KEYS.sector]);
  const sector =
    s && (SECTOR_CODES as string[]).includes(s) ? (s as SectorCode) : undefined;

  const t = first(sp[FILTER_KEYS.type]);
  const actorType =
    t && (ACTOR_TYPE_CODES as string[]).includes(t)
      ? (t as ActorTypeCode)
      : undefined;

  return { q, districtCode, sector, actorType };
}

export function hasActiveFilters(f: ActorFilters): boolean {
  return Boolean(f.q || f.districtCode || f.sector || f.actorType);
}
