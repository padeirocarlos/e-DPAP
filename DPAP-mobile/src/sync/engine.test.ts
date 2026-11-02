import { beforeEach, describe, expect, it, vi } from "vitest";
import { db, type LocalActor } from "@/db/db";
import { ApiError } from "@/api/http";
import type { Actor, ActorWriteModel } from "@/api/types";

// Mock the network layer; the engine logic is what we exercise.
vi.mock("@/api/actors", () => ({
  createActor: vi.fn(),
  updateActor: vi.fn(),
  deleteActor: vi.fn(),
  getActor: vi.fn(),
}));

import { createActor, updateActor, deleteActor, getActor } from "@/api/actors";
import { runSync } from "@/sync/engine";

const mockCreate = vi.mocked(createActor);
const mockUpdate = vi.mocked(updateActor);
const mockDelete = vi.mocked(deleteActor);
const mockGet = vi.mocked(getActor);

const WRITE: ActorWriteModel = {
  name: "Associação de Teste",
  actorType: "PRODUCER_ASSOCIATION",
  legalStatus: "ASSOCIATION",
  sector: "AGRICULTURE",
  districtCode: "BOA",
  administrativePostCode: "BOA-SED",
  latitude: -26.04,
  longitude: 32.33,
};

function localActor(over: Partial<LocalActor> = {}): LocalActor {
  const ts = "2026-01-01T10:00:00.000Z";
  return {
    ...WRITE,
    localId: "L1",
    version: 0,
    createdAt: ts,
    updatedAt: ts,
    syncStatus: "PENDING",
    ...over,
  };
}

function serverActor(over: Partial<Actor> = {}): Actor {
  return {
    ...WRITE,
    id: "S1",
    version: 1,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...over,
  };
}

async function queue(localId: string, op: "CREATE" | "UPDATE" | "DELETE", serverId?: string) {
  await db.outbox.add({ localId, op, serverId, createdAt: "t", attempts: 0 });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await db.actors.clear();
  await db.outbox.clear();
  await db.meta.clear();
});

describe("runSync — CREATE", () => {
  it("marks the record SYNCED and drains the outbox on success", async () => {
    await db.actors.put(localActor());
    await queue("L1", "CREATE");
    mockCreate.mockResolvedValue(serverActor({ id: "S1", version: 1 }));

    const summary = await runSync();

    expect(summary).toMatchObject({ ok: 1, conflicts: 0, failed: 0, offline: false });
    const saved = await db.actors.get("L1");
    expect(saved?.syncStatus).toBe("SYNCED");
    expect(saved?.serverId).toBe("S1");
    expect(saved?.version).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });

  it("flags a duplicate (409) as CONFLICT and drops the op", async () => {
    await db.actors.put(localActor());
    await queue("L1", "CREATE");
    mockCreate.mockRejectedValue(new ApiError("CONFLICT", "Duplicate actor", 409));

    const summary = await runSync();

    expect(summary.conflicts).toBe(1);
    const saved = await db.actors.get("L1");
    expect(saved?.syncStatus).toBe("CONFLICT");
    expect(saved?.syncError).toContain("Duplicate");
    expect(await db.outbox.count()).toBe(0);
  });

  it("aborts and keeps the op queued when offline", async () => {
    await db.actors.put(localActor());
    await queue("L1", "CREATE");
    mockCreate.mockRejectedValue(new ApiError("NETWORK", "Network request failed"));

    const summary = await runSync();

    expect(summary.offline).toBe(true);
    expect(summary.ok).toBe(0);
    const saved = await db.actors.get("L1");
    expect(saved?.syncStatus).toBe("PENDING");
    expect(await db.outbox.count()).toBe(1);
  });
});

describe("runSync — UPDATE with conflict resolution", () => {
  const synced = () =>
    localActor({
      serverId: "S1",
      version: 3,
      syncStatus: "PENDING",
      updatedAt: "2026-02-01T10:00:00.000Z",
      name: "Nome Editado Localmente",
    });

  it("sends version and marks SYNCED on success", async () => {
    await db.actors.put(synced());
    await queue("L1", "UPDATE", "S1");
    mockUpdate.mockResolvedValue(serverActor({ id: "S1", version: 4 }));

    const summary = await runSync();

    expect(summary.ok).toBe(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][2]).toBe(3); // version sent
    expect((await db.actors.get("L1"))?.version).toBe(4);
  });

  it("stale (409): server newer → server wins, local edit discarded", async () => {
    await db.actors.put(synced()); // local updatedAt 2026-02-01
    await queue("L1", "UPDATE", "S1");
    mockUpdate.mockRejectedValueOnce(new ApiError("CONFLICT", "stale", 409));
    mockGet.mockResolvedValue(
      serverActor({ id: "S1", version: 9, name: "Nome do Servidor", updatedAt: "2026-03-01T10:00:00.000Z" }),
    );

    const summary = await runSync();

    expect(summary.conflicts).toBe(1);
    expect(mockUpdate).toHaveBeenCalledTimes(1); // no retry — server won
    const saved = await db.actors.get("L1");
    expect(saved?.name).toBe("Nome do Servidor");
    expect(saved?.version).toBe(9);
    expect(saved?.syncStatus).toBe("SYNCED");
  });

  it("stale (409): local newer → retry once with the server version", async () => {
    await db.actors.put(synced()); // local updatedAt 2026-02-01
    await queue("L1", "UPDATE", "S1");
    mockUpdate
      .mockRejectedValueOnce(new ApiError("CONFLICT", "stale", 409))
      .mockResolvedValueOnce(serverActor({ id: "S1", version: 6, name: "Nome Editado Localmente" }));
    mockGet.mockResolvedValue(
      serverActor({ id: "S1", version: 5, updatedAt: "2026-01-15T10:00:00.000Z" }),
    );

    const summary = await runSync();

    expect(summary.conflicts).toBe(1);
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate.mock.calls[1][2]).toBe(5); // retried with server version
    const saved = await db.actors.get("L1");
    expect(saved?.version).toBe(6);
    expect(saved?.syncStatus).toBe("SYNCED");
  });
});

describe("runSync — DELETE", () => {
  it("removes the row after a server delete", async () => {
    await db.actors.put(localActor({ serverId: "S1", syncStatus: "SYNCED" }));
    await queue("L1", "DELETE", "S1");
    mockDelete.mockResolvedValue(undefined);

    const summary = await runSync();

    expect(summary.ok).toBe(1);
    expect(mockDelete).toHaveBeenCalledWith("S1", undefined);
    expect(await db.actors.get("L1")).toBeUndefined();
    expect(await db.outbox.count()).toBe(0);
  });

  it("treats a 404 as already deleted", async () => {
    await db.actors.put(localActor({ serverId: "S1", syncStatus: "SYNCED" }));
    await queue("L1", "DELETE", "S1");
    mockDelete.mockRejectedValue(new ApiError("NOT_FOUND", "gone", 404));

    const summary = await runSync();

    expect(summary.ok).toBe(1);
    expect(await db.actors.get("L1")).toBeUndefined();
  });
});

describe("runSync — token threading", () => {
  it("passes an explicit token to the API (Background Sync path)", async () => {
    await db.actors.put(localActor());
    await queue("L1", "CREATE");
    mockCreate.mockResolvedValue(serverActor());

    await runSync({ token: "sw-token" });

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Object), "sw-token");
  });
});

describe("runSync — ordering", () => {
  it("processes queued ops in sequence order", async () => {
    await db.actors.put(localActor({ localId: "A" }));
    await db.actors.put(localActor({ localId: "B" }));
    await queue("A", "CREATE");
    await queue("B", "CREATE");
    const order: string[] = [];
    mockCreate.mockImplementation(async (model) => {
      order.push((model as ActorWriteModel).name);
      return serverActor();
    });
    // Distinguish the two by name.
    await db.actors.update("A", { name: "Primeiro" });
    await db.actors.update("B", { name: "Segundo" });

    await runSync();

    expect(order).toEqual(["Primeiro", "Segundo"]);
    expect(await db.outbox.count()).toBe(0);
  });
});
