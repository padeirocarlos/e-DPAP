import { useState } from "react";
import { dict, format } from "@/i18n";
import { appConfig } from "@/config/app";
import { login } from "@/api/auth";
import { setSession } from "@/auth/session";
import { ApiError } from "@/api/http";
import { Field, controlClass } from "@/components/Field";
import type { AuthUser } from "@/api/types";

export function Login({ onLoggedIn }: { onLoggedIn: (user: AuthUser) => void }) {
  const t = dict.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!navigator.onLine) {
      setError(t.offline);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await login(email.trim(), password);
      setSession(res.token, res.user);
      onLoggedIn(res.user);
    } catch (err) {
      if (err instanceof ApiError && err.code === "UNAUTHORIZED") setError(t.invalid);
      else if (err instanceof ApiError && err.isOffline) setError(t.offline);
      else setError(t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-full items-center justify-center p-6">
      <div className="mz-flag-stripe absolute inset-x-0 top-0 h-1.5" />
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 inline-flex h-12 items-center rounded-lg bg-emerald-700 px-4 text-lg font-semibold text-white">
            {appConfig.org.shortName}
          </div>
          <h1 className="text-xl font-semibold">{t.title}</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t.subtitle}</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/15 dark:bg-zinc-900"
        >
          <Field id="email" label={t.email} required>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              className={controlClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field id="password" label={t.password} required>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className={controlClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>

          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-base font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? t.submitting : t.submit}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-zinc-400">
          {format(dict.app.subtitle, {})}
        </p>
      </div>
    </div>
  );
}
