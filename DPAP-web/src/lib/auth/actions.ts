"use server";

/**
 * Auth Server Actions. These run on the server and set/clear the httpOnly
 * session cookie — the browser can't do that itself. Error outcomes are
 * returned as stable codes; the client maps them to localized copy.
 */

import { redirect } from "next/navigation";
import { resolveLocale } from "@/i18n/config";
import { routes } from "@/config/routes";
import { authenticate } from "@/lib/auth/service";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export type LoginState = { error?: "missing" | "invalid" | "error" };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const locale = resolveLocale(String(formData.get("locale") ?? ""));

  if (!email || !password) return { error: "missing" };

  let result;
  try {
    result = await authenticate({ email, password });
  } catch {
    return { error: "error" };
  }
  if (!result) return { error: "invalid" };

  await setSessionCookie(result.user, result.apiToken);
  redirect(routes.dashboard(locale)); // throws to navigate
}

export async function logoutAction(locale: string): Promise<void> {
  await clearSessionCookie();
  redirect(routes.login(resolveLocale(locale)));
}
