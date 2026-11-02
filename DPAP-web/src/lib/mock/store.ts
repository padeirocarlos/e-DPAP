/**
 * In-memory mock data store for the dev backend.
 *
 * DEV-ONLY. Backs the `/api/*` route handlers so the whole app works end-to-end
 * without the real Spring Boot backend. State lives in the server process
 * (reset on restart) and is kept on `globalThis` so it survives HMR in dev.
 *
 * The store mirrors the real API's contract (sync envelope, pagination,
 * optimistic-concurrency versioning) so swapping in the real backend needs no
 * client changes.
 */

import { randomUUID } from "node:crypto";
import { appConfig } from "@/config/app.config";
import { identityKey } from "@/lib/validation/duplicate";
import type {
  Actor,
  ActorSummary,
  ActorFilters,
  ActorWriteModel,
  Paginated,
  DashboardStats,
  CountByCode,
} from "@/lib/api/types";

export type CreateResult =
  | { ok: true; actor: Actor }
  | { ok: false; reason: "DUPLICATE" };

export type UpdateResult =
  | { ok: true; actor: Actor }
  | { ok: false; reason: "NOT_FOUND" | "STALE" };

type Store = { actors: Map<string, Actor> };

function nowIso(): string {
  return new Date().toISOString();
}

function seedActor(
  partial: Omit<ActorWriteModel, "registrationNumber"> & {
    registrationNumber?: string;
  },
  daysAgo: number,
): Actor {
  const ts = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    id: randomUUID(),
    version: 1,
    createdAt: ts,
    updatedAt: ts,
    syncStatus: "SYNCED",
    ...partial,
  };
}

function createSeed(): Store {
  const actors = new Map<string, Actor>();
  const seeds: Array<Parameters<typeof seedActor>> = [
    [
      {
        name: "Associação Agrícola de Boane",
        registrationNumber: "AG-BOA-001",
        actorType: "PRODUCER_ASSOCIATION",
        legalStatus: "ASSOCIATION",
        sector: "AGRICULTURE",
        districtCode: "BOA",
        administrativePostCode: "BOA-SED",
        latitude: -26.04,
        longitude: 32.33,
        responsiblePerson: "Ana Mondlane",
        phone: "+258841234567",
        email: "boane.agricola@example.mz",
      },
      40,
    ],
    [
      {
        name: "Cooperativa de Pescadores da Manhiça",
        registrationNumber: "PE-MAN-014",
        actorType: "FISHERIES_ACTOR",
        legalStatus: "COOPERATIVE",
        sector: "FISHERIES",
        districtCode: "MAN",
        administrativePostCode: "MAN-SED",
        latitude: -25.4,
        longitude: 32.8,
        responsiblePerson: "João Sitoe",
        phone: "+258821112233",
      },
      32,
    ],
    [
      {
        name: "Fazenda Pecuária Namaacha",
        actorType: "LIVESTOCK_PRODUCER",
        legalStatus: "COMPANY",
        sector: "LIVESTOCK",
        districtCode: "NAM",
        administrativePostCode: "NAM-SED",
        latitude: -26.02,
        longitude: 32.02,
        responsiblePerson: "Carla Nhaca",
        phone: "+258843334455",
        email: "fazenda.namaacha@example.mz",
      },
      25,
    ],
    [
      {
        name: "Aquacultura Marracuene Lda",
        registrationNumber: "AQ-MAR-007",
        actorType: "AQUACULTURE_ACTOR",
        legalStatus: "COMPANY",
        sector: "AQUACULTURE",
        districtCode: "MAR",
        administrativePostCode: "MAR-SED",
        latitude: -25.74,
        longitude: 32.67,
        responsiblePerson: "Paulo Macie",
        phone: "+258845556677",
        email: "aqua.marracuene@example.mz",
      },
      20,
    ],
    [
      {
        name: "Produtores de Hortícolas de Moamba",
        actorType: "PRODUCER",
        legalStatus: "INDIVIDUAL",
        sector: "AGRICULTURE",
        districtCode: "MOA",
        administrativePostCode: "MOA-SED",
        latitude: -25.6,
        longitude: 32.24,
        responsiblePerson: "Rosa Chissano",
      },
      14,
    ],
    [
      {
        name: "ONG Desenvolvimento Rural de Magude",
        registrationNumber: "NGO-MAG-003",
        actorType: "NGO",
        legalStatus: "NGO",
        sector: "AGRICULTURE",
        districtCode: "MAG",
        administrativePostCode: "MAG-SED",
        latitude: -25.02,
        longitude: 32.65,
        responsiblePerson: "Miguel Tembe",
        phone: "+258846667788",
        email: "ong.magude@example.mz",
      },
      10,
    ],
    [
      {
        name: "Instituto de Investigação Agrária de Matutuíne",
        actorType: "RESEARCH_INSTITUTION",
        legalStatus: "PUBLIC",
        sector: "AGRICULTURE",
        districtCode: "MAT",
        administrativePostCode: "MAT-SED",
        latitude: -26.32,
        longitude: 32.67,
        responsiblePerson: "Teresa Cossa",
        phone: "+258847778899",
      },
      6,
    ],
    [
      {
        name: "Empresa Pesqueira de Matutuíne",
        registrationNumber: "PE-MAT-021",
        actorType: "PRIVATE_COMPANY",
        legalStatus: "COMPANY",
        sector: "FISHERIES",
        districtCode: "MAT",
        administrativePostCode: "MAT-ZIT",
        latitude: -26.73,
        longitude: 32.88,
        responsiblePerson: "Fernando Guambe",
        phone: "+258848889900",
        email: "pesqueira.matutuine@example.mz",
      },
      3,
    ],
  ];

  for (const [partial, daysAgo] of seeds) {
    const actor = seedActor(partial, daysAgo);
    actors.set(actor.id, actor);
  }
  return { actors };
}

// Survive HMR in dev by stashing the store on globalThis.
const globalRef = globalThis as unknown as { __dpapMockStore?: Store };
const store: Store = (globalRef.__dpapMockStore ??= createSeed());

function toSummary(a: Actor): ActorSummary {
  return {
    id: a.id,
    name: a.name,
    actorType: a.actorType,
    sector: a.sector,
    districtCode: a.districtCode,
    latitude: a.latitude,
    longitude: a.longitude,
    updatedAt: a.updatedAt,
  };
}

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function listActors(filters: ActorFilters): Paginated<ActorSummary> {
  const all = [...store.actors.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );

  const q = filters.q ? normalize(filters.q) : undefined;
  const filtered = all.filter((a) => {
    if (q && !normalize(a.name).includes(q)) return false;
    if (filters.districtCode && a.districtCode !== filters.districtCode) return false;
    if (filters.sector && a.sector !== filters.sector) return false;
    if (filters.actorType && a.actorType !== filters.actorType) return false;
    if (filters.legalStatus && a.legalStatus !== filters.legalStatus) return false;
    return true;
  });

  const pageSize = filters.pageSize ?? appConfig.pagination.defaultPageSize;
  const page = filters.page ?? 1;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(toSummary);

  return { items, page, pageSize, total: filtered.length };
}

export function getActor(id: string): Actor | undefined {
  return store.actors.get(id);
}

/**
 * Full (unpaginated) actor records matching the filters, newest first — the
 * data source for report exports. Mirrors the backend `findForExport`.
 */
export function exportActors(filters: ActorFilters): Actor[] {
  const q = filters.q ? normalize(filters.q) : undefined;
  return [...store.actors.values()]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((a) => {
      if (q && !normalize(a.name).includes(q)) return false;
      if (filters.districtCode && a.districtCode !== filters.districtCode) return false;
      if (filters.sector && a.sector !== filters.sector) return false;
      if (filters.actorType && a.actorType !== filters.actorType) return false;
      if (filters.legalStatus && a.legalStatus !== filters.legalStatus) return false;
      return true;
    });
}

export function createActor(input: ActorWriteModel): CreateResult {
  const key = identityKey({
    name: input.name,
    districtCode: input.districtCode,
    actorType: input.actorType,
    registrationNumber: input.registrationNumber,
  });
  for (const existing of store.actors.values()) {
    const existingKey = identityKey({
      name: existing.name,
      districtCode: existing.districtCode,
      actorType: existing.actorType,
      registrationNumber: existing.registrationNumber,
    });
    if (existingKey === key) return { ok: false, reason: "DUPLICATE" };
  }

  const ts = nowIso();
  const actor: Actor = {
    id: randomUUID(),
    version: 1,
    createdAt: ts,
    updatedAt: ts,
    syncStatus: "SYNCED",
    ...input,
  };
  store.actors.set(actor.id, actor);
  return { ok: true, actor };
}

export function updateActor(
  id: string,
  input: ActorWriteModel,
  version: number,
): UpdateResult {
  const existing = store.actors.get(id);
  if (!existing) return { ok: false, reason: "NOT_FOUND" };
  if (existing.version !== version) return { ok: false, reason: "STALE" };

  const updated: Actor = {
    ...existing,
    ...input,
    id: existing.id,
    version: existing.version + 1,
    createdAt: existing.createdAt,
    updatedAt: nowIso(),
    syncStatus: "SYNCED",
  };
  store.actors.set(id, updated);
  return { ok: true, actor: updated };
}

export function deleteActor(id: string): boolean {
  return store.actors.delete(id);
}

function countBy(key: (a: Actor) => string): CountByCode[] {
  const counts = new Map<string, number>();
  for (const a of store.actors.values()) {
    const k = key(a);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count);
}

export function dashboardStats(): DashboardStats {
  const actors = [...store.actors.values()];

  const trend = new Map<string, number>();
  for (const a of actors) {
    const period = a.createdAt.slice(0, 7); // YYYY-MM
    trend.set(period, (trend.get(period) ?? 0) + 1);
  }

  const keyFields: (keyof Actor)[] = [
    "registrationNumber",
    "responsiblePerson",
    "phone",
    "email",
  ];
  const completeCount = actors.filter((a) =>
    keyFields.every((f) => Boolean(a[f])),
  ).length;

  return {
    totalActors: actors.length,
    byDistrict: countBy((a) => a.districtCode),
    bySector: countBy((a) => a.sector),
    byType: countBy((a) => a.actorType),
    registrationTrend: [...trend.entries()]
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period)),
    completeness: actors.length === 0 ? 0 : completeCount / actors.length,
    sync: { pending: 0, conflicts: 0, lastSyncAt: nowIso() },
  };
}
