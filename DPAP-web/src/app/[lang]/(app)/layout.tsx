import { Suspense, type ReactNode } from "react";
import { getDictionary } from "@/i18n/dictionary";
import { requireSession, toClientSession } from "@/lib/auth/session";
import { SessionProvider } from "@/lib/auth/provider";
import { AppShell } from "@/components/layout/app-shell";
import { Loading } from "@/components/ui/loading";

/**
 * Protected area layout. The session read (cookies) happens inside a <Suspense>
 * boundary via `AuthenticatedShell` — never at the layout's top level — as Cache
 * Components requires. `requireSession` redirects to login when unauthenticated,
 * so everything below here can assume a signed-in user.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const dict = await getDictionary();
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Loading label={dict.common.states.loading} />
        </div>
      }
    >
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: ReactNode }) {
  const session = await requireSession();
  return (
    <SessionProvider session={toClientSession(session)}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
