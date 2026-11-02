/**
 * Sync controller hook. Exposes the pending count, running state, last sync
 * time and a manual `syncNow()` that **pushes the outbox then pulls central
 * changes**. Auto-runs when the device comes online (reconnect) and on a
 * periodic interval; also pushes promptly whenever queued work appears.
 *
 * Note on Background Sync: true background replay (while the app is closed) is
 * handled by the service worker (`src/sw.ts`); this hook covers the foreground
 * case plus the manual button.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/db";
import { appConfig } from "@/config/app";
import {
  runSync,
  onSyncStateChange,
  getLastSyncAt,
  type SyncSummary,
} from "@/sync/engine";
import { pullChanges, type PullSummary } from "@/sync/pull";
import { syncSubmissions } from "@/sync/submissions-sync";
import { ApiError } from "@/api/http";
import { useOnline } from "@/hooks/useOnline";

export type UseSync = {
  online: boolean;
  syncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  lastSummary: SyncSummary | null;
  lastPull: PullSummary | null;
  syncNow: () => Promise<void>;
};

export function useSync(onUnauthorized?: () => void): UseSync {
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(() => getLastSyncAt());
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null);
  const [lastPull, setLastPull] = useState<PullSummary | null>(null);
  const unauthorizedRef = useRef(onUnauthorized);
  unauthorizedRef.current = onUnauthorized;
  const inFlight = useRef(false);

  const outboxCount = useLiveQuery(() => db.outbox.count(), [], 0) ?? 0;
  const submissionsPending =
    useLiveQuery(() => db.submissions.where("status").equals("pending").count(), [], 0) ?? 0;
  const pendingCount = outboxCount + submissionsPending;

  useEffect(() => onSyncStateChange(setSyncing), []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || inFlight.current) return;
    inFlight.current = true;
    try {
      // 1) Push the actor outbox.
      const summary = await runSync();
      setLastSummary(summary);
      if (summary.unauthorized) {
        unauthorizedRef.current?.();
        return; // token invalid — don't bother pulling
      }
      // 1b) Push captured interviews (submissions).
      const subs = await syncSubmissions();
      if (subs.unauthorized) {
        unauthorizedRef.current?.();
        return;
      }
      // 2) Pull central changes (best-effort; ignore offline).
      try {
        const pull = await pullChanges();
        setLastPull(pull);
      } catch (err) {
        if (!(err instanceof ApiError && err.isOffline)) throw err;
      }
      setLastSyncAt(getLastSyncAt());
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Sync on (re)connect — pushes queued work and pulls central changes.
  useEffect(() => {
    if (online) void syncNow();
  }, [online, syncNow]);

  // Push promptly when new work is queued.
  useEffect(() => {
    if (online && pendingCount > 0) void syncNow();
  }, [online, pendingCount, syncNow]);

  // Periodic refresh while online.
  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => void syncNow(), appConfig.sync.autoIntervalMs);
    return () => clearInterval(id);
  }, [online, syncNow]);

  return { online, syncing, pendingCount, lastSyncAt, lastSummary, lastPull, syncNow };
}
