"use server";

/**
 * Dashboard drill-down. When a category (district / sector / type) is clicked,
 * the client calls this to fetch the actors in that category inline. Re-verifies
 * the session and uses the server-side token (the httpOnly cookie never reaches
 * client fetch).
 */

import { getActiveSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listActors } from "@/lib/api/actors";
import type { ActorSummary, ActorFilters } from "@/lib/api/types";
import type { SectorCode, ActorTypeCode } from "@/lib/domain/enums";

export type DrilldownKind = "district" | "sector" | "type";

export type DrilldownResult =
  | { ok: true; items: ActorSummary[]; total: number }
  | { ok: false };

const PREVIEW_SIZE = 6;

export async function drilldownActorsAction(
  kind: DrilldownKind,
  code: string,
): Promise<DrilldownResult> {
  const session = await getActiveSession();
  if (!session || !can(session.user.role, "actors:read")) return { ok: false };

  const filters: ActorFilters = { pageSize: PREVIEW_SIZE };
  if (kind === "district") filters.districtCode = code;
  else if (kind === "sector") filters.sector = code as SectorCode;
  else filters.actorType = code as ActorTypeCode;

  try {
    const res = await listActors(filters, { token: session.apiToken });
    return { ok: true, items: res.items, total: res.total };
  } catch {
    return { ok: false };
  }
}
