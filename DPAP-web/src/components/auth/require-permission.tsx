import type { ReactNode } from "react";
import { requireSession } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { can, type Permission } from "@/lib/auth/permissions";

/**
 * Server-side authorization gate. Redirects unauthenticated users to login
 * (via `requireSession`) and shows a localized "forbidden" notice when the
 * signed-in user lacks the permission. Reads the session, so render it inside a
 * <Suspense> boundary.
 *
 * This gates the UI; the backend still re-verifies every mutation.
 */
export async function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const session = await requireSession();

  if (!can(session.user.role, permission)) {
    const dict = await getDictionary();
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-semibold">{dict.auth.forbidden.title}</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {dict.auth.forbidden.description}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
