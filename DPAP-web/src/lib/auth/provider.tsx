"use client";

/**
 * Client-side session context. The (app) layout resolves the session on the
 * server (behind Suspense) and passes the client-safe shape here so Client
 * Components can read the current user and gate UI with `useCan()`.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { ClientSession } from "@/lib/auth/types";
import { can, type Permission } from "@/lib/auth/permissions";

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: ClientSession;
  children: ReactNode;
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): ClientSession {
  const session = useContext(SessionContext);
  if (session === null) {
    throw new Error("useSession must be used within a <SessionProvider>.");
  }
  return session;
}

/** Returns a predicate for the current user's permissions (UI gating only). */
export function useCan(): (permission: Permission) => boolean {
  const { user } = useSession();
  return (permission) => can(user.role, permission);
}
