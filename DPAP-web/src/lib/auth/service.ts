/**
 * Authentication service (server-only).
 *
 * In dev mode, authenticates against the demo accounts so the app is usable
 * without a backend. Otherwise posts credentials to the backend and maps the
 * response to a session. The returned `apiToken` is stored in the session
 * cookie and sent as the bearer token on subsequent API calls.
 */

import "server-only";
import { http } from "@/lib/api/http";
import { authDevMode, DEMO_ACCOUNTS } from "@/lib/auth/config";
import { normalizeRole } from "@/lib/auth/permissions";
import type { AuthUser } from "@/lib/auth/types";

export type Credentials = { email: string; password: string };
export type AuthResult = { user: AuthUser; apiToken: string };

type LoginResponse = {
  token: string;
  user: { id: string; name: string; email: string; role: string };
};

export async function authenticate(
  credentials: Credentials,
): Promise<AuthResult | null> {
  if (authDevMode) {
    return authenticateDemo(credentials.email);
  }

  const res = await http.post<LoginResponse>("/auth/login", credentials);
  const role = normalizeRole(res.user.role);
  if (!role) return null;

  return {
    apiToken: res.token,
    user: {
      id: res.user.id,
      name: res.user.name,
      email: res.user.email,
      role,
    },
  };
}

function authenticateDemo(email: string): AuthResult | null {
  const account = DEMO_ACCOUNTS.find(
    (a) => a.email.toLowerCase() === email.trim().toLowerCase(),
  );
  if (!account) return null;
  return {
    // Placeholder token; backend absent in dev, so API reads will fail softly.
    apiToken: `dev:${account.role}`,
    user: {
      id: account.email,
      name: account.name,
      email: account.email,
      role: account.role,
    },
  };
}
