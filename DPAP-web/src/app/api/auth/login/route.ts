/**
 * Mock login endpoint (DEV-ONLY). Validates against the demo accounts and
 * returns `{ token, user }` shaped like the real backend. Password is ignored.
 */

import { NextResponse, type NextRequest } from "next/server";
import { MOCK_ENABLED, notFound } from "@/lib/mock/http";
import { DEMO_ACCOUNTS } from "@/lib/auth/config";

export async function POST(request: NextRequest) {
  if (!MOCK_ENABLED) return notFound();

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
  };
  const email = (body.email ?? "").trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email);

  if (!account) {
    return NextResponse.json(
      { message: "Invalid credentials", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const token = `mock.${Buffer.from(account.email).toString("base64url")}`;
  return NextResponse.json({
    token,
    user: {
      id: account.email,
      name: account.name,
      email: account.email,
      role: account.role,
    },
  });
}
