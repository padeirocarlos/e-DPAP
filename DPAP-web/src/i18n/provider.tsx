"use client";

/**
 * Client-side i18n context.
 *
 * Server Components read messages via `getDictionary()`. Client Components can't
 * use `next/root-params`, so the root layout resolves the dictionary on the
 * server and hands it (plus the active locale) to this provider. Client
 * Components then read it with `useDictionary()` / `useLocale()`.
 */

import { createContext, useContext, type ReactNode } from "react";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/config";

type I18nContextValue = {
  dict: Dictionary;
  locale: Locale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  dict,
  locale,
  children,
}: I18nContextValue & { children: ReactNode }) {
  return (
    <I18nContext.Provider value={{ dict, locale }}>
      {children}
    </I18nContext.Provider>
  );
}

function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (ctx === null) {
    throw new Error("useI18n must be used within an <I18nProvider>.");
  }
  return ctx;
}

/** The full message catalog for the active locale. */
export function useDictionary(): Dictionary {
  return useI18n().dict;
}

/** The active locale (e.g. for building locale-prefixed links). */
export function useLocale(): Locale {
  return useI18n().locale;
}
