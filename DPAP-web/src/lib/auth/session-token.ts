/**
 * Signed session cookie encode/decode (server-only).
 *
 * The cookie is `base64url(payload).base64url(hmacSHA256(payload))`. The HMAC
 * guarantees integrity so a user can't edit the cookie to grant themselves a
 * role; it is not encryption, so the payload must not hold secrets beyond the
 * short-lived API bearer token (which the backend validates independently).
 */

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret } from "@/lib/auth/config";
import type { ServerSession } from "@/lib/auth/types";

function b64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function encodeSession(session: ServerSession): string {
  const payload = b64urlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): ServerSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  // Constant-time signature check.
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const session = JSON.parse(b64urlDecode(payload)) as ServerSession;
    if (typeof session.expiresAt !== "number") return null;
    // NOTE: expiry is NOT compared to the current time here. Reading `Date.now()`
    // in the render path trips Cache Components' "unstable value" guard. The
    // cookie's `maxAge` drops expired sessions in the browser; Server Actions
    // re-check with `isSessionExpired()` (where reading the clock is allowed),
    // and the backend validates the bearer token authoritatively.
    return session;
  } catch {
    return null;
  }
}
