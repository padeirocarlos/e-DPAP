/**
 * Dictionary type + server-side loader.
 *
 * `Dictionary` is derived from the Portuguese catalog so every other locale is
 * checked against it at build time — a missing or renamed key is a type error,
 * not a runtime surprise. Loading happens only on the server; client components
 * receive the resolved dictionary through `I18nProvider`.
 */

import "server-only";
import { lang } from "next/root-params";
import { pt } from "@/i18n/locales/pt";
import { type Locale, resolveLocale } from "@/i18n/config";

export type Dictionary = typeof pt;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  pt: async () => pt,
};

/** Load a dictionary for an explicit locale. */
export function getDictionaryFor(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

/**
 * Load the dictionary for the current request's locale, read from the `[lang]`
 * root parameter. Usable in any Server Component without prop drilling.
 */
export async function getDictionary(): Promise<Dictionary> {
  const locale = resolveLocale(await lang());
  return getDictionaryFor(locale);
}
