import Link from "next/link";
import { lang } from "next/root-params";
import { getActor } from "@/lib/api/actors";
import { getServerAuthToken, getSession } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { resolveLocale } from "@/i18n/config";
import { can } from "@/lib/auth/permissions";
import { routes } from "@/config/routes";
import { PageHeader } from "@/components/ui/page-header";
import { ActorDetail } from "@/components/actors/actor-detail";

/**
 * Server component: loads one actor and renders its full detail view with a
 * back link and (role-gated) edit link. Reads the session token, so render
 * inside a <Suspense> boundary; a missing actor (NOT_FOUND) bubbles to the
 * segment error boundary.
 */
export async function ActorDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = await getServerAuthToken();
  const [actor, dict, locale, session] = await Promise.all([
    getActor(id, { token }),
    getDictionary(),
    resolveLocale(await lang()),
    getSession(),
  ]);
  const canEdit = session ? can(session.user.role, "actors:write") : false;
  const d = dict.actors.detail;

  return (
    <>
      <PageHeader
        title={actor.name}
        subtitle={actor.acronym ?? undefined}
        actions={
          <div className="flex gap-2">
            <Link
              href={routes.actors(locale)}
              className="rounded-md border border-black/15 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {d.back}
            </Link>
            {canEdit ? (
              <Link
                href={routes.editActor(locale, actor.id)}
                className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                {d.edit}
              </Link>
            ) : null}
          </div>
        }
      />
      <ActorDetail actor={actor} dict={dict} locale={locale} />
    </>
  );
}
