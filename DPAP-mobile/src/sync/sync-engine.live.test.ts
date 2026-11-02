/**
 * Live integration test: runs the real sync engine against a running DPAP-api.
 *
 * Opt-in — skipped unless `DPAP_LIVE=1` and the backend is up at
 * `VITE_API_BASE_URL` (default http://localhost:8080/api). It exercises the full
 * local-first path (repo write → outbox → engine push) against real HTTP +
 * PostGIS, covering create, update (version bump) and delete, each verified by
 * reading the record back from the server.
 *
 *   cd DPAP-api && docker compose up --build -d
 *   cd DPAP-mobile && npm run test:live
 */

import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db/db";
import { login } from "@/api/auth";
import { getActor } from "@/api/actors";
import { ApiError } from "@/api/http";
import { saveNewActor, updateLocalActor, deleteLocalActor } from "@/db/actors-repo";
import { runSync } from "@/sync/engine";
import { pullChanges } from "@/sync/pull";
import type { ActorWriteModel } from "@/api/types";

const LIVE = process.env.DPAP_LIVE === "1";

describe.skipIf(!LIVE)("sync engine against the live backend", () => {
  let token = "";
  // Unique name per run so the backend's duplicate guard doesn't reject it.
  const stamp = Date.now();
  const write: ActorWriteModel = {
    name: `Ator de Integração ${stamp}`,
    actorType: "PRODUCER",
    legalStatus: "INDIVIDUAL",
    sector: "AGRICULTURE",
    districtCode: "BOA",
    administrativePostCode: "BOA-SED",
    latitude: -26.04,
    longitude: 32.33,
    responsiblePerson: "Teste",
  };
  let localId = "";
  let serverId = "";

  beforeAll(async () => {
    await db.actors.clear();
    await db.outbox.clear();
    const res = await login("admin@dpap.gov.mz", "dpap2024");
    token = res.token;
    expect(token.length).toBeGreaterThan(10);
  });

  it("pushes a new offline record to the server (CREATE)", async () => {
    const actor = await saveNewActor(write);
    localId = actor.localId;

    const summary = await runSync({ token });
    expect(summary.ok).toBe(1);

    const saved = await db.actors.get(localId);
    expect(saved?.syncStatus).toBe("SYNCED");
    expect(saved?.serverId).toBeTruthy();
    serverId = saved!.serverId!;

    const onServer = await getActor(serverId, token);
    expect(onServer.name).toBe(write.name);
    // Hibernate @Version starts at 0 on insert — matches the client's default.
    expect(typeof onServer.version).toBe("number");
    expect(onServer.version).toBe(saved?.version);
  });

  it("pushes an edit and bumps the server version (UPDATE)", async () => {
    const before = await db.actors.get(localId);
    const newName = `${write.name} (editado)`;
    await updateLocalActor(localId, { ...write, name: newName });

    const summary = await runSync({ token });
    expect(summary.ok + summary.conflicts).toBeGreaterThanOrEqual(1);

    const onServer = await getActor(serverId, token);
    expect(onServer.name).toBe(newName);
    expect(onServer.version).toBeGreaterThan(before!.version);
  });

  it("pushes a delete and the record is gone server-side (DELETE)", async () => {
    await deleteLocalActor(localId);

    const summary = await runSync({ token });
    expect(summary.ok).toBe(1);
    expect(await db.actors.get(localId)).toBeUndefined();

    await expect(getActor(serverId, token)).rejects.toSatisfy(
      (e: unknown) => e instanceof ApiError && e.code === "NOT_FOUND",
    );
  });

  it("pulls the central registry into the local store (server → device)", async () => {
    await db.actors.clear();
    await db.meta.clear();

    const summary = await pullChanges({ token });

    expect(summary.pulled).toBeGreaterThanOrEqual(1); // seeded actors
    const all = await db.actors.toArray();
    expect(all.length).toBe(summary.pulled);
    expect(all.every((a) => a.syncStatus === "SYNCED" && a.serverId)).toBe(true);
    // A second pull with the stored watermark transfers nothing new.
    const second = await pullChanges({ token });
    expect(second.pulled).toBe(0);
  });
});
