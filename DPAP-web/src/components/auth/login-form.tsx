"use client";

import { useActionState } from "react";
import { useDictionary, useLocale } from "@/i18n/provider";
import { Field, controlClass } from "@/components/ui/field";
import { loginAction, type LoginState } from "@/lib/auth/actions";

export function LoginForm({ demoEmails }: { demoEmails: string[] }) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.auth.login;

  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  const errorMessage =
    state.error === "invalid" || state.error === "missing"
      ? t.invalid
      : state.error === "error"
        ? t.error
        : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />

      <Field id="email" label={t.email} required>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className={controlClass}
          required
        />
      </Field>

      <Field id="password" label={t.password} required>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={controlClass}
          required
        />
      </Field>

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? t.submitting : t.submit}
      </button>

      {demoEmails.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p>{t.devHint}</p>
          <ul className="mt-1 font-mono">
            {demoEmails.map((email) => (
              <li key={email}>{email}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </form>
  );
}
