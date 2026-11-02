import type { Metadata } from "next";
import { getDictionary } from "@/i18n/dictionary";
import { appConfig } from "@/config/app.config";
import { LoginForm } from "@/components/auth/login-form";
import { MozambiqueMap } from "@/components/brand/mozambique-map";
import { authDevMode, DEMO_ACCOUNTS } from "@/lib/auth/config";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.auth.login.title };
}

export default async function LoginPage() {
  const dict = await getDictionary();
  const t = dict.auth.login;
  const demoEmails = authDevMode ? DEMO_ACCOUNTS.map((a) => a.email) : [];

  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      {/* Left — Mozambique branding hero (flag green). Hidden on small screens. */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="mz-flag-stripe absolute inset-x-0 top-0 h-1.5" />

        {/* Country silhouette, bleeding off the right edge as a brand watermark. */}
        <MozambiqueMap className="pointer-events-none absolute -right-20 top-1/2 h-[135%] -translate-y-1/2 text-white/15" />

        <div className="relative">
          <span className="inline-flex h-9 items-center rounded bg-white/15 px-3 text-base font-semibold tracking-wide ring-1 ring-white/25 backdrop-blur">
            {appConfig.org.shortName}
          </span>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-2xl font-semibold leading-snug">{dict.app.fullName}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/85">{t.heroTagline}</p>
        </div>

        <p className="relative text-xs text-white/70">{t.gov}</p>
      </aside>

      {/* Right — the login form, sitting just right of centre on large screens. */}
      <main className="relative flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="mz-flag-stripe absolute inset-x-0 top-0 h-1 lg:hidden" />
        <div className="w-full max-w-sm lg:pl-4">
          <div className="mb-8">
            <span className="inline-flex h-8 items-center rounded bg-emerald-700 px-2.5 text-sm font-semibold text-white lg:hidden">
              {appConfig.org.shortName}
            </span>
            <h1 className="mt-4 text-xl font-semibold tracking-tight lg:mt-0">
              {t.title}
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
          </div>
          <LoginForm demoEmails={demoEmails} />
        </div>
      </main>
    </div>
  );
}
