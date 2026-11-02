/**
 * Shared helpers for the dev mock API route handlers (DEV-ONLY).
 */

import { NextResponse, type NextRequest } from "next/server";

/**
 * The mock API is available outside production, or anywhere `MOCK_API=true`.
 * In production without that flag the handlers 404, so the mock never ships.
 */
export const MOCK_ENABLED =
  process.env.MOCK_API === "true" || process.env.NODE_ENV !== "production";

export function notFound() {
  return NextResponse.json({ message: "Not found", code: "NOT_FOUND" }, {
    status: 404,
  });
}

export function unauthorized() {
  return NextResponse.json(
    { message: "Missing bearer token", code: "UNAUTHORIZED" },
    { status: 401 },
  );
}

/** True when the request carries a non-empty Bearer token. */
export function hasBearer(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") && header.slice(7).trim().length > 0;
}

/**
 * Best-effort acting-user email from the mock bearer token (`mock.<b64url>` —
 * see the mock login route). Used to attribute audit entries; falls back to
 * "system" for any token shape we don't recognize.
 */
export function bearerEmail(request: NextRequest): string {
  const token = (request.headers.get("authorization") ?? "").slice(7).trim();
  if (token.startsWith("mock.")) {
    try {
      return Buffer.from(token.slice(5), "base64url").toString("utf8") || "system";
    } catch {
      return "system";
    }
  }
  return "system";
}
