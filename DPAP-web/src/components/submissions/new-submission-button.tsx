"use client";

import Link from "next/link";
import { useDictionary, useLocale } from "@/i18n/provider";
import { useCan } from "@/lib/auth/provider";
import { routes } from "@/config/routes";

/** "New interview" link, shown only to users who can capture. */
export function NewSubmissionButton() {
  const can = useCan();
  const dict = useDictionary();
  const locale = useLocale();

  if (!can("actors:write")) return null;

  return (
    <Link
      href={routes.newSubmission(locale)}
      className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
    >
      {dict.submissions.new}
    </Link>
  );
}
