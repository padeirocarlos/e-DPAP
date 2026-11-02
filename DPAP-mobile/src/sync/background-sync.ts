/**
 * Background Sync registration (page side).
 *
 * When supported (Chromium), registering a sync tag lets the browser fire a
 * `sync` event in the service worker once connectivity returns — even if the
 * app was closed in the meantime — so a form filled offline is replayed in the
 * background. Where unsupported (Safari/Firefox), this is a no-op and the
 * in-page reconnect sync (`useSync`) remains the fallback.
 */

export const BACKGROUND_SYNC_TAG = "dpap-outbox";

type SyncManagerLike = { register(tag: string): Promise<void> };

/** Ask the browser to replay the outbox in the background. Returns true if queued. */
export async function requestBackgroundSync(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }
  try {
    const reg = await navigator.serviceWorker.ready;
    const sync = (reg as unknown as { sync?: SyncManagerLike }).sync;
    if (!sync) return false;
    await sync.register(BACKGROUND_SYNC_TAG);
    return true;
  } catch {
    return false;
  }
}
