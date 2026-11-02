/// <reference lib="webworker" />
/**
 * Custom service worker (vite-plugin-pwa `injectManifest`).
 *
 * Responsibilities:
 *  - Precache the app shell (Workbox injects the manifest into `__WB_MANIFEST`)
 *    so the app opens with no network.
 *  - Runtime-cache OpenStreetMap tiles (CacheFirst) for maps seen while online.
 *  - Background Sync: on the `sync` event for our tag, replay the outbox using
 *    the shared sync engine, reading the auth token from IndexedDB (the service
 *    worker has no access to localStorage).
 */

import { precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { runSync } from "@/sync/engine";
import { readTokenFromDb } from "@/auth/token-store";
import { BACKGROUND_SYNC_TAG } from "@/sync/background-sync";

declare let self: ServiceWorkerGlobalScope;

// Precache everything Workbox bundled at build time.
precacheAndRoute(self.__WB_MANIFEST);

// OpenStreetMap raster tiles — cache first, bounded, keep for a month.
registerRoute(
  ({ url }) => url.hostname.endsWith("tile.openstreetmap.org"),
  new CacheFirst({
    cacheName: "osm-tiles",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 }),
    ],
  }),
);

/** Replay the queued mutations with the stored token. */
async function replayOutbox(): Promise<void> {
  const token = await readTokenFromDb();
  if (!token) return; // not signed in on this device; nothing to push
  await runSync({ token });
}

self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as Event & { tag?: string; waitUntil(p: Promise<unknown>): void };
  if (syncEvent.tag === BACKGROUND_SYNC_TAG) {
    syncEvent.waitUntil(replayOutbox());
  }
});

// Auto-update: a newly-installed worker activates immediately and claims the
// open pages, so an online device picks up the latest deployed version. With
// `registerType: "autoUpdate"` the registration then reloads the page ONCE —
// per new deployment, not in a loop (an unchanged worker is never re-installed,
// so nothing re-triggers it). The page also checks for updates on reconnect /
// focus (see main.tsx), so a long-open app refreshes to the newest version.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
