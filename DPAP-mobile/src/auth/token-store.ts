/**
 * Auth token mirror in IndexedDB.
 *
 * The in-page app keeps the token in `localStorage` (synchronous, used by the
 * HTTP client). The service worker cannot read `localStorage`, so Background
 * Sync reads the token from here instead. The two are kept in step by
 * `auth/session.ts`.
 */

import { db } from "@/db/db";

const TOKEN_KEY = "token";

export async function mirrorToken(token: string): Promise<void> {
  try {
    await db.meta.put({ key: TOKEN_KEY, value: token });
  } catch {
    /* IndexedDB unavailable — the in-page localStorage copy still works */
  }
}

export async function clearMirroredToken(): Promise<void> {
  try {
    await db.meta.delete(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Read the token from IndexedDB — the source used inside the service worker. */
export async function readTokenFromDb(): Promise<string | null> {
  try {
    const row = await db.meta.get(TOKEN_KEY);
    return row?.value ?? null;
  } catch {
    return null;
  }
}
