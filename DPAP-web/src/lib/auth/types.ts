/** Auth domain types (client-safe). */

import type { RoleCode } from "@/lib/domain/enums";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
};

/** What the client is allowed to see about the session (never the API token). */
export type ClientSession = {
  user: AuthUser;
  /** Epoch ms when the session expires. */
  expiresAt: number;
};

/**
 * Full server-side session, including the bearer token used for API calls.
 * Never passed to Client Components.
 */
export type ServerSession = ClientSession & {
  apiToken: string;
};
