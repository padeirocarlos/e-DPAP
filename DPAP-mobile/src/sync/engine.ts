/**
 * Sync engine: drains the outbox to the backend when connectivity allows.
 *
 * Model (per the project's conflict rules): local-first write → queue →
 * reconcile. Conflicts are resolved by **last-updated timestamp + server
 * version**. On a stale UPDATE (409) the engine fetches the server record and
 * keeps whichever `updatedAt` is newer; if the local copy wins it retries once
 * with the server's current version.
 *
 * The run is sequential and aborts on the first offline signal (the remaining
 * ops stay queued for the next attempt). It never throws — callers get a
 * summary and the per-record state is reflected on the actor's `syncStatus`.
 */

import { db, type LocalActor, type OutboxEntry } from "@/db/db";
import { ApiError } from "@/api/http";
import { createActor, updateActor, deleteActor, getActor } from "@/api/actors";
import { serverToLocalFields } from "@/sync/server-record";
import type { Actor, ActorWriteModel } from "@/api/types";

const LAST_SYNC_KEY = "dpap.lastSyncAt";

export type SyncSummary = {
  ok: number;
  failed: number;
  conflicts: number;
  /** Aborted because the device went offline mid-run. */
  offline: boolean;
  /** Backend rejected the token — the caller should prompt re-login. */
  unauthorized: boolean;
};

type Listener = (running: boolean) => void;
const listeners = new Set<Listener>();
let running = false;

export function onSyncStateChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setRunning(value: boolean): void {
  running = value;
  for (const fn of listeners) fn(value);
}

export function isSyncing(): boolean {
  return running;
}

export function getLastSyncAt(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

function setLastSyncAt(iso: string): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, iso);
  } catch {
    /* ignore */
  }
}

/** Only the fields the backend accepts (strip local-only bookkeeping). */
function toWriteModel(a: LocalActor): ActorWriteModel {
  return {
    name: a.name,
    registrationNumber: a.registrationNumber,
    actorType: a.actorType,
    legalStatus: a.legalStatus,
    sector: a.sector,
    districtCode: a.districtCode,
    administrativePostCode: a.administrativePostCode,
    localityCode: a.localityCode,
    latitude: a.latitude,
    longitude: a.longitude,
    responsiblePerson: a.responsiblePerson,
    phone: a.phone,
    email: a.email,
    address: a.address,
    description: a.description,
    observations: a.observations,
    startDate: a.startDate,
    fundingType: a.fundingType,
    imageUrl: a.imageUrl,
    acronym: a.acronym,
    respondentSex: a.respondentSex,
    respondentAge: a.respondentAge,
    respondentEducation: a.respondentEducation,
    phoneAlt: a.phoneAlt,
    website: a.website,
    subsectors: a.subsectors,
    valueChainLinks: a.valueChainLinks,
    operationLevel: a.operationLevel,
    districtsOfOperation: a.districtsOfOperation,
    legalFormality: a.legalFormality,
    registrationDocs: a.registrationDocs,
    nuit: a.nuit,
    consent: a.consent,
    contactSharingConsent: a.contactSharingConsent,
    fundingSources: a.fundingSources,
    receivedCredit: a.receivedCredit,
  };
}

/**
 * Adopt the authoritative server record over the local row. The server returns
 * the stored state after a write, so copying all fields keeps the device in
 * exact sync (including any server-side normalization) and, on a server-wins
 * conflict, replaces the discarded local edit. Local-only GPS metadata is left
 * untouched (merge update).
 */
async function markSynced(localId: string, server: Actor): Promise<void> {
  await db.actors.update(localId, serverToLocalFields(server));
}

/**
 * Process one outbox entry. Returns "done" (op handled, remove it), "conflict"
 * (handled but flagged), or throws an ApiError the caller inspects for offline.
 */
async function processEntry(
  entry: OutboxEntry,
  token?: string,
): Promise<"done" | "conflict"> {
  const actor = await db.actors.get(entry.localId);

  // DELETE can run even if the row is already gone locally.
  if (entry.op === "DELETE") {
    const serverId = entry.serverId ?? actor?.serverId;
    if (serverId) {
      try {
        await deleteActor(serverId, token);
      } catch (err) {
        if (err instanceof ApiError && err.code === "NOT_FOUND") {
          // Already gone server-side — treat as success.
        } else {
          throw err;
        }
      }
    }
    await db.actors.delete(entry.localId);
    return "done";
  }

  if (!actor) return "done"; // row vanished; nothing to push

  if (entry.op === "CREATE") {
    try {
      const server = await createActor(toWriteModel(actor), token);
      await markSynced(actor.localId, server);
      return "done";
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        await db.actors.update(actor.localId, {
          syncStatus: "CONFLICT",
          syncError: err.message,
        });
        return "conflict";
      }
      throw err;
    }
  }

  // UPDATE
  const serverId = actor.serverId ?? entry.serverId;
  if (!serverId) {
    // Never created server-side — fall back to a create.
    const server = await createActor(toWriteModel(actor), token);
    await markSynced(actor.localId, server);
    return "done";
  }

  try {
    const server = await updateActor(serverId, toWriteModel(actor), actor.version, token);
    await markSynced(actor.localId, server);
    return "done";
  } catch (err) {
    if (!(err instanceof ApiError) || err.code !== "CONFLICT") throw err;

    // Stale update — resolve by last-updated-wins against the server copy.
    const server = await getActor(serverId, token);
    if (new Date(server.updatedAt).getTime() >= new Date(actor.updatedAt).getTime()) {
      // Server is newer (or equal): server wins, discard the local edit.
      await markSynced(actor.localId, server);
      return "conflict";
    }
    // Local is newer: retry once with the server's current version.
    const resaved = await updateActor(serverId, toWriteModel(actor), server.version, token);
    await markSynced(actor.localId, resaved);
    return "conflict";
  }
}

/**
 * Drain the outbox. Safe to call repeatedly / concurrently (guarded). Never
 * throws — returns a summary of what happened.
 */
export async function runSync(opts?: { token?: string }): Promise<SyncSummary> {
  const summary: SyncSummary = {
    ok: 0,
    failed: 0,
    conflicts: 0,
    offline: false,
    unauthorized: false,
  };
  if (running) return summary;
  setRunning(true);
  try {
    const entries = await db.outbox.orderBy("seq").toArray();
    for (const entry of entries) {
      try {
        const result = await processEntry(entry, opts?.token);
        if (entry.seq !== undefined) await db.outbox.delete(entry.seq);
        if (result === "conflict") summary.conflicts++;
        else summary.ok++;
      } catch (err) {
        if (err instanceof ApiError && err.isOffline) {
          summary.offline = true;
          break; // stop the run; remaining ops retry next time
        }
        if (err instanceof ApiError && err.code === "UNAUTHORIZED") {
          summary.unauthorized = true;
          break;
        }
        // Other error: record it, count it, leave the op queued for retry.
        summary.failed++;
        const message = err instanceof Error ? err.message : String(err);
        if (entry.seq !== undefined) {
          await db.outbox.update(entry.seq, {
            attempts: entry.attempts + 1,
            lastError: message,
          });
        }
        await db.actors.update(entry.localId, { syncError: message });
        break; // backend trouble — stop and retry later
      }
    }
    if (summary.ok > 0 || summary.conflicts > 0) {
      setLastSyncAt(new Date().toISOString());
    }
    return summary;
  } finally {
    setRunning(false);
  }
}
