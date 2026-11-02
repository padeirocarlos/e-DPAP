import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import {
  saveNewActor,
  updateLocalActor,
  deleteLocalActor,
  findLocalDuplicates,
} from "@/db/actors-repo";
import type { ActorWriteModel } from "@/api/types";

const WRITE: ActorWriteModel = {
  name: "Quinta Verde",
  actorType: "PRODUCER",
  legalStatus: "INDIVIDUAL",
  sector: "AGRICULTURE",
  districtCode: "BOA",
  administrativePostCode: "BOA-SED",
  latitude: -26.04,
  longitude: 32.33,
};

beforeEach(async () => {
  await db.actors.clear();
  await db.outbox.clear();
  await db.meta.clear();
});

describe("saveNewActor", () => {
  it("stores a PENDING record and queues one CREATE op", async () => {
    const actor = await saveNewActor(WRITE);
    expect(actor.syncStatus).toBe("PENDING");
    expect(actor.version).toBe(0);
    const ops = await db.outbox.toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe("CREATE");
  });

  it("captures GPS metadata when provided", async () => {
    const actor = await saveNewActor(WRITE, {
      latitude: -26.0,
      longitude: 32.3,
      accuracy: 8,
      capturedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(actor.gpsAccuracy).toBe(8);
    expect(actor.gpsCapturedAt).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("outbox folding", () => {
  it("folds an edit made before first sync into the pending CREATE", async () => {
    const actor = await saveNewActor(WRITE);
    await updateLocalActor(actor.localId, { ...WRITE, name: "Quinta Verde Lda" });

    const ops = await db.outbox.where("localId").equals(actor.localId).toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe("CREATE");
    expect((await db.actors.get(actor.localId))?.name).toBe("Quinta Verde Lda");
  });

  it("deleting an unsynced record removes it with no queued op", async () => {
    const actor = await saveNewActor(WRITE);
    await deleteLocalActor(actor.localId);

    expect(await db.actors.get(actor.localId)).toBeUndefined();
    expect(await db.outbox.count()).toBe(0);
  });

  it("deleting a synced record queues a DELETE and keeps the row until confirmed", async () => {
    const actor = await saveNewActor(WRITE);
    // Simulate a prior successful sync.
    await db.actors.update(actor.localId, { serverId: "S1", syncStatus: "SYNCED" });
    await db.outbox.clear();

    await deleteLocalActor(actor.localId);

    const ops = await db.outbox.where("localId").equals(actor.localId).toArray();
    expect(ops).toHaveLength(1);
    expect(ops[0].op).toBe("DELETE");
    expect(ops[0].serverId).toBe("S1");
    expect(await db.actors.get(actor.localId)).toBeDefined();
  });
});

describe("findLocalDuplicates", () => {
  it("flags an exact identity match", async () => {
    await saveNewActor(WRITE);
    const matches = await findLocalDuplicates({
      name: "Quinta Verde",
      districtCode: "BOA",
      actorType: "PRODUCER",
    });
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].exact).toBe(true);
  });

  it("warns on a near-match name typo in the same district", async () => {
    await saveNewActor(WRITE);
    const matches = await findLocalDuplicates({
      name: "Quinta Verd", // typo
      districtCode: "BOA",
      actorType: "PRODUCER",
    });
    expect(matches.length).toBeGreaterThan(0);
  });

  it("ignores records in a different district", async () => {
    await saveNewActor(WRITE);
    const matches = await findLocalDuplicates({
      name: "Quinta Verde",
      districtCode: "MAN",
      actorType: "PRODUCER",
    });
    expect(matches).toHaveLength(0);
  });

  it("excludes the record being edited", async () => {
    const actor = await saveNewActor(WRITE);
    const matches = await findLocalDuplicates(
      { name: "Quinta Verde", districtCode: "BOA", actorType: "PRODUCER" },
      actor.localId,
    );
    expect(matches).toHaveLength(0);
  });
});
