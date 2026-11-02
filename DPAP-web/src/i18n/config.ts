/**
 * Locale configuration.
 *
 * Portuguese is the default and only locale today, but the whole app is built
 * around `[lang]` routing and dictionaries so additional locales can be added
 * by dropping a new file in `src/i18n/locales` and extending `locales` here.
 */

export const locales = ["pt"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "pt";

/** Narrowing guard — safe to call with any string (e.g. a URL segment). */
export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

/** Resolve an arbitrary value to a supported locale, falling back to default. */
export function resolveLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}
