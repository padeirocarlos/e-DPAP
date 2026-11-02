import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, type LocalActor } from "@/db/db";
import type { Actor, ActorWriteModel, Paginated } from "@/api/types";

vi.mock("@/api/actors", () => ({ listChanges: vi.fn() }));
import { listChanges } from "@/api/actors";
import { pullChanges } from "@/sync/pull";

const mockList = vi.mocked(listChanges);

const WRITE: ActorWriteModel = {
  name: "Ator Central",
  actorType: "PRODUCER",
  legalStatus: "INDIVIDUAL",
  sector: "AGRICULTURE",
  districtCode: "BOA",
  administrativePostCode: "BOA-SED",
  latitude: -26.04,
  longitude: 32.33,
};

function serverActor(over: Partial<Actor> = {}): Actor {
  return {
    ...WRITE,
    id: "S1",
    version: 2,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
    ...over,
  };
}

function page(items: Actor[], over: Partial<Paginated<Actor>> = {}): Paginated<Actor> {
  return { items, page: 1, pageSize: 200, total: items.length, ...over };
}

beforeEach(async () => {
  vi.clearAllMocks();
  await db.actors.clear();
  await db.outbox.clear();
  await db.meta.clear();
});

describe("pullChanges", () => {
  it("inserts new server records as SYNCED keyed by server id", async () => {
    mockList.mockResolvedValue(page([serverActor({ id: "S1" }), serverActor({ id: "S2" })]));

    const summary = await pullChanges();

    expect(summary.pulled).toBe(2);
    const a = await db.actors.get("S1");
    expect(a?.serverId).toBe("S1");
    expect(a?.syncStatus).toBe("SYNCED");
    expect(a?.version).toBe(2);
  });

  it("advances the watermark and sends it as `since` next time", async () => {
    mockList.mockResolvedValueOnce(
      page([serverActor({ id: "S1", updatedAt: "2026-02-01T10:00:00.000Z" })]),
    );
    await pullChanges();
    expect(await db.meta.get("pullSince")).toMatchObject({ value: "2026-02-01T10:00:00.000Z" });

    mockList.mockResolvedValueOnce(page([]));
    await pullChanges();
    expect(mockList.mock.calls[1][0].since).toBe("2026-02-01T10:00:00.000Z");
  });

  it("updates an existing SYNCED local record", async () => {
    await db.actors.put({
      ...WRITE,
      localId: "S1",
      serverId: "S1",
      version: 2,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-02-01T10:00:00.000Z",
      syncStatus: "SYNCED",
    } satisfies LocalActor);
    mockList.mockResolvedValue(
      page([serverActor({ id: "S1", version: 3, name: "Nome Atualizado", updatedAt: "2026-03-01T10:00:00.000Z" })]),
    );

    const summary = await pullChanges();

    expect(summary.pulled).toBe(1);
    const a = await db.actors.get("S1");
    expect(a?.name).toBe("Nome Atualizado");
    expect(a?.version).toBe(3);
  });

  it("does NOT clobber a record with un-synced local work", async () => {
    await db.actors.put({
      ...WRITE,
      localId: "S1",
      serverId: "S1",
      version: 2,
      createdAt: "2026-01-01T10:00:00.000Z",
      updatedAt: "2026-02-10T10:00:00.000Z",
      syncStatus: "PENDING",
      name: "Edição Local Não Sincronizada",
    } satisfies LocalActor);
    mockList.mockResolvedValue(
      page([serverActor({ id: "S1", name: "Versão do Servidor", updatedAt: "2026-03-01T10:00:00.000Z" })]),
    );

    const summary = await pullChanges();

    expect(summary.skipped).toBe(1);
    expect(summary.pulled).toBe(0);
    expect((await db.actors.get("S1"))?.name).toBe("Edição Local Não Sincronizada");
  });

  it("loops across pages until all records are received", async () => {
    mockList
      .mockResolvedValueOnce(page([serverActor({ id: "S1" })], { page: 1, pageSize: 1, total: 2 }))
      .mockResolvedValueOnce(page([serverActor({ id: "S2" })], { page: 2, pageSize: 1, total: 2 }));

    const summary = await pullChanges();

    expect(summary.pulled).toBe(2);
    expect(mockList).toHaveBeenCalledTimes(2);
    expect(await db.actors.count()).toBe(2);
  });
});
