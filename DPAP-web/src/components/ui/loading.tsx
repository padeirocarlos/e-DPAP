/** Minimal inline loading indicator. The label is passed in (already localized). */
export function Loading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 py-10 text-sm text-zinc-500 dark:text-zinc-400"
    >
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      />
      {label}
    </div>
  );
}
