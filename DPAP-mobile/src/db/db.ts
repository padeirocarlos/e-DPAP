/**
 * Local database (IndexedDB via Dexie) — the offline source of truth.
 *
 * Offline-first means every write lands here first and is mirrored to the
 * backend later through the outbox. Two stores:
 *
 *  - `actors`  — the records captured on this device, each carrying the sync
 *                envelope (`version`, `updatedAt`, `syncStatus`) needed for
 *                last-updated-wins conflict resolution.
 *  - `outbox`  — an ordered queue of pending mutations (create/update/delete)
 *                awaiting sync. The engine drains it when connectivity returns.
 */

import Dexie, { type Table } from "dexie";
import type { ActorWriteModel, SyncStatus } from "@/api/types";

/** A locally-stored actor: the write model plus local sync bookkeeping. */
export type LocalActor = ActorWriteModel & {
  /** Stable on-device id (primary key), independent of the server id. */
  localId: string;
  /** Backend id once the record has been created server-side. */
  serverId?: string;
  /** Server `@Version` for optimistic concurrency (0 until first sync). */
  version: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601 — authoritative for conflict resolution
  syncStatus: SyncStatus;
  /** Local-only GPS metadata (not part of the backend contract). */
  gpsAccuracy?: number;
  gpsCapturedAt?: string;
  /** Diagnostic message when the last sync attempt failed / conflicted. */
  syncError?: string;
};

export type OutboxOp = "CREATE" | "UPDATE" | "DELETE";

/** One queued mutation. Ordered by the auto-incremented `seq`. */
export type OutboxEntry = {
  seq?: number;
  localId: string;
  op: OutboxOp;
  /** Backend id for UPDATE/DELETE (absent for a not-yet-created record). */
  serverId?: string;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

/**
 * Small key/value store. Holds the auth token so the service worker can read
 * it during Background Sync (localStorage is unavailable in a worker context).
 */
export type MetaEntry = { key: string; value: string };

/** Local sync state of a captured interview (submission). */
export type SubmissionSyncStatus = "draft" | "pending" | "synced" | "error";

/**
 * A locally-captured interview (BRD submission). The full questionnaire answer
 * map lives in `answers` (keyed by qX_YY, incl. roster rows under the roster
 * var). Offline-first: written here first, pushed to `POST /submissions` later
 * (idempotent via `clientUuid`).
 */
export type LocalSubmission = {
  localId: string;
  clientUuid: string;
  serverId?: string;
  questionnaireNumber?: number;
  formVersion: string;
  status: SubmissionSyncStatus;
  answers: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  syncError?: string;
};

export class DpapDatabase extends Dexie {
  actors!: Table<LocalActor, string>;
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<MetaEntry, string>;
  submissions!: Table<LocalSubmission, string>;

  constructor() {
    super("dpap-mobile");
    this.version(1).stores({
      // Indexes: primary key + fields we query/filter on.
      actors: "localId, serverId, syncStatus, districtCode, updatedAt",
      outbox: "++seq, localId, op",
      meta: "key",
    });
    // v2: add the interview (submission) store.
    this.version(2).stores({
      actors: "localId, serverId, syncStatus, districtCode, updatedAt",
      outbox: "++seq, localId, op",
      meta: "key",
      submissions: "localId, serverId, clientUuid, status, updatedAt",
    });
  }
}

export const db = new DpapDatabase();
