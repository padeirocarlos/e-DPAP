"use client";

/**
 * Error boundary for the protected area. Sits below the (app) layout, so a
 * failed data fetch shows inside the app shell with a retry, instead of
 * replacing the whole page. Localized via the provider in the root layout.
 */

import { useEffect } from "react";
import { useDictionary } from "@/i18n/provider";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDictionary();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold">{dict.errors.generic.title}</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {dict.errors.generic.description}
      </p>
      <button
        onClick={reset}
        className="mt-6 inline-block rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
      >
        {dict.common.actions.retry}
      </button>
    </div>
  );
}
