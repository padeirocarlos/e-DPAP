import { LOCALE } from "@/i18n";

/** Format an ISO timestamp for display (date + time). */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

/** Format just the time (HH:mm). */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, { timeStyle: "short" }).format(d);
}
