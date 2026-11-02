/**
 * Session storage for the field app.
 *
 * The JWT and the signed-in user are kept in `localStorage` so the enumerator
 * stays authenticated across app launches and offline sessions (the token is
 * only re-validated by the backend when connectivity returns). This is a field
 * device held by a single user, so a persistent local token is the pragmatic
 * choice; the backend remains the authoritative authorization boundary.
 */

import type { AuthUser } from "@/api/types";
import { mirrorToken, clearMirroredToken } from "@/auth/token-store";

const TOKEN_KEY = "dpap.token";
const USER_KEY = "dpap.user";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
  // Mirror to IndexedDB so the service worker can sync in the background.
  void mirrorToken(token);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
  void clearMirroredToken();
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}
