/**
 * Local actor repository: all writes land in IndexedDB first (local-first) and
 * are queued in the outbox for later sync. The outbox is deduplicated to at
 * most one pending op per record, and the sync engine reads the *current* row
 * at push time — so edits made before a record ever syncs are folded into its
 * pending CREATE rather than producing a second request.
 *
 * Outbox folding rules:
 *  - CREATE then edit (unsynced)   → keep CREATE (it sends the latest data)
 *  - CREATE then delete (unsynced) → drop the CREATE and the row (never existed server-side)
 *  - SYNCED then edit              → queue UPDATE
 *  - SYNCED then delete            → queue DELETE (row kept until the server confirms)
 */

import { db, type LocalActor } from "@/db/db";
import { requestBackgroundSync } from "@/sync/background-sync";
import type { ActorWriteModel } from "@/api/types";
import type { GpsFix } from "@/lib/gps";
import {
  rankDuplicates,
  type ActorIdentity,
  type DuplicateCandidate,
  type DuplicateMatch,
} from "@/lib/duplicate";

function uuid(): string {
  return crypto.randomUUID();
}

function nowIso(): string {
  return new Date().toISOString();
}

/** Create a new actor locally and queue it for sync. */
export async function saveNewActor(
  input: ActorWriteModel,
  gps?: GpsFix,
): Promise<LocalActor> {
  const ts = nowIso();
  const actor: LocalActor = {
    ...input,
    localId: uuid(),
    version: 0,
    createdAt: ts,
    updatedAt: ts,
    syncStatus: "PENDING",
    gpsAccuracy: gps?.accuracy,
    gpsCapturedAt: gps?.capturedAt,
  };
  await db.transaction("rw", db.actors, db.outbox, async () => {
    await db.actors.put(actor);
    await db.outbox.add({
      localId: actor.localId,
      op: "CREATE",
      createdAt: ts,
      attempts: 0,
    });
  });
  void requestBackgroundSync();
  return actor;
}

/** Update an existing local actor and queue the change. */
export async function updateLocalActor(
  localId: string,
  input: ActorWriteModel,
  gps?: GpsFix,
): Promise<LocalActor | undefined> {
  return db.transaction("rw", db.actors, db.outbox, async () => {
    const existing = await db.actors.get(localId);
    if (!existing) return undefined;

    const updated: LocalActor = {
      ...existing,
      ...input,
      localId: existing.localId,
      serverId: existing.serverId,
      version: existing.version,
      createdAt: existing.createdAt,
      updatedAt: nowIso(),
      syncStatus: "PENDING",
      syncError: undefined,
      gpsAccuracy: gps?.accuracy ?? existing.gpsAccuracy,
      gpsCapturedAt: gps?.capturedAt ?? existing.gpsCapturedAt,
    };
    await db.actors.put(updated);

    const queued = await db.outbox.where("localId").equals(localId).toArray();
    const hasCreateOrUpdate = queued.some((q) => q.op === "CREATE" || q.op === "UPDATE");
    // Only queue an UPDATE if nothing already covers this record; the engine
    // reads the latest row at push time, so one pending op is enough.
    if (!hasCreateOrUpdate) {
      await db.outbox.add({
        localId,
        op: "UPDATE",
        serverId: existing.serverId,
        createdAt: nowIso(),
        attempts: 0,
      });
    }
    return updated;
  }).then((result) => {
    void requestBackgroundSync();
    return result;
  });
}

/** Delete a local actor, queuing a server delete only if it was ever synced. */
export async function deleteLocalActor(localId: string): Promise<void> {
  await db.transaction("rw", db.actors, db.outbox, async () => {
    const existing = await db.actors.get(localId);
    const queued = await db.outbox.where("localId").equals(localId).toArray();

    // Drop any queued ops for this record first.
    await db.outbox.where("localId").equals(localId).delete();

    const neverSynced = !existing?.serverId;
    const onlyPendingCreate = queued.every((q) => q.op === "CREATE");

    if (existing && !(neverSynced && onlyPendingCreate)) {
      // Record exists server-side: queue a DELETE and keep the row until the
      // server confirms (so the engine still has the serverId to send).
      await db.outbox.add({
        localId,
        op: "DELETE",
        serverId: existing.serverId,
        createdAt: nowIso(),
        attempts: 0,
      });
      await db.actors.update(localId, { syncStatus: "PENDING", syncError: undefined });
    } else {
      // Never reached the server — just remove it locally.
      await db.actors.delete(localId);
    }
  });
  void requestBackgroundSync();
}

/** On-device duplicate check (exact + fuzzy), scoped to the actor's district. */
export async function findLocalDuplicates(
  identity: ActorIdentity,
  excludeLocalId?: string,
): Promise<DuplicateMatch[]> {
  const sameDistrict = await db.actors
    .where("districtCode")
    .equals(identity.districtCode)
    .toArray();

  const candidates: DuplicateCandidate[] = sameDistrict
    .filter((a) => a.localId !== excludeLocalId)
    .map((a) => ({
      id: a.localId,
      name: a.name,
      districtCode: a.districtCode,
      actorType: a.actorType,
      registrationNumber: a.registrationNumber,
    }));

  return rankDuplicates(identity, candidates);
}

export function getLocalActor(localId: string): Promise<LocalActor | undefined> {
  return db.actors.get(localId);
}
