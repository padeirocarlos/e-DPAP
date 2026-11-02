/**
 * Server → device pull (delta sync).
 *
 * Fetches actor records changed since the stored watermark (`meta.pullSince`)
 * and upserts them into IndexedDB as SYNCED, page by page. **Local-first is
 * preserved**: a record with un-synced local work (PENDING/CONFLICT) is never
 * clobbered — the push reconciles it first. The watermark advances to the
 * newest `updatedAt` seen, so later pulls transfer only deltas (bandwidth-
 * conscious, per the rural-connectivity constraint).
 *
 * Note: the backend has no tombstones, so a pull cannot learn about records
 * deleted on the server; that would need a soft-delete/`deletedAt` feed.
 */

import { db } from "@/db/db";
import { listChanges } from "@/api/actors";
import { serverToLocalFields } from "@/sync/server-record";

const PULL_SINCE_KEY = "pullSince";
const PAGE_SIZE = 200;

export type PullSummary = {
  pulled: number; // inserted or updated locally
  skipped: number; // had un-synced local work, left intact
};

async function getWatermark(): Promise<string | undefined> {
  try {
    return (await db.meta.get(PULL_SINCE_KEY))?.value;
  } catch {
    return undefined;
  }
}

async function setWatermark(iso: string): Promise<void> {
  try {
    await db.meta.put({ key: PULL_SINCE_KEY, value: iso });
  } catch {
    /* ignore */
  }
}

/** Pull central changes into the local store. Throws `ApiError` when offline. */
export async function pullChanges(opts?: { token?: string }): Promise<PullSummary> {
  const since = await getWatermark();
  let page = 1;
  let pulled = 0;
  let skipped = 0;
  let maxTime = since ? new Date(since).getTime() : 0;
  let maxIso = since ?? "";

  for (;;) {
    const res = await listChanges({ since, page, pageSize: PAGE_SIZE }, opts);
    for (const server of res.items) {
      const t = new Date(server.updatedAt).getTime();
      if (t > maxTime) {
        maxTime = t;
        maxIso = server.updatedAt;
      }
      const existing = await db.actors.where("serverId").equals(server.id).first();
      if (existing) {
        // Never overwrite un-synced local edits; the push handles those.
        if (existing.syncStatus === "SYNCED") {
          await db.actors.update(existing.localId, serverToLocalFields(server));
          pulled++;
        } else {
          skipped++;
        }
      } else {
        // New to this device — key the local row by the server id.
        await db.actors.put({ localId: server.id, ...serverToLocalFields(server) });
        pulled++;
      }
    }

    const seen = (res.page - 1) * res.pageSize + res.items.length;
    if (res.items.length === 0 || seen >= res.total) break;
    page++;
  }

  if (maxIso) await setWatermark(maxIso);
  return { pulled, skipped };
}
