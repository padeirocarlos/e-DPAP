import type { ReactNode } from "react";

/** Shared input/select styling so form controls stay consistent. */
export const controlClass =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 disabled:opacity-60 dark:border-white/20 dark:bg-zinc-900";

/** Labeled form field with optional hint and error message, wired for a11y. */
export function Field({
  id,
  label,
  required,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-xs text-zinc-500 dark:text-zinc-400">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
