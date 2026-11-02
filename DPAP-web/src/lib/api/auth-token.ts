/**
 * Auth token seam.
 *
 * JWT auth is not built yet. This provides a single place for the HTTP client to
 * obtain a bearer token so wiring auth later touches only this file.
 *
 * NOTE: the in-memory store is per-browser-tab on the client and per-process on
 * the server. It is a placeholder — once auth lands, server requests must read
 * the token per-request (e.g. from an httpOnly cookie) and pass it explicitly to
 * the HTTP client, rather than relying on this shared module on the server.
 */

let currentToken: string | null = null;

export function setAuthToken(token: string | null): void {
  currentToken = token;
}

export function getAuthToken(): string | null {
  return currentToken;
}
