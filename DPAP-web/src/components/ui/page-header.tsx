import type { ReactNode } from "react";

/** Standard page title block. Text is passed in (already localized). */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}
