import type { ReactNode } from "react";

/**
 * Minimal chrome for public auth pages (no app shell, no session required).
 * Full-bleed so the login page can render its two-column Mozambique hero.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[100dvh]">{children}</div>;
}
