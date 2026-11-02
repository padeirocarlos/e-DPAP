/**
 * i18n entry point. The app is Portuguese-first (the deployment default), so a
 * single catalog is exported as `dict`. Components read strings from here and
 * never hardcode copy. Add locales later by swapping this for a provider.
 */

import { pt, type Dictionary } from "@/i18n/pt";

export const dict: Dictionary = pt;
export { format } from "@/i18n/format";
export type { Dictionary };

/** Locale tag used for date/number formatting. */
export const LOCALE = "pt-MZ";
