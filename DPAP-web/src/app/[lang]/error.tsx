"use client";

/**
 * Route-segment error boundary for the localized app.
 *
 * Catches failures from data-fetching components (e.g. the backend being
 * unreachable) and shows a localized message with a retry that re-runs the
 * failed render. The provider lives in the layout above this boundary, so
 * `useDictionary()` is available here.
 */

import { useEffect } from "react";
import { useDictionary } from "@/i18n/provider";

export default function SegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dict = useDictionary();

  useEffect(() => {
    // Surface for diagnostics; user sees the localized message below.
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
