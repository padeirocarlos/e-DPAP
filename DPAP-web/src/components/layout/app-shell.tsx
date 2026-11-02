"use client";

/**
 * Application chrome: accessible skip link, header with primary navigation, and
 * the main content region. All labels come from the dictionary; all links from
 * the central route builders. Responsive and keyboard-navigable.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useSession, useCan } from "@/lib/auth/provider";
import { logoutAction } from "@/lib/auth/actions";
import { routes } from "@/config/routes";
import { appConfig } from "@/config/app.config";
import { cn } from "@/lib/utils/cn";

export function AppShell({ children }: { children: ReactNode }) {
  const dict = useDictionary();
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useSession();
  const can = useCan();

  const items = [
    { href: routes.dashboard(locale), label: dict.nav.dashboard },
    { href: routes.map(locale), label: dict.nav.map },
    { href: routes.actors(locale), label: dict.nav.actors },
    { href: routes.submissions(locale), label: dict.nav.submissions },
    // Data Conformance review queue — Supervisor+ only (never interviewers).
    ...(can("conformance:review")
      ? [{ href: routes.conformance(locale), label: dict.nav.conformance }]
      : []),
    { href: routes.network(locale), label: dict.nav.network },
    // Every role can read/export reports.
    ...(can("reports:read")
      ? [{ href: routes.reports(locale), label: dict.nav.reports }]
      : []),
    // Admin-only entry.
    ...(can("admin:access")
      ? [{ href: routes.administration(locale), label: dict.nav.administration }]
      : []),
  ];

  const isActive = (href: string) =>
    href === routes.dashboard(locale)
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <div className="flex min-h-full flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:shadow dark:focus:bg-zinc-900"
      >
        {dict.nav.skipToContent}
      </a>

      {/* Mozambique-flag accent stripe across the top of every page. */}
      <div className="mz-flag-stripe h-1" />

      <header className="border-b border-black/10 bg-white/90 backdrop-blur dark:border-white/15 dark:bg-zinc-950/90">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link
            href={routes.dashboard(locale)}
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="inline-flex h-7 items-center rounded bg-emerald-700 px-2 text-sm text-white">
              {appConfig.org.shortName}
            </span>
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {dict.app.name}
            </span>
          </Link>

          <nav aria-label={dict.nav.primary} className="ml-auto">
            <ul className="flex items-center gap-1">
              {items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-emerald-700 text-white"
                        : "text-zinc-700 hover:bg-black/5 dark:text-zinc-300 dark:hover:bg-white/10",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3 border-l border-black/10 pl-3 dark:border-white/15">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {dict.roles[user.role]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logoutAction(locale)}
              className="rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-black/5 dark:border-white/20 dark:text-zinc-300 dark:hover:bg-white/10"
            >
              {dict.auth.session.logout}
            </button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6"
      >
        {children}
      </main>

      <footer className="border-t border-black/10 py-4 text-center text-xs text-zinc-500 dark:border-white/15">
        {dict.app.fullName}
      </footer>
    </div>
  );
}
